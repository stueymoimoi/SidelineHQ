// /app/api/player/[id]/recent-stats/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/player/[id]/recent-stats
 * 
 * Returns last 5 matches for a player with full stats
 * Used by Player Profile "Recent Performance" UI
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase();
  const { id: playerId } = await params;

  if (!playerId) {
    return NextResponse.json({ error: 'Player ID required' }, { status: 400 });
  }

  try {
    // Fetch last 5 matches for this player
    const { data: recentStats, error } = await supabase
      .from('player_match_stats')
      .select(`
        id,
        fixture_id,
        team_id,
        jersey_number,
        minutes_played,
        rating,
        tries,
        try_assists,
        goals_made,
        goals_attempted,
        metres,
        tackles,
        missed_tackles,
        line_breaks,
        tackle_breaks,
        errors,
        created_at
      `)
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching recent stats:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!recentStats || recentStats.length === 0) {
      return NextResponse.json({
        player_id: playerId,
        matches: [],
        total_matches: 0,
        averages: null,
      });
    }

    // Get fixture details
    const fixtureIds = [...new Set(recentStats.map((s: any) => s.fixture_id).filter(Boolean))];
    
    let fixturesMap: Record<string, any> = {};
    if (fixtureIds.length > 0) {
      const { data: fixtures } = await supabase
        .from('fixtures')
        .select('id, round, season, home_team_id, away_team_id')
        .in('id', fixtureIds);
      
      (fixtures || []).forEach((f: any) => { fixturesMap[f.id] = f; });
    }

    // Get all team IDs from fixtures
    const teamIds = [...new Set(
      Object.values(fixturesMap)
        .flatMap((f: any) => [f.home_team_id, f.away_team_id])
        .filter(Boolean)
    )];

    let teamsMap: Record<string, any> = {};
    if (teamIds.length > 0) {
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name, short_name')
        .in('id', teamIds);
      
      (teams || []).forEach((t: any) => { teamsMap[t.id] = t; });
    }

    // Transform data for frontend
    const formattedStats = recentStats.map((stat: any) => {
      const fixture = fixturesMap[stat.fixture_id];
      const isHome = stat.team_id === fixture?.home_team_id;
      const opponentId = isHome ? fixture?.away_team_id : fixture?.home_team_id;
      const opponent = teamsMap[opponentId] || null;
      const playerTeam = teamsMap[stat.team_id] || null;

      return {
        id: stat.id,
        round: fixture?.round ?? null,
        season: fixture?.season ?? null,
        opponent: opponent ? {
          id: opponent.id,
          name: opponent.name,
          short_name: opponent.short_name,
        } : null,
        isHome,
        jersey_number: stat.jersey_number,
        minutes_played: stat.minutes_played,
        rating: stat.rating,
        tries: stat.tries,
        try_assists: stat.try_assists,
        metres: stat.metres,
        line_breaks: stat.line_breaks,
        tackle_breaks: stat.tackle_breaks,
        goals_made: stat.goals_made,
        goals_attempted: stat.goals_attempted,
        tackles: stat.tackles,
        missed_tackles: stat.missed_tackles,
        errors: stat.errors,
        played_at: stat.created_at,
      };
    });

    // Calculate averages
    const totalMatches = formattedStats.length;
    const averages = {
      rating: +(formattedStats.reduce((sum: number, s: any) => sum + (parseFloat(s.rating) || 0), 0) / totalMatches).toFixed(1),
      metres: Math.round(formattedStats.reduce((sum: number, s: any) => sum + (s.metres || 0), 0) / totalMatches),
      tackles: Math.round(formattedStats.reduce((sum: number, s: any) => sum + (s.tackles || 0), 0) / totalMatches),
      tries: +(formattedStats.reduce((sum: number, s: any) => sum + (s.tries || 0), 0) / totalMatches).toFixed(2),
      try_assists: +(formattedStats.reduce((sum: number, s: any) => sum + (s.try_assists || 0), 0) / totalMatches).toFixed(2),
    };

    return NextResponse.json({
      player_id: playerId,
      matches: formattedStats,
      total_matches: totalMatches,
      averages,
    });

  } catch (error) {
    console.error('Recent stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}