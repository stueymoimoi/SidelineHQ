// /app/clubhouse/contracts/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MORALE_DISPLAY: Record<number, { label: string; emoji: string; color: string }> = {
  1: { label: 'Angry', emoji: '🔴', color: 'text-red-500' },
  2: { label: 'Unhappy', emoji: '🟠', color: 'text-orange-400' },
  3: { label: 'Content', emoji: '⚪', color: 'text-gray-400' },
  4: { label: 'Happy', emoji: '💙', color: 'text-blue-400' },
  5: { label: 'Ecstatic', emoji: '💚', color: 'text-green-400' },
};

const TIER_LABELS: Record<number, string> = {
  1: 'NONE', 2: 'POOR', 3: 'OK', 4: 'GOOD', 5: 'GREAT', 6: 'EXCELLENT', 7: 'ELITE', 8: 'LEGEND'
};

const TIER_COLORS: Record<number, string> = {
  1: 'text-red-500 bg-red-500/20',
  2: 'text-orange-600 bg-orange-600/20',
  3: 'text-orange-400 bg-orange-400/20',
  4: 'text-yellow-400 bg-yellow-400/20',
  5: 'text-lime-400 bg-lime-400/20',
  6: 'text-green-400 bg-green-400/20',
  7: 'text-cyan-400 bg-cyan-400/20',
  8: 'text-yellow-300 bg-yellow-500/30'
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

interface ExpiringPlayer {
  id: string;
  first_name: string;
  last_name: string;
  age: number;
  overall: number;
  position: string;
  morale: number;
  speed: number;
  strength: number;
  power: number;
  passing: number;
  stamina: number;
  tackling: number;
  kicking: number;
  fatigue: number;
  visible_trait: string | null;
  dominant_side: string | null;
  nationality: string;
  state: string | null;
  contract_id: string;
  weekly_wage: number;
  weeks_remaining: number;
}

interface ActiveNegotiation {
  id: string;
  player_id: string;
  status: string;
  demanded_wage: number;
  demanded_length: number;
  offered_wage: number | null;
  offered_length: number | null;
  counter_wage: number | null;
  counter_length: number | null;
  rounds_used: number;
  rejected_at: string | null;
}

export default function ContractsPage() {

  const [loading, setLoading] = useState(true);
  const [expiringPlayers, setExpiringPlayers] = useState<ExpiringPlayer[]>([]);
  const [negotiations, setNegotiations] = useState<Map<string, ActiveNegotiation>>(new Map());
  const [teamId, setTeamId] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<ExpiringPlayer | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // Get current user's team
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: coach } = await supabase
        .from('coaches')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!coach) return;
      setTeamId(coach.team_id);

      // Get current round from fixtures
      const { data: roundData } = await supabase
        .from('fixtures')
        .select('round')
        .eq('played', true)
        .order('round', { ascending: false })
        .limit(1)
        .single();
      
      if (roundData) {
        setCurrentWeek(roundData.round);
      }

      // Get players with expiring contracts (≤6 weeks remaining)
      const { data: contracts, error: contractsError } = await supabase
        .from('player_contracts')
        .select(`
          id,
          weekly_wage,
          weeks_remaining,
          player_id,
          players!inner (
            id,
            first_name,
            last_name,
            age,
            overall,
            position,
            morale,
            speed,
            strength,
            power,
            passing,
            stamina,
            tackling,
            kicking,
            fatigue,
            visible_trait,
            dominant_side,
            nationality,
            state
          )
        `)
        .eq('team_id', coach.team_id)
        .lte('weeks_remaining', 6)
        .gt('weeks_remaining', 0);

      if (contractsError) throw contractsError;

      // Flatten the data and sort by weeks remaining
      const flattened: ExpiringPlayer[] = (contracts || []).map((c: any) => ({
        id: c.players.id,
        first_name: c.players.first_name,
        last_name: c.players.last_name,
        age: c.players.age,
        overall: c.players.overall,
        position: c.players.position,
        morale: c.players.morale ?? 3,
        speed: c.players.speed,
        strength: c.players.strength,
        power: c.players.power,
        passing: c.players.passing,
        stamina: c.players.stamina,
        tackling: c.players.tackling,
        kicking: c.players.kicking,
        fatigue: c.players.fatigue || 0,
        visible_trait: c.players.visible_trait,
        dominant_side: c.players.dominant_side,
        nationality: c.players.nationality,
        state: c.players.state,
        contract_id: c.id,
        weekly_wage: c.weekly_wage,
        weeks_remaining: c.weeks_remaining,
      })).sort((a, b) => a.weeks_remaining - b.weeks_remaining);

      setExpiringPlayers(flattened);

      // Get active negotiations for this team
      const { data: negs } = await supabase
        .from('contract_negotiations')
        .select('*')
        .eq('team_id', coach.team_id);

      if (negs) {
        const negMap = new Map<string, ActiveNegotiation>();
        negs.forEach((n: ActiveNegotiation) => negMap.set(n.player_id, n));
        setNegotiations(negMap);
        
        // Filter out players with accepted contracts
        const filtered = flattened.filter(p => {
          const neg = negMap.get(p.id);
          return !neg || neg.status !== 'accepted';
        });
        setExpiringPlayers(filtered);
      } else {
        setExpiringPlayers(flattened);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatWage(cents: number): string {
    return '$' + (cents / 100).toLocaleString();
  }

  function getStatusBadge(playerId: string): React.ReactNode {
    const neg = negotiations.get(playerId);
    if (!neg) return null;

    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      countered: 'bg-blue-500/20 text-blue-400',
      accepted: 'bg-green-500/20 text-green-400',
      rejected: 'bg-red-500/20 text-red-400',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[neg.status] || 'bg-gray-500/20 text-gray-400'}`}>
        {neg.status.toUpperCase()}
      </span>
    );
  }

  function canNegotiate(playerId: string): boolean {
    const neg = negotiations.get(playerId);
    if (!neg) return true; // No negotiation started yet
    if (neg.status === 'accepted') return false; // Already signed
    if (neg.status === 'rejected' && neg.rejected_at) {
      // Check cooldown - simplified check (1 week = wait for next data fetch)
      return false; // For now, rejected means wait
    }
    return true;
  }

  const getOvrColor = (ovr: number): string => {
    if (ovr >= 50) return 'bg-green-500';
    if (ovr >= 45) return 'bg-purple-500';
    if (ovr >= 40) return 'bg-blue-500';
    if (ovr >= 35) return 'bg-teal-500';
    if (ovr >= 30) return 'bg-yellow-500';
    if (ovr >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getFitnessColor = (fitness: number): string => {
    if (fitness >= 70) return 'text-green-500';
    if (fitness >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading contracts...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/clubhouse" className="text-blue-400 hover:text-blue-300 text-sm mb-2 inline-block">
              ← Back to Clubhouse
            </Link>
            <h1 className="text-3xl font-bold">📝 Contract Negotiations</h1>
          </div>
          <div className="text-right text-gray-400">
            <div>Week {currentWeek}</div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {/* Expiring Contracts */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            Expiring Contracts ({expiringPlayers.length})
          </h2>
          
          {expiringPlayers.length === 0 ? (
            <p className="text-gray-400">No contracts expiring in the next 6 weeks.</p>
          ) : (
            <div className="space-y-3">
              {expiringPlayers.map((player) => (
                <div
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  className="bg-gray-700 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-gray-600 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${getOvrColor(player.overall)} rounded-full flex items-center justify-center text-lg font-bold text-white`}>
                      {player.overall}
                    </div>
                    <div>
                      <div className="font-semibold">
                        {player.first_name} {player.last_name}
                        <span className="ml-2">{getStatusBadge(player.id)}</span>
                      </div>
                      <div className="text-sm text-gray-400">
                        {player.position} • Age {player.age} • Morale: {MORALE_DISPLAY[player.morale]?.label}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <div className="font-semibold">{formatWage(player.weekly_wage)}/wk</div>
                      <div className={`text-sm ${player.weeks_remaining <= 2 ? 'text-red-400' : 'text-yellow-400'}`}>
                        {player.weeks_remaining} week{player.weeks_remaining !== 1 ? 's' : ''} left
                      </div>
                    </div>
                    
                    <Link
                      href={canNegotiate(player.id) ? `/clubhouse/contracts/${player.id}` : '#'}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        canNegotiate(player.id)
                          ? 'bg-blue-600 hover:bg-blue-500 text-white'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!canNegotiate(player.id)) e.preventDefault();
                      }}
                    >
                      {negotiations.get(player.id)?.status === 'countered' ? 'Respond' : 'Negotiate'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-gray-800/50 rounded-lg p-4 text-sm text-gray-400">
          <h3 className="font-semibold text-gray-300 mb-2">💡 How Negotiations Work</h3>
          <ul className="space-y-1 list-disc list-inside">
            <li>Players with ≤6 weeks on their contract appear here</li>
            <li>Click on a player to view their full stats</li>
            <li>Click "Negotiate" to see their demands and make an offer</li>
            <li>You have up to 2 rounds of negotiation per player</li>
            <li>If rejected, you must wait 1 week before trying again</li>
            <li>If a contract expires, the player leaves your team!</li>
          </ul>
        </div>

        {/* Player Detail Modal */}
        {selectedPlayer && (
          <div 
            className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedPlayer(null)}
          >
            <div 
              className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-gray-300 text-lg">{selectedPlayer.first_name}</p>
                  <h2 className="text-2xl font-bold text-white">{selectedPlayer.last_name}</h2>
                  <p className="text-gray-500 text-sm">{selectedPlayer.nationality}{selectedPlayer.state ? `, ${selectedPlayer.state}` : ''}</p>
                  <span className={`${POSITION_COLORS[selectedPlayer.position] || 'bg-gray-600'} text-white text-sm px-3 py-1 rounded mt-2 inline-block`}>
                    {selectedPlayer.position}
                  </span>
                </div>
                <div className="text-right">
                  <button onClick={() => setSelectedPlayer(null)} className="text-gray-400 hover:text-white text-2xl">×</button>
                  <div className="mt-2">
                    <p className="text-gray-500 text-xs">OVR</p>
                    <span className={`${getOvrColor(selectedPlayer.overall)} text-white px-4 py-2 rounded-lg font-bold text-2xl inline-block`}>
                      {selectedPlayer.overall}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-700 rounded p-3 text-center">
                  <p className="text-gray-400 text-xs">Age</p>
                  <p className="text-white text-xl font-bold">{selectedPlayer.age}</p>
                </div>
                <div className="bg-gray-700 rounded p-3 text-center">
                  <p className="text-gray-400 text-xs">Fitness</p>
                  <p className={`text-xl font-bold ${getFitnessColor(100 - selectedPlayer.fatigue)}`}>
                    {100 - selectedPlayer.fatigue}%
                  </p>
                </div>
              </div>

              {/* Morale */}
              <div className="bg-gray-700 rounded p-3 mb-4">
                <p className="text-gray-400 text-xs">Morale</p>
                <p className="text-lg font-semibold text-white">
                  {MORALE_DISPLAY[selectedPlayer.morale]?.label || 'Content'}
                </p>
              </div>

              {/* Contract Info */}
              <div className="bg-blue-900/30 border border-blue-600 rounded p-3 mb-4">
                <p className="text-blue-400 text-xs font-semibold">Current Contract</p>
                <div className="flex justify-between mt-1">
                  <span className="text-white font-bold">{formatWage(selectedPlayer.weekly_wage)}/wk</span>
                  <span className={`font-bold ${selectedPlayer.weeks_remaining <= 2 ? 'text-red-400' : 'text-yellow-400'}`}>
                    {selectedPlayer.weeks_remaining} weeks left
                  </span>
                </div>
              </div>

              {/* Trait */}
              {selectedPlayer.visible_trait && (
                <div className="bg-gray-700 rounded p-3 mb-4">
                  <p className="text-gray-400 text-xs">Trait</p>
                  <p className="text-white font-semibold">{selectedPlayer.visible_trait.charAt(0).toUpperCase() + selectedPlayer.visible_trait.slice(1)}</p>
                </div>
              )}

              {/* Stats */}
              <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                {['Speed', 'Strength', 'Power', 'Passing', 'Stamina', 'Tackling', 'Kicking'].map((stat) => {
                  const value = selectedPlayer[stat.toLowerCase() as keyof ExpiringPlayer] as number;
                  return (
                    <div key={stat} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
                      <span className="text-gray-300">{stat}</span>
                      <span className={`px-3 py-1 rounded font-bold text-sm ${TIER_COLORS[value] || TIER_COLORS[1]}`}>
                        {TIER_LABELS[value] || 'NONE'}
                      </span>
                    </div>
                  );
                })}
                <p className="text-gray-500 text-[10px] text-center mt-3 pt-2 border-t border-gray-600">
                  NONE → POOR → OK → GOOD → GREAT → EXCELLENT → ELITE → LEGEND
                </p>
              </div>

              {/* Negotiate Button */}
              <Link
                href={canNegotiate(selectedPlayer.id) ? `/clubhouse/contracts/${selectedPlayer.id}` : '#'}
                className={`block w-full text-center py-3 rounded-lg font-bold transition mb-2 ${
                  canNegotiate(selectedPlayer.id)
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
                onClick={(e) => !canNegotiate(selectedPlayer.id) && e.preventDefault()}
              >
                {negotiations.get(selectedPlayer.id)?.status === 'countered' ? '💬 Respond to Counter' : '📝 Negotiate Contract'}
              </Link>

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
    </div>
  );
}
