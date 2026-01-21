import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Jersey number to position mapping
const JERSEY_TO_POSITION: Record<number, string> = {
  1: 'Fullback',
  2: 'Wing',
  3: 'Centre',
  4: 'Centre',
  5: 'Wing',
  6: 'Five-Eighth',
  7: 'Halfback',
  8: 'Prop',
  9: 'Hooker',
  10: 'Prop',
  11: 'Second Row',
  12: 'Second Row',
  13: 'Lock',
  14: 'Bench',
  15: 'Bench',
  16: 'Bench',
  17: 'Bench',
};

interface PlayerMatchStat {
  id: string;
  player_id: string;
  team_id: string;
  jersey_number: number;
  rating: number;
  tries: number;
  try_assists: number;
  metres: number;
  tackles: number;
  missed_tackles: number;
  line_breaks: number;
  tackle_breaks: number;
  errors: number;
  goals_made: number;
  goals_attempted: number;
  points: number;
  minutes_played: number;
  player_name: string;
  fixture_id: string;
  ovr?: number;
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  overall: number;
  age: number;
  team_id: string;
}

interface Team {
  id: string;
  name: string;
  division: number;
}

interface TOTWPlayer {
  jersey_number: number;
  position_played: string;
  player_id: string;
  player_name: string;
  natural_position: string;
  age: number | undefined;
  overall: number;
  team_id: string;
  team_name: string;
  team_division: number | undefined;
  rating: number;
  stats: {
    tries: number;
    try_assists: number;
    metres: number;
    tackles: number;
    missed_tackles: number;
    line_breaks: number;
    tackle_breaks: number;
    errors: number;
    goals_made: number;
    goals_attempted: number;
    points: number;
    minutes_played: number;
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const roundParam = searchParams.get('round');
  const divisionParam = searchParams.get('division');
  
  try {
    // Get the latest completed round if not specified
    let round = roundParam ? parseInt(roundParam) : null;
    
    if (!round) {
      const { data: latestFixture } = await supabase
        .from('fixtures')
        .select('round')
        .eq('played', true)
        .order('round', { ascending: false })
        .limit(1)
        .single();
      
      round = latestFixture?.round || 1;
    }
    
    // Get all fixture IDs for this round (optionally filtered by division)
    let fixturesQuery = supabase
      .from('fixtures')
      .select('id, division')
      .eq('round', round)
      .eq('played', true)
    
    if (divisionParam && divisionParam !== 'all') {
      fixturesQuery = fixturesQuery.eq('division', parseInt(divisionParam));
    }
    
    const { data: fixtures, error: fixturesError } = await fixturesQuery;
    
    if (fixturesError) throw fixturesError;
    if (!fixtures || fixtures.length === 0) {
      return NextResponse.json({ 
        round, 
        division: divisionParam || 'all',
        team: [],
        message: 'No completed fixtures for this round' 
      });
    }
    
    const fixtureIds = fixtures.map((f: { id: string }) => f.id);
    
    // Get all player stats for these fixtures
    const { data: stats, error: statsError } = await supabase
      .from('player_match_stats')
      .select(`
        id,
        player_id,
        team_id,
        jersey_number,
        rating,
        tries,
        try_assists,
        metres,
        tackles,
        missed_tackles,
        line_breaks,
        tackle_breaks,
        errors,
        goals_made,
        goals_attempted,
        points,
        minutes_played,
        player_name,
        fixture_id,
        ovr
      `)
      .in('fixture_id', fixtureIds)
      .gte('jersey_number', 1)
      .lte('jersey_number', 17)
      .order('rating', { ascending: false });
    
    if (statsError) throw statsError;
    if (!stats || stats.length === 0) {
      return NextResponse.json({ 
        round, 
        division: divisionParam || 'all',
        team: [],
        message: 'No player stats for this round' 
      });
    }
    
    // Get player details
    const playerIds = [...new Set((stats as PlayerMatchStat[]).map(s => s.player_id))];
    const { data: players } = await supabase
      .from('players')
      .select('id, first_name, last_name, position, overall, age, team_id')
      .in('id', playerIds);
    
    const playersMap = new Map((players as Player[] || []).map(p => [p.id, p]));
    
    // Get team details
    const teamIds = [...new Set((stats as PlayerMatchStat[]).map(s => s.team_id))];
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name, division')
      .in('id', teamIds);
    
    const teamsMap = new Map((teams as Team[] || []).map(t => [t.id, t]));
    
    // Find best player for each jersey position (1-17)
    const teamOfTheWeek: Record<number, TOTWPlayer> = {};
    
    for (const stat of (stats as PlayerMatchStat[])) {
      const jersey = stat.jersey_number;
      
      // Skip if we already have a player for this position with higher rating
      if (teamOfTheWeek[jersey] && teamOfTheWeek[jersey].rating >= stat.rating) {
        continue;
      }
      
      const player = playersMap.get(stat.player_id);
      const team = teamsMap.get(stat.team_id);
      
      teamOfTheWeek[jersey] = {
        jersey_number: jersey,
        position_played: JERSEY_TO_POSITION[jersey] || 'Bench',
        player_id: stat.player_id,
        player_name: stat.player_name || (player ? `${player.first_name} ${player.last_name}` : 'Unknown'),
        natural_position: player?.position || 'Unknown',
        age: player?.age,
        overall: player?.overall || stat.ovr || 0,
        team_id: stat.team_id,
        team_name: team?.name || 'Unknown',
        team_division: team?.division,
        rating: stat.rating,
        stats: {
          tries: stat.tries,
          try_assists: stat.try_assists,
          metres: stat.metres,
          tackles: stat.tackles,
          missed_tackles: stat.missed_tackles,
          line_breaks: stat.line_breaks,
          tackle_breaks: stat.tackle_breaks,
          errors: stat.errors,
          goals_made: stat.goals_made,
          goals_attempted: stat.goals_attempted,
          points: stat.points,
          minutes_played: stat.minutes_played,
        }
      };
    }
    
    // Convert to array sorted by jersey number
    const teamArray = Object.values(teamOfTheWeek).sort(
      (a, b) => a.jersey_number - b.jersey_number
    );
    
    // Get available rounds for dropdown
    const { data: availableRounds } = await supabase
      .from('fixtures')
      .select('round')
      .eq('played', true)
      .order('round', { ascending: false });
    
    const rounds = [...new Set((availableRounds as { round: number }[] || []).map(r => r.round))];
    
    return NextResponse.json({
      round,
      division: divisionParam || 'all',
      team: teamArray,
      availableRounds: rounds,
    });
    
  } catch (error) {
    console.error('Team of the Week error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Team of the Week' },
      { status: 500 }
    );
  }
}