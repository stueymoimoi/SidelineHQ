'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Team {
  id: string;
  name: string;
  city: string;
  mascot: string;
  state: string;
  division: number;
  overall_rating: number;
  colors: { primary: string; secondary: string };
  wins: number;
  losses: number;
  draws: number;
}

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
  is_academy: boolean;
}

export default function TeamPage() {
  const params = useParams();
  const teamId = params.id as string;
  
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teamId) {
      fetchTeamAndPlayers();
    }
  }, [teamId]);

  async function fetchTeamAndPlayers() {
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (teamError) {
      console.error('Error fetching team:', teamError);
    } else {
      setTeam(teamData);
    }

    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId)
      .order('is_academy', { ascending: true })
      .order('overall', { ascending: false });

    if (playersError) {
      console.error('Error fetching players:', playersError);
    } else {
      setPlayers(playersData || []);
    }

    setLoading(false);
  }

  function getPositionColor(position: string) {
    const colors: { [key: string]: string } = {
      'Fullback': 'bg-purple-600',
      'Winger': 'bg-blue-600',
      'Centre': 'bg-green-600',
      'Five-Eighth': 'bg-yellow-600',
      'Halfback': 'bg-yellow-500',
      'Prop': 'bg-red-600',
      'Hooker': 'bg-orange-600',
      'Second Row': 'bg-pink-600',
      'Lock': 'bg-red-700',
      'Utility': 'bg-gray-500'
    };
    return colors[position] || 'bg-gray-500';
  }

  function getOverallColor(overall: number) {
    if (overall >= 85) return 'text-green-400';
    if (overall >= 75) return 'text-yellow-400';
    if (overall >= 65) return 'text-orange-400';
    return 'text-red-400';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading team...</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Team not found</div>
      </div>
    );
  }

  const seniorPlayers = players.filter(p => !p.is_academy);
  const academyPlayers = players.filter(p => p.is_academy);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-gray-400 hover:text-white transition">
              ← Back to Teams
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-green-500">Sideline</span>HQ
            </h1>
            <div></div>
          </div>
        </div>
      </header>

      <div 
        className="py-8"
        style={{ 
          background: `linear-gradient(135deg, ${team.colors?.primary || '#22c55e'} 0%, ${team.colors?.secondary || '#000'} 100%)`
        }}
      >
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-white drop-shadow-lg">{team.name}</h2>
          <p className="text-white/80 mt-1">{team.city}, {team.state}</p>
          <div className="flex gap-4 mt-4">
            <span className="bg-black/30 px-3 py-1 rounded text-white">
              Division {team.division}
            </span>
            <span className="bg-black/30 px-3 py-1 rounded text-white">
              {team.overall_rating} OVR
            </span>
            <span className="bg-black/30 px-3 py-1 rounded text-white">
              {team.wins}W - {team.draws}D - {team.losses}L
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h3 className="text-2xl font-bold mb-4">Senior Squad ({seniorPlayers.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {seniorPlayers.map(player => (
            <div 
              key={player.id}
              className="bg-gray-800 rounded-lg p-4 flex items-center gap-4"
            >
              <div className={`text-2xl font-bold ${getOverallColor(player.overall)}`}>
                {player.overall}
              </div>
              
              <div className="flex-1">
                <div className="font-semibold">
                  {player.first_name} {player.last_name}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded text-white ${getPositionColor(player.position)}`}>
                    {player.position}
                  </span>
                  <span className="text-gray-400 text-sm">Age {player.age}</span>
                </div>
              </div>

              <div className="text-xs text-gray-400 text-right">
                <div>SPD {player.speed}</div>
                <div>STR {player.strength}</div>
                <div>SKL {player.skill}</div>
              </div>
            </div>
          ))}
        </div>

        <h3 className="text-2xl font-bold mb-4">
          Academy ({academyPlayers.length})
          <span className="text-sm font-normal text-gray-400 ml-2">Developing talents</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {academyPlayers.map(player => (
            <div 
              key={player.id}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex items-center gap-4"
            >
              <div className={`text-2xl font-bold ${getOverallColor(player.overall)}`}>
                {player.overall}
              </div>
              
              <div className="flex-1">
                <div className="font-semibold">
                  {player.first_name} {player.last_name}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded text-white ${getPositionColor(player.position)}`}>
                    {player.position}
                  </span>
                  <span className="text-gray-400 text-sm">Age {player.age}</span>
                  <span className="text-yellow-500 text-xs">★ Academy</span>
                </div>
              </div>

              <div className="text-xs text-gray-400 text-right">
                <div>SPD {player.speed}</div>
                <div>STR {player.strength}</div>
                <div>SKL {player.skill}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
