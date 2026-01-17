'use client';

import { useState, useEffect } from 'react';
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

interface InjuryType {
  name: string;
  body_part: string;
  severity: 'minor' | 'moderate' | 'major';
}

interface PlayerInjury {
  id: string;
  player_id: string;
  round_injured: number;
  rounds_out: number;
  round_return: number;
  injury_context: 'match' | 'origin';
  is_active: boolean;
  created_at: string;
  injury_types: InjuryType;
  players: {
    id: string;
    first_name: string;
    last_name: string;
    position: string;
    overall: number;
    age: number;
  };
}

interface Team {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
}

interface GameState {
  current_round: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'minor': return { bg: 'bg-yellow-600/20', border: 'border-yellow-500', text: 'text-yellow-400', badge: 'bg-yellow-600' };
    case 'moderate': return { bg: 'bg-orange-600/20', border: 'border-orange-500', text: 'text-orange-400', badge: 'bg-orange-600' };
    case 'major': return { bg: 'bg-red-600/20', border: 'border-red-500', text: 'text-red-400', badge: 'bg-red-600' };
    default: return { bg: 'bg-gray-600/20', border: 'border-gray-500', text: 'text-gray-400', badge: 'bg-gray-600' };
  }
};

const getContextIcon = (context: string) => {
  return context === 'origin' ? '🏉' : '🏟️';
};

const getBodyPartIcon = (bodyPart: string) => {
  const icons: Record<string, string> = {
    'Head': '🧠',
    'Neck': '🦴',
    'Shoulder': '💪',
    'Arm': '💪',
    'Hand': '✋',
    'Torso': '🫁',
    'Back': '🔙',
    'Groin': '🦵',
    'Leg': '🦵',
    'Knee': '🦵',
    'Ankle': '🦶',
  };
  return icons[bodyPart] || '🏥';
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function MedicalRoomPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [activeInjuries, setActiveInjuries] = useState<PlayerInjury[]>([]);
  const [injuryHistory, setInjuryHistory] = useState<PlayerInjury[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  
  const router = useRouter();

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

        // Fetch all data in parallel
        const [teamResult, activeResult, historyResult, gameStateResult] = await Promise.all([
          supabase
            .from('teams')
            .select('id, name, primary_color, secondary_color')
            .eq('id', coach.team_id)
            .single(),
          supabase
            .from('player_injuries')
            .select('*, injury_types(name, body_part, severity), players(id, first_name, last_name, position, overall, age)')
            .eq('team_id', coach.team_id)
            .eq('is_active', true)
            .order('round_return', { ascending: true }),
          supabase
            .from('player_injuries')
            .select('*, injury_types(name, body_part, severity), players(id, first_name, last_name, position, overall, age)')
            .eq('team_id', coach.team_id)
            .eq('is_active', false)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('game_state')
            .select('current_round')
            .single(),
        ]);

        setTeam(teamResult.data);
        setActiveInjuries(activeResult.data || []);
        setInjuryHistory(historyResult.data || []);
        setCurrentRound(gameStateResult.data?.current_round || 1);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading medical room...</div>
      </div>
    );
  }

  const minorCount = activeInjuries.filter(i => i.injury_types?.severity === 'minor').length;
  const moderateCount = activeInjuries.filter(i => i.injury_types?.severity === 'moderate').length;
  const majorCount = activeInjuries.filter(i => i.injury_types?.severity === 'major').length;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div 
        className="p-6"
        style={{
          background: `linear-gradient(135deg, ${team?.primary_color || '#1f2937'} 0%, ${team?.secondary_color || '#111827'} 100%)`
        }}
      >
        <div className="max-w-4xl mx-auto">
          <Link href="/clubhouse" className="text-white/70 hover:text-white mb-2 inline-block">
            ← Back to Clubhouse
          </Link>
          <h1 className="text-3xl font-bold text-white">🏥 Medical Room</h1>
          <p className="text-white/80">{team?.name} • Injury Report</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-sm">Total Injured</p>
            <p className="text-3xl font-bold text-white">{activeInjuries.length}</p>
          </div>
          <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-xl p-4 text-center">
            <p className="text-yellow-400 text-sm">Minor</p>
            <p className="text-3xl font-bold text-yellow-400">{minorCount}</p>
          </div>
          <div className="bg-orange-900/30 border border-orange-600/50 rounded-xl p-4 text-center">
            <p className="text-orange-400 text-sm">Moderate</p>
            <p className="text-3xl font-bold text-orange-400">{moderateCount}</p>
          </div>
          <div className="bg-red-900/30 border border-red-600/50 rounded-xl p-4 text-center">
            <p className="text-red-400 text-sm">Major</p>
            <p className="text-3xl font-bold text-red-400">{majorCount}</p>
          </div>
        </div>

        {/* Current Round Info */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6 text-center">
          <p className="text-gray-400 text-sm">Current Round</p>
          <p className="text-2xl font-bold text-white">Round {currentRound}</p>
        </div>

        {/* Active Injuries */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">🚑 Active Injuries</h2>
          
          {activeInjuries.length === 0 ? (
            <div className="bg-green-900/20 border border-green-600/50 rounded-xl p-8 text-center">
              <p className="text-green-400 text-xl font-bold">✅ All Clear!</p>
              <p className="text-green-400/70 mt-2">No players currently injured</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeInjuries.map((injury) => {
                const colors = getSeverityColor(injury.injury_types?.severity || 'minor');
                const roundsRemaining = injury.round_return - currentRound;
                const player = injury.players;
                
                return (
                  <div 
                    key={injury.id}
                    className={`${colors.bg} border ${colors.border} rounded-xl p-4`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      {/* Player Info */}
                      <div className="flex items-center gap-4">
                        <div className="text-4xl">
                          {getBodyPartIcon(injury.injury_types?.body_part || '')}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white font-bold text-lg">
                              {player?.first_name} {player?.last_name}
                            </p>
                            <span className={`${colors.badge} text-white text-xs px-2 py-0.5 rounded font-bold uppercase`}>
                              {injury.injury_types?.severity}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm">
                            {player?.position} • {player?.overall} OVR • Age {player?.age}
                          </p>
                        </div>
                      </div>

                      {/* Injury Details */}
                      <div className="flex flex-col md:items-end gap-1">
                        <p className={`${colors.text} font-bold`}>
                          {injury.injury_types?.name}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {getContextIcon(injury.injury_context)} Injured Round {injury.round_injured}
                        </p>
                      </div>

                      {/* Return Info */}
                      <div className="bg-gray-900/50 rounded-lg p-3 text-center min-w-[120px]">
                        <p className="text-gray-400 text-xs">Returns</p>
                        <p className="text-white font-bold text-xl">Round {injury.round_return}</p>
                        <p className={`text-sm ${roundsRemaining <= 1 ? 'text-green-400' : colors.text}`}>
                          {roundsRemaining <= 0 ? 'Ready!' : roundsRemaining === 1 ? '1 round' : `${roundsRemaining} rounds`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Injury History Toggle */}
        <div className="mb-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            <span>{showHistory ? '🔼' : '🔽'}</span>
            <span>{showHistory ? 'Hide' : 'Show'} Injury History</span>
            {injuryHistory.length > 0 && (
              <span className="bg-gray-600 text-xs px-2 py-0.5 rounded-full">{injuryHistory.length}</span>
            )}
          </button>
        </div>

        {/* Injury History */}
        {showHistory && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">📋 Recent Injury History</h2>
            
            {injuryHistory.length === 0 ? (
              <div className="bg-gray-800 rounded-xl p-8 text-center">
                <p className="text-gray-500">No injury history yet</p>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="text-left text-gray-300 text-sm font-medium px-4 py-3">Player</th>
                      <th className="text-left text-gray-300 text-sm font-medium px-4 py-3">Injury</th>
                      <th className="text-center text-gray-300 text-sm font-medium px-4 py-3">Severity</th>
                      <th className="text-center text-gray-300 text-sm font-medium px-4 py-3">Rounds Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {injuryHistory.map((injury) => {
                      const colors = getSeverityColor(injury.injury_types?.severity || 'minor');
                      const player = injury.players;
                      
                      return (
                        <tr key={injury.id} className="hover:bg-gray-700/50">
                          <td className="px-4 py-3">
                            <p className="text-white font-medium">
                              {player?.first_name} {player?.last_name}
                            </p>
                            <p className="text-gray-500 text-xs">{player?.position}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-300">{injury.injury_types?.name}</p>
                            <p className="text-gray-500 text-xs">
                              {getContextIcon(injury.injury_context)} Round {injury.round_injured}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`${colors.badge} text-white text-xs px-2 py-1 rounded font-bold uppercase`}>
                              {injury.injury_types?.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-white font-bold">{injury.rounds_out}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Info Card */}
        <div className="mt-8 bg-gray-800 rounded-xl p-4">
          <h3 className="text-white font-bold mb-2">ℹ️ Injury Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-yellow-400 font-bold">Minor (1-2 rounds)</p>
              <p className="text-gray-400">Light training allowed</p>
            </div>
            <div>
              <p className="text-orange-400 font-bold">Moderate (3-6 rounds)</p>
              <p className="text-gray-400">No training</p>
            </div>
            <div>
              <p className="text-red-400 font-bold">Major (8-12 rounds)</p>
              <p className="text-gray-400">No training</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
