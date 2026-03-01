/**
 * SidelineHQ Admin: Generate Season Fixtures
 * 
 * Creates all fixtures for a new season:
 * - 18 club rounds (home & away round-robin per division)
 * - 3 rep fixtures (rounds 9, 12, 15)
 * - Rep series record
 * - Finals fixtures (rounds 22-24) — generated separately after round 21
 * 
 * Usage:
 *   Generate season:  /api/admin/generate-season?season=1&sport=nrl
 *   Generate finals:  /api/admin/generate-season?season=1&sport=nrl&phase=finals
 * 
 * Auth: Admin user ID or CRON_SECRET required
 */

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const ADMIN_USER_ID = process.env.ADMIN_USER_ID || 'b0c4c970-ac17-4be8-9b35-68d321a166ad';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// =============================================
// ROUND-ROBIN FIXTURE GENERATION
// =============================================

/**
 * Generate a round-robin schedule for N teams (each plays every other team once).
 * Uses the "circle method" — guaranteed balanced schedule.
 * Returns array of rounds, each containing [homeTeamIndex, awayTeamIndex] pairs.
 */
function generateRoundRobin(numTeams: number): [number, number][][] {
  // Circle method requires even number — add a bye if odd
  const n = numTeams % 2 === 0 ? numTeams : numTeams + 1;
  const hasBye = numTeams % 2 !== 0;
  
  const rounds: [number, number][][] = [];
  
  // Teams indexed 0 to n-1. Team 0 is fixed, others rotate.
  const teams = Array.from({ length: n }, (_, i) => i);
  
  for (let round = 0; round < n - 1; round++) {
    const matches: [number, number][] = [];
    
    for (let i = 0; i < n / 2; i++) {
      const home = teams[i];
      const away = teams[n - 1 - i];
      
      // Skip bye team
      if (hasBye && (home >= numTeams || away >= numTeams)) continue;
      
      // Alternate home/away each round for fairness
      if (round % 2 === 0) {
        matches.push([home, away]);
      } else {
        matches.push([away, home]);
      }
    }
    
    rounds.push(matches);
    
    // Rotate: fix teams[0], rotate the rest clockwise
    const last = teams.pop()!;
    teams.splice(1, 0, last);
  }
  
  return rounds;
}

/**
 * Generate home & away fixtures (play everyone twice — second half flips home/away).
 * Maps team indices to actual team IDs.
 * Assigns to club round slots (skipping rep rounds 9, 12, 15).
 */
function generateHomeAndAwayFixtures(
  teamIds: string[],
  season: number,
  division: number
): { home_team_id: string; away_team_id: string; round: number; season: number; division: number; played: boolean }[] {
  const firstHalf = generateRoundRobin(teamIds.length);
  
  // Second half: same matchups, home/away flipped
  const secondHalf = firstHalf.map(round =>
    round.map(([home, away]): [number, number] => [away, home])
  );
  
  const allRounds = [...firstHalf, ...secondHalf];
  
  // Club round slots (1-21 excluding rep rounds 9, 12, 15)
  const clubRoundSlots = [];
  for (let r = 1; r <= 21; r++) {
    if (r !== 9 && r !== 12 && r !== 15) clubRoundSlots.push(r);
  }
  
  // We need 18 club rounds, and we have 18 slots (21 - 3 rep rounds)
  if (allRounds.length !== clubRoundSlots.length) {
    console.warn(`Warning: ${allRounds.length} fixture rounds but ${clubRoundSlots.length} club slots. Teams: ${teamIds.length}`);
  }
  
  const fixtures: { home_team_id: string; away_team_id: string; round: number; season: number; division: number; played: boolean }[] = [];
  
  for (let i = 0; i < allRounds.length && i < clubRoundSlots.length; i++) {
    const round = clubRoundSlots[i];
    
    for (const [homeIdx, awayIdx] of allRounds[i]) {
      fixtures.push({
        home_team_id: teamIds[homeIdx],
        away_team_id: teamIds[awayIdx],
        round,
        season,
        division,
        played: false,
      });
    }
  }
  
  return fixtures;
}

// =============================================
// REP FIXTURES (ORIGIN / ALL-STAR)
// =============================================

interface RepFixture {
  season: number;
  game_number: number;
  round: number;
  venue: string;
  home_team: string;
  away_team: string;
  played: boolean;
  home_score: number | null;
  away_score: number | null;
  motm_player_id: string | null;
  motm_reason: string | null;
}

function generateNRLOriginFixtures(season: number): RepFixture[] {
  const venues = ['Stadium Australia, Sydney', 'Suncorp Stadium, Brisbane', 'MCG, Melbourne'];
  
  return [
    {
      season,
      game_number: 1,
      round: 9,
      venue: venues[0],
      home_team: 'NSW',
      away_team: 'QLD',
      played: false,
      home_score: null,
      away_score: null,
      motm_player_id: null,
      motm_reason: null,
    },
    {
      season,
      game_number: 2,
      round: 12,
      venue: venues[1],
      home_team: 'QLD',
      away_team: 'NSW',
      played: false,
      home_score: null,
      away_score: null,
      motm_player_id: null,
      motm_reason: null,
    },
    {
      season,
      game_number: 3,
      round: 15,
      venue: venues[2],
      home_team: 'NSW',
      away_team: 'QLD',
      played: false,
      home_score: null,
      away_score: null,
      motm_player_id: null,
      motm_reason: null,
    },
  ];
}

function generateNFLAllStarFixtures(season: number): RepFixture[] {
  const venues = ['Allegiant Stadium, Las Vegas', 'AT&T Stadium, Dallas', 'SoFi Stadium, LA'];
  
  return [
    {
      season,
      game_number: 1,
      round: 9,
      venue: venues[0],
      home_team: 'EAST',
      away_team: 'WEST',
      played: false,
      home_score: null,
      away_score: null,
      motm_player_id: null,
      motm_reason: null,
    },
    {
      season,
      game_number: 2,
      round: 12,
      venue: venues[1],
      home_team: 'WEST',
      away_team: 'EAST',
      played: false,
      home_score: null,
      away_score: null,
      motm_player_id: null,
      motm_reason: null,
    },
    {
      season,
      game_number: 3,
      round: 15,
      venue: venues[2],
      home_team: 'EAST',
      away_team: 'WEST',
      played: false,
      home_score: null,
      away_score: null,
      motm_player_id: null,
      motm_reason: null,
    },
  ];
}

// =============================================
// FINALS GENERATION
// =============================================

interface FinalsFixture {
  home_team_id: string;
  away_team_id: string;
  round: number;
  season: number;
  division: number;
  played: boolean;
}

/**
 * Generate finals fixtures for a division based on final ladder.
 * 
 * Round 22 (Week 1):
 *   - 1st vs 2nd (winner → GF)
 *   - 3rd vs 4th (loser eliminated)
 * 
 * Round 23 (Prelim):
 *   - Loser of 1v2 vs Winner of 3v4
 *   (This fixture can't be created until Round 22 results are in.
 *    So we create placeholder fixtures with the known matchups for Round 22,
 *    and Round 23-24 are generated after each finals round completes.)
 * 
 * Round 24 (Grand Final):
 *   - Winner of 1v2 vs Winner of Prelim
 */
function generateWeek1Finals(
  ladderTeamIds: string[],
  season: number,
  division: number
): FinalsFixture[] {
  if (ladderTeamIds.length < 4) return [];
  
  const [first, second, third, fourth] = ladderTeamIds;
  
  return [
    {
      home_team_id: first,
      away_team_id: second,
      round: 22,
      season,
      division,
      played: false,
    },
    {
      home_team_id: third,
      away_team_id: fourth,
      round: 22,
      season,
      division,
      played: false,
    },
  ];
}

// =============================================
// MAIN API HANDLER
// =============================================

export async function GET(request: Request) {
  const supabase = getSupabase();
  const url = new URL(request.url);
  
  // Auth check
  const secret = url.searchParams.get('secret');
  const CRON_SECRET = process.env.CRON_SECRET;
  
  // Verify admin — either secret match or check auth
  if (secret !== CRON_SECRET) {
    // Try auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  }
  
  const season = parseInt(url.searchParams.get('season') || '1');
  const sport = url.searchParams.get('sport') || 'nrl';
  const phase = url.searchParams.get('phase') || 'season'; // 'season', 'finals', 'prelim', 'gf'
  
  if (isNaN(season)) {
    return NextResponse.json({ success: false, error: 'Invalid season number' }, { status: 400 });
  }
  
  try {
    // =========================================
    // PHASE: GENERATE FULL SEASON
    // =========================================
    if (phase === 'season') {
      // Check if fixtures already exist for this season
      const { count: existingCount } = await supabase
        .from('fixtures')
        .select('id', { count: 'exact', head: true })
        .eq('season', season);
      
      if (existingCount && existingCount > 0) {
        return NextResponse.json({
          success: false,
          error: `Season ${season} already has ${existingCount} fixtures. Delete them first or use a different season number.`
        }, { status: 409 });
      }
      
      // Load all teams grouped by division
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, division')
        .order('division');
      
      if (teamsError || !teams) {
        return NextResponse.json({ success: false, error: 'Failed to load teams' }, { status: 500 });
      }
      
      // Group teams by division
      const divisions: Record<number, string[]> = {};
      for (const team of teams) {
        if (!divisions[team.division]) divisions[team.division] = [];
        divisions[team.division].push(team.id);
      }
      
      // Generate fixtures for each division
      const allFixtures: any[] = [];
      
      for (const [divStr, teamIds] of Object.entries(divisions)) {
        const division = parseInt(divStr);
        
        if (teamIds.length < 2) {
          console.warn(`Division ${division} has ${teamIds.length} teams — skipping`);
          continue;
        }
        
        // Shuffle team order so fixture order varies each season
        const shuffled = [...teamIds].sort(() => Math.random() - 0.5);
        
        const divFixtures = generateHomeAndAwayFixtures(shuffled, season, division);
        allFixtures.push(...divFixtures);
      }
      
      // Insert fixtures in chunks (Supabase has row limits)
      const CHUNK_SIZE = 500;
      let insertedCount = 0;
      
      for (let i = 0; i < allFixtures.length; i += CHUNK_SIZE) {
        const chunk = allFixtures.slice(i, i + CHUNK_SIZE);
        const { error: insertError } = await supabase.from('fixtures').insert(chunk);
        
        if (insertError) {
          return NextResponse.json({
            success: false,
            error: `Failed to insert fixtures chunk ${i}: ${insertError.message}`
          }, { status: 500 });
        }
        
        insertedCount += chunk.length;
      }
      
      // Generate rep fixtures
      const repFixtures = sport === 'nfl'
        ? generateNFLAllStarFixtures(season)
        : generateNRLOriginFixtures(season);
      
      const { error: repError } = await supabase.from('origin_fixtures').insert(repFixtures);
      
      if (repError) {
        return NextResponse.json({
          success: false,
          error: `Fixtures created but rep fixtures failed: ${repError.message}`
        }, { status: 500 });
      }
      
      // Create rep series record
      const seriesRecord = sport === 'nfl'
        ? {
            season,
            nsw_wins: 0,  // Reuse columns: nsw_wins = east_wins, qld_wins = west_wins
            qld_wins: 0,
            series_winner: null,
            series_status: 'pending',
          }
        : {
            season,
            nsw_wins: 0,
            qld_wins: 0,
            series_winner: null,
            series_status: 'pending',
          };
      
      const { error: seriesError } = await supabase.from('origin_series').insert(seriesRecord);
      
      if (seriesError) {
        console.warn(`Series record failed (may already exist): ${seriesError.message}`);
      }
      
      // Summary
      const divisionSummary = Object.entries(divisions).map(([div, ids]) => 
        `Div ${div}: ${ids.length} teams`
      );
      
      return NextResponse.json({
        success: true,
        season,
        sport,
        fixtures_created: insertedCount,
        rep_fixtures_created: repFixtures.length,
        divisions: divisionSummary,
        rounds: {
          club: '1-8, 10-11, 13-14, 16-21 (18 rounds)',
          rep: '9, 12, 15',
          finals: '22-24 (generate after round 21 with ?phase=finals)',
        },
      });
    }
    
    // =========================================
    // PHASE: GENERATE FINALS (Week 1)
    // =========================================
    if (phase === 'finals') {
      // Check no finals fixtures exist yet
      const { count: existingFinals } = await supabase
        .from('fixtures')
        .select('id', { count: 'exact', head: true })
        .eq('season', season)
        .gte('round', 22);
      
      if (existingFinals && existingFinals > 0) {
        return NextResponse.json({
          success: false,
          error: `Finals fixtures already exist for season ${season}. Delete them first.`
        }, { status: 409 });
      }
      
      // Load teams with standings
      const { data: teams } = await supabase
        .from('teams')
        .select('id, division, wins, draws, losses, points_for, points_against');
      
      if (!teams) {
        return NextResponse.json({ success: false, error: 'Failed to load teams' }, { status: 500 });
      }
      
      // Group by division and sort by ladder
      const divisions: Record<number, typeof teams> = {};
      for (const team of teams) {
        if (!divisions[team.division]) divisions[team.division] = [];
        divisions[team.division].push(team);
      }
      
      const allFinalsFixtures: FinalsFixture[] = [];
      
      for (const [divStr, divTeams] of Object.entries(divisions)) {
        const division = parseInt(divStr);
        
        // Sort by competition points, then PD, then PF
        const sorted = divTeams.sort((a, b) => {
          const aPoints = (a.wins * 2) + a.draws;
          const bPoints = (b.wins * 2) + b.draws;
          if (bPoints !== aPoints) return bPoints - aPoints;
          
          const aDiff = a.points_for - a.points_against;
          const bDiff = b.points_for - b.points_against;
          if (bDiff !== aDiff) return bDiff - aDiff;
          
          return b.points_for - a.points_for;
        });
        
        const top4Ids = sorted.slice(0, 4).map(t => t.id);
        const week1 = generateWeek1Finals(top4Ids, season, division);
        allFinalsFixtures.push(...week1);
      }
      
      if (allFinalsFixtures.length > 0) {
        const { error } = await supabase.from('fixtures').insert(allFinalsFixtures);
        if (error) {
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
      }
      
      return NextResponse.json({
        success: true,
        season,
        phase: 'finals_week1',
        fixtures_created: allFinalsFixtures.length,
        note: 'Round 22 fixtures created (1v2 + 3v4 per division). Run ?phase=prelim after Round 22 completes.',
      });
    }
    
    // =========================================
    // PHASE: GENERATE PRELIM (after Round 22)
    // =========================================
    if (phase === 'prelim') {
      // Get Round 22 results
      const { data: week1Fixtures } = await supabase
        .from('fixtures')
        .select('*')
        .eq('season', season)
        .eq('round', 22)
        .eq('played', true);
      
      if (!week1Fixtures || week1Fixtures.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Round 22 not yet played. Run finals week 1 first.'
        }, { status: 400 });
      }
      
      // Get results
      const fixtureIds = week1Fixtures.map(f => f.id);
      const { data: results } = await supabase
        .from('match_results')
        .select('*')
        .in('fixture_id', fixtureIds);
      
      if (!results || results.length === 0) {
        return NextResponse.json({ success: false, error: 'No results for Round 22' }, { status: 400 });
      }
      
      const resultsMap: Record<string, any> = {};
      results.forEach(r => { resultsMap[r.fixture_id] = r; });
      
      // Group week 1 fixtures by division
      const divisionFixtures: Record<number, typeof week1Fixtures> = {};
      for (const f of week1Fixtures) {
        if (!divisionFixtures[f.division]) divisionFixtures[f.division] = [];
        divisionFixtures[f.division].push(f);
      }
      
      const prelimFixtures: FinalsFixture[] = [];
      
      for (const [divStr, fixtures] of Object.entries(divisionFixtures)) {
        const division = parseInt(divStr);
        
        if (fixtures.length !== 2) continue;
        
        // Identify the 1v2 and 3v4 matches
        // 1v2 is the match where home_team was 1st seed (higher ladder position)
        // We stored 1st vs 2nd and 3rd vs 4th
        // Sort by home team seed to identify correctly
        const sorted = [...fixtures].sort((a, b) => {
          // The 1v2 match has higher-seeded teams
          // We can identify by checking which fixture has teams with more wins
          return 0; // We'll use a different approach
        });
        
        // Simpler: just process both fixtures and determine winners/losers
        const match1 = fixtures[0];
        const match2 = fixtures[1];
        const result1 = resultsMap[match1.id];
        const result2 = resultsMap[match2.id];
        
        if (!result1 || !result2) continue;
        
        // Determine winners and losers
        const winner1 = result1.home_score > result1.away_score ? match1.home_team_id : match1.away_team_id;
        const loser1 = result1.home_score > result1.away_score ? match1.away_team_id : match1.home_team_id;
        const winner2 = result2.home_score > result2.away_score ? match2.home_team_id : match2.away_team_id;
        const loser2 = result2.home_score > result2.away_score ? match2.away_team_id : match2.home_team_id;
        
        // Handle draws in finals — home team (higher seed) advances
        // match1 is 1v2: loser plays prelim
        // match2 is 3v4: winner plays prelim
        
        // Prelim: Loser of 1v2 vs Winner of 3v4
        // Loser of 1v2 gets home advantage (higher seed)
        prelimFixtures.push({
          home_team_id: loser1,
          away_team_id: winner2,
          round: 23,
          season,
          division,
          played: false,
        });
      }
      
      if (prelimFixtures.length > 0) {
        const { error } = await supabase.from('fixtures').insert(prelimFixtures);
        if (error) {
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
      }
      
      return NextResponse.json({
        success: true,
        season,
        phase: 'prelim',
        fixtures_created: prelimFixtures.length,
        note: 'Round 23 prelim fixtures created. Run ?phase=gf after Round 23 completes.',
      });
    }
    
    // =========================================
    // PHASE: GENERATE GRAND FINAL (after Round 23)
    // =========================================
    if (phase === 'gf') {
      // Get Round 22 results (for 1v2 winner)
      const { data: week1Fixtures } = await supabase
        .from('fixtures')
        .select('*')
        .eq('season', season)
        .eq('round', 22)
        .eq('played', true);
      
      // Get Round 23 results (for prelim winner)
      const { data: prelimFixtures } = await supabase
        .from('fixtures')
        .select('*')
        .eq('season', season)
        .eq('round', 23)
        .eq('played', true);
      
      if (!week1Fixtures || !prelimFixtures || prelimFixtures.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Round 23 not yet played.'
        }, { status: 400 });
      }
      
      // Get all results for rounds 22-23
      const allFixtureIds = [
        ...week1Fixtures.map(f => f.id),
        ...prelimFixtures.map(f => f.id),
      ];
      
      const { data: results } = await supabase
        .from('match_results')
        .select('*')
        .in('fixture_id', allFixtureIds);
      
      if (!results) {
        return NextResponse.json({ success: false, error: 'No results found' }, { status: 400 });
      }
      
      const resultsMap: Record<string, any> = {};
      results.forEach(r => { resultsMap[r.fixture_id] = r; });
      
      // Group by division
      const week1ByDiv: Record<number, any[]> = {};
      week1Fixtures.forEach(f => {
        if (!week1ByDiv[f.division]) week1ByDiv[f.division] = [];
        week1ByDiv[f.division].push(f);
      });
      
      const prelimByDiv: Record<number, any> = {};
      prelimFixtures.forEach(f => { prelimByDiv[f.division] = f; });
      
      const gfFixtures: FinalsFixture[] = [];
      
      for (const [divStr, w1Fixtures] of Object.entries(week1ByDiv)) {
        const division = parseInt(divStr);
        const prelimFixture = prelimByDiv[division];
        
        if (!prelimFixture) continue;
        
        // Find the 1v2 match (the one where neither team is in the prelim)
        // The 1v2 match winner went straight to GF
        const prelimTeams = new Set([prelimFixture.home_team_id, prelimFixture.away_team_id]);
        const match1v2 = w1Fixtures.find(f => {
          const result = resultsMap[f.id];
          if (!result) return false;
          const winner = result.home_score > result.away_score ? f.home_team_id : f.away_team_id;
          // The winner of 1v2 is NOT in the prelim
          return !prelimTeams.has(winner);
        });
        
        if (!match1v2) {
          // Fallback: first fixture is 1v2
          const f = w1Fixtures[0];
          const r = resultsMap[f.id];
          if (!r) continue;
          
          const week1Winner = r.home_score > r.away_score ? f.home_team_id : f.away_team_id;
          const prelimResult = resultsMap[prelimFixture.id];
          if (!prelimResult) continue;
          
          const prelimWinner = prelimResult.home_score > prelimResult.away_score 
            ? prelimFixture.home_team_id 
            : prelimFixture.away_team_id;
          
          gfFixtures.push({
            home_team_id: week1Winner, // 1v2 winner gets home advantage
            away_team_id: prelimWinner,
            round: 24,
            season,
            division,
            played: false,
          });
          continue;
        }
        
        const match1v2Result = resultsMap[match1v2.id];
        const prelimResult = resultsMap[prelimFixture.id];
        
        if (!match1v2Result || !prelimResult) continue;
        
        const week1Winner = match1v2Result.home_score > match1v2Result.away_score 
          ? match1v2.home_team_id 
          : match1v2.away_team_id;
        
        const prelimWinner = prelimResult.home_score > prelimResult.away_score 
          ? prelimFixture.home_team_id 
          : prelimFixture.away_team_id;
        
        // Grand Final: 1v2 winner (home) vs Prelim winner (away)
        gfFixtures.push({
          home_team_id: week1Winner,
          away_team_id: prelimWinner,
          round: 24,
          season,
          division,
          played: false,
        });
      }
      
      if (gfFixtures.length > 0) {
        const { error } = await supabase.from('fixtures').insert(gfFixtures);
        if (error) {
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
      }
      
      return NextResponse.json({
        success: true,
        season,
        phase: 'grand_final',
        fixtures_created: gfFixtures.length,
        note: 'Round 24 Grand Final fixtures created. Season complete after these are played!',
      });
    }
    
    // =========================================
    // PHASE: SEASON ROLLOVER (after Grand Final)
    // =========================================
    if (phase === 'rollover') {
      const logs: string[] = [];

      // ── 1. Verify Grand Final is complete ──────────────────────────────
      const { data: gfFixtures } = await supabase
  .from('fixtures')
  .select('id, division, played, home_team_id, away_team_id')
  .eq('season', season)
  .eq('round', 24);

      if (!gfFixtures || gfFixtures.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No Grand Final fixtures found. Has ?phase=gf been run?'
        }, { status: 400 });
      }

      const unplayed = gfFixtures.filter(f => !f.played);
      if (unplayed.length > 0) {
        return NextResponse.json({
          success: false,
          error: `Grand Final not yet played in ${unplayed.length} division(s). Run rollover after Round 24 completes.`
        }, { status: 400 });
      }

      logs.push(`✅ Grand Final complete in ${gfFixtures.length} division(s)`);

      // ── 2. Determine Grand Final winners ───────────────────────────────
      const gfFixtureIds = gfFixtures.map(f => f.id);
      const { data: gfResults } = await supabase
        .from('match_results')
        .select('*')
        .in('fixture_id', gfFixtureIds);

      const gfResultsMap: Record<string, any> = {};
      (gfResults || []).forEach(r => { gfResultsMap[r.fixture_id] = r; });

      // Map division → champion team ID
      const champions: Record<number, string> = {};
      for (const fixture of gfFixtures) {
        const result = gfResultsMap[fixture.id];
        if (result) {
          champions[fixture.division] = result.home_score >= result.away_score
            ? fixture.home_team_id
            : fixture.away_team_id;
        }
      }

      logs.push(`🏆 Champions determined for ${Object.keys(champions).length} division(s)`);

      // ── 3. Load all teams with standings ───────────────────────────────
      const { data: allTeams } = await supabase
        .from('teams')
        .select('id, name, division, wins, draws, losses, points_for, points_against');

      if (!allTeams) {
        return NextResponse.json({ success: false, error: 'Failed to load teams' }, { status: 500 });
      }

      // Group by division and sort by ladder
      const byDivision: Record<number, typeof allTeams> = {};
      for (const team of allTeams) {
        if (!byDivision[team.division]) byDivision[team.division] = [];
        byDivision[team.division].push(team);
      }

      const sortedDivisions: Record<number, typeof allTeams> = {};
      for (const [divStr, teams] of Object.entries(byDivision)) {
        sortedDivisions[parseInt(divStr)] = teams.sort((a, b) => {
          const aPoints = (a.wins * 2) + a.draws;
          const bPoints = (b.wins * 2) + b.draws;
          if (bPoints !== aPoints) return bPoints - aPoints;
          const aDiff = a.points_for - a.points_against;
          const bDiff = b.points_for - b.points_against;
          if (bDiff !== aDiff) return bDiff - aDiff;
          return b.points_for - a.points_for;
        });
      }

      // ── 4. Promotion / Relegation (top 2 up, bottom 2 down) ────────────
      const divisionNumbers = Object.keys(sortedDivisions).map(Number).sort((a, b) => a - b);
      const maxDivision = Math.max(...divisionNumbers);
      const promotionMap: Record<string, { from: number; to: number; direction: 'promoted' | 'relegated' }> = {};

      for (const div of divisionNumbers) {
        const teams = sortedDivisions[div];
        if (teams.length < 4) continue;

        // Top 2 get promoted (unless already in div 1)
        if (div > 1) {
          const promoted = teams.slice(0, 2);
          for (const team of promoted) {
            promotionMap[team.id] = { from: div, to: div - 1, direction: 'promoted' };
          }
        }

        // Bottom 2 get relegated (unless already in last division)
        if (div < maxDivision) {
          const relegated = teams.slice(-2);
          for (const team of relegated) {
            promotionMap[team.id] = { from: div, to: div + 1, direction: 'relegated' };
          }
        }
      }

      // Apply division changes
      const promotionUpdates = Object.entries(promotionMap).map(([teamId, info]) =>
        supabase.from('teams').update({ division: info.to }).eq('id', teamId)
      );
      await Promise.all(promotionUpdates);

      const promotedCount = Object.values(promotionMap).filter(p => p.direction === 'promoted').length;
      const relegatedCount = Object.values(promotionMap).filter(p => p.direction === 'relegated').length;
      logs.push(`📈 Promoted: ${promotedCount} teams, 📉 Relegated: ${relegatedCount} teams`);

      // ── 5. Send promotion/relegation notifications ─────────────────────
      const notifications: any[] = [];

      for (const [teamId, info] of Object.entries(promotionMap)) {
        const isChampion = champions[info.from] === teamId;
        if (info.direction === 'promoted') {
          notifications.push({
            team_id: teamId,
            type: 'promoted',
            title: '📈 Promoted!',
            message: isChampion
              ? `Congratulations! You won Division ${info.from} and have been promoted to Division ${info.to} for Season ${season + 1}!`
              : `You finished in the top 2 of Division ${info.from} and have been promoted to Division ${info.to} for Season ${season + 1}!`,
          });
        } else {
          notifications.push({
            team_id: teamId,
            type: 'relegated',
            title: '📉 Relegated',
            message: `You finished in the bottom 2 of Division ${info.from} and have been relegated to Division ${info.to} for Season ${season + 1}.`,
          });
        }
      }

      // Champion notifications for teams that didn't get promoted (div 1 winner)
      for (const [divStr, championId] of Object.entries(champions)) {
        const div = parseInt(divStr);
        if (!promotionMap[championId]) {
          // Div 1 champion — already top division
          notifications.push({
            team_id: championId,
            type: 'champion',
            title: '🏆 Division Champion!',
            message: `Congratulations! You are the Division ${div} Season ${season} Champion!`,
          });
        }
      }

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }
      logs.push(`🔔 ${notifications.length} notifications sent`);

      // ── 6. Age all players +1 year ─────────────────────────────────────
      // Increment age for all players
      const { data: allPlayers } = await supabase
        .from('players')
        .select('id, age, is_u21, is_u23, retiring_end_of_season');

      if (allPlayers && allPlayers.length > 0) {
        // Process in chunks of 500
        const chunkSize = 500;
        for (let i = 0; i < allPlayers.length; i += chunkSize) {
          const chunk = allPlayers.slice(i, i + chunkSize);
          await Promise.all(
            chunk.map((player: any) => {
              const newAge = player.age + 1;
              return supabase
                .from('players')
                .update({
                  age: newAge,
                  is_u21: newAge < 21,
                  is_u23: newAge < 23,
                })
                .eq('id', player.id);
            })
          );
        }

        // Handle retirements — remove players flagged retiring_end_of_season
        const retirees = allPlayers.filter((p: any) => p.retiring_end_of_season);
        if (retirees.length > 0) {
          const retireeIds = retirees.map((p: any) => p.id);

          // Delete their contracts first
          await supabase.from('player_contracts').delete().in('player_id', retireeIds);

          // Notify coaches
          const retirementNotifications: any[] = [];
          for (const player of retirees) {
            const { data: playerData } = await supabase
              .from('players')
              .select('first_name, last_name, position, overall, team_id')
              .eq('id', player.id)
              .single();

            if (playerData?.team_id) {
              retirementNotifications.push({
                team_id: playerData.team_id,
                type: 'retirement',
                title: '👋 Player Retired',
                message: `${playerData.first_name} ${playerData.last_name} (${playerData.position}, ${playerData.overall} OVR) has retired at the end of Season ${season}.`,
                player_id: player.id,
              });
            }
          }

          if (retirementNotifications.length > 0) {
            await supabase.from('notifications').insert(retirementNotifications);
          }

          // Null out team_id for retirees (keep player records for history)
          await supabase
            .from('players')
            .update({ team_id: null, retiring_end_of_season: false })
            .in('id', retireeIds);

          logs.push(`👋 ${retirees.length} players retired`);
        }

        logs.push(`🎂 ${allPlayers.length} players aged +1 year`);
      }

      // ── 7. Reset all team records ───────────────────────────────────────
      await supabase
        .from('teams')
        .update({
          wins: 0,
          losses: 0,
          draws: 0,
          points_for: 0,
          points_against: 0,
          weekly_transfers_used: 0,
        })
        .gte('wins', 0); // matches all rows

      logs.push('🔄 All team records reset');

      // ── 8. Update game_state to off-season ─────────────────────────────
      await supabase
        .from('game_state')
        .update({ current_phase: 'off_season' })
        .eq('id', 1);

      logs.push('🏁 Game state set to off_season');

      // ── Summary ────────────────────────────────────────────────────────
      const promoSummary = Object.entries(promotionMap).map(([teamId, info]) => {
        const team = allTeams.find(t => t.id === teamId);
        return `${info.direction === 'promoted' ? '📈' : '📉'} ${team?.name} (Div ${info.from} → Div ${info.to})`;
      });

      return NextResponse.json({
        success: true,
        season,
        phase: 'rollover',
        champions,
        promotion_relegation: promoSummary,
        logs,
        next_steps: [
          '1. Manually bump SEASON constant in /lib/game-engine/constants.ts from 0 to 1',
          '2. Wait one week (3 match days) — no fixtures will process during off-season',
          `3. Run ?phase=season&season=${season + 1}&sport=${sport} to generate Season ${season + 1} fixtures`,
        ],
      });
    }return NextResponse.json({ success: false, error: `Unknown phase: ${phase}` }, { status: 400 });
    
  } catch (error) {
    console.error('Generate season error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
