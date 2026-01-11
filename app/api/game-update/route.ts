import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ===========================================
// CONFIGURATION
// ===========================================

const SEASON = 0;
const HOME_ADVANTAGE = 3;
const BASE_TRIES = 4;
const TRY_POINTS = 4;
const CONVERSION_POINTS = 2;
const PENALTY_GOAL_POINTS = 2;

const PROGRESS_STAGES = ['NONE', 'POOR', 'FAIR', 'GOOD', 'VERY GOOD', 'EXCELLENT'];
const PROGRESS_ADVANCE_BASE_CHANCE = 60;
const STAT_IMPROVEMENT_CHANCES: Record<string, number> = {
  'NONE': 0,
  'POOR': 15,
  'FAIR': 35,
  'GOOD': 55,
  'VERY GOOD': 75,
  'EXCELLENT': 90
};
const STAT_TRAINING = ['Speed', 'Strength', 'Skill', 'Stamina', 'Defense'];
const POSITION_STATS: Record<string, string[]> = {
  'Fullback': ['speed', 'skill', 'defense'],
  'Winger': ['speed', 'skill'],
  'Centre': ['speed', 'strength', 'defense'],
  'Five-Eighth': ['skill', 'speed'],
  'Halfback': ['skill', 'speed', 'stamina'],
  'Prop': ['strength', 'defense', 'stamina'],
  'Hooker': ['skill', 'defense', 'stamina'],
  'Second Row': ['strength', 'defense', 'stamina'],
  'Lock': ['strength', 'defense', 'stamina']
};
const REST_FATIGUE_REDUCTION = 25;
const TRAINING_FATIGUE_INCREASE = 5;
const MATCH_FATIGUE_INCREASE = 15;

// ===========================================
// HELPER FUNCTIONS
// ===========================================

function rollChance(percentage: number): boolean {
  return Math.random() * 100 < percentage;
}

function getPotentialBonus(potential: number): number {
  return (potential - 60) / 2;
}

function getNextStage(currentStage: string | null): string {
  const stage = currentStage || 'NONE';
  const currentIndex = PROGRESS_STAGES.indexOf(stage);
  if (currentIndex === -1 || currentIndex >= PROGRESS_STAGES.length - 1) {
    return stage;
  }
  return PROGRESS_STAGES[currentIndex + 1];
}

function calculateOverall(player: Record<string, number>): number {
  const stats = [player.speed, player.strength, player.skill, player.stamina, player.defense];
  const sum = stats.reduce((a, b) => a + b, 0);
  return Math.round(sum / 5);
}

// ===========================================
// MATCH SIMULATION
// ===========================================

async function getTeamStrength(teamId: string): Promise<number> {
  const { data: tactics } = await supabase
    .from('team_tactics')
    .select('*')
    .eq('team_id', teamId)
    .single();
  
  if (!tactics) {
    const { data: players } = await supabase
      .from('players')
      .select('overall, fatigue')
      .eq('team_id', teamId)
      .order('overall', { ascending: false })
      .limit(13);
    
    if (!players || players.length === 0) return 70;
    
    const avgOverall = players.reduce((sum, p) => sum + p.overall, 0) / players.length;
    const avgFatigue = players.reduce((sum, p) => sum + p.fatigue, 0) / players.length;
    return avgOverall * (1 - avgFatigue / 200);
  }
  
  const positionFields = [
    'pos_fullback', 'pos_winger_l', 'pos_winger_r', 'pos_centre_l', 'pos_centre_r',
    'pos_five_eighth', 'pos_halfback', 'pos_prop_l', 'pos_prop_r', 'pos_hooker',
    'pos_second_row_l', 'pos_second_row_r', 'pos_lock'
  ];
  
  const playerIds = positionFields.map(f => tactics[f]).filter((id): id is string => id != null);
  
  if (playerIds.length === 0) return 70;
  
  const { data: players } = await supabase
    .from('players')
    .select('overall, fatigue')
    .in('id', playerIds);
  
  if (!players || players.length === 0) return 70;
  
  const avgOverall = players.reduce((sum, p) => sum + p.overall, 0) / players.length;
  const avgFatigue = players.reduce((sum, p) => sum + p.fatigue, 0) / players.length;
  return avgOverall * (1 - avgFatigue / 200);
}

async function getGoalKicker(teamId: string): Promise<{ kicking: number }> {
  const { data: tactics } = await supabase
    .from('team_tactics')
    .select('goal_kicker')
    .eq('team_id', teamId)
    .single();
  
  if (!tactics?.goal_kicker) return { kicking: 60 };
  
  const { data: player } = await supabase
    .from('players')
    .select('kicking')
    .eq('id', tactics.goal_kicker)
    .single();
  
  return player || { kicking: 60 };
}

interface MatchResult {
  homeScore: number;
  awayScore: number;
  homeTries: number;
  awayTries: number;
  homeConversions: number;
  awayConversions: number;
}

async function simulateMatch(homeTeamId: string, awayTeamId: string): Promise<MatchResult> {
  const homeStrength = await getTeamStrength(homeTeamId) + HOME_ADVANTAGE;
  const awayStrength = await getTeamStrength(awayTeamId);
  
  const homeKicker = await getGoalKicker(homeTeamId);
  const awayKicker = await getGoalKicker(awayTeamId);
  
  const strengthDiff = homeStrength - awayStrength;
  const homeTriesBase = BASE_TRIES + (strengthDiff / 20);
  const awayTriesBase = BASE_TRIES - (strengthDiff / 20);
  
  const homeTries = Math.max(0, Math.round(homeTriesBase + (Math.random() - 0.5) * 4));
  const awayTries = Math.max(0, Math.round(awayTriesBase + (Math.random() - 0.5) * 4));
  
  let homeConversions = 0;
  let awayConversions = 0;
  
  for (let i = 0; i < homeTries; i++) {
    if (rollChance(homeKicker.kicking)) homeConversions++;
  }
  for (let i = 0; i < awayTries; i++) {
    if (rollChance(awayKicker.kicking)) awayConversions++;
  }
  
  const homePenalties = rollChance(30 + strengthDiff) ? (rollChance(30) ? 2 : 1) : 0;
  const awayPenalties = rollChance(30 - strengthDiff) ? (rollChance(30) ? 2 : 1) : 0;
  
  const homeScore = (homeTries * TRY_POINTS) + (homeConversions * CONVERSION_POINTS) + (homePenalties * PENALTY_GOAL_POINTS);
  const awayScore = (awayTries * TRY_POINTS) + (awayConversions * CONVERSION_POINTS) + (awayPenalties * PENALTY_GOAL_POINTS);
  
  return { homeScore, awayScore, homeTries, awayTries, homeConversions, awayConversions };
}

async function addMatchFatigue(teamId: string): Promise<void> {
  const { data: tactics } = await supabase
    .from('team_tactics')
    .select('*')
    .eq('team_id', teamId)
    .single();
  
  if (!tactics) return;
  
  const positionFields = [
    'pos_fullback', 'pos_winger_l', 'pos_winger_r', 'pos_centre_l', 'pos_centre_r',
    'pos_five_eighth', 'pos_halfback', 'pos_prop_l', 'pos_prop_r', 'pos_hooker',
    'pos_second_row_l', 'pos_second_row_r', 'pos_lock',
    'bench_1', 'bench_2', 'bench_3', 'bench_4'
  ];
  
  const playerIds = positionFields.map(f => tactics[f]).filter((id): id is string => id != null);
  
  for (const playerId of playerIds) {
    const { data: player } = await supabase
      .from('players')
      .select('fatigue')
      .eq('id', playerId)
      .single();
    
    if (player) {
      await supabase
        .from('players')
        .update({ fatigue: Math.min(100, player.fatigue + MATCH_FATIGUE_INCREASE) })
        .eq('id', playerId);
    }
  }
}

// ===========================================
// TRAINING PROCESSING
// ===========================================

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  secondary_position: string | null;
  current_training: string | null;
  training_progress: string | null;
  potential: number;
  fatigue: number;
  speed: number;
  strength: number;
  skill: number;
  stamina: number;
  defense: number;
  overall: number;
}

interface TrainingResult {
  updates: Record<string, unknown>;
  improved: boolean;
}

async function processPlayerTraining(player: Player): Promise<TrainingResult> {
  const updates: Record<string, unknown> = {};
  let improved = false;
  
  const training = player.current_training;
  const progress = player.training_progress || 'NONE';
  const potential = player.potential || 70;
  
  if (!training) {
    return { updates, improved };
  }
  
  // Handle REST
  if (training === 'Rest') {
    updates.fatigue = Math.max(0, player.fatigue - REST_FATIGUE_REDUCTION);
    return { updates, improved };
  }
  
  // Non-rest training increases fatigue
  updates.fatigue = Math.min(100, player.fatigue + TRAINING_FATIGUE_INCREASE);
  
  // Progress advancement
  if (progress !== 'EXCELLENT') {
    const advanceChance = PROGRESS_ADVANCE_BASE_CHANCE + getPotentialBonus(potential);
    if (rollChance(advanceChance)) {
      updates.training_progress = getNextStage(progress);
    }
  }
  
  // Stat improvement
  const effectiveProgress = (updates.training_progress as string) || progress;
  const baseChance = STAT_IMPROVEMENT_CHANCES[effectiveProgress] || 0;
  const totalChance = baseChance + getPotentialBonus(potential);
  
  if (baseChance > 0 && rollChance(totalChance)) {
    if (STAT_TRAINING.includes(training)) {
      const statKey = training.toLowerCase() as keyof Player;
      const currentStat = player[statKey] as number;
      
      if (currentStat < 99) {
        const roll = Math.random() * 100;
        const improvement = roll < 50 ? 1 : roll < 85 ? 2 : 3;
        const newStat = Math.min(99, currentStat + improvement);
        updates[statKey] = newStat;
        updates.overall = calculateOverall({ ...player, [statKey]: newStat });
        improved = true;
      }
      
    } else if (POSITION_STATS[training]) {
      if (training === player.position) {
        const relatedStats = POSITION_STATS[training];
        const statToImprove = relatedStats[Math.floor(Math.random() * relatedStats.length)];
        const currentStat = player[statToImprove as keyof Player] as number;
        
        if (currentStat < 99) {
          const roll = Math.random() * 100;
          const improvement = roll < 50 ? 1 : roll < 85 ? 2 : 3;
          const newStat = Math.min(99, currentStat + improvement);
          updates[statToImprove] = newStat;
          updates.overall = calculateOverall({ ...player, [statToImprove]: newStat });
          improved = true;
        }
        
      } else if (training === player.secondary_position) {
        if (player.skill < 99) {
          const roll = Math.random() * 100;
          const improvement = roll < 50 ? 1 : roll < 85 ? 2 : 3;
          const newSkill = Math.min(99, player.skill + improvement);
          updates.skill = newSkill;
          updates.overall = calculateOverall({ ...player, skill: newSkill });
          improved = true;
        }
        
      } else {
        if (effectiveProgress === 'EXCELLENT') {
          updates.secondary_position = training;
          improved = true;
        }
      }
    }
  }
  
  return { updates, improved };
}

// ===========================================
// MAIN API HANDLER
// ===========================================

export async function GET(request: Request) {
  // Verify this is a legitimate cron request (optional security)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow without auth for testing, but log it
    console.log('Warning: Request without CRON_SECRET');
  }
  
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };
  
  log('🏉 SIDELINEHQ GAME UPDATE STARTING');
  log(`Time: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}`);
  
  try {
    // Find current round
    const { data: fixtures, error: fixturesError } = await supabase
      .from('fixtures')
      .select('*')
      .eq('season', SEASON)
      .eq('played', false)
      .order('round', { ascending: true });
    
    if (fixturesError) throw fixturesError;
    
    if (!fixtures || fixtures.length === 0) {
      log('🏆 All fixtures played! Season complete.');
      return NextResponse.json({ success: true, message: 'Season complete', logs });
    }
    
    const currentRound = fixtures[0].round;
    const roundFixtures = fixtures.filter(f => f.round === currentRound);
    
    log(`📅 Simulating Round ${currentRound}`);
    
    // Get all teams
    const { data: teams } = await supabase
      .from('teams')
      .select('*')
      .eq('division', 1);
    
    const teamsMap: Record<string, typeof teams[0]> = {};
    teams?.forEach(t => { teamsMap[t.id] = t; });
    
    // Simulate matches
    const matchResults: string[] = [];
    
    for (const fixture of roundFixtures) {
      const homeTeam = teamsMap[fixture.home_team_id];
      const awayTeam = teamsMap[fixture.away_team_id];
      
      const result = await simulateMatch(fixture.home_team_id, fixture.away_team_id);
      
      // Save result
      await supabase.from('match_results').insert({
        fixture_id: fixture.id,
        home_team_id: fixture.home_team_id,
        away_team_id: fixture.away_team_id,
        home_score: result.homeScore,
        away_score: result.awayScore
      });
      
      // Mark played
      await supabase.from('fixtures').update({ played: true }).eq('id', fixture.id);
      
      // Update standings
      const homeWin = result.homeScore > result.awayScore;
      const awayWin = result.awayScore > result.homeScore;
      const draw = result.homeScore === result.awayScore;
      
      await supabase.from('teams').update({
        wins: homeTeam.wins + (homeWin ? 1 : 0),
        draws: homeTeam.draws + (draw ? 1 : 0),
        losses: homeTeam.losses + (awayWin ? 1 : 0),
        points_for: homeTeam.points_for + result.homeScore,
        points_against: homeTeam.points_against + result.awayScore
      }).eq('id', homeTeam.id);
      
      await supabase.from('teams').update({
        wins: awayTeam.wins + (awayWin ? 1 : 0),
        draws: awayTeam.draws + (draw ? 1 : 0),
        losses: awayTeam.losses + (homeWin ? 1 : 0),
        points_for: awayTeam.points_for + result.awayScore,
        points_against: awayTeam.points_against + result.homeScore
      }).eq('id', awayTeam.id);
      
      // Add fatigue
      await addMatchFatigue(fixture.home_team_id);
      await addMatchFatigue(fixture.away_team_id);
      
      matchResults.push(`${homeTeam.city} ${result.homeScore} - ${result.awayScore} ${awayTeam.city}`);
    }
    
    matchResults.forEach(r => log(`🏟️ ${r}`));
    
    // Process training
    const { data: allPlayers } = await supabase
      .from('players')
      .select('*')
      .not('current_training', 'is', null);
    
    let improvements = 0;
    
    for (const player of (allPlayers || []) as Player[]) {
      const { updates, improved } = await processPlayerTraining(player);
      
      if (improved) improvements++;
      
      if (Object.keys(updates).length > 0) {
        await supabase.from('players').update(updates).eq('id', player.id);
      }
    }
    
    log(`🏋️ Training: ${improvements} players improved`);
    
    log('✅ UPDATE COMPLETE');
    
    return NextResponse.json({
      success: true,
      round: currentRound,
      matches: matchResults,
      improvements,
      logs
    });
    
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ success: false, error: String(error), logs }, { status: 500 });
  }
}
