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

interface Academy {
  id: string;
  team_id: string;
  position_type: string;
  rounds_cooking: number;
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

interface Coach {
  id: string;
  team_id: string;
  last_academy_pull_round: number;
}

export default function AcademyPage() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [coach, setCoach] = useState<Coach | null>(null);
  const [academy, setAcademy] = useState<Academy | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [freeAgents, setFreeAgents] = useState<FreeAgent[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [ladderPosition, setLadderPosition] = useState(1);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedFreeAgent, setSelectedFreeAgent] = useState<FreeAgent | null>(null);
  const [actionType, setActionType] = useState<'pull' | 'claim' | null>(null);
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

      const { data: coachData } = await supabase
        .from('coaches')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!coachData?.team_id) {
        router.push('/choose-team');
        return;
      }

      setCoach(coachData);

      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', coachData.team_id)
        .single();

      setTeam(teamData);

      // Get academy status
      const { data: academyData } = await supabase
        .from('academy')
        .select('*')
        .eq('team_id', coachData.team_id)
        .single();

      setAcademy(academyData);

      // Get squad
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', coachData.team_id)
        .order('overall', { ascending: true });

      setPlayers(playersData || []);

      // Get current round (first unplayed fixture)
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
        const pos = sorted.findIndex(t => t.id === coachData.team_id) + 1;
        setLadderPosition(pos);
      }

      // Get available free agents
      const { data: freeAgentsData } = await supabase
        .from('free_agents')
        .select('*, players(*)')
        .eq('claimed', false)
        .lte('available_round', round);

      setFreeAgents(freeAgentsData || []);

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const startCooking = async (positionType: string) => {
    if (!team) return;
    setProcessing(true);

    // Generate hidden player
    const positions: Record<string, string[]> = {
      forward: ['Prop', 'Second Row', 'Lock'],
      back: ['Fullback', 'Winger', 'Centre'],
      half: ['Halfback', 'Five-Eighth']
    };

    const posOptions = positions[positionType];
    const position = posOptions[Math.floor(Math.random() * posOptions.length)];

    // Random Aussie names
    const firstNames = ['Jack', 'Liam', 'Noah', 'Oliver', 'James', 'Ethan', 'Lucas', 'Mason', 'Logan', 'Alex', 'Ryan', 'Cooper', 'Riley', 'Harrison', 'Jordan', 'Kai', 'Tyler', 'Blake', 'Mitchell', 'Cameron'];
    const lastNames = ['Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Johnson', 'White', 'Martin', 'Thompson', 'Anderson', 'Walker', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Young', 'King', 'Scott', 'Mitchell'];

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

    // Base stats for youth (will improve with cooking)
    const baseOverall = 45 + Math.floor(Math.random() * 15); // 45-59
    const potential = 65 + Math.floor(Math.random() * 30); // 65-94
    
    // Generate stats around base
    const variance = () => Math.floor(Math.random() * 10) - 5;
    const speed = Math.max(40, Math.min(70, baseOverall + variance()));
    const strength = Math.max(40, Math.min(70, baseOverall + variance()));
    const skill = Math.max(40, Math.min(70, baseOverall + variance()));
    const stamina = Math.max(40, Math.min(70, baseOverall + variance()));
    const defense = Math.max(40, Math.min(70, baseOverall + variance()));
    
    // Kicking based on position
    let kicking = 30 + Math.floor(Math.random() * 20);
    if (position === 'Halfback' || position === 'Fullback') kicking = 50 + Math.floor(Math.random() * 25);
    if (position === 'Five-Eighth') kicking = 45 + Math.floor(Math.random() * 25);

    const { error } = await supabase
      .from('academy')
      .insert({
        team_id: team.id,
        position_type: positionType,
        hidden_position: position,
        hidden_first_name: firstName,
        hidden_last_name: lastName,
        hidden_overall: baseOverall,
        hidden_potential: potential,
        hidden_speed: speed,
        hidden_strength: strength,
        hidden_skill: skill,
        hidden_stamina: stamina,
        hidden_defense: defense,
        hidden_kicking: kicking,
        rounds_cooking: 0
      });

    if (!error) {
      loadData();
    }
    setProcessing(false);
  };

  const openReleaseModal = (type: 'pull' | 'claim', freeAgent?: FreeAgent) => {
    setActionType(type);
    if (freeAgent) setSelectedFreeAgent(freeAgent);
    setShowReleaseModal(true);
  };

  const releaseAndComplete = async () => {
    if (!selectedPlayer || !team || !coach) return;
    setProcessing(true);

    if (actionType === 'pull' && academy) {
      // Release selected player to free agents
      await supabase.from('free_agents').insert({
        player_id: selectedPlayer.id,
        released_by_team_id: team.id,
        available_round: currentRound + 1
      });

      // Remove player from team
      await supabase.from('players').delete().eq('id', selectedPlayer.id);

      // Create new player from academy
      const { data: academyFull } = await supabase
        .from('academy')
        .select('*')
        .eq('team_id', team.id)
        .single();

      if (academyFull) {
        // Calculate improved stats based on rounds cooking
        const bonus = Math.min(academyFull.rounds_cooking * 2, 25); // Max +25 from cooking
        const potentialBonus = Math.floor((academyFull.hidden_potential - 60) / 10); // Bonus from potential
        
        const improveBy = bonus + potentialBonus + Math.floor(Math.random() * 5);
        
        await supabase.from('players').insert({
          team_id: team.id,
          first_name: academyFull.hidden_first_name,
          last_name: academyFull.hidden_last_name,
          position: academyFull.hidden_position,
          age: 18,
          overall: Math.min(85, academyFull.hidden_overall + improveBy),
          potential: academyFull.hidden_potential,
          speed: Math.min(90, academyFull.hidden_speed + Math.floor(improveBy * 0.8) + Math.floor(Math.random() * 5)),
          strength: Math.min(90, academyFull.hidden_strength + Math.floor(improveBy * 0.8) + Math.floor(Math.random() * 5)),
          skill: Math.min(90, academyFull.hidden_skill + Math.floor(improveBy * 0.8) + Math.floor(Math.random() * 5)),
          stamina: Math.min(90, academyFull.hidden_stamina + Math.floor(improveBy * 0.8) + Math.floor(Math.random() * 5)),
          defense: Math.min(90, academyFull.hidden_defense + Math.floor(improveBy * 0.8) + Math.floor(Math.random() * 5)),
          kicking: Math.min(90, academyFull.hidden_kicking + Math.floor(Math.random() * 10)),
          fatigue: 0,
          is_u21: false
        });

        // Delete academy entry
        await supabase.from('academy').delete().eq('team_id', team.id);

        // Update coach last pull round
        await supabase.from('coaches').update({ last_academy_pull_round: currentRound }).eq('id', coach.id);
      }
    } else if (actionType === 'claim' && selectedFreeAgent) {
      // Release selected player to free agents
      await supabase.from('free_agents').insert({
        player_id: selectedPlayer.id,
        released_by_team_id: team.id,
        available_round: currentRound + 1
      });

      // Remove player from team
      await supabase.from('players').delete().eq('id', selectedPlayer.id);

      // Move free agent player to this team
      await supabase.from('players').update({ team_id: team.id }).eq('id', selectedFreeAgent.player_id);

      // Mark free agent as claimed
      await supabase.from('free_agents').update({ claimed: true }).eq('id', selectedFreeAgent.id);
    }

    setShowReleaseModal(false);
    setSelectedPlayer(null);
    setSelectedFreeAgent(null);
    setActionType(null);
    setProcessing(false);
    loadData();
  };

  const canPull = coach && (currentRound - (coach.last_academy_pull_round || 0)) >= 6;
  const roundsUntilPull = coach ? Math.max(0, 6 - (currentRound - (coach.last_academy_pull_round || 0))) : 6;

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
          <h1 className="text-3xl font-bold text-white">🎓 Development Academy</h1>
          <p className="text-white/70 mt-1">Develop youth talent for your squad</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        
        {/* Academy Oven */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">🍳 The Oven</h2>
          
          {!academy ? (
            <div>
              <p className="text-gray-400 mb-4">Select a position type to start developing a youth player:</p>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => startCooking('forward')}
                  disabled={processing}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg transition disabled:opacity-50"
                >
                  <div className="text-2xl mb-1">💪</div>
                  Forward
                  <div className="text-xs text-white/70 mt-1">Prop, 2nd Row, Lock</div>
                </button>
                <button
                  onClick={() => startCooking('back')}
                  disabled={processing}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition disabled:opacity-50"
                >
                  <div className="text-2xl mb-1">⚡</div>
                  Back
                  <div className="text-xs text-white/70 mt-1">FB, Winger, Centre</div>
                </button>
                <button
                  onClick={() => startCooking('half')}
                  disabled={processing}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-4 px-6 rounded-lg transition disabled:opacity-50"
                >
                  <div className="text-2xl mb-1">🧠</div>
                  Half
                  <div className="text-xs text-white/70 mt-1">Halfback, Five-Eighth</div>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">👤</div>
                    <div>
                      <p className="text-white font-bold text-lg">
                        {academy.position_type === 'forward' ? '💪 Forward' : 
                         academy.position_type === 'back' ? '⚡ Back' : '🧠 Half'} 
                        <span className="text-gray-400 font-normal ml-2">developing...</span>
                      </p>
                      <p className="text-gray-500 text-sm">Identity hidden until pulled</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-yellow-400">{academy.rounds_cooking}</div>
                  <div className="text-gray-400 text-sm">rounds cooking</div>
                </div>
              </div>
              
              {/* Progress indicator */}
              <div className="bg-gray-700 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-yellow-500 to-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (academy.rounds_cooking / 12) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mb-4">
                <span>Raw</span>
                <span>Developing</span>
                <span>Ready</span>
                <span>Prime 🌟</span>
              </div>

              {players.length >= 20 ? (
                <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-400 p-3 rounded mb-4">
                  ⚠️ Squad full (20 players). You must release a player to pull from academy.
                </div>
              ) : null}

              {!canPull ? (
                <div className="bg-gray-700 text-gray-400 p-3 rounded mb-4">
                  ⏳ Can pull in {roundsUntilPull} more round{roundsUntilPull !== 1 ? 's' : ''}
                </div>
              ) : null}

              <button
                onClick={() => openReleaseModal('pull')}
                disabled={!canPull || processing}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-lg transition"
              >
                {canPull ? '🎓 Pull Player from Academy' : `⏳ Wait ${roundsUntilPull} more rounds`}
              </button>
            </div>
          )}
        </div>

        {/* Free Agents */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">🏪 Free Agents</h2>
          
          {freeAgents.length === 0 ? (
            <p className="text-gray-400">No free agents available. Released players appear here after 1 round.</p>
          ) : (
            <div className="space-y-3">
              {freeAgents.map(fa => (
                <div key={fa.id} className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-white">{fa.players.overall}</div>
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
                  <button
                    onClick={() => openReleaseModal('claim', fa)}
                    disabled={players.length < 20 ? false : true}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition"
                  >
                    Claim
                  </button>
                </div>
              ))}
              
              <div className="text-gray-500 text-sm mt-4">
                💡 Priority goes to teams lower on the ladder. Your position: {ladderPosition}/10
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Release Modal */}
      {showReleaseModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-2">
              {actionType === 'pull' ? '🎓 Pull from Academy' : '🏪 Claim Free Agent'}
            </h3>
            <p className="text-gray-400 mb-4">
              Select a player to release to make room:
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
                      <div className="text-lg font-bold text-white">{player.overall}</div>
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
              <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded mb-4">
                ⚠️ <strong>{selectedPlayer.first_name} {selectedPlayer.last_name}</strong> will be released to free agents.
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReleaseModal(false);
                  setSelectedPlayer(null);
                  setActionType(null);
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={releaseAndComplete}
                disabled={!selectedPlayer || processing}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-lg transition"
              >
                {processing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
