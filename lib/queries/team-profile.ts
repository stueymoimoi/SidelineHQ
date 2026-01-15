/**
 * Team Profile Queries
 * 
 * Reusable queries for team data used by:
 * - TeamSnapshotPopup (Fixtures, Ladder, Match Centre)
 * - Team History page (/team/[id])
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ===========================================
// TYPES
// ===========================================

export interface TeamProfile {
  id: string;
  name: string;
  city: string;
  division: number;
  primary_color: string;
  secondary_color: string;
  tertiary_color: string | null;
  
  // Record
  wins: number;
  draws: number;
  losses: number;
  points_for: number;
  points_against: number;
  
  // Calculated
  played: number;
  points_diff: number;
  competition_points: number;
  ladder_position: number;
  
  // Home/Away split
  home_wins: number;
  home_draws: number;
  home_losses: number;
  away_wins: number;
  away_draws: number;
  away_losses: number;
  
  // Form (last 5 results: 'W' | 'L' | 'D')
  form: ('W' | 'L' | 'D')[];
  
  // Coach
  coach_id: string | null;
  coach_name: string | null;
  coach_start_date: string | null;
  
  // Squad stats
  avg_ovr: number;
  avg_age: number;
  star_player: {
    id: string;
    name: string;
    position: string;
    overall: number;
  } | null;
}

export interface TeamResult {
  fixture_id: string;
  round: number;
  opponent_id: string;
  opponent_name: string;
  opponent_color: string;
  home_or_away: 'home' | 'away';
  team_score: number;
  opponent_score: number;
  result: 'W' | 'L' | 'D';
  match_date: string | null;
}

export interface CoachHistoryEntry {
  coach_id: string;
  coach_name: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
}

export interface SeasonSummary {
  matches_played: number;
  total_points_for: number;
  total_points_against: number;
  avg_points_for: number;
  avg_points_against: number;
  total_tries_for: number;
  total_tries_against: number;
  biggest_win: { opponent: string; score: string; round: number } | null;
  biggest_loss: { opponent: string; score: string; round: number } | null;
}

// ===========================================
// MAIN QUERY: Get Team Profile (for popup)
// ===========================================

export async function getTeamProfile(
  supabase: SupabaseClient,
  teamId: string
): Promise<TeamProfile | null> {
  try {
    // Fetch team basic data
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      console.error('Error fetching team:', teamError);
      return null;
    }

    // Fetch all teams in division for ladder position
    const { data: divisionTeams } = await supabase
      .from('teams')
      .select('id, wins, draws, losses, points_for, points_against')
      .eq('division', team.division);

    // Calculate ladder position
    const sortedTeams = (divisionTeams || []).sort((a: any, b: any) => {
      const ptsA = (a.wins * 2) + a.draws;
      const ptsB = (b.wins * 2) + b.draws;
      if (ptsB !== ptsA) return ptsB - ptsA;
      const diffA = a.points_for - a.points_against;
      const diffB = b.points_for - b.points_against;
      return diffB - diffA;
    });
    const ladderPosition = sortedTeams.findIndex((t: any) => t.id === teamId) + 1;

    // Fetch coach
    const { data: coach } = await supabase
      .from('coaches')
      .select('id, coach_name, created_at')
      .eq('team_id', teamId)
      .single();

    // Fetch players for squad stats
    const { data: players } = await supabase
      .from('players')
      .select('id, first_name, last_name, position, overall, age')
      .eq('team_id', teamId);

    // Calculate squad stats
    let avgOvr = 0;
    let avgAge = 0;
    let starPlayer: TeamProfile['star_player'] = null;

    if (players && players.length > 0) {
      const totalOvr = players.reduce((sum: number, p: any) => sum + (p.overall || 0), 0);
      const totalAge = players.reduce((sum: number, p: any) => sum + (p.age || 0), 0);
      avgOvr = Math.round((totalOvr / players.length) * 10) / 10;
      avgAge = Math.round((totalAge / players.length) * 10) / 10;

      // Find star player (highest OVR)
      const best = players.reduce((max: any, p: any) => 
        (p.overall || 0) > (max?.overall || 0) ? p : max
      , players[0]);

      if (best) {
        starPlayer = {
          id: best.id,
          name: `${best.first_name} ${best.last_name}`,
          position: best.position,
          overall: best.overall || 0
        };
      }
    }

    // Fetch fixtures with results for home/away record and form
const { data: homeFixtures } = await supabase
  .from('match_results')
  .select('fixture_id, home_team_id, away_team_id, home_score, away_score, round')
  .eq('home_team_id', teamId);

const { data: awayFixtures } = await supabase
  .from('match_results')
  .select('fixture_id, home_team_id, away_team_id, home_score, away_score, round')
  .eq('away_team_id', teamId);

// Combine and sort by round descending
const fixtures = [...(homeFixtures || []), ...(awayFixtures || [])]
  .sort((a, b) => b.round - a.round);

    // Calculate home/away record and form
    let homeWins = 0, homeDraws = 0, homeLosses = 0;
    let awayWins = 0, awayDraws = 0, awayLosses = 0;
    const form: ('W' | 'L' | 'D')[] = [];

    (fixtures || []).forEach((f: any, index: number) => {
      const isHome = f.home_team_id === teamId;
      const teamScore = isHome ? f.home_score : f.away_score;
      const oppScore = isHome ? f.away_score : f.home_score;

      let result: 'W' | 'L' | 'D' = 'D';
      if (teamScore > oppScore) result = 'W';
      else if (teamScore < oppScore) result = 'L';

      // Form (last 5 only)
      if (index < 5) {
        form.push(result);
      }

      // Home/Away record
      if (isHome) {
        if (result === 'W') homeWins++;
        else if (result === 'D') homeDraws++;
        else homeLosses++;
      } else {
        if (result === 'W') awayWins++;
        else if (result === 'D') awayDraws++;
        else awayLosses++;
      }
    });

    // Reverse form so most recent is last (for display: oldest → newest)
    form.reverse();

    return {
      id: team.id,
      name: team.name,
      city: team.city,
      division: team.division,
      primary_color: team.primary_color,
      secondary_color: team.secondary_color,
      tertiary_color: team.tertiary_color,

      wins: team.wins,
      draws: team.draws,
      losses: team.losses,
      points_for: team.points_for,
      points_against: team.points_against,

      played: team.wins + team.draws + team.losses,
      points_diff: team.points_for - team.points_against,
      competition_points: (team.wins * 2) + team.draws,
      ladder_position: ladderPosition,

      home_wins: homeWins,
      home_draws: homeDraws,
      home_losses: homeLosses,
      away_wins: awayWins,
      away_draws: awayDraws,
      away_losses: awayLosses,

      form,

      coach_id: coach?.id || null,
      coach_name: coach?.coach_name || null,
      coach_start_date: coach?.created_at || null,

      avg_ovr: avgOvr,
      avg_age: avgAge,
      star_player: starPlayer
    };
  } catch (error) {
    console.error('Error in getTeamProfile:', error);
    return null;
  }
}

// ===========================================
// QUERY: Get Team Results (for Team History)
// ===========================================

export async function getTeamResults(
  supabase: SupabaseClient,
  teamId: string
): Promise<TeamResult[]> {
  try {
    const { data: fixtures, error } = await supabase
      .from('fixtures')
      .select(`
        id,
        round,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        match_date,
        home_team:teams!fixtures_home_team_id_fkey(id, name, primary_color),
        away_team:teams!fixtures_away_team_id_fkey(id, name, primary_color)
      `)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .eq('played', true)
      .order('round', { ascending: true });

    if (error) {
      console.error('Error fetching team results:', error);
      return [];
    }

    return (fixtures || []).map((f: any) => {
      const isHome = f.home_team_id === teamId;
      // Handle joined data (could be object or array)
      const homeTeam = Array.isArray(f.home_team) ? f.home_team[0] : f.home_team;
      const awayTeam = Array.isArray(f.away_team) ? f.away_team[0] : f.away_team;
      const opponent = isHome ? awayTeam : homeTeam;
      const teamScore = isHome ? f.home_score : f.away_score;
      const oppScore = isHome ? f.away_score : f.home_score;

      let result: 'W' | 'L' | 'D' = 'D';
      if (teamScore > oppScore) result = 'W';
      else if (teamScore < oppScore) result = 'L';

      return {
        fixture_id: f.id,
        round: f.round,
        opponent_id: opponent?.id || '',
        opponent_name: opponent?.name || 'Unknown',
        opponent_color: opponent?.primary_color || '#666',
        home_or_away: isHome ? 'home' : 'away',
        team_score: teamScore || 0,
        opponent_score: oppScore || 0,
        result,
        match_date: f.match_date
      };
    });
  } catch (error) {
    console.error('Error in getTeamResults:', error);
    return [];
  }
}

// ===========================================
// QUERY: Get Coach History (for Team History)
// ===========================================

export async function getCoachHistory(
  supabase: SupabaseClient,
  teamId: string
): Promise<CoachHistoryEntry[]> {
  try {
    // For now, we only track current coach
    // Future: Add coach_history table for full history
    const { data: coach, error } = await supabase
      .from('coaches')
      .select('id, coach_name, created_at')
      .eq('team_id', teamId)
      .single();

    if (error || !coach) {
      return [];
    }

    return [{
      coach_id: coach.id,
      coach_name: coach.coach_name,
      start_date: coach.created_at,
      end_date: null,
      is_current: true
    }];
  } catch (error) {
    console.error('Error in getCoachHistory:', error);
    return [];
  }
}

// ===========================================
// QUERY: Get Season Summary (for Team History)
// ===========================================

export async function getSeasonSummary(
  supabase: SupabaseClient,
  teamId: string
): Promise<SeasonSummary> {
  try {
    // Get all played fixtures
    const { data: fixtures } = await supabase
      .from('fixtures')
      .select(`
        id,
        round,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        home_team:teams!fixtures_home_team_id_fkey(name),
        away_team:teams!fixtures_away_team_id_fkey(name)
      `)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .eq('played', true);

    // Get player match stats for tries
    const { data: matchStats } = await supabase
      .from('player_match_stats')
      .select('fixture_id, team_id, tries')
      .eq('team_id', teamId);

    // Get opponent tries
    const fixtureIds = (fixtures || []).map((f: any) => f.id);
    const { data: oppStats } = await supabase
      .from('player_match_stats')
      .select('fixture_id, team_id, tries')
      .in('fixture_id', fixtureIds)
      .neq('team_id', teamId);

    let totalPointsFor = 0;
    let totalPointsAgainst = 0;
    let biggestWin: SeasonSummary['biggest_win'] = null;
    let biggestLoss: SeasonSummary['biggest_loss'] = null;
    let biggestWinMargin = 0;
    let biggestLossMargin = 0;

    (fixtures || []).forEach((f: any) => {
      const isHome = f.home_team_id === teamId;
      const teamScore = isHome ? f.home_score : f.away_score;
      const oppScore = isHome ? f.away_score : f.home_score;
      // Handle joined data (could be object or array)
      const homeTeam = Array.isArray(f.home_team) ? f.home_team[0] : f.home_team;
      const awayTeam = Array.isArray(f.away_team) ? f.away_team[0] : f.away_team;
      const opponent = isHome ? awayTeam : homeTeam;

      totalPointsFor += teamScore || 0;
      totalPointsAgainst += oppScore || 0;

      const margin = (teamScore || 0) - (oppScore || 0);

      if (margin > biggestWinMargin) {
        biggestWinMargin = margin;
        biggestWin = {
          opponent: opponent?.name || 'Unknown',
          score: `${teamScore}-${oppScore}`,
          round: f.round
        };
      }

      if (margin < biggestLossMargin) {
        biggestLossMargin = margin;
        biggestLoss = {
          opponent: opponent?.name || 'Unknown',
          score: `${teamScore}-${oppScore}`,
          round: f.round
        };
      }
    });

    const totalTriesFor = (matchStats || []).reduce((sum: number, s: any) => sum + (s.tries || 0), 0);
    const totalTriesAgainst = (oppStats || []).reduce((sum: number, s: any) => sum + (s.tries || 0), 0);

    const matchesPlayed = fixtures?.length || 0;

    return {
      matches_played: matchesPlayed,
      total_points_for: totalPointsFor,
      total_points_against: totalPointsAgainst,
      avg_points_for: matchesPlayed > 0 ? Math.round((totalPointsFor / matchesPlayed) * 10) / 10 : 0,
      avg_points_against: matchesPlayed > 0 ? Math.round((totalPointsAgainst / matchesPlayed) * 10) / 10 : 0,
      total_tries_for: totalTriesFor,
      total_tries_against: totalTriesAgainst,
      biggest_win: biggestWin,
      biggest_loss: biggestLoss
    };
  } catch (error) {
    console.error('Error in getSeasonSummary:', error);
    return {
      matches_played: 0,
      total_points_for: 0,
      total_points_against: 0,
      avg_points_for: 0,
      avg_points_against: 0,
      total_tries_for: 0,
      total_tries_against: 0,
      biggest_win: null,
      biggest_loss: null
    };
  }
}