// /app/clubhouse/contracts/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ExpiringPlayer {
  id: string;
  first_name: string;
  last_name: string;
  age: number;
  overall: number;
  position: string;
  morale: number;
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
            morale
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
        morale: c.players.morale ?? 50,
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
                  className="bg-gray-700 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center text-lg font-bold">
                      {player.overall}
                    </div>
                    <div>
                      <div className="font-semibold">
                        {player.first_name} {player.last_name}
                        <span className="ml-2">{getStatusBadge(player.id)}</span>
                      </div>
                      <div className="text-sm text-gray-400">
                        {player.position} • Age {player.age} • Morale {player.morale}
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
                      onClick={(e) => !canNegotiate(player.id) && e.preventDefault()}
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
            <li>Click "Negotiate" to see their demands and make an offer</li>
            <li>You have up to 2 rounds of negotiation per player</li>
            <li>If rejected, you must wait 1 week before trying again</li>
            <li>If a contract expires, the player leaves your team!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
