'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MAX_SQUAD_SIZE } from '@/lib/game-engine/constants';

const supabase = createBrowserClient();

// ============================================
// TYPES
// ============================================

interface Team {
  id: string;
  name: string;
  city: string;
  primary_color: string;
  secondary_color: string;
  division: number;
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  overall: number;
  age: number;
  nationality: string;
  state: string | null;
  visible_trait: string | null;
}

interface FreeAgent {
  id: string;
  player_id: string;
  available_round: number;
  claimed: boolean;
  player: Player; // Flattened single player object
}

interface Claim {
  id: string;
  free_agent_id: string;
  team_id: string;
  release_player_id: string | null;
}

// ============================================
// CONSTANTS
// ============================================

const MAX_CLAIMS = 3;
const RELEASE_THRESHOLD = MAX_SQUAD_SIZE - 8;

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

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatNationality = (nationality: string, state: string | null): string => {
  return state ? `${nationality}, ${state}` : nationality;
};

const getTraitDisplay = (trait: string | null): string | null => {
  if (!trait) return null;
  return TRAIT_DISPLAY_NAMES[trait] || trait.charAt(0).toUpperCase() + trait.slice(1);
};

const getOvrBgColor = (ovr: number): string => {
  if (ovr >= 45) return 'bg-purple-500';
  if (ovr >= 40) return 'bg-green-500';
  if (ovr >= 35) return 'bg-green-600';
  if (ovr >= 30) return 'bg-yellow-500';
  if (ovr >= 25) return 'bg-orange-500';
  return 'bg-red-500';
};

// ============================================
// MAIN COMPONENT
// ============================================

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
  const [selectedPlayerCard, setSelectedPlayerCard] = useState<Player | null>(null);
  const [processing, setProcessing] = useState(false);
  const router = useRouter();

  const claimedFreeAgentIds = useMemo(() => {
    return new Set(claims.map(c => c.free_agent_id));
  }, [claims]);

  const loadData = useCallback(async () => {
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

      const [teamResult, playersResult, fixturesResult, claimsResult] = await Promise.all([
        supabase
          .from('teams')
          .select('id, name, city, primary_color, secondary_color, division')
          .eq('id', coach.team_id)
          .single(),
        supabase
          .from('players')
          .select('id, first_name, last_name, position, overall, age, nationality, state, visible_trait')
          .eq('team_id', coach.team_id)
          .order('overall', { ascending: true }),
        supabase
          .from('fixtures')
          .select('round')
          .eq('played', false)
          .order('round', { ascending: true })
          .limit(1),
        supabase
          .from('free_agent_claims')
          .select('id, free_agent_id, team_id, release_player_id')
          .eq('team_id', coach.team_id),
      ]);

      setTeam(teamResult.data);
      setPlayers(playersResult.data || []);
      setClaims(claimsResult.data || []);

      const round = fixturesResult.data?.[0]?.round || 1;
      setCurrentRound(round);

      const { data: allTeams } = await supabase
        .from('teams')
        .select('id, wins, draws, points_for, points_against')
        .eq('division', teamResult.data?.division || 1);

      if (allTeams) {
        const sorted = [...allTeams].sort((a, b) => {
          const aPoints = (a.wins * 2) + a.draws;
          const bPoints = (b.wins * 2) + b.draws;
          if (bPoints !== aPoints) return bPoints - aPoints;
          return (b.points_for - b.points_against) - (a.points_for - a.points_against);
        });
        const pos = sorted.findIndex(t => t.id === coach.team_id) + 1;
        setLadderPosition(pos || 1);
      }

      const { data: freeAgentsData } = await supabase
        .from('free_agents')
        .select(`
          id, player_id, available_round, claimed,
          players (id, first_name, last_name, position, overall, age, nationality, state, visible_trait)
        `)
        .eq('claimed', false)
        .lte('available_round', round);

      // Transform: flatten players array to single player object
      const transformedFreeAgents: FreeAgent[] = (freeAgentsData || [])
        .map(fa => {
          const playerData = Array.isArray(fa.players) ? fa.players[0] : fa.players;
          return {
            id: fa.id,
            player_id: fa.player_id,
            available_round: fa.available_round,
            claimed: fa.claimed,
            player: playerData as Player
          };
        })
        .filter(fa => fa.player);

      setFreeAgents(transformedFreeAgents);

      if (transformedFreeAgents.length > 0) {
        const freeAgentIds = transformedFreeAgents.map(fa => fa.id);
        const { data: allClaims } = await supabase
          .from('free_agent_claims')
          .select('free_agent_id')
          .in('free_agent_id', freeAgentIds);

        const counts: Record<string, number> = {};
        freeAgentIds.forEach(id => { counts[id] = 0; });
        allClaims?.forEach(claim => {
          counts[claim.free_agent_id] = (counts[claim.free_agent_id] || 0) + 1;
        });
        setClaimCounts(counts);
      }

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openRequestModal = useCallback((freeAgent: FreeAgent) => {
    setSelectedFreeAgent(freeAgent);
    if (players.length >= MAX_SQUAD_SIZE) {
      return;
    }
    if (players.length >= RELEASE_THRESHOLD) {
      setShowRequestModal(true);
    } else {
      submitRequest(freeAgent, null);
    }
  }, [players.length]);

  const submitRequest = useCallback(async (freeAgent: FreeAgent, releasePlayerId: string | null) => {
    if (!teamId) return;
    setProcessing(true);

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

      if (!coach?.team_id || coach.team_id !== teamId) {
        console.error('Team ID mismatch');
        return;
      }

      if (releasePlayerId) {
        const playerExists = players.some(p => p.id === releasePlayerId);
        if (!playerExists) {
          console.error('Invalid release player ID');
          return;
        }
      }

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
  }, [teamId, players, loadData, router]);

  const cancelRequest = useCallback(async (freeAgentId: string) => {
    if (!teamId) return;
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: coach } = await supabase
        .from('coaches')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!coach?.team_id || coach.team_id !== teamId) {
        console.error('Team ID mismatch');
        return;
      }

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
  }, [teamId, loadData]);

  const closeRequestModal = useCallback(() => {
    setShowRequestModal(false);
    setSelectedFreeAgent(null);
    setSelectedPlayer(null);
  }, []);

  const closePlayerCard = useCallback(() => {
    setSelectedPlayerCard(null);
  }, []);

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
          background: `linear-gradient(135deg, ${team?.primary_color || '#1f2937'} 0%, ${team?.secondary_color || '#111827'} 100%)`
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
            <div className="text-center">
              <p className="text-gray-400 text-sm">Pending claims</p>
              <p className={`text-xl font-bold ${claims.length >= MAX_CLAIMS ? 'text-red-400' : 'text-green-400'}`}>
                {claims.length}/{MAX_CLAIMS}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Squad size</p>
              <p className={`text-xl font-bold ${players.length >= MAX_SQUAD_SIZE ? 'text-red-400' : 'text-green-400'}`}>
                {players.length}/{MAX_SQUAD_SIZE}
              </p>
            </div>
          </div>
          <div className="bg-blue-500/20 border border-blue-500 rounded p-3">
            <p className="text-blue-400 text-sm">
              <strong>How it works:</strong> Request up to {MAX_CLAIMS} players. During game updates (Tue/Thu/Sun 6pm), 
              the system assigns players based on division, ladder position, squad needs, and player preference.
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
                const claimed = claimedFreeAgentIds.has(fa.id);
                const interestCount = claimCounts[fa.id] || 0;
                const traitDisplay = getTraitDisplay(fa.player.visible_trait);
                
                return (
                  <div key={fa.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition"
                        onClick={() => setSelectedPlayerCard(fa.player)}
                      >
                        <div className={`${getOvrBgColor(fa.player.overall)} text-white text-xl font-bold px-3 py-1 rounded`}>
                          {fa.player.overall}
                        </div>
                        <div>
                          <p className="text-white font-bold">{fa.player.first_name} {fa.player.last_name}</p>
                          <p className="text-gray-500 text-xs">{formatNationality(fa.player.nationality, fa.player.state)}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded text-white ${POSITION_COLORS[fa.player.position] || 'bg-gray-600'}`}>
                              {fa.player.position}
                            </span>
                            <span className="text-gray-400 text-sm">Age {fa.player.age}</span>
                          </div>
                          {traitDisplay && (
                            <p className="text-gray-400 text-xs mt-1">Trait: {traitDisplay}</p>
                          )}
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
                        ) : claims.length >= MAX_CLAIMS ? (
                          <span className="text-gray-500 text-sm">Claim limit reached</span>
                        ) : players.length >= MAX_SQUAD_SIZE ? (
                          <span className="text-gray-500 text-sm">Squad full ({MAX_SQUAD_SIZE})</span>
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

      {/* Player Card Popup */}
      {selectedPlayerCard && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={closePlayerCard}
        >
          <div 
            className="bg-gray-800 rounded-lg p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-400 text-sm">{selectedPlayerCard.first_name}</p>
                <p className="text-white text-2xl font-bold">{selectedPlayerCard.last_name}</p>
                <p className="text-gray-500 text-xs">{formatNationality(selectedPlayerCard.nationality, selectedPlayerCard.state)}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={closePlayerCard}
                  className="text-gray-400 hover:text-white text-2xl leading-none"
                >
                  ×
                </button>
                <div className={`${getOvrBgColor(selectedPlayerCard.overall)} text-white text-2xl font-bold px-3 py-1 rounded`}>
                  {selectedPlayerCard.overall}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`text-sm px-3 py-1 rounded text-white ${POSITION_COLORS[selectedPlayerCard.position] || 'bg-gray-600'}`}>
                  {selectedPlayerCard.position}
                </span>
              </div>
              
              {selectedPlayerCard.visible_trait && (
                <p className="text-gray-400">Trait: {getTraitDisplay(selectedPlayerCard.visible_trait)}</p>
              )}
              
              <p className="text-gray-400">Age: {selectedPlayerCard.age}</p>
            </div>

            <button
              onClick={closePlayerCard}
              className="w-full mt-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Request Modal (release required) */}
      {showRequestModal && selectedFreeAgent && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={closeRequestModal}
        >
          <div 
            className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-bold text-white">Select Player to Release</h3>
              <button onClick={closeRequestModal} className="text-gray-400 hover:text-white text-2xl">×</button>
            </div>
            <p className="text-gray-400 mb-4">
              If you win <strong className="text-white">{selectedFreeAgent.player.first_name} {selectedFreeAgent.player.last_name}</strong>, 
              who would you release to make room?
            </p>

            <div className="space-y-2 mb-4">
              {players.map(player => {
                const traitDisplay = getTraitDisplay(player.visible_trait);
                return (
                  <div
                    key={player.id}
                    onClick={() => setSelectedPlayer(player)}
                    className={`p-3 rounded-lg cursor-pointer transition ${
                      selectedPlayer?.id === player.id 
                        ? 'bg-red-600/30 border-2 border-red-500' 
                        : 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`${getOvrBgColor(player.overall)} text-white text-sm font-bold px-2 py-1 rounded`}>
                          {player.overall}
                        </div>
                        <div>
                          <p className="text-white font-bold">{player.first_name} {player.last_name}</p>
                          <p className="text-gray-500 text-xs">{formatNationality(player.nationality, player.state)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded text-white ${POSITION_COLORS[player.position] || 'bg-gray-600'}`}>
                            {player.position}
                          </span>
                          {traitDisplay && (
                            <p className="text-gray-400 text-xs mt-1">Trait: {traitDisplay}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-gray-400 text-sm">Age {player.age}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedPlayer && (
              <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-400 p-3 rounded mb-4">
                ⚠️ If your request is successful, <strong>{selectedPlayer.first_name} {selectedPlayer.last_name}</strong> will be released.
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeRequestModal}
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