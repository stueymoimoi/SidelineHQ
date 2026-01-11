'use client';

import { useState, useEffect } from 'react';
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
  skill: number;
  stamina: number;
  defense: number;
  kicking: number;
  fatigue: number;
  current_training: string | null;
  training_progress: string | null;
}

// All training options
const STAT_TRAINING = ['Speed', 'Strength', 'Skill', 'Stamina', 'Defense'];
const POSITIONS = ['Fullback', 'Winger', 'Centre', 'Five-Eighth', 'Halfback', 'Prop', 'Hooker', 'Second Row', 'Lock'];
const ALL_TRAINING_OPTIONS = [...STAT_TRAINING, 'Rest', ...POSITIONS];

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
    'POOR': 'w-1/5',
    'FAIR': 'w-2/5',
    'GOOD': 'w-3/5',
    'VERY GOOD': 'w-4/5',
    'EXCELLENT': 'w-full',
  };
  return widths[progress || 'NONE'] || 'w-0';
};

const getFatigueColor = (fatigue: number) => {
  if (fatigue >= 60) return 'text-red-500';
  if (fatigue >= 40) return 'text-yellow-500';
  return 'text-green-500';
};

const getTrainingIcon = (training: string | null) => {
  if (!training) return '➖';
  if (training === 'Rest') return '😴';
  if (training === 'Speed') return '⚡';
  if (training === 'Strength') return '💪';
  if (training === 'Skill') return '🎯';
  if (training === 'Stamina') return '🫀';
  if (training === 'Defense') return '🛡️';
  // Position training
  return '📍';
};

const getTrainingDescription = (training: string | null, player: Player) => {
  if (!training) return 'No training assigned';
  if (training === 'Rest') return 'Recovering fitness';
  if (STAT_TRAINING.includes(training)) return `Training ${training.toLowerCase()}`;
  
  // Position training
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
  const [saving, setSaving] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, string | null>>({});
  const router = useRouter();

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
    setPendingChanges(prev => ({
      ...prev,
      [playerId]: training
    }));
    
    // Update local state for immediate UI feedback
    setPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        // If changing training type, reset progress to NONE
        const currentTraining = pendingChanges[playerId] !== undefined 
          ? pendingChanges[playerId] 
          : p.current_training;
        const isNewTraining = currentTraining !== training;
        
        return {
          ...p,
          current_training: training,
          training_progress: isNewTraining ? 'NONE' : p.training_progress
        };
      }
      return p;
    }));
    
    setSelectedPlayer(null);
  };

  const saveChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) return;
    
    setSaving(true);
    try {
      // Get original player data to check if training changed
      const { data: originalPlayers } = await supabase
        .from('players')
        .select('id, current_training')
        .eq('team_id', team?.id);
      
      const originalTrainingMap: Record<string, string | null> = {};
      originalPlayers?.forEach(p => {
        originalTrainingMap[p.id] = p.current_training;
      });

      // Update each player
      for (const [playerId, newTraining] of Object.entries(pendingChanges)) {
        const originalTraining = originalTrainingMap[playerId];
        const trainingChanged = originalTraining !== newTraining;
        
        const updateData: Record<string, unknown> = {
          current_training: newTraining
        };
        
        // Reset progress if training type changed
        if (trainingChanged) {
          updateData.training_progress = 'NONE';
        }
        
        await supabase
          .from('players')
          .update(updateData)
          .eq('id', playerId);
      }
      
      setPendingChanges({});
      
      // Reload to get fresh data
      await loadData();
      
    } catch (err) {
      console.error('Error saving:', err);
    } finally {
      setSaving(false);
    }
  };

  const setAllTraining = (training: string) => {
    const newChanges: Record<string, string | null> = {};
    players.forEach(p => {
      newChanges[p.id] = training;
    });
    setPendingChanges(newChanges);
    
    // Update local state
    setPlayers(prev => prev.map(p => ({
      ...p,
      current_training: training,
      training_progress: p.current_training !== training ? 'NONE' : p.training_progress
    })));
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

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
          <Link href="/clubhouse" className="text-white/70 hover:text-white mb-2 inline-block">
            ← Back to Clubhouse
          </Link>
          <h1 className="text-3xl font-bold text-white">🏋️ Training</h1>
          <p className="text-white/80 mt-1">Assign training to develop your players</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        
        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-white font-bold mb-3">Quick Assign</h2>
          <div className="flex flex-wrap gap-2">
            {['Rest', ...STAT_TRAINING].map(training => (
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
            const displayTraining = pendingChanges[player.id] !== undefined 
              ? pendingChanges[player.id] 
              : player.current_training;
            const hasChange = pendingChanges[player.id] !== undefined;
            
            return (
              <div
                key={player.id}
                onClick={() => setSelectedPlayer(player)}
                className={`bg-gray-800 rounded-lg p-4 cursor-pointer transition border-2 ${
                  hasChange 
                    ? 'border-yellow-500 bg-gray-750' 
                    : 'border-transparent hover:border-green-500'
                }`}
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
                    <span className="text-2xl">{getTrainingIcon(displayTraining)}</span>
                    <span className="text-white font-medium">
                      {displayTraining || 'None'}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs mb-2">
                    {getTrainingDescription(displayTraining, player)}
                  </p>
                  
                  {/* Progress Bar */}
                  {displayTraining && displayTraining !== 'Rest' && (
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(player.training_progress)} ${getProgressWidth(player.training_progress)}`}
                      ></div>
                    </div>
                  )}
                  {displayTraining && displayTraining !== 'Rest' && (
                    <p className="text-gray-500 text-xs mt-1 text-right">
                      {player.training_progress || 'NONE'}
                    </p>
                  )}
                </div>

                {hasChange && (
                  <p className="text-yellow-500 text-xs mt-2 text-center">Unsaved changes</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Save Button */}
        {hasChanges && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2">
            <button
              onClick={saveChanges}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Saving...
                </>
              ) : (
                <>
                  💾 Save Training ({Object.keys(pendingChanges).length} changes)
                </>
              )}
            </button>
          </div>
        )}
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

            {/* Player Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
              <div className="bg-gray-700 rounded p-2 text-center">
                <p className="text-gray-400 text-xs">SPD</p>
                <p className="text-white font-bold">{selectedPlayer.speed}</p>
              </div>
              <div className="bg-gray-700 rounded p-2 text-center">
                <p className="text-gray-400 text-xs">STR</p>
                <p className="text-white font-bold">{selectedPlayer.strength}</p>
              </div>
              <div className="bg-gray-700 rounded p-2 text-center">
                <p className="text-gray-400 text-xs">SKL</p>
                <p className="text-white font-bold">{selectedPlayer.skill}</p>
              </div>
              <div className="bg-gray-700 rounded p-2 text-center">
                <p className="text-gray-400 text-xs">STA</p>
                <p className="text-white font-bold">{selectedPlayer.stamina}</p>
              </div>
              <div className="bg-gray-700 rounded p-2 text-center">
                <p className="text-gray-400 text-xs">DEF</p>
                <p className="text-white font-bold">{selectedPlayer.defense}</p>
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
              className="w-full mb-2 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-left transition flex items-center gap-3"
            >
              <span className="text-2xl">😴</span>
              <div>
                <p className="text-white font-medium">Rest</p>
                <p className="text-gray-400 text-xs">Reduce fatigue, recover fitness</p>
              </div>
            </button>

            {/* Stat Training */}
            <p className="text-gray-500 text-xs mt-4 mb-2">STAT TRAINING</p>
            <div className="grid grid-cols-1 gap-2">
              {STAT_TRAINING.map(stat => (
                <button
                  key={stat}
                  onClick={() => handleTrainingChange(selectedPlayer.id, stat)}
                  className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-left transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getTrainingIcon(stat)}</span>
                    <div>
                      <p className="text-white font-medium">{stat}</p>
                      <p className="text-gray-400 text-xs">Current: {selectedPlayer[stat.toLowerCase() as keyof Player]}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Position Training */}
            <p className="text-gray-500 text-xs mt-4 mb-2">POSITION TRAINING</p>
            <div className="grid grid-cols-1 gap-2">
              {POSITIONS.map(pos => {
                const isPrimary = pos === selectedPlayer.position;
                const isSecondary = pos === selectedPlayer.secondary_position;
                
                return (
                  <button
                    key={pos}
                    onClick={() => handleTrainingChange(selectedPlayer.id, pos)}
                    className={`p-3 rounded-lg text-left transition flex items-center justify-between ${
                      isPrimary 
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
                    {isPrimary && <span className="text-green-400 text-xs">PRIMARY</span>}
                    {isSecondary && <span className="text-yellow-400 text-xs">SECONDARY</span>}
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
