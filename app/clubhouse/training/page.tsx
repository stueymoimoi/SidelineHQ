'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
}

// Updated for 7 stats
const STAT_TRAINING = ['Speed', 'Strength', 'Power', 'Passing', 'Stamina', 'Tackling', 'Kicking'];
const POSITIONS = ['Fullback', 'Winger', 'Centre', 'Five-Eighth', 'Halfback', 'Prop', 'Hooker', 'Second Row', 'Lock'];

// Progress stages in order
const PROGRESS_STAGES = ['NONE', 'POOR', 'FAIR', 'GOOD', 'VERY GOOD', 'EXCELLENT'];

const getPositionColor = (position: string) => {
  const colors: Record<string, string> = {
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
  return colors[position] || 'bg-gray-600';
};

const getProgressColor = (progress: string | null) => {
  const colors: Record<string, string> = {
    'NONE': 'bg-gray-600',
    'POOR': 'bg-red-600',
    'FAIR': 'bg-orange-500',
    'GOOD': 'bg-yellow-500',
    'VERY GOOD': 'bg-lime-500',
    'EXCELLENT': 'bg-green-500',
  };
  return colors[progress || 'NONE'] || 'bg-gray-600';
};

const getProgressWidth = (progress: string | null) => {
  const widths: Record<string, string> = {
    'NONE': 'w-0',
    'POOR': 'w-1/6',
    'FAIR': 'w-2/6',
    'GOOD': 'w-3/6',
    'VERY GOOD': 'w-4/6',
    'EXCELLENT': 'w-full',
  };
  return widths[progress || 'NONE'] || 'w-0';
};

const getFatigueColor = (fatigue: number) => {
  if (fatigue >= 60) return 'text-red-500';
  if (fatigue >= 40) return 'text-yellow-500';
  return 'text-green-500';
};

// Updated icons for 7 stats
const getTrainingIcon = (training: string | null) => {
  if (!training) return '➖';
  if (training === 'Rest') return '😴';
  if (training === 'Speed') return '⚡';
  if (training === 'Strength') return '💪';
  if (training === 'Power') return '💥';
  if (training === 'Passing') return '🎯';
  if (training === 'Stamina') return '🫁';
  if (training === 'Tackling') return '🛡️';
  if (training === 'Kicking') return '🦶';
  return '📍';
};

const getTrainingDescription = (training: string | null, player: Player) => {
  if (!training) return 'No training assigned';
  if (training === 'Rest') return 'Recovering fitness';
  if (STAT_TRAINING.includes(training)) return `Training ${training.toLowerCase()}`;
  
  if (training === player.position) {
    return `Mastering ${training} skills`;
  } else if (training === player.secondary_position) {
    return `Improving ${training} (secondary)`;
  } else {
    return `Learning ${training} position`;
  }
};

export default function TrainingPage() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveQueue, setSaveQueue] = useState<{playerId: string, training: string | null, resetProgress: boolean}[]>([]);
  const router = useRouter();

  // Process save queue
  const processSaveQueue = useCallback(async () => {
    if (saveQueue.length === 0) return;
    
    setSaveStatus('saving');
    
    try {
      for (const item of saveQueue) {
        const updateData: Record<string, unknown> = {
          current_training: item.training
        };
        
        if (item.resetProgress) {
          updateData.training_progress = 'NONE';
        }
        
        await supabase
          .from('players')
          .update(updateData)
          .eq('id', item.playerId)
          .eq('team_id', team?.id);
      }
      
      setSaveQueue([]);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Error saving:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [saveQueue]);

  // Debounced save
  useEffect(() => {
    if (saveQueue.length === 0) return;
    
    const timeout = setTimeout(() => {
      processSaveQueue();
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [saveQueue, processSaveQueue]);

  useEffect(() => {
    loadData();
  }, []);

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

      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', coach.team_id)
        .single();

      setTeam(teamData);

      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', coach.team_id)
        .order('overall', { ascending: false });

      setPlayers(playersData || []);

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTrainingChange = (playerId: string, training: string | null) => {
    // Find current training to check if it changed
    const player = players.find(p => p.id === playerId);
    const currentTraining = player?.current_training;
    const trainingChanged = currentTraining !== training;
    
    // Update local state immediately
    setPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        return {
          ...p,
          current_training: training,
          training_progress: trainingChanged ? 'NONE' : p.training_progress
        };
      }
      return p;
    }));
    
    // Add to save queue
    setSaveQueue(prev => {
      // Remove any existing entry for this player
      const filtered = prev.filter(item => item.playerId !== playerId);
      return [...filtered, { playerId, training, resetProgress: trainingChanged }];
    });
    
    setSelectedPlayer(null);
  };

  const setAllTraining = (training: string) => {
    // Update all players locally
    const updates: {playerId: string, training: string | null, resetProgress: boolean}[] = [];
    
    setPlayers(prev => prev.map(p => {
      const trainingChanged = p.current_training !== training;
      updates.push({ playerId: p.id, training, resetProgress: trainingChanged });
      return {
        ...p,
        current_training: training,
        training_progress: trainingChanged ? 'NONE' : p.training_progress
      };
    }));
    
    // Add all to save queue
    setSaveQueue(updates);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div 
        className="p-6"
        style={{
          background: `linear-gradient(135deg, ${team?.primary_color} 0%, ${team?.secondary_color} 100%)`
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
            
            {/* Auto-save indicator */}
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
                <div className={`w-3 h-3 rounded ${getProgressColor(stage)}`}></div>
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
            return (
              <div
                key={player.id}
                onClick={() => setSelectedPlayer(player)}
                className="bg-gray-800 rounded-lg p-4 cursor-pointer transition border-2 border-transparent hover:border-green-500"
              >
                {/* Player Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-gray-400 text-xs">{player.first_name}</p>
                    <p className="text-white font-bold">{player.last_name}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold text-white ${getPositionColor(player.position)}`}>
                      {player.position}
                    </span>
                    {player.secondary_position && (
                      <p className="text-gray-500 text-xs mt-1">{player.secondary_position}</p>
                    )}
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-2 mb-3 text-xs">
                  <span className="text-white font-bold">{player.overall} OVR</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">Age {player.age}</span>
                  <span className="text-gray-500">•</span>
                  <span className={getFatigueColor(player.fatigue)}>{player.fatigue}% fatigue</span>
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
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(player.training_progress)} ${getProgressWidth(player.training_progress)}`}
                      ></div>
                    </div>
                  )}
                  {player.current_training && player.current_training !== 'Rest' && (
                    <p className="text-gray-500 text-xs mt-1 text-right">
                      {player.training_progress || 'NONE'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Training Selection Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-1">
              {selectedPlayer.first_name} {selectedPlayer.last_name}
            </h3>
            <p className="text-gray-400 mb-4">
              {selectedPlayer.position} • {selectedPlayer.overall} OVR
            </p>

            {/* Player Stats - Updated for 7 stats */}
            <div className="grid grid-cols-4 gap-2 mb-4 text-sm">
              <div className="bg-gray-700 rounded p-2 text-center">
                <p className="text-gray-400 text-xs">SPD</p>
                <p className="text-white font-bold">{selectedPlayer.speed}</p>
              </div>
              <div className="bg-gray-700 rounded p-2 text-center">
                <p className="text-gray-400 text-xs">STR</p>
                <p className="text-white font-bold">{selectedPlayer.strength}</p>
              </div>
              <div className="bg-gray-700 rounded p-2 text-center">
                <p className="text-gray-400 text-xs">PWR</p>
                <p className="text-white font-bold">{selectedPlayer.power}</p>
              </div>
              <div className="bg-gray-700 rounded p-2 text-center">
                <p className="text-gray-400 text-xs">PAS</p>
                <p className="text-white font-bold">{selectedPlayer.passing}</p>
              </div>
              <div className="bg-gray-700 rounded p-2 text-center">
                <p className="text-gray-400 text-xs">STA</p>
                <p className="text-white font-bold">{selectedPlayer.stamina}</p>
              </div>
              <div className="bg-gray-700 rounded p-2 text-center">
                <p className="text-gray-400 text-xs">TAK</p>
                <p className="text-white font-bold">{selectedPlayer.tackling}</p>
              </div>
              <div className="bg-gray-700 rounded p-2 text-center">
                <p className="text-gray-400 text-xs">KCK</p>
                <p className="text-white font-bold">{selectedPlayer.kicking}</p>
              </div>
              <div className="bg-gray-700 rounded p-2 text-center">
                <p className="text-gray-400 text-xs">FAT</p>
                <p className={`font-bold ${getFatigueColor(selectedPlayer.fatigue)}`}>{selectedPlayer.fatigue}%</p>
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
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <span className="text-2xl">😴</span>
              <div>
                <p className="text-white font-medium">Rest</p>
                <p className="text-gray-400 text-xs">Reduce fatigue, recover fitness</p>
              </div>
              {selectedPlayer.current_training === 'Rest' && (
                <span className="ml-auto text-green-400">✓</span>
              )}
            </button>

            {/* Stat Training - Updated for 7 stats */}
            <p className="text-gray-500 text-xs mt-4 mb-2">STAT TRAINING</p>
            <div className="grid grid-cols-1 gap-2">
              {STAT_TRAINING.map(stat => {
                const statKey = stat.toLowerCase() as keyof Player;
                const statValue = selectedPlayer[statKey];
                
                return (
                  <button
                    key={stat}
                    onClick={() => handleTrainingChange(selectedPlayer.id, stat)}
                    className={`p-3 rounded-lg text-left transition flex items-center justify-between ${
                      selectedPlayer.current_training === stat
                        ? 'bg-green-600/30 border-2 border-green-500'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTrainingIcon(stat)}</span>
                      <div>
                        <p className="text-white font-medium">{stat}</p>
                        <p className="text-gray-400 text-xs">Current: {statValue}</p>
                      </div>
                    </div>
                    {selectedPlayer.current_training === stat && (
                      <span className="text-green-400">✓</span>
                    )}
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
                            : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold ${getPositionColor(pos)}`}>
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
              onClick={() => setSelectedPlayer(null)}
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