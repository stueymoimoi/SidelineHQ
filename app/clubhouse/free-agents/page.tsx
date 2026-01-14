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
  first_name: string;
  last_name: string;
  position: string;
  overall: number;
  age: number;
}

interface FreeAgent {
  id: string;
  player_id: string;
  available_round: number;
  claimed: boolean;
  players: Player;
}

interface Claim {
  id: string;
  free_agent_id: string;
  team_id: string;
  release_player_id: string | null;
}

export default function FreeAgentsPage() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [freeAgents, setFreeAgents] = useState<FreeAgent[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimCounts, setClaimCounts] = useState<Record<string, number>>({});
  const [currentRound, setCurrentRound] = useState(1);
  const [ladderPosition, setLadderPosition] = useState(1);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedFreeAgent, setSelectedFreeAgent] = useState<FreeAgent | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [processing, setProcessing] = useState(false);
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

      setTeamId(coach.team_id);

      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', coach.team_id)
        .single();

      setTeam(teamData);

      // Get squad
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', coach.team_id)
        .order('overall', { ascending: true });

      setPlayers(playersData || []);

      // Get current round
      const { data: fixtures } = await supabase
        .from('fixtures')
        .select('round')
        .eq('played', false)
        .order('round', { ascending: true })
        .limit(1);

      const round = fixtures && fixtures.length > 0 ? fixtures[0].round : 1;
      setCurrentRound(round);

      // Get ladder position
      const { data: allTeams } = await supabase
        .from('teams')
        .select('*')
        .eq('division', 1);

      if (allTeams) {
        const sorted = allTeams.sort((a, b) => {
          const aPoints = (a.wins * 2) + a.draws;
          const bPoints = (b.wins * 2) + b.draws;
          if (bPoints !== aPoints) return bPoints - aPoints;
          return (b.points_for - b.points_against) - (a.points_for - a.points_against);
        });
        const pos = sorted.findIndex(t => t.id === coach.team_id) + 1;
        setLadderPosition(pos);
      }

      // Get available free agents
      const { data: freeAgentsData } = await supabase
        .from('free_agents')
        .select('*, players(*)')
        .eq('claimed', false)
        .lte('available_round', round);

      setFreeAgents(freeAgentsData || []);

      // Get my claims
      const { data: myClaims } = await supabase
        .from('free_agent_claims')
        .select('*')
        .eq('team_id', coach.team_id);

      setClaims(myClaims || []);

      // Get claim counts for each free agent
      if (freeAgentsData && freeAgentsData.length > 0) {
        const counts: Record<string, number> = {};
        for (const fa of freeAgentsData) {
          const { count } = await supabase
            .from('free_agent_claims')
            .select('*', { count: 'exact', head: true })
            .eq('free_agent_id', fa.id);
          counts[fa.id] = count || 0;
        }
        setClaimCounts(counts);
      }

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const openRequestModal = (freeAgent: FreeAgent) => {
    setSelectedFreeAgent(freeAgent);
    if (players.length >= 22) {
      setShowRequestModal(true);
    } else {
      submitRequest(freeAgent, null);
    }
  };

  const submitRequest = async (freeAgent: FreeAgent, releasePlayerId: string | null) => {
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: coach } = await supabase
        .from('coaches')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!coach?.team_id) return;

      await supabase.from('free_agent_claims').insert({
        free_agent_id: freeAgent.id,
        team_id: coach.team_id,
        release_player_id: releasePlayerId
      });

      await loadData();
    } catch (err) {
      console.error('Error submitting request:', err);
    } finally {
      setProcessing(false);
      setShowRequestModal(false);
      setSelectedFreeAgent(null);
      setSelectedPlayer(null);
    }
  };

  const cancelRequest = async (freeAgentId: string) => {
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: coach } = await supabase
        .from('coaches')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!coach?.team_id) return;

      await supabase
        .from('free_agent_claims')
        .delete()
        .eq('free_agent_id', freeAgentId)
        .eq('team_id', coach.team_id);

      await loadData();
    } catch (err) {
      console.error('Error cancelling request:', err);
    } finally {
      setProcessing(false);
    }
  };

  const hasClaimed = (freeAgentId: string) => {
    return claims.some(c => c.free_agent_id === freeAgentId);
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

  const getOverallColor = (overall: number) => {
    if (overall >= 75) return 'text-green-400';
    if (overall >= 65) return 'text-yellow-400';
    if (overall >= 55) return 'text-orange-400';
    return 'text-red-400';
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
        <div className="max-w-4xl mx-auto">
          <Link href="/clubhouse" className="text-white/70 hover:text-white mb-2 inline-block">
            ← Back to Clubhouse
          </Link>
          <h1 className="text-3xl font-bold text-white">🏪 Free Agents</h1>
          <p className="text-white/70 mt-1">Request released players for your squad</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        
        {/* Info Box */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-gray-400 text-sm">Your ladder position</p>
              <p className="text-white text-xl font-bold">{ladderPosition}/10</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Squad size</p>
              <p className={`text-xl font-bold ${players.length >= 22 ? 'text-red-400' : 'text-green-400'}`}>
                {players.length}/22
              </p>
            </div>
          </div>
          <div className="bg-blue-500/20 border border-blue-500 rounded p-3">
            <p className="text-blue-400 text-sm">
              <strong>How it works:</strong> Request players you want. During game updates (Tue/Thu/Sun 6pm), 
              the system assigns players based on ladder position, squad needs, and squad size. 
              Lower ladder position = higher priority!
            </p>
          </div>
        </div>

        {/* Free Agents List */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Available Players</h2>
          
          {freeAgents.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🏝️</div>
              <p className="text-gray-400">No free agents available</p>
              <p className="text-gray-500 text-sm mt-1">Released players appear here after 1 round</p>
            </div>
          ) : (
            <div className="space-y-3">
              {freeAgents.map(fa => {
                const claimed = hasClaimed(fa.id);
                const interestCount = claimCounts[fa.id] || 0;
                
                return (
                  <div key={fa.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`text-2xl font-bold ${getOverallColor(fa.players.overall)}`}>
                          {fa.players.overall}
                        </div>
                        <div>
                          <p className="text-white font-bold">{fa.players.first_name} {fa.players.last_name}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded text-white ${getPositionColor(fa.players.position)}`}>
                              {fa.players.position}
                            </span>
                            <span className="text-gray-400 text-sm">Age {fa.players.age}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {interestCount > 0 && (
                          <span className="text-gray-400 text-sm">
                            {interestCount} team{interestCount !== 1 ? 's' : ''} interested
                          </span>
                        )}
                        {claimed ? (
                          <button
                            onClick={() => cancelRequest(fa.id)}
                            disabled={processing}
                            className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition"
                          >
                            📋 Requested
                          </button>
                        ) : (
                          <button
                            onClick={() => openRequestModal(fa)}
                            disabled={processing}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition"
                          >
                            Request
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Request Modal (release required) */}
      {showRequestModal && selectedFreeAgent && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-2">Select Player to Release</h3>
            <p className="text-gray-400 mb-4">
              If you win <strong className="text-white">{selectedFreeAgent.players.first_name} {selectedFreeAgent.players.last_name}</strong>, 
              who would you release to make room?
            </p>

            <div className="space-y-2 mb-4">
              {players.map(player => (
                <div
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  className={`p-3 rounded-lg cursor-pointer transition ${
                    selectedPlayer?.id === player.id 
                      ? 'bg-red-600/30 border-2 border-red-500' 
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`text-lg font-bold ${getOverallColor(player.overall)}`}>{player.overall}</div>
                      <div>
                        <p className="text-white">{player.first_name} {player.last_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded text-white ${getPositionColor(player.position)}`}>
                          {player.position}
                        </span>
                      </div>
                    </div>
                    <div className="text-gray-400 text-sm">Age {player.age}</div>
                  </div>
                </div>
              ))}
            </div>

            {selectedPlayer && (
              <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-400 p-3 rounded mb-4">
                ⚠️ If your request is successful, <strong>{selectedPlayer.first_name} {selectedPlayer.last_name}</strong> will be released.
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setSelectedFreeAgent(null);
                  setSelectedPlayer(null);
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => submitRequest(selectedFreeAgent, selectedPlayer?.id || null)}
                disabled={!selectedPlayer || processing}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-lg transition"
              >
                {processing ? 'Processing...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
