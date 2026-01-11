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

interface Team {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
}

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

  const getOvrColor = (ovr: number) => {
    if (ovr >= 85) return 'bg-green-500';
    if (ovr >= 80) return 'bg-green-600';
    if (ovr >= 75) return 'bg-yellow-500';
    if (ovr >= 70) return 'bg-orange-500';
    return 'bg-red-500';
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
                  <p className="text-gray-400 text-xs">{player.first_name}</p>
                  <p className="text-white font-bold text-lg">{player.last_name}</p>
                  <div className="flex gap-2 mt-1">
                    <span className={`${getPositionColor(player.position)} text-white text-xs px-2 py-1 rounded`}>
                      {player.position}
                    </span>
                    {player.secondary_position && (
                      <span className="bg-gray-600 text-white text-xs px-2 py-1 rounded">
                        {player.secondary_position}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`${getOvrColor(player.overall)} text-white px-3 py-1 rounded-lg font-bold text-lg`}>
                  {player.overall}
                </span>
              </div>
              
              <div className="flex justify-between text-sm text-gray-400 mt-3">
                <span>Age: {player.age}</span>
                <span className={getFatigueColor(player.fatigue || 0)}>
                  Fatigue: {player.fatigue || 0}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-400 text-sm">{selectedPlayer.first_name}</p>
                <h2 className="text-2xl font-bold text-white">{selectedPlayer.last_name}</h2>
                <div className="flex gap-2 mt-2">
                  <span className={`${getPositionColor(selectedPlayer.position)} text-white text-sm px-3 py-1 rounded`}>
                    {selectedPlayer.position}
                  </span>
                  {selectedPlayer.secondary_position && (
                    <span className="bg-gray-600 text-white text-sm px-3 py-1 rounded">
                      {selectedPlayer.secondary_position}
                    </span>
                  )}
                </div>
              </div>
              <span className={`${getOvrColor(selectedPlayer.overall)} text-white px-4 py-2 rounded-lg font-bold text-2xl`}>
                {selectedPlayer.overall}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-700 rounded p-3">
                <p className="text-gray-400 text-sm">Age</p>
                <p className="text-white text-xl font-bold">{selectedPlayer.age}</p>
              </div>
              <div className="bg-gray-700 rounded p-3">
                <p className="text-gray-400 text-sm">Fatigue</p>
                <p className={`text-xl font-bold ${getFatigueColor(selectedPlayer.fatigue || 0)}`}>
                  {selectedPlayer.fatigue || 0}%
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Speed</span>
                  <span className="text-white">{selectedPlayer.speed}</span>
                </div>
                <div className="bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${selectedPlayer.speed}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Strength</span>
                  <span className="text-white">{selectedPlayer.strength}</span>
                </div>
                <div className="bg-gray-700 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: `${selectedPlayer.strength}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Skill</span>
                  <span className="text-white">{selectedPlayer.skill}</span>
                </div>
                <div className="bg-gray-700 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${selectedPlayer.skill}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Stamina</span>
                  <span className="text-white">{selectedPlayer.stamina}</span>
                </div>
                <div className="bg-gray-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${selectedPlayer.stamina}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Defense</span>
                  <span className="text-white">{selectedPlayer.defense}</span>
                </div>
                <div className="bg-gray-700 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${selectedPlayer.defense}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Kicking</span>
                  <span className="text-white">{selectedPlayer.kicking}</span>
                </div>
                <div className="bg-gray-700 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${selectedPlayer.kicking}%` }}></div>
                </div>
              </div>
            </div>

            {selectedPlayer.current_training && (
              <div className="bg-gray-700 rounded p-3 mb-4">
                <p className="text-gray-400 text-sm">Current Training</p>
                <p className="text-white font-semibold">{selectedPlayer.current_training}</p>
                <p className="text-yellow-500 text-sm">{selectedPlayer.training_progress || 'NONE'}</p>
              </div>
            )}

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