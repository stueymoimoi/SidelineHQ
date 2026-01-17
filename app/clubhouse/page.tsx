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
  wins: number;
  draws: number;
  losses: number;
  points_for: number;
  points_against: number;
  division: number;
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
  age: number;
  overall: number;
}

// Season 0 schedule
const SEASON_0_START = new Date('2026-01-13T07:00:00Z');

function getRoundDates(): Date[] {
  const dates: Date[] = [];
  let current = new Date(SEASON_0_START);
  
  for (let round = 1; round <= 18; round++) {
    dates.push(new Date(current));
    const day = current.getDay();
    if (day === 2) current.setDate(current.getDate() + 2);
    else if (day === 4) current.setDate(current.getDate() + 3);
    else current.setDate(current.getDate() + 2);
  }
  return dates;
}

const ROUND_DATES = getRoundDates();

function getNextUpdateInfo(): { date: Date; round: number; dayName: string } {
  const now = new Date();
  for (let i = 0; i < ROUND_DATES.length; i++) {
    if (now < ROUND_DATES[i]) {
      return { 
        date: ROUND_DATES[i], 
        round: i + 1,
        dayName: ROUND_DATES[i].toLocaleDateString('en-AU', { weekday: 'long', timeZone: 'Australia/Sydney' })
      };
    }
  }
  return { date: ROUND_DATES[17], round: 18, dayName: 'Complete' };
}

export default function ClubhousePage() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [coach, setCoach] = useState<Coach | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [ladderPosition, setLadderPosition] = useState(1);
  const [nextMatch, setNextMatch] = useState<{ opponent: Team; isHome: boolean; round: number } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 90 seconds
    const interval = setInterval(loadData, 90000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      setUserId(user.id);

      const { data: coachData } = await supabase
        .from('coaches')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!coachData?.team_id) {
        router.push('/choose-team');
        return;
      }

      // Check if approved
      if (!coachData.approved) {
        router.push('/pending');
        return;
      }

      setCoach(coachData);

      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', coachData.team_id)
        .single();

      setTeam(teamData);

      // Get players for avg calculations
      const { data: playersData } = await supabase
        .from('players')
        .select('id, age, overall')
        .eq('team_id', coachData.team_id);

      setPlayers(playersData || []);

      // Calculate ladder position within division
      const { data: allTeams } = await supabase
        .from('teams')
        .select('*')
        .eq('division', teamData?.division || 1);

      if (allTeams) {
        const sorted = allTeams.sort((a, b) => {
          const aPoints = (a.wins * 2) + a.draws;
          const bPoints = (b.wins * 2) + b.draws;
          if (bPoints !== aPoints) return bPoints - aPoints;
          const aDiff = a.points_for - a.points_against;
          const bDiff = b.points_for - b.points_against;
          return bDiff - aDiff;
        });
        const pos = sorted.findIndex(t => t.id === coachData.team_id) + 1;
        setLadderPosition(pos);

        // Get next match
        const { data: fixtures } = await supabase
          .from('fixtures')
          .select('*')
          .eq('season', 0)
          .eq('played', false)
          .or(`home_team_id.eq.${coachData.team_id},away_team_id.eq.${coachData.team_id}`)
          .order('round', { ascending: true })
          .limit(1);

        if (fixtures && fixtures.length > 0) {
          const fixture = fixtures[0];
          const isHome = fixture.home_team_id === coachData.team_id;
          const opponentId = isHome ? fixture.away_team_id : fixture.home_team_id;
          const opponent = allTeams.find(t => t.id === opponentId);
          if (opponent) {
            setNextMatch({ opponent, isHome, round: fixture.round });
          }
        }
        
        // Get unread notification count
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', coachData.team_id)
          .eq('read', false);
        
        setUnreadCount(count || 0);
      }

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // Calculate averages
  const avgOvr = players.length > 0 
    ? Math.round(players.reduce((sum, p) => sum + p.overall, 0) / players.length) 
    : 0;
  
  const avgAge = players.length > 0 
    ? (players.reduce((sum, p) => sum + p.age, 0) / players.length).toFixed(1)
    : '0';

  const nextUpdate = getNextUpdateInfo();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Team Banner */}
      <div 
        className="p-6 pb-8"
        style={{
          background: `linear-gradient(135deg, ${team?.primary_color} 0%, ${team?.secondary_color} 100%)`
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/70 text-sm mb-1">Welcome back, {coach?.coach_name || 'Coach'}</p>
              <h1 className="text-4xl font-bold text-white mb-1">
                {team?.name}
              </h1>
              <p className="text-white/80">
                Division {team?.division} • {getOrdinal(ladderPosition)} Place • {team?.wins}-{team?.draws}-{team?.losses}
              </p>
            </div>
            <Link href="/clubhouse/notifications" className="relative">
              <div className="text-4xl">🔔</div>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 -mt-4 flex-1">
        
        {/* Next Match Card */}
        {nextMatch && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">NEXT MATCH • Round {nextMatch.round}</p>
                <p className="text-white text-xl font-bold mt-1">
                  {nextMatch.isHome ? 'vs' : '@'} {nextMatch.opponent.name}
                </p>
                <p className="text-gray-500 text-sm">{nextMatch.isHome ? 'Home' : 'Away'}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">{nextUpdate.dayName} 6pm</p>
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold mt-1"
                  style={{ 
                    backgroundColor: nextMatch.opponent.primary_color,
                    color: nextMatch.opponent.secondary_color 
                  }}
                >
                  {nextMatch.opponent.city.substring(0, 3).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-xs">Ladder</p>
            <p className="text-white text-2xl font-bold">{getOrdinal(ladderPosition)}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-xs">Avg OVR</p>
            <p className="text-blue-400 text-2xl font-bold">{avgOvr}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-xs">Avg Age</p>
            <p className="text-yellow-400 text-2xl font-bold">{avgAge}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-xs">Level</p>
            <p className="text-green-400 text-2xl font-bold">{coach?.level || 1}</p>
          </div>
        </div>

        {/* Main Navigation - Primary */}
        <h2 className="text-white font-bold mb-3">Manage Team</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Link href="/clubhouse/squad" className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-700 transition border-2 border-transparent hover:border-green-500">
            <div className="text-4xl mb-2">👥</div>
            <p className="text-white font-bold">Squad</p>
            <p className="text-gray-500 text-sm">View players</p>
          </Link>
          <Link href="/clubhouse/tactics" className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-700 transition border-2 border-transparent hover:border-green-500">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-white font-bold">Tactics</p>
            <p className="text-gray-500 text-sm">Set lineup</p>
          </Link>
          <Link href="/clubhouse/training" className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-700 transition border-2 border-transparent hover:border-green-500">
            <div className="text-4xl mb-2">💪</div>
            <p className="text-white font-bold">Training</p>
            <p className="text-gray-500 text-sm">Develop players</p>
          </Link>
          <Link href="/clubhouse/film-room" className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-700 transition border-2 border-transparent hover:border-yellow-500">
            <div className="text-4xl mb-2">🎬</div>
            <p className="text-white font-bold">Film Room</p>
            <p className="text-gray-500 text-sm">Scout opponent</p>
          </Link>
        </div>

        {/* Secondary Navigation */}
        <h2 className="text-white font-bold mb-3">League</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Link href="/clubhouse/fixtures" className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-700 transition border-2 border-transparent hover:border-green-500">
            <div className="text-4xl mb-2">📅</div>
            <p className="text-white font-bold">Fixtures</p>
            <p className="text-gray-500 text-sm">Match schedule</p>
          </Link>
          <Link href="/clubhouse/ladder" className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-700 transition border-2 border-transparent hover:border-green-500">
            <div className="text-4xl mb-2">🏆</div>
            <p className="text-white font-bold">Ladder</p>
            <p className="text-gray-500 text-sm">Standings</p>
          </Link>
          <Link href="/clubhouse/leaderboards" className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-700 transition border-2 border-transparent hover:border-green-500">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-white font-bold">Leaderboards</p>
            <p className="text-gray-500 text-sm">Top performers</p>
          </Link>
          <Link href="/clubhouse/rep-teams" className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-700 transition border-2 border-transparent hover:border-green-500">
            <div className="text-4xl mb-2">🏅</div>
            <p className="text-white font-bold">Rep Teams</p>
            <p className="text-gray-500 text-sm">Origin & National</p>
          </Link>
        </div>

        {/* Tertiary Navigation */}
        <h2 className="text-white font-bold mb-3">Development</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/clubhouse/academy" className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-700 transition border-2 border-transparent hover:border-green-500">
            <div className="text-4xl mb-2">🎓</div>
            <p className="text-white font-bold">Dev Squad</p>
            <p className="text-gray-500 text-sm">Youth players</p>
          </Link>
          <Link href="/clubhouse/free-agents" className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-700 transition border-2 border-transparent hover:border-green-500">
            <div className="text-4xl mb-2">🏪</div>
            <p className="text-white font-bold">Free Agents</p>
            <p className="text-gray-500 text-sm">Sign players</p>
          </Link>
          <Link href="/guide" className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-700 transition border-2 border-transparent hover:border-green-500">
            <div className="text-4xl mb-2">📖</div>
            <p className="text-white font-bold">Coach Guide</p>
            <p className="text-gray-500 text-sm">How to play</p>
          </Link>
          {userId === 'b0c4c970-ac17-4be8-9b35-68d321a166ad' && (
            <Link href="/admin" className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-700 transition border-2 border-transparent hover:border-yellow-500">
              <div className="text-4xl mb-2">🔐</div>
              <p className="text-white font-bold">Admin</p>
              <p className="text-gray-500 text-sm">Manage league</p>
            </Link>
          )}
        </div>

        {/* Sign Out */}
        <div className="mt-8 text-center">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/auth');
            }}
            className="text-gray-500 hover:text-gray-300 text-sm"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-950 border-t border-gray-800 py-6 mt-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="text-gray-500 text-sm">
                © 2026 SidelineHQ. All rights reserved.
              </p>
              <p className="text-gray-600 text-xs mt-1">
                Season 0 • Built with ☕ in Brisbane
              </p>
            </div>
            <div className="flex gap-4">
              <a href="https://twitter.com/SidelineHQ" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition">
                𝕏
              </a>
              <a href="https://discord.gg/sidelinehq" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition">
                Discord
              </a>
              <a href="mailto:support@sidelinehq.app" className="text-gray-500 hover:text-white transition text-sm">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}