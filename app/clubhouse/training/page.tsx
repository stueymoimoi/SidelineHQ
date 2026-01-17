'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================
// TYPES
// ============================================

interface Team {
  id: string;
  name: string;
  city: string;
  primary_color: string;
  secondary_color: string;
}

interface Player {
  id: string;
  team_id: string;
  first_name: string;
  last_name: string;
  position: string;
  secondary_position: string | null;
  age: number;
  overall: number;
  speed: number;
  strength: number;
  power: number;
  passing: number;
  stamina: number;
  tackling: number;
  kicking: number;
  fatigue: number;
  current_training: string | null;
  training_progress: string | null;
  nationality: string;
  state: string | null;
  visible_trait: string | null;
}

// ============================================
// CONSTANTS
// ============================================

const STAT_TRAINING = ['Speed', 'Strength', 'Power', 'Passing', 'Stamina', 'Tackling', 'Kicking'] as const;
const POSITIONS = ['Fullback', 'Winger', 'Centre', 'Five-Eighth', 'Halfback', 'Prop', 'Hooker', 'Second Row', 'Lock'] as const;
const PROGRESS_STAGES = ['NONE', 'POOR', 'FAIR', 'GOOD', 'VERY GOOD', 'EXCELLENT'] as const;

const VALID_STAT_KEYS = ['speed', 'strength', 'power', 'passing', 'stamina', 'tackling', 'kicking'] as const;
type StatKey = typeof VALID_STAT_KEYS[number];

const STAT_TIERS: Record<number, string> = {
  1: 'None', 2: 'Poor', 3: 'Fair', 4: 'OK',
  5: 'Good', 6: 'Very Good', 7: 'Excellent', 8: 'Elite',
};

const STAT_TIERS_SHORT: Record<number, string> = {
  1: 'None', 2: 'Poor', 3: 'Fair', 4: 'OK',
  5: 'Good', 6: 'V.Good', 7: 'Excel', 8: 'Elite',
};

const TRAIT_DISPLAY_NAMES: Record<string, string> = {
  fiery: 'Fiery',
  confident: 'Confident',
  showman: 'Showman',
  professional: 'Professional',
  clutch: 'Clutch',
  prodigy: 'Prodigy',
  leader: 'Leader',
  loyal: 'Loyal',
  composed: 'Composed',
};

const POSITION_COLORS: Record<string, string> = {
  'Fullback': 'bg-purple-600',
  'Winger': 'bg-blue-600',
  'Centre': 'bg-green-600',
  'Five-Eighth': 'bg-yellow-600',
  'Halfback': 'bg-yellow-500',
  'Prop': 'bg-red-600',
  'Hooker': 'bg-orange-600',
  'Second Row': 'bg-pink-600',
  'Lock': 'bg-red-700',
};

const PROGRESS_COLORS: Record<string, string> = {
  'NONE': 'bg-gray-600',
  'POOR': 'bg-red-600',
  'FAIR': 'bg-orange-500',
  'GOOD': 'bg-yellow-500',
  'VERY GOOD': 'bg-lime-500',
  'EXCELLENT': 'bg-green-500',
};

const PROGRESS_WIDTHS: Record<string, string> = {
  'NONE': 'w-0',
  'POOR': 'w-1/6',
  'FAIR': 'w-2/6',
  'GOOD': 'w-3/6',
  'VERY GOOD': 'w-4/6',
  'EXCELLENT': 'w-full',
};

const TRAINING_ICONS: Record<string, string> = {
  'Rest': '😴',
  'Speed': '⚡',
  'Strength': '💪',
  'Power': '💥',
  'Passing': '🎯',
  'Stamina': '🫁',
  'Tackling': '🛡️',
  'Kicking': '🦶',
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const getStatTier = (value: number, short = false): string => {
  const tiers = short ? STAT_TIERS_SHORT : STAT_TIERS;
  if (typeof value !== 'number' || isNaN(value)) return 'None';
  const clampedValue = Math.max(1, Math.min(8, Math.round(value)));
  return tiers[clampedValue] || 'None';
};

const getStatTierColor = (value: number): string => {
  if (value >= 8) return 'text-yellow-400';
  if (value >= 7) return 'text-purple-400';
  if (value >= 6) return 'text-green-400';
  if (value >= 5) return 'text-blue-400';
  if (value >= 4) return 'text-gray-300';
  if (value >= 3) return 'text-orange-400';
  if (value >= 2) return 'text-red-400';
  return 'text-red-600';
};

const getFitness = (fatigue: number): number => {
  return Math.max(0, Math.min(100, 100 - fatigue));
};

const getFitnessColor = (fatigue: number): string => {
  const fitness = getFitness(fatigue);
  if (fitness >= 90) return 'text-green-400';
  if (fitness >= 80) return 'text-green-500';
  if (fitness >= 70) return 'text-yellow-400';
  if (fitness >= 60) return 'text-yellow-500';
  if (fitness >= 50) return 'text-orange-400';
  return 'text-red-500';
};

const getPlayerStat = (player: Player, statName: string): number => {
  const key = statName.toLowerCase() as StatKey;
  if (VALID_STAT_KEYS.includes(key)) {
    return player[key];
  }
  return 1;
};

const getTrainingIcon = (training: string | null): string => {
  return training ? (TRAINING_ICONS[training] || '📍') : '➖';
};

const getTrainingDescription = (training: string | null, player: Player): string => {
  if (!training) return 'No training assigned';
  if (training === 'Rest') return 'Recovering fitness';
  if (STAT_TRAINING.includes(training as typeof STAT_TRAINING[number])) {
    return `Training ${training.toLowerCase()}`;
  }
  if (training === player.position) {
    return `Mastering ${training} skills`;
  } else if (training === player.secondary_position) {
    return `Improving ${training} (secondary)`;
  }
  return `Learning ${training} position`;
};

const formatNationality = (nationality: string, state: string | null): string => {
  if (state) return `${nationality}, ${state}`;
  return nationality;
};

const getTraitDisplay = (trait: string | null): string | null => {
  if (!trait) return null;
  return TRAIT_DISPLAY_NAMES[trait] || trait.charAt(0).toUpperCase() + trait.slice(1);
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function TrainingPage() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveQueue, setSaveQueue] = useState<Map<string, { training: string | null; resetProgress: boolean }>>(new Map());
  const [teamId, setTeamId] = useState<string | null>(null);
  const router = useRouter();

  // Memoized player map for O(1) lookups
  const playerMap = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);

  // Batch save with proper error handling
  const processSaveQueue = useCallback(async () => {
    if (saveQueue.size === 0 || !teamId) return;
    
    setSaveStatus('saving');
    
    try {
      // Re-verify team ownership (security)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      const { data: coach } = await supabase
        .from('coaches')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!coach?.team_id || coach.team_id !== teamId) {
        console.error('Team ID mismatch - potential security issue');
        setSaveStatus('error');
        return;
      }

      // Batch updates in parallel (chunked for safety)
      const entries = Array.from(saveQueue.entries());
      const CHUNK_SIZE = 10;
      
      for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
        const chunk = entries.slice(i, i + CHUNK_SIZE);
        await Promise.all(
          chunk.map(([playerId, { training, resetProgress }]) => {
            const updateData: Record<string, unknown> = { current_training: training };
            if (resetProgress) updateData.training_progress = 'NONE';
            
            return supabase
              .from('players')
              .update(updateData)
              .eq('id', playerId)
              .eq('team_id', coach.team_id); // Security: double-check ownership
          })
        );
      }
      
      setSaveQueue(new Map());
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Error saving:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [saveQueue, teamId, router]);

  // Debounced save
  useEffect(() => {
    if (saveQueue.size === 0) return;
    
    const timeout = setTimeout(() => {
      processSaveQueue();
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [saveQueue, processSaveQueue]);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth');
          return;
        }

        const { data: coach } = await supabase
          .from('coaches')
          .select('team_id')
          .eq('user_id', user.id)
          .single();

        if (!coach?.team_id) {
          router.push('/choose-team');
          return;
        }

        setTeamId(coach.team_id);

        // Parallel fetch for performance
        const [teamResult, playersResult] = await Promise.all([
          supabase
            .from('teams')
            .select('id, name, city, primary_color, secondary_color')
            .eq('id', coach.team_id)
            .single(),
          supabase
            .from('players')
            .select(`
              id, team_id, first_name, last_name, position, secondary_position,
              age, overall, speed, strength, power, passing, stamina, tackling, kicking,
              fatigue, current_training, training_progress, nationality, state, visible_trait
            `)
            .eq('team_id', coach.team_id)
            .order('overall', { ascending: false }),
        ]);

        setTeam(teamResult.data);
        setPlayers(playersResult.data || []);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleTrainingChange = useCallback((playerId: string, training: string | null) => {
    const player = playerMap.get(playerId);
    if (!player) return;
    
    const trainingChanged = player.current_training !== training;
    
    // Update local state immediately
    setPlayers(prev => prev.map(p => 
      p.id === playerId 
        ? { ...p, current_training: training, training_progress: trainingChanged ? 'NONE' : p.training_progress }
        : p
    ));
    
    // Add to save queue (Map automatically handles duplicates)
    setSaveQueue(prev => {
      const next = new Map(prev);
      next.set(playerId, { training, resetProgress: trainingChanged });
      return next;
    });
    
    // Update selected player if it's the one being changed
    setSelectedPlayer(prev => 
      prev?.id === playerId 
        ? { ...prev, current_training: training, training_progress: trainingChanged ? 'NONE' : prev.training_progress }
        : prev
    );
  }, [playerMap]);

  const setAllTraining = useCallback((training: string) => {
    const newQueue = new Map<string, { training: string | null; resetProgress: boolean }>();
    
    setPlayers(prev => prev.map(p => {
      const trainingChanged = p.current_training !== training;
      newQueue.set(p.id, { training, resetProgress: trainingChanged });
      return {
        ...p,
        current_training: training,
        training_progress: trainingChanged ? 'NONE' : p.training_progress
      };
    }));
    
    setSaveQueue(newQueue);
  }, []);

  const closeModal = useCallback(() => setSelectedPlayer(null), []);

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div 
        className="p-6"
        style={{
          background: `linear-gradient(135deg, ${team?.primary_color || '#1f2937'} 0%, ${team?.secondary_color || '#111827'} 100%)`
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-start">
            <div>
              <Link href="/clubhouse" className="text-white/70 hover:text-white mb-2 inline-block">
                ← Back to Clubhouse
              </Link>
              <h1 className="text-3xl font-bold text-white">🏋️ Training</h1>
              <p className="text-white/80 mt-1">Assign training to develop your players</p>
            </div>
            
            <div className="text-right">
              {saveStatus === 'saving' && (
                <span className="text-yellow-400 text-sm animate-pulse">💾 Saving...</span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-green-400 text-sm">✅ Saved</span>
              )}
              {saveStatus === 'error' && (
                <span className="text-red-400 text-sm">❌ Error saving</span>
              )}
              {saveStatus === 'idle' && (
                <span className="text-white/50 text-sm">Auto-save on</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        
        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-white font-bold mb-3">Quick Assign</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setAllTraining('Rest')}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition"
            >
              😴 All Rest
            </button>
            {STAT_TRAINING.map(training => (
              <button
                key={training}
                onClick={() => setAllTraining(training)}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition"
              >
                {getTrainingIcon(training)} All {training}
              </button>
            ))}
          </div>
        </div>

        {/* Training Legend */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-white font-bold mb-3">Progress Guide</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            {PROGRESS_STAGES.map(stage => (
              <div key={stage} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${PROGRESS_COLORS[stage]}`}></div>
                <span className="text-gray-400">{stage}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-xs mt-3">
            Higher progress = better chance of stat improvement. Excellent keeps improving without reset.
          </p>
        </div>

        {/* Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {players.map(player => {
            const fitness = getFitness(player.fatigue);
            const traitDisplay = getTraitDisplay(player.visible_trait);
            
            return (
              <div
                key={player.id}
                onClick={() => setSelectedPlayer(player)}
                className="bg-gray-800 rounded-lg p-4 cursor-pointer transition border-2 border-transparent hover:border-green-500"
              >
                {/* Player Header */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-gray-400 text-xs">{player.first_name}</p>
                    <p className="text-white font-bold">{player.last_name}</p>
                    <p className="text-gray-500 text-xs">{formatNationality(player.nationality, player.state)}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold text-white ${POSITION_COLORS[player.position] || 'bg-gray-600'}`}>
                      {player.position}
                    </span>
                    {player.secondary_position && (
                      <p className="text-gray-500 text-xs mt-1">{player.secondary_position}</p>
                    )}
                  </div>
                </div>

                {/* Trait - Only show if exists */}
                {traitDisplay && (
                  <p className="text-gray-400 text-xs mb-2">Trait: {traitDisplay}</p>
                )}

                {/* Stats Row */}
                <div className="flex items-center gap-2 mb-3 text-xs">
                  <span className="text-white font-bold">{player.overall} OVR</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">Age {player.age}</span>
                  <span className="text-gray-500">•</span>
                  <span className={getFitnessColor(player.fatigue)}>{fitness}% Fit</span>
                </div>

                {/* Current Training */}
                <div className="bg-gray-900 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{getTrainingIcon(player.current_training)}</span>
                    <span className="text-white font-medium">
                      {player.current_training || 'None'}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs mb-2">
                    {getTrainingDescription(player.current_training, player)}
                  </p>
                  
                  {/* Progress Bar */}
                  {player.current_training && player.current_training !== 'Rest' && (
                    <>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${PROGRESS_COLORS[player.training_progress || 'NONE']} ${PROGRESS_WIDTHS[player.training_progress || 'NONE']}`}
                        />
                      </div>
                      <p className="text-gray-500 text-xs mt-1 text-right">
                        {player.training_progress || 'NONE'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Training Selection Modal */}
      {selectedPlayer && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={closeModal}
        >
          <div 
            className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-1">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {selectedPlayer.first_name} {selectedPlayer.last_name}
                </h3>
                <p className="text-gray-500 text-xs">
                  {formatNationality(selectedPlayer.nationality, selectedPlayer.state)}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            <p className="text-gray-400 text-sm">
              {selectedPlayer.position} • {selectedPlayer.overall} OVR
            </p>
            
            {/* Trait display */}
            {selectedPlayer.visible_trait && (
              <p className="text-gray-400 text-sm">
                Trait: {getTraitDisplay(selectedPlayer.visible_trait)}
              </p>
            )}

            {/* Player Stats */}
            <div className="grid grid-cols-4 gap-2 my-4 text-sm">
              {[
                { key: 'speed', label: 'SPD' },
                { key: 'strength', label: 'STR' },
                { key: 'power', label: 'PWR' },
                { key: 'passing', label: 'PAS' },
                { key: 'stamina', label: 'STA' },
                { key: 'tackling', label: 'TAK' },
                { key: 'kicking', label: 'KCK' },
              ].map(({ key, label }) => {
                const value = selectedPlayer[key as StatKey];
                return (
                  <div key={key} className="bg-gray-700 rounded p-2 text-center">
                    <p className="text-gray-400 text-xs">{label}</p>
                    <p className={`font-bold ${getStatTierColor(value)}`}>
                      {getStatTier(value, true)}
                    </p>
                  </div>
                );
              })}
              <div className="bg-gray-700 rounded p-2 text-center">
                <p className="text-gray-400 text-xs">FIT</p>
                <p className={`font-bold ${getFitnessColor(selectedPlayer.fatigue)}`}>
                  {getFitness(selectedPlayer.fatigue)}%
                </p>
              </div>
            </div>

            {/* Training Options */}
            <h4 className="text-white font-bold mb-2">Select Training</h4>
            
            {/* Rest Option */}
            <button
              onClick={() => handleTrainingChange(selectedPlayer.id, 'Rest')}
              className={`w-full mb-2 p-3 rounded-lg text-left transition flex items-center gap-3 ${
                selectedPlayer.current_training === 'Rest'
                  ? 'bg-green-600/30 border-2 border-green-500'
                  : 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent'
              }`}
            >
              <span className="text-2xl">😴</span>
              <div className="flex-1">
                <p className="text-white font-medium">Rest</p>
                <p className="text-gray-400 text-xs">Recover fitness, reduce fatigue</p>
              </div>
              {selectedPlayer.current_training === 'Rest' && (
                <span className="text-green-400">✓</span>
              )}
            </button>

            {/* Stat Training */}
            <p className="text-gray-500 text-xs mt-4 mb-2">STAT TRAINING</p>
            <div className="grid grid-cols-1 gap-2">
              {STAT_TRAINING.map(stat => {
                const statValue = getPlayerStat(selectedPlayer, stat);
                const tierWord = getStatTier(statValue);
                const tierColor = getStatTierColor(statValue);
                const isSelected = selectedPlayer.current_training === stat;
                
                return (
                  <button
                    key={stat}
                    onClick={() => handleTrainingChange(selectedPlayer.id, stat)}
                    className={`p-3 rounded-lg text-left transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-green-600/30 border-2 border-green-500'
                        : 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTrainingIcon(stat)}</span>
                      <div>
                        <p className="text-white font-medium">{stat}</p>
                        <p className="text-gray-400 text-xs">
                          Current: <span className={tierColor}>{tierWord}</span>
                        </p>
                      </div>
                    </div>
                    {isSelected && <span className="text-green-400">✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Position Training */}
            <p className="text-gray-500 text-xs mt-4 mb-2">POSITION TRAINING</p>
            <div className="grid grid-cols-1 gap-2">
              {POSITIONS.map(pos => {
                const isPrimary = pos === selectedPlayer.position;
                const isSecondary = pos === selectedPlayer.secondary_position;
                const isCurrentTraining = selectedPlayer.current_training === pos;
                
                return (
                  <button
                    key={pos}
                    onClick={() => handleTrainingChange(selectedPlayer.id, pos)}
                    className={`p-3 rounded-lg text-left transition flex items-center justify-between ${
                      isCurrentTraining
                        ? 'bg-green-600/30 border-2 border-green-500'
                        : isPrimary 
                          ? 'bg-green-900/30 hover:bg-green-900/50 border border-green-600' 
                          : isSecondary
                            ? 'bg-yellow-900/30 hover:bg-yellow-900/50 border border-yellow-600'
                            : 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold ${POSITION_COLORS[pos] || 'bg-gray-600'}`}>
                        {pos.substring(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-white font-medium">{pos}</p>
                        <p className="text-gray-400 text-xs">
                          {isPrimary ? 'Primary position — master skills' : 
                           isSecondary ? 'Secondary position — improve proficiency' :
                           'Learn as new secondary position'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPrimary && <span className="text-green-400 text-xs">PRIMARY</span>}
                      {isSecondary && <span className="text-yellow-400 text-xs">SECONDARY</span>}
                      {isCurrentTraining && <span className="text-green-400">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Clear Training */}
            <button
              onClick={() => handleTrainingChange(selectedPlayer.id, null)}
              className="w-full mt-4 p-3 bg-red-900/30 hover:bg-red-900/50 border border-red-600 rounded-lg text-red-400 transition"
            >
              Clear Training
            </button>

            {/* Close */}
            <button
              onClick={closeModal}
              className="w-full mt-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}