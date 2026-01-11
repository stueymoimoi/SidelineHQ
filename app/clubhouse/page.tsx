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
  state: string;
  primary_color: string;
  secondary_color: string;
  division: number;
  wins: number;
  draws: number;
  losses: number;
  points_for: number;
  points_against: number;
}

interface Coach {
  id: string;
  coach_name: string;
  team_id: string;
  xp: number;
  level: number;
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  overall: number;
  age: number;
  fatigue: number;
}

export default function ClubhousePage() {
  const [coach, setCoach] = useState<Coach | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [ladderPosition, setLadderPosition] = useState<number>(0);
  
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      // Get coach profile
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

      // Get team
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', coachData.team_id)
        .single();

      setTeam(teamData);

      // Get players
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', coachData.team_id)
        .eq('is_u21', false)
        .order('overall', { ascending: false });

      setPlayers(playersData || []);

      // Get ladder position
      const { data: allTeams } = await supabase
        .from('teams')
        .select('id, wins, points_for, points_against')
        .eq('division', teamData?.division || 1)
        .order('wins', { ascending: false });

      if (allTeams) {
        const sorted = allTeams.sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins;
          return (b.points_for - b.points_against) - (a.points_for - a.points_against);
        });
        const pos = sorted.findIndex(t => t.id === coachData.team_id) + 1;
        setLadderPosition(pos);
      }

    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading clubhouse...</div>
      </div>
    );
  }

  if (!team || !coach) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Team not found</div>
      </div>
    );
  }

  const fatigued = players.filter(p => (p.fatigue || 0) >= 60).length;
  const topPlayer = players[0];
  const avgOvr = players.length > 0 
    ? Math.round(players.reduce((sum, p) => sum + p.overall, 0) / players.length)
    : 0;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header Banner */}
      <div 
        className="p-8"
        style={{
          background: `linear-gradient(135deg, ${team.primary_color} 0%, ${team.secondary_color} 100%)`
        }}
      >
        <div className="max-w-6xl mx-auto">
          <p className="text-white/70 mb-1">Welcome back, Coach {coach.coach_name}</p>
          <h1 className="text-4xl font-bold text-white">{team.name}</h1>
          <p className="text-white/80 mt-1">{team.city}, {team.state}</p>
          
          <div className="flex gap-4 mt-4">
            <span className="bg-black/30 px-4 py-2 rounded-lg text-white">
              Division {team.division}
            </span>
            <span className="bg-black/30 px-4 py-2 rounded-lg text-white">
              {avgOvr} OVR
            </span>
            <span className="bg-black/30 px-4 py-2 rounded-lg text-white">
              {team.wins}W - {team.draws}D - {team.losses}L
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-gray-400 text-sm">Ladder Position</p>
            <p className="text-3xl font-bold text-white">{ladderPosition}{ladderPosition === 1 ? 'st' : ladderPosition === 2 ? 'nd' : ladderPosition === 3 ? 'rd' : 'th'}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-gray-400 text-sm">Point Difference</p>
            <p className={`text-3xl font-bold ${(team.points_for - team.points_against) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {(team.points_for - team.points_against) >= 0 ? '+' : ''}{team.points_for - team.points_against}
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-gray-400 text-sm">Coach XP</p>
            <p className="text-3xl font-bold text-yellow-500">{coach.xp} XP</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-gray-400 text-sm">Coach Level</p>
            <p className="text-3xl font-bold text-purple-500">Level {coach.level}</p>
          </div>
        </div>

        {/* Alerts */}
        {fatigued > 0 && (
          <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-400 px-4 py-3 rounded-lg mb-6">
            ⚠️ <strong>{fatigued} players</strong> are fatigued (60%+) and need rest!
          </div>
        )}

        {/* Top Player */}
        {topPlayer && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <p className="text-gray-400 text-sm mb-2">⭐ Best Player</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-white">{topPlayer.first_name} {topPlayer.last_name}</p>
                <p className="text-gray-400">{topPlayer.position} • Age {topPlayer.age}</p>
              </div>
              <div className="bg-green-600 text-white px-4 py-2 rounded-lg text-2xl font-bold">
                {topPlayer.overall}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <h2 className="text-xl font-bold text-white mb-4">Manage Team</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/clubhouse/squad" className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 text-center transition">
            <div className="text-4xl mb-2">👥</div>
            <p className="text-white font-semibold">Squad</p>
            <p className="text-gray-400 text-sm">View players</p>
          </Link>
          
          <Link href="/clubhouse/tactics" className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 text-center transition">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-white font-semibold">Tactics</p>
            <p className="text-gray-400 text-sm">Set lineup</p>
          </Link>
          
          <Link href="/clubhouse/training" className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 text-center transition">
            <div className="text-4xl mb-2">💪</div>
            <p className="text-white font-semibold">Training</p>
            <p className="text-gray-400 text-sm">Develop players</p>
          </Link>
          
          <Link href="/clubhouse/fixtures" className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 text-center transition">
            <div className="text-4xl mb-2">📅</div>
            <p className="text-white font-semibold">Fixtures</p>
            <p className="text-gray-400 text-sm">Match schedule</p>
          </Link>
          
          <Link href="/clubhouse/ladder" className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 text-center transition">
            <div className="text-4xl mb-2">🏆</div>
            <p className="text-white font-semibold">Ladder</p>
            <p className="text-gray-400 text-sm">Standings</p>
          </Link>
          
          <Link href="/clubhouse/finances" className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 text-center transition">
            <div className="text-4xl mb-2">💰</div>
            <p className="text-white font-semibold">Finances</p>
            <p className="text-gray-400 text-sm">Money & wages</p>
          </Link>
          
          <Link href="/clubhouse/history" className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 text-center transition">
            <div className="text-4xl mb-2">📜</div>
            <p className="text-white font-semibold">History</p>
            <p className="text-gray-400 text-sm">Club records</p>
          </Link>
          
          <Link href="/clubhouse/rivals" className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 text-center transition">
            <div className="text-4xl mb-2">👀</div>
            <p className="text-white font-semibold">Scout</p>
            <p className="text-gray-400 text-sm">View other teams</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
