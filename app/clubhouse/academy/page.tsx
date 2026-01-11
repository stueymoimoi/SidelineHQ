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

interface Coach {
  id: string;
  team_id: string;
  last_academy_pull_round: number;
}

export default function DevelopmentSquadPage() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [coach, setCoach] = useState<Coach | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedPositionType, setSelectedPositionType] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [newPlayer, setNewPlayer] = useState<Player | null>(null);
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

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = (positionType: string) => {
    setSelectedPositionType(positionType);
    if (players.length >= 22) {
      setShowReleaseModal(true);
    } else {
      generateAndAddPlayer(positionType, null);
    }
  };

  const generateAndAddPlayer = async (positionType: string, releasePlayerId: string | null) => {
    if (!team || !coach) return;
    setProcessing(true);

    try {
      // Release player if needed
      if (releasePlayerId) {
        // Move to free agents
        await supabase.from('free_agents').insert({
          player_id: releasePlayerId,
          released_by_team_id: team.id,
          available_round: currentRound + 1
        });

        // Remove from team
        await supabase.from('players').delete().eq('id', releasePlayerId);
      }

      // Position groups
      const positions: Record<string, string[]> = {
        forward: ['Prop', 'Second Row', 'Lock'],
        back: ['Fullback', 'Winger', 'Centre'],
        half: ['Halfback', 'Five-Eighth', 'Hooker']
      };

      const posOptions = positions[positionType];
      const position = posOptions[Math.floor(Math.random() * posOptions.length)];

      // Random Aussie names
      const firstNames = ['Jack', 'Liam', 'Noah', 'Oliver', 'James', 'Ethan', 'Lucas', 'Mason', 'Logan', 'Alex', 'Ryan', 'Cooper', 'Riley', 'Harrison', 'Jordan', 'Kai', 'Tyler', 'Blake', 'Mitchell', 'Cameron', 'Dylan', 'Hunter', 'Ashton', 'Bailey', 'Caleb', 'Daniel', 'Flynn', 'Hamish', 'Isaac', 'Jesse'];
      const lastNames = ['Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Johnson', 'White', 'Martin', 'Thompson', 'Anderson', 'Walker', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Young', 'King', 'Scott', 'Mitchell', 'Campbell', 'Edwards', 'Murphy', 'Collins', 'Stewart', 'Morris', 'Rogers', 'Reed', 'Cook', 'Morgan'];

      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

      // Generate quality based on luck
      // Base: 55-70, with rare chance for gems
      const luck = Math.random() * 100;
      let baseOverall: number;
      let potential: number;

      if (luck < 2) {
        // 2% - Generational talent
        baseOverall = 70 + Math.floor(Math.random() * 10); // 70-79
        potential = 90 + Math.floor(Math.random() * 5); // 90-94
      } else if (luck < 10) {
        // 8% - Gun prospect
        baseOverall = 65 + Math.floor(Math.random() * 10); // 65-74
        potential = 82 + Math.floor(Math.random() * 8); // 82-89
      } else if (luck < 40) {
        // 30% - Solid prospect
        baseOverall = 58 + Math.floor(Math.random() * 10); // 58-67
        potential = 72 + Math.floor(Math.random() * 10); // 72-81
      } else {
        // 60% - Average youth
        baseOverall = 50 + Math.floor(Math.random() * 12); // 50-61
        potential = 62 + Math.floor(Math.random() * 10); // 62-71
      }

      // Generate stats around base overall
      const variance = () => Math.floor(Math.random() * 12) - 6;
      const speed = Math.max(45, Math.min(85, baseOverall + variance()));
      const strength = Math.max(45, Math.min(85, baseOverall + variance()));
      const skill = Math.max(45, Math.min(85, baseOverall + variance()));
      const stamina = Math.max(45, Math.min(85, baseOverall + variance()));
      const defense = Math.max(45, Math.min(85, baseOverall + variance()));

      // Calculate actual overall from stats
      const actualOverall = Math.round((speed + strength + skill + stamina + defense) / 5);

      // Kicking based on position
      let kicking = 30 + Math.floor(Math.random() * 20);
      if (position === 'Halfback' || position === 'Fullback') kicking = 50 + Math.floor(Math.random() * 25);
      if (position === 'Five-Eighth' || position === 'Hooker') kicking = 45 + Math.floor(Math.random() * 20);

      // Insert new player
      const { data: newPlayerData, error } = await supabase
        .from('players')
        .insert({
          team_id: team.id,
          first_name: firstName,
          last_name: lastName,
          position: position,
          age: 18,
          overall: actualOverall,
          potential: potential,
          speed: speed,
          strength: strength,
          skill: skill,
          stamina: stamina,
          defense: defense,
          kicking: kicking,
          fatigue: 0,
          is_u21: false
        })
        .select()
        .single();

      if (error) throw error;

      // Update coach last pull round
      await supabase
        .from('coaches')
        .update({ last_academy_pull_round: currentRound })
        .eq('id', coach.id);

      // Show the new player
      setNewPlayer(newPlayerData);

      // Reload data
      await loadData();

    } catch (err) {
      console.error('Error promoting player:', err);
    } finally {
      setProcessing(false);
      setShowReleaseModal(false);
      setSelectedPlayer(null);
      setSelectedPositionType(null);
    }
  };

  const canPromote = coach && (currentRound - (coach.last_academy_pull_round || 0)) >= 6;
  const roundsUntilPromote = coach ? Math.max(0, 6 - (currentRound - (coach.last_academy_pull_round || 0))) : 6;

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
          <h1 className="text-3xl font-bold text-white">🎓 Development Squad</h1>
          <p className="text-white/70 mt-1">Promote youth talent to your senior squad</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        
        {/* Promote Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-2">Promote a Youth Player</h2>
          <p className="text-gray-400 mb-4">
            Select a position group to promote a random youth player to your senior squad.
            Quality varies - you might get a future star or a squad filler!
          </p>

          {!canPromote && (
            <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-400 p-3 rounded mb-4">
              ⏳ You can promote again in <strong>{roundsUntilPromote}</strong> round{roundsUntilPromote !== 1 ? 's' : ''}
            </div>
          )}

          {players.length >= 22 && canPromote && (
            <div className="bg-blue-500/20 border border-blue-500 text-blue-400 p-3 rounded mb-4">
              📋 Squad full (22 players). You'll need to release someone to make room.
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => handlePromote('forward')}
              disabled={!canPromote || processing}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-6 px-4 rounded-lg transition"
            >
              <div className="text-3xl mb-2">💪</div>
              <div className="text-lg">Forward</div>
              <div className="text-xs text-white/70 mt-1">Prop, 2nd Row, Lock</div>
            </button>
            <button
              onClick={() => handlePromote('back')}
              disabled={!canPromote || processing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-6 px-4 rounded-lg transition"
            >
              <div className="text-3xl mb-2">⚡</div>
              <div className="text-lg">Back</div>
              <div className="text-xs text-white/70 mt-1">Fullback, Winger, Centre</div>
            </button>
            <button
              onClick={() => handlePromote('half')}
              disabled={!canPromote || processing}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-6 px-4 rounded-lg transition"
            >
              <div className="text-3xl mb-2">🧠</div>
              <div className="text-lg">Half</div>
              <div className="text-xs text-white/70 mt-1">Halfback, Five-Eighth, Hooker</div>
            </button>
          </div>

          <div className="mt-4 text-gray-500 text-sm">
            💡 Youth quality is random. Rare gems (2%) can have 70+ overall!
          </div>
        </div>

        {/* Squad Count */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Current Squad Size</span>
            <span className={`text-xl font-bold ${players.length >= 22 ? 'text-red-400' : 'text-green-400'}`}>
              {players.length}/22
            </span>
          </div>
        </div>
      </div>

      {/* Release Modal */}
      {showReleaseModal && selectedPositionType && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-2">Release a Player</h3>
            <p className="text-gray-400 mb-4">
              Squad is full. Select a player to release to make room:
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
              <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded mb-4">
                ⚠️ <strong>{selectedPlayer.first_name} {selectedPlayer.last_name}</strong> will be released to free agents.
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReleaseModal(false);
                  setSelectedPlayer(null);
                  setSelectedPositionType(null);
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => generateAndAddPlayer(selectedPositionType, selectedPlayer?.id || null)}
                disabled={!selectedPlayer || processing}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-lg transition"
              >
                {processing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Player Reveal Modal */}
      {newPlayer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-white mb-2">New Player!</h3>
            
            <div className="bg-gray-700 rounded-lg p-4 mb-4">
              <div className={`text-4xl font-bold ${getOverallColor(newPlayer.overall)} mb-2`}>
                {newPlayer.overall}
              </div>
              <p className="text-white text-xl font-bold">{newPlayer.first_name} {newPlayer.last_name}</p>
              <span className={`inline-block text-sm px-3 py-1 rounded text-white mt-2 ${getPositionColor(newPlayer.position)}`}>
                {newPlayer.position}
              </span>
              <p className="text-gray-400 mt-2">Age {newPlayer.age}</p>
            </div>

            {newPlayer.overall >= 70 && (
              <div className="bg-green-500/20 border border-green-500 text-green-400 p-2 rounded mb-4">
                ⭐ Rare talent! This one could be special!
              </div>
            )}

            <button
              onClick={() => setNewPlayer(null)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
