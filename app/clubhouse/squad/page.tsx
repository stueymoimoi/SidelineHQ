'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  age: number;
  overall: number;
  speed: number;
  strength: number;
  skill: number;
  stamina: number;
  defense: number;
  kicking: number;
  fatigue: number;
  potential: number;
  nationality: string;
  state: string | null;
  current_training: string | null;
  training_progress: string | null;
}

interface Team {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Tier names (index 0 = unused, 1-8 = tiers)
const TIER_NAMES: Record<number, string> = {
  1: 'None',
  2: 'Poor',
  3: 'Fair',
  4: 'Good',
  5: 'Very Good',
  6: 'Excellent',
  7: 'Elite',
  8: 'World Class'
};

// Potential labels
const POTENTIAL_LABELS: Record<number, string> = {
  1: 'POOR',
  2: 'LOW',
  3: 'AVG',
  4: 'HIGH',
  5: 'ELITE'
};

// Position stat importance
const POSITION_STATS: Record<string, { primary: string[], secondary: string[], minor: string[], negligible: string[] }> = {
  'Prop': {
    primary: ['strength', 'defense'],
    secondary: ['stamina', 'skill'],
    minor: ['speed'],
    negligible: ['kicking']
  },
  'Hooker': {
    primary: ['skill', 'stamina'],
    secondary: ['defense', 'speed'],
    minor: ['strength'],
    negligible: ['kicking']
  },
  'Second Row': {
    primary: ['strength', 'defense'],
    secondary: ['stamina', 'skill'],
    minor: ['speed'],
    negligible: ['kicking']
  },
  'Lock': {
    primary: ['defense', 'stamina'],
    secondary: ['strength', 'skill'],
    minor: ['speed'],
    negligible: ['kicking']
  },
  'Halfback': {
    primary: ['skill', 'kicking'],
    secondary: ['speed', 'stamina'],
    minor: ['defense'],
    negligible: ['strength']
  },
  'Five-Eighth': {
    primary: ['skill', 'kicking'],
    secondary: ['speed', 'defense'],
    minor: ['stamina'],
    negligible: ['strength']
  },
  'Centre': {
    primary: ['defense', 'skill'],
    secondary: ['speed', 'strength'],
    minor: ['stamina'],
    negligible: ['kicking']
  },
  'Winger': {
    primary: ['speed', 'skill'],
    secondary: ['stamina', 'defense'],
    minor: ['strength'],
    negligible: ['kicking']
  },
  'Fullback': {
    primary: ['speed', 'skill'],
    secondary: ['kicking', 'defense'],
    minor: ['stamina'],
    negligible: ['strength']
  }
};

export default function SquadPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  
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

  // Get OVR color based on new 12-48 scale
  const getOvrColor = (ovr: number) => {
    if (ovr >= 41) return 'bg-purple-500'; // Elite/Rep
    if (ovr >= 35) return 'bg-green-500';  // Star
    if (ovr >= 29) return 'bg-green-600';  // Quality
    if (ovr >= 23) return 'bg-yellow-500'; // Solid
    if (ovr >= 17) return 'bg-orange-500'; // Fringe
    return 'bg-red-500';                   // Youth/Dev
  };

  // Get OVR stars (1-5) based on OVR value
  const getOvrStars = (ovr: number) => {
    if (ovr >= 39) return '⭐⭐⭐⭐⭐';
    if (ovr >= 33) return '⭐⭐⭐⭐';
    if (ovr >= 27) return '⭐⭐⭐';
    if (ovr >= 21) return '⭐⭐';
    return '⭐';
  };

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

  const getFatigueColor = (fatigue: number) => {
    if (fatigue >= 60) return 'text-red-500';
    if (fatigue >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  // Get potential color
  const getPotentialColor = (potential: number) => {
    if (potential >= 5) return 'text-purple-400';
    if (potential >= 4) return 'text-green-400';
    if (potential >= 3) return 'text-yellow-400';
    if (potential >= 2) return 'text-orange-400';
    return 'text-red-400';
  };

  // Get tier name from value
  const getTierName = (value: number) => {
    return TIER_NAMES[value] || 'None';
  };

  // Get tier color
  const getTierColor = (value: number) => {
    if (value >= 8) return 'text-purple-400';  // World Class
    if (value >= 7) return 'text-yellow-400';  // Elite
    if (value >= 6) return 'text-green-400';   // Excellent
    if (value >= 5) return 'text-blue-400';    // Very Good
    if (value >= 4) return 'text-white';       // Good
    if (value >= 3) return 'text-gray-400';    // Fair
    if (value >= 2) return 'text-orange-400';  // Poor
    return 'text-red-400';                     // None
  };

  // Get stat importance for position
  const getStatImportance = (position: string, stat: string): 'primary' | 'secondary' | 'minor' | 'negligible' => {
    const posStats = POSITION_STATS[position];
    if (!posStats) return 'secondary';
    
    if (posStats.primary.includes(stat)) return 'primary';
    if (posStats.secondary.includes(stat)) return 'secondary';
    if (posStats.minor.includes(stat)) return 'minor';
    return 'negligible';
  };

  // Get importance indicator
  const getImportanceIndicator = (importance: 'primary' | 'secondary' | 'minor' | 'negligible') => {
    switch (importance) {
      case 'primary': return { icon: '⭐', color: 'text-yellow-400', opacity: 'opacity-100' };
      case 'secondary': return { icon: '🔵', color: 'text-blue-400', opacity: 'opacity-100' };
      case 'minor': return { icon: '⚪', color: 'text-gray-400', opacity: 'opacity-70' };
      case 'negligible': return { icon: '❌', color: 'text-gray-600', opacity: 'opacity-50' };
    }
  };

  // Render stat bar for modal
  const renderStatBar = (
    label: string, 
    statKey: string, 
    value: number, 
    position: string
  ) => {
    const importance = getStatImportance(position, statKey);
    const indicator = getImportanceIndicator(importance);
    const tierName = getTierName(value);
    const tierColor = getTierColor(value);
    const barWidth = (value / 8) * 100; // 8 is max tier
    
    const barColors: Record<string, string> = {
      speed: 'bg-blue-500',
      strength: 'bg-red-500',
      skill: 'bg-yellow-500',
      stamina: 'bg-green-500',
      defense: 'bg-purple-500',
      kicking: 'bg-orange-500'
    };

    return (
      <div className={indicator.opacity}>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400 flex items-center gap-1">
            <span className="text-xs">{indicator.icon}</span>
            {label}
          </span>
          <span className={tierColor}>{tierName}</span>
        </div>
        <div className="bg-gray-700 rounded-full h-2">
          <div 
            className={`${barColors[statKey]} h-2 rounded-full transition-all`} 
            style={{ width: `${barWidth}%` }}
          ></div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading squad...</div>
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
          <h1 className="text-3xl font-bold text-white">👥 Squad</h1>
          <p className="text-white/80">{team?.name} • {players.length} Players</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* All Players */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((player) => (
            <div
              key={player.id}
              onClick={() => setSelectedPlayer(player)}
              className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition border-2 border-transparent hover:border-green-500"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  {/* First Name - Bigger */}
                  <p className="text-gray-300 text-base font-semibold">{player.first_name}</p>
                  {/* Last Name - Biggest */}
                  <p className="text-white font-bold text-xl">{player.last_name}</p>
                  {/* Nationality + State */}
                  <p className="text-gray-500 text-xs">
                    {player.nationality === 'AUS' && player.state 
                      ? `${player.nationality}, ${player.state}` 
                      : player.nationality}
                  </p>
                  {/* Position Badge */}
                  <div className="flex gap-2 mt-2">
                    <span className={`${getPositionColor(player.position)} text-white text-xs px-2 py-1 rounded`}>
                      {player.position}
                    </span>
                  </div>
                </div>
                {/* OVR Badge + Stars */}
                <div className="text-right">
                  <span className={`${getOvrColor(player.overall)} text-white px-3 py-1 rounded-lg font-bold text-lg inline-block`}>
                    {player.overall}
                  </span>
                  <p className="text-yellow-500 text-sm mt-1">{getOvrStars(player.overall)}</p>
                </div>
              </div>
              
              {/* Bottom Row: Age, Potential, Fatigue */}
              <div className="flex justify-between text-sm text-gray-400 mt-3 pt-2 border-t border-gray-700">
                <span>Age: {player.age}</span>
                <span className={getPotentialColor(player.potential)}>
                  Potential: {POTENTIAL_LABELS[player.potential] || 'AVG'}
                </span>
                <span className={getFatigueColor(player.fatigue || 0)}>
                  {player.fatigue || 0}% Fatigue
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-300 text-lg font-semibold">{selectedPlayer.first_name}</p>
                <h2 className="text-2xl font-bold text-white">{selectedPlayer.last_name}</h2>
                <p className="text-gray-500 text-sm">
                  {selectedPlayer.nationality === 'AUS' && selectedPlayer.state 
                    ? `${selectedPlayer.nationality}, ${selectedPlayer.state}` 
                    : selectedPlayer.nationality}
                </p>
                <div className="flex gap-2 mt-2">
                  <span className={`${getPositionColor(selectedPlayer.position)} text-white text-sm px-3 py-1 rounded`}>
                    {selectedPlayer.position}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className={`${getOvrColor(selectedPlayer.overall)} text-white px-4 py-2 rounded-lg font-bold text-2xl inline-block`}>
                  {selectedPlayer.overall}
                </span>
                <p className="text-yellow-500 text-sm mt-1">{getOvrStars(selectedPlayer.overall)}</p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-700 rounded p-3 text-center">
                <p className="text-gray-400 text-xs">Age</p>
                <p className="text-white text-xl font-bold">{selectedPlayer.age}</p>
              </div>
              <div className="bg-gray-700 rounded p-3 text-center">
                <p className="text-gray-400 text-xs">Potential</p>
                <p className={`text-lg font-bold ${getPotentialColor(selectedPlayer.potential)}`}>
                  {POTENTIAL_LABELS[selectedPlayer.potential] || 'AVG'}
                </p>
              </div>
              <div className="bg-gray-700 rounded p-3 text-center">
                <p className="text-gray-400 text-xs">Fatigue</p>
                <p className={`text-xl font-bold ${getFatigueColor(selectedPlayer.fatigue || 0)}`}>
                  {selectedPlayer.fatigue || 0}%
                </p>
              </div>
            </div>

            {/* Stats Legend */}
            <div className="flex gap-4 text-xs text-gray-500 mb-2 justify-center">
              <span>⭐ Primary</span>
              <span>🔵 Secondary</span>
              <span>⚪ Minor</span>
              <span>❌ Negligible</span>
            </div>

            {/* Stats */}
            <div className="space-y-3 mb-4">
              {renderStatBar('Speed', 'speed', selectedPlayer.speed, selectedPlayer.position)}
              {renderStatBar('Strength', 'strength', selectedPlayer.strength, selectedPlayer.position)}
              {renderStatBar('Skill', 'skill', selectedPlayer.skill, selectedPlayer.position)}
              {renderStatBar('Stamina', 'stamina', selectedPlayer.stamina, selectedPlayer.position)}
              {renderStatBar('Defense', 'defense', selectedPlayer.defense, selectedPlayer.position)}
              {renderStatBar('Kicking', 'kicking', selectedPlayer.kicking, selectedPlayer.position)}
            </div>

            {/* Training Status */}
            {selectedPlayer.current_training && (
              <div className="bg-gray-700 rounded p-3 mb-4">
                <p className="text-gray-400 text-sm">Current Training</p>
                <p className="text-white font-semibold">{selectedPlayer.current_training}</p>
                <p className="text-yellow-500 text-sm">{selectedPlayer.training_progress || 'None'}</p>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setSelectedPlayer(null)}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
