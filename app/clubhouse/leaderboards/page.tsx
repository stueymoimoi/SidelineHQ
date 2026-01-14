'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface LeaderboardEntry {
  player_name: string;
  team_name: string;
  value: number;
}

export default function LeaderboardsPage() {
  const [division, setDivision] = useState(1);
  const [loading, setLoading] = useState(true);
  const [leaders, setLeaders] = useState<{
    points: LeaderboardEntry[];
    tries: LeaderboardEntry[];
    tryAssists: LeaderboardEntry[];
    metres: LeaderboardEntry[];
    tackles: LeaderboardEntry[];
    goals: LeaderboardEntry[];
    rating: LeaderboardEntry[];
    lineBreaks: LeaderboardEntry[];
    tackleBreaks: LeaderboardEntry[];
    errors: LeaderboardEntry[];
    motm: LeaderboardEntry[];
  }>({
    points: [],
    tries: [],
    tryAssists: [],
    metres: [],
    tackles: [],
    goals: [],
    rating: [],
    lineBreaks: [],
    tackleBreaks: [],
    errors: [],
    motm: []
  });

  useEffect(() => {
    loadLeaderboards();
  }, [division]);

  const loadLeaderboards = async () => {
    setLoading(true);
    
    // Get teams in this division
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')
      .eq('division', division);
    
    if (!teams || teams.length === 0) {
      setLoading(false);
      return;
    }
    
    const teamIds = teams.map(t => t.id);
    const teamMap: Record<string, string> = {};
    teams.forEach(t => { teamMap[t.id] = t.name; });
    
    // Get all player stats for teams in this division
    const { data: stats } = await supabase
      .from('player_match_stats')
      .select('*')
      .in('team_id', teamIds);
    
    if (!stats || stats.length === 0) {
      setLoading(false);
      return;
    }
    
    // Get current team info for all players
    const playerIds = [...new Set(stats.map(s => s.player_id))];
    const { data: players } = await supabase
      .from('players')
      .select('id, team_id')
      .in('id', playerIds);
    
    const playerCurrentTeam: Record<string, string | null> = {};
    players?.forEach(p => { playerCurrentTeam[p.id] = p.team_id; });
    
    // Get MOTM counts from match_results
    const { data: matchResults } = await supabase
      .from('match_results')
      .select('motm_player_id')
      .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`);
    
    const motmCounts: Record<string, number> = {};
    matchResults?.forEach(m => {
      if (m.motm_player_id) {
        motmCounts[m.motm_player_id] = (motmCounts[m.motm_player_id] || 0) + 1;
      }
    });
    
    // Aggregate stats by player
    const playerTotals: Record<string, {
      player_id: string;
      player_name: string;
      team_id: string | null;
      points: number;
      tries: number;
      tryAssists: number;
      metres: number;
      tackles: number;
      goals: number;
      errors: number;
      lineBreaks: number;
      tackleBreaks: number;
      games: number;
      totalRating: number;
    }> = {};
    
    for (const stat of stats) {
      const key = stat.player_id;
      if (!playerTotals[key]) {
        playerTotals[key] = {
          player_id: stat.player_id,
          player_name: stat.player_name,
          team_id: playerCurrentTeam[stat.player_id] || null,
          points: 0,
          tries: 0,
          tryAssists: 0,
          metres: 0,
          tackles: 0,
          goals: 0,
          errors: 0,
          lineBreaks: 0,
          tackleBreaks: 0,
          games: 0,
          totalRating: 0
        };
      }
      playerTotals[key].points += stat.points || 0;
      playerTotals[key].tries += stat.tries || 0;
      playerTotals[key].tryAssists += stat.try_assists || 0;
      playerTotals[key].metres += stat.metres || 0;
      playerTotals[key].tackles += stat.tackles || 0;
      playerTotals[key].goals += stat.goals_made || 0;
      playerTotals[key].errors += stat.errors || 0;
      playerTotals[key].lineBreaks += stat.line_breaks || 0;
      playerTotals[key].tackleBreaks += stat.tackle_breaks || 0;
      playerTotals[key].games += 1;
      playerTotals[key].totalRating += stat.rating || 6;
    }
    
    // Sort and get top 10 for each category
    const getTop10 = (sortFn: (a: any, b: any) => number, getValue: (p: any) => number) => {
      return [...Object.values(playerTotals)]
        .sort(sortFn)
        .slice(0, 10)
        .map(p => ({
          player_name: p.player_name,
          team_name: p.team_id ? (teamMap[p.team_id] || 'Unknown') : 'Free Agent',
          value: getValue(p)
        }));
    };
    
    // MOTM leaderboard (separate logic)
    const motmLeaders = Object.entries(motmCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([playerId, count]) => {
        const player = playerTotals[playerId];
        return {
          player_name: player?.player_name || 'Unknown',
          team_name: player?.team_id ? (teamMap[player.team_id] || 'Unknown') : 'Free Agent',
          value: count
        };
      });
    
    setLeaders({
      points: getTop10((a, b) => b.points - a.points, p => p.points),
      tries: getTop10((a, b) => b.tries - a.tries, p => p.tries),
      tryAssists: getTop10((a, b) => b.tryAssists - a.tryAssists, p => p.tryAssists),
      metres: getTop10((a, b) => b.metres - a.metres, p => p.metres),
      tackles: getTop10((a, b) => b.tackles - a.tackles, p => p.tackles),
      goals: getTop10((a, b) => b.goals - a.goals, p => p.goals),
      rating: getTop10((a, b) => (b.totalRating / b.games) - (a.totalRating / a.games), p => Math.round((p.totalRating / p.games) * 10) / 10),
      lineBreaks: getTop10((a, b) => b.lineBreaks - a.lineBreaks, p => p.lineBreaks),
      tackleBreaks: getTop10((a, b) => b.tackleBreaks - a.tackleBreaks, p => p.tackleBreaks),
      errors: getTop10((a, b) => b.errors - a.errors, p => p.errors),
      motm: motmLeaders
    });
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-6">
        <Link href="/clubhouse" className="text-sm text-gray-400 hover:text-white mb-4 inline-block">
          ← Back to Clubhouse
        </Link>
        
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">🏆 Division {division} Leaderboards</h1>
          
          {/* Division Selector */}
          <select
            value={division}
            onChange={(e) => setDivision(Number(e.target.value))}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(d => (
              <option key={d} value={d}>Division {d}</option>
            ))}
          </select>
        </div>
        
        {loading ? (
          <div className="text-center py-12">Loading leaderboards...</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* MOTM Leaders */}
            <LeaderboardCard 
              title="⭐ Most MOTM Awards" 
              entries={leaders.motm} 
              suffix=" awards"
              color="text-yellow-500"
            />
            
            {/* Points Leaders */}
            <LeaderboardCard 
              title="🏅 Top Points" 
              entries={leaders.points} 
              suffix=" pts"
              color="text-yellow-400"
            />
            
            {/* Try Scorers */}
            <LeaderboardCard 
              title="🏉 Top Try Scorers" 
              entries={leaders.tries} 
              suffix=" tries"
              color="text-green-400"
            />
            
            {/* Try Assists */}
            <LeaderboardCard 
              title="🎯 Top Try Assists" 
              entries={leaders.tryAssists} 
              suffix=" assists"
              color="text-teal-400"
            />
            
            {/* Metres */}
            <LeaderboardCard 
              title="🏃 Top Metres" 
              entries={leaders.metres} 
              suffix="m"
              color="text-blue-400"
            />
            
            {/* Line Breaks */}
            <LeaderboardCard 
              title="💨 Top Line Breaks" 
              entries={leaders.lineBreaks} 
              suffix=" breaks"
              color="text-sky-400"
            />
            
            {/* Tackle Breaks */}
            <LeaderboardCard 
              title="💪 Top Tackle Breaks" 
              entries={leaders.tackleBreaks} 
              suffix=" breaks"
              color="text-indigo-400"
            />
            
            {/* Tackles */}
            <LeaderboardCard 
              title="🛡️ Top Tacklers" 
              entries={leaders.tackles} 
              suffix=" tkl"
              color="text-purple-400"
            />
            
            {/* Goals */}
            <LeaderboardCard 
              title="🥅 Top Goal Kickers" 
              entries={leaders.goals} 
              suffix=" goals"
              color="text-cyan-400"
            />
            
            {/* Avg Rating */}
            <LeaderboardCard 
              title="📊 Best Avg Rating" 
              entries={leaders.rating} 
              suffix=""
              color="text-orange-400"
              isRating={true}
            />
            
            {/* Errors - Shame Board */}
            <LeaderboardCard 
              title="🤦 Most Errors" 
              entries={leaders.errors} 
              suffix=" err"
              color="text-red-400"
              isShame={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function LeaderboardCard({ 
  title, 
  entries, 
  suffix, 
  color,
  isRating = false,
  isShame = false
}: { 
  title: string; 
  entries: LeaderboardEntry[]; 
  suffix: string;
  color: string;
  isRating?: boolean;
  isShame?: boolean;
}) {
  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${isShame ? 'border border-red-900' : ''}`}>
      <h3 className="font-bold text-lg mb-3">{title}</h3>
      
      {entries.length === 0 ? (
        <p className="text-gray-500 text-sm">No data yet</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => (
            <div 
              key={idx} 
              className={`flex items-center justify-between py-1 ${idx === 0 ? 'bg-gray-700/50 rounded px-2 -mx-2' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-6 text-center font-bold ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                  {idx + 1}.
                </span>
                <div>
                  <p className="font-medium text-sm">{entry.player_name}</p>
                  <p className="text-gray-500 text-xs">{entry.team_name}</p>
                </div>
              </div>
              <span className={`font-bold ${color}`}>
                {isRating ? entry.value.toFixed(1) : entry.value}{suffix}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
