// @ts-nocheck
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const SEASON = 0;
const HOME_ADVANTAGE = 3;
const BASE_TRIES = 4;
const COACHING_BONUS = 12;

function rollChance(pct: number) {
  return Math.random() * 100 < pct;
}

function getPositionConfig(jerseyNumber: number) {
  const configs: Record<number, { metresBase: number; tacklesBase: number; touchesBase: number }> = {
    // Backs - need 150+ for excellent
    1:  { metresBase: 160, tacklesBase: 8, touchesBase: 18 },   // Fullback
    2:  { metresBase: 140, tacklesBase: 10, touchesBase: 12 },  // Winger
    3:  { metresBase: 150, tacklesBase: 18, touchesBase: 14 },  // Centre
    4:  { metresBase: 150, tacklesBase: 18, touchesBase: 14 },  // Centre
    5:  { metresBase: 140, tacklesBase: 10, touchesBase: 12 },  // Winger
    6:  { metresBase: 120, tacklesBase: 22, touchesBase: 22 },  // Five-eighth
    7:  { metresBase: 70, tacklesBase: 28, touchesBase: 35 },   // Halfback
    // Forwards - need 180+ for excellent
    8:  { metresBase: 190, tacklesBase: 32, touchesBase: 14 },  // Prop
    9:  { metresBase: 80, tacklesBase: 48, touchesBase: 40 },   // Hooker
    10: { metresBase: 190, tacklesBase: 32, touchesBase: 14 },  // Prop
    11: { metresBase: 170, tacklesBase: 36, touchesBase: 14 },  // Second Row
    12: { metresBase: 170, tacklesBase: 36, touchesBase: 14 },  // Second Row
    13: { metresBase: 180, tacklesBase: 42, touchesBase: 16 },  // Lock
    // Bench (reduced minutes = lower base)
    14: { metresBase: 80, tacklesBase: 18, touchesBase: 8 },
    15: { metresBase: 70, tacklesBase: 16, touchesBase: 8 },
    16: { metresBase: 60, tacklesBase: 14, touchesBase: 6 },
    17: { metresBase: 50, tacklesBase: 12, touchesBase: 5 },
  };
  return configs[jerseyNumber] || configs[14];
}

function getMissChance(tacklingStat: number): number {
  if (tacklingStat >= 90) return 0.01;
  if (tacklingStat >= 80) return 0.02;
  if (tacklingStat >= 70) return 0.03;
  if (tacklingStat >= 60) return 0.04;
  if (tacklingStat >= 50) return 0.05;
  if (tacklingStat >= 40) return 0.07;
  return 0.10;
}

function getErrorChance(passingStat: number): number {
  if (passingStat >= 90) return 0.005;
  if (passingStat >= 80) return 0.01;
  if (passingStat >= 70) return 0.015;
  if (passingStat >= 60) return 0.02;
  if (passingStat >= 50) return 0.025;
  if (passingStat >= 40) return 0.035;
  return 0.05;
}

function generatePlayerStats(player: any, jerseyNumber: number, minutes: number) {
  if (minutes === 0) return { metres: 0, tackles: 0, missedTackles: 0, errors: 0 };

  const config = getPositionConfig(jerseyNumber);
  const minutesFactor = minutes / 80;

  const speedBonus = ((player.speed || 50) - 50) / 4;
  const powerBonus = ((player.power || 50) - 50) / 5;
  const metresVariance = 0.75 + Math.random() * 0.5;
  const metres = Math.max(0, Math.round((config.metresBase + speedBonus + powerBonus) * minutesFactor * metresVariance));

  const staminaBonus = ((player.stamina || 50) - 50) / 8;
  const tacklesVariance = 0.8 + Math.random() * 0.4;
  const tackles = Math.max(0, Math.round((config.tacklesBase + staminaBonus) * minutesFactor * tacklesVariance));

  const missChance = getMissChance(player.tackling || 50);
  let missedTackles = 0;
  for (let i = 0; i < tackles + Math.floor(Math.random() * 5); i++) {
    if (Math.random() < missChance) missedTackles++;
  }

  const errorChance = getErrorChance(player.passing || 50);
  let errors = 0;
  const touches = Math.round(config.touchesBase * minutesFactor);
  for (let i = 0; i < touches; i++) {
    if (Math.random() < errorChance) errors++;
  }

  return { metres, tackles, missedTackles, errors };
}

function calculatePlayerRating(stats: any, jerseyNumber: number, isMotm: boolean): number {
  const config = getPositionConfig(jerseyNumber);
  let rating = 7.0;
  
  const metresRatio = stats.metres / (config.metresBase * 0.7);
  rating += Math.min(1.5, (metresRatio - 1) * 1.2);
  
  const tacklesRatio = stats.tackles / (config.tacklesBase * 0.7);
  rating += Math.min(1.0, (tacklesRatio - 1) * 0.8);
  
  rating += stats.tries * 0.7;
  rating += stats.goals * 0.25;
  rating -= stats.missedTackles * 0.05;
  rating -= stats.errors * 0.08;
  
  if (stats.missedTackles === 0) rating += 0.3;
  if (stats.errors === 0) rating += 0.2;
  
  if (isMotm) rating = Math.max(rating, 9);
  
  return Math.min(10, Math.max(1, Math.round(rating)));
}

// NEW: Context-aware MOTM scoring
function calculateMotmInfluence(
  stats: any, 
  jerseyNumber: number, 
  gameContext: { totalPoints: number; margin: number; teamWon: boolean }
): number {
  const { totalPoints, margin, teamWon } = gameContext;
  
  // Game type detection
  const isLowScoring = totalPoints < 24;  // Grind (e.g. 12-10)
  const isHighScoring = totalPoints > 44; // Shootout (e.g. 36-30)
  const isCloseGame = margin <= 6;
  
  // Position type
  const isForward = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17].includes(jerseyNumber);
  const isPlaymaker = [6, 7, 9].includes(jerseyNumber); // 6, 7, hooker
  const isOutsideBack = [1, 2, 3, 4, 5].includes(jerseyNumber);
  
  let influence = 0;
  
  // === TRIES ===
  // Always huge, but context matters
  let tryValue = 30;
  if (isLowScoring) tryValue = 40;        // Tries are gold in a grind
  if (isOutsideBack) tryValue *= 0.9;     // Expected from backs
  if (isForward) tryValue *= 1.2;         // Rare from forwards = more impressive
  influence += stats.tries * tryValue;
  
  // === GOALS ===
  // Clutch in close games
  let goalValue = 8;
  if (isCloseGame) goalValue = 18;        // Could be match-winning
  influence += stats.goals * goalValue;
  
  // === METRES ===
  // Forwards in grinds = MOTM territory
  const config = getPositionConfig(jerseyNumber);
  const metresAboveExpected = stats.metres - config.metresBase;
  let metresValue = 0.08;
  if (isLowScoring) metresValue = 0.15;   // Hard yards matter in tight games
  if (isForward) metresValue *= 1.3;
  if (isHighScoring) metresValue *= 0.6;  // Less important in shootouts
  influence += Math.max(0, metresAboveExpected) * metresValue;
  
  // === TACKLES ===
  // Defensive effort, huge in grinds
  const tacklesAboveExpected = stats.tackles - config.tacklesBase;
  let tackleValue = 0.2;
  if (isLowScoring) tackleValue = 0.4;    // Defense wins grinds
  if (isForward) tackleValue *= 1.2;
  if (isHighScoring) tackleValue *= 0.5;
  influence += Math.max(0, tacklesAboveExpected) * tackleValue;
  
  // === NEGATIVE IMPACT ===
  influence -= stats.errors * 8;
  influence -= stats.missedTackles * 4;
  
  // === BONUSES ===
  if (stats.errors === 0 && stats.tries > 0) influence += 8;        // Try + clean game
  if (stats.missedTackles === 0 && stats.tackles > 30) influence += 10; // Defensive wall
  if (teamWon) influence += 5;  // Slight edge to winners
  
  // === PLAYMAKER BONUS ===
  // Playmakers who scored AND had low errors get a bump
  // (proxy for "ran the game well")
  if (isPlaymaker && stats.tries > 0 && stats.errors === 0) {
    influence += 12;
  }
  
  return influence;
}

function calculateTacticalBonus(attackFocus: string, defenseFocus: string) {
  let bonus = 0;
  let description = '';

  if (attackFocus === 'off_the_cuff') {
    const roll = Math.random() * 100;
    if (roll < 40) { bonus = 15; description = '🎲 Off the Cuff magic!'; }
    else if (roll < 75) { bonus = 0; description = '🎲 Off the Cuff: Nothing came off'; }
    else { bonus = -10; description = '🎲 Off the Cuff backfired!'; }
    return { bonus, description };
  }

  if (attackFocus === 'raid_left') {
    if (defenseFocus === 'shift_right') { bonus = 10; description = '⬅️ Left raid found space'; }
    else if (defenseFocus === 'shift_left') { bonus = -2; description = '⬅️ Left raid met stacked defense'; }
    else { bonus = 3; description = '⬅️ Left raid made ground'; }
  } else if (attackFocus === 'raid_right') {
    if (defenseFocus === 'shift_left') { bonus = 10; description = '➡️ Right raid exploited the edge'; }
    else if (defenseFocus === 'shift_right') { bonus = -2; description = '➡️ Right raid was shut down'; }
    else { bonus = 3; description = '➡️ Right raid made ground'; }
  } else if (attackFocus === 'up_the_guts') {
    if (defenseFocus === 'brick_wall') { bonus = -3; description = '💪 Forwards met a brick wall'; }
    else if (defenseFocus === 'shift_left' || defenseFocus === 'shift_right') { bonus = 8; description = '💪 Forwards punched through'; }
    else { bonus = 2; description = '💪 Forwards made hard yards'; }
  } else {
    bonus = 1;
    description = '📋 Structured attack probed for openings';
  }

  return { bonus, description };
}

function distributeTries(allPlayers: any[], totalTries: number, tactics: any): Record<string, number> {
  const tryScorers: Record<string, number> = {};
  const positionFields = [
    'pos_fullback', 'pos_winger_r', 'pos_centre_r', 'pos_centre_l', 'pos_winger_l',
    'pos_five_eighth', 'pos_halfback', 'pos_prop_l', 'pos_hooker', 'pos_prop_r',
    'pos_second_row_l', 'pos_second_row_r', 'pos_lock', 'bench_1', 'bench_2', 'bench_3', 'bench_4'
  ];
  const baseWeights = [15, 20, 12, 12, 20, 10, 8, 5, 8, 4, 10, 10, 8, 3, 3, 2, 2];
  
  const weighted: { id: string; weight: number }[] = [];
  positionFields.forEach((field, i) => {
    const playerId = tactics?.[field];
    if (playerId) {
      const player = allPlayers.find(p => p.id === playerId);
      const speedBonus = ((player?.speed || 50) - 50) / 25;
      weighted.push({ id: playerId, weight: Math.max(1, baseWeights[i] + speedBonus) });
    }
  });

  for (let i = 0; i < totalTries; i++) {
    const total = weighted.reduce((s, w) => s + w.weight, 0);
    let rand = Math.random() * total;
    for (const w of weighted) {
      rand -= w.weight;
      if (rand <= 0) {
        tryScorers[w.id] = (tryScorers[w.id] || 0) + 1;
        break;
      }
    }
  }
  return tryScorers;
}

export async function GET(request: Request) {
  const supabase = getSupabase();
  const logs: string[] = [];
  
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron');
  
  if (!isVercelCron && secret !== 'frost2026') {
    return NextResponse.json({ success: false, error: 'Add ?secret=frost2026' });
  }
  
  try {
    const [fixturesRes, teamsRes, tacticsRes, players1, players2, players3] = await Promise.all([
      supabase.from('fixtures').select('*').eq('season', SEASON).eq('played', false).order('round', { ascending: true }),
      supabase.from('teams').select('*'),
      supabase.from('team_tactics').select('*'),
      supabase.from('players').select('*').range(0, 999),
      supabase.from('players').select('*').range(1000, 1999),
      supabase.from('players').select('*').range(2000, 2999)
    ]);
    
    const fixtures = fixturesRes.data || [];
    const teams = teamsRes.data || [];
    const allTactics = tacticsRes.data || [];
    const allPlayers = [...(players1.data || []), ...(players2.data || []), ...(players3.data || [])];
    
    if (fixtures.length === 0) {
      return NextResponse.json({ success: true, message: 'Season complete!' });
    }
    
    const currentRound = fixtures[0].round;
    const roundFixtures = fixtures.filter(f => f.round === currentRound);
    
    logs.push(`Simulating Round ${currentRound} - ${allPlayers.length} players loaded`);
    
    const teamsMap: Record<string, any> = {};
    teams.forEach(t => { teamsMap[t.id] = t; });
    
    const tacticsMap: Record<string, any> = {};
    allTactics.forEach(t => { tacticsMap[t.team_id] = t; });
    
    const playersMap: Record<string, any> = {};
    allPlayers.forEach(p => { playersMap[p.id] = p; });
    
    const positionFields = [
      'pos_fullback', 'pos_winger_r', 'pos_centre_r', 'pos_centre_l', 'pos_winger_l',
      'pos_five_eighth', 'pos_halfback', 'pos_prop_l', 'pos_hooker', 'pos_prop_r',
      'pos_second_row_l', 'pos_second_row_r', 'pos_lock', 'bench_1', 'bench_2', 'bench_3', 'bench_4'
    ];
    const minutesPlayed = [80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 25, 20, 10, 0];
    
    const allPlayerStats: any[] = [];
    const allMatchResults: any[] = [];
    const allNotifications: any[] = [];
    const teamUpdates: Record<string, any> = {};
    const fatigueUpdates: Record<string, number> = {};
    
    for (const fixture of roundFixtures) {
      const homeTeam = teamsMap[fixture.home_team_id];
      const awayTeam = teamsMap[fixture.away_team_id];
      if (!homeTeam || !awayTeam) continue;
      
      let homeTactics = tacticsMap[fixture.home_team_id];
      let awayTactics = tacticsMap[fixture.away_team_id];
      
      const homePlayers = allPlayers.filter(p => p.team_id === fixture.home_team_id);
      const awayPlayers = allPlayers.filter(p => p.team_id === fixture.away_team_id);
      
      if (!homeTactics && homePlayers.length >= 13) {
        const sorted = [...homePlayers].sort((a, b) => b.overall - a.overall);
        homeTactics = {
          attack_focus: 'structured', defense_focus: 'line_speed',
          pos_fullback: sorted[0]?.id, pos_winger_r: sorted[1]?.id,
          pos_centre_r: sorted[2]?.id, pos_centre_l: sorted[3]?.id,
          pos_winger_l: sorted[4]?.id, pos_five_eighth: sorted[5]?.id,
          pos_halfback: sorted[6]?.id, pos_prop_l: sorted[7]?.id,
          pos_hooker: sorted[8]?.id, pos_prop_r: sorted[9]?.id,
          pos_second_row_l: sorted[10]?.id, pos_second_row_r: sorted[11]?.id,
          pos_lock: sorted[12]?.id, bench_1: sorted[13]?.id,
          bench_2: sorted[14]?.id, bench_3: sorted[15]?.id, bench_4: sorted[16]?.id,
          goal_kicker: sorted[6]?.id
        };
      }
      
      if (!awayTactics && awayPlayers.length >= 13) {
        const sorted = [...awayPlayers].sort((a, b) => b.overall - a.overall);
        awayTactics = {
          attack_focus: 'structured', defense_focus: 'line_speed',
          pos_fullback: sorted[0]?.id, pos_winger_r: sorted[1]?.id,
          pos_centre_r: sorted[2]?.id, pos_centre_l: sorted[3]?.id,
          pos_winger_l: sorted[4]?.id, pos_five_eighth: sorted[5]?.id,
          pos_halfback: sorted[6]?.id, pos_prop_l: sorted[7]?.id,
          pos_hooker: sorted[8]?.id, pos_prop_r: sorted[9]?.id,
          pos_second_row_l: sorted[10]?.id, pos_second_row_r: sorted[11]?.id,
          pos_lock: sorted[12]?.id, bench_1: sorted[13]?.id,
          bench_2: sorted[14]?.id, bench_3: sorted[15]?.id, bench_4: sorted[16]?.id,
          goal_kicker: sorted[6]?.id
        };
      }
      
      if (!homeTactics || !awayTactics) continue;
      
      let homeStrengthTotal = 0, homeCount = 0;
      let awayStrengthTotal = 0, awayCount = 0;
      
      for (let i = 0; i < 13; i++) {
        const homePlayerId = homeTactics[positionFields[i]];
        const awayPlayerId = awayTactics[positionFields[i]];
        if (homePlayerId && playersMap[homePlayerId]) {
          homeStrengthTotal += playersMap[homePlayerId].overall;
          homeCount++;
        }
        if (awayPlayerId && playersMap[awayPlayerId]) {
          awayStrengthTotal += playersMap[awayPlayerId].overall;
          awayCount++;
        }
      }
      
      const homeBaseStrength = homeCount > 0 ? homeStrengthTotal / homeCount : 30;
      const awayBaseStrength = awayCount > 0 ? awayStrengthTotal / awayCount : 30;
      
      const homeTacticalBonus = calculateTacticalBonus(
        homeTactics.attack_focus || 'structured',
        awayTactics.defense_focus || 'line_speed'
      );
      const awayTacticalBonus = calculateTacticalBonus(
        awayTactics.attack_focus || 'structured',
        homeTactics.defense_focus || 'line_speed'
      );
      
      const { data: homeCoach } = await supabase
        .from('coaches')
        .select('id')
        .eq('team_id', fixture.home_team_id)
        .maybeSingle();

      const { data: awayCoach } = await supabase
        .from('coaches')
        .select('id')
        .eq('team_id', fixture.away_team_id)
        .maybeSingle();

      const homeStrength = homeBaseStrength + HOME_ADVANTAGE + homeTacticalBonus.bonus + (homeCoach ? COACHING_BONUS : 0);
      const awayStrength = awayBaseStrength + awayTacticalBonus.bonus + (awayCoach ? COACHING_BONUS : 0);
      
      const homeKicker = playersMap[homeTactics.goal_kicker];
      const awayKicker = playersMap[awayTactics.goal_kicker];
      const homeKicking = homeKicker?.kicking || 60;
      const awayKicking = awayKicker?.kicking || 60;
      
      const strengthDiff = homeStrength - awayStrength;
      const homeTries = Math.max(0, Math.round(BASE_TRIES + (strengthDiff / 10) + (Math.random() - 0.5) * 3));
      const awayTries = Math.max(0, Math.round(BASE_TRIES - (strengthDiff / 10) + (Math.random() - 0.5) * 3));
      
      let homeConv = 0, awayConv = 0;
      for (let i = 0; i < homeTries; i++) if (rollChance(homeKicking)) homeConv++;
      for (let i = 0; i < awayTries; i++) if (rollChance(awayKicking)) awayConv++;
      
      const homePen = rollChance(30) ? (rollChance(30) ? 2 : 1) : 0;
      const awayPen = rollChance(30) ? (rollChance(30) ? 2 : 1) : 0;
      
      const homeScore = (homeTries * 4) + (homeConv * 2) + (homePen * 2);
      const awayScore = (awayTries * 4) + (awayConv * 2) + (awayPen * 2);
      
      // Game context for MOTM calculation
      const totalPoints = homeScore + awayScore;
      const margin = Math.abs(homeScore - awayScore);
      const homeWon = homeScore > awayScore;
      const awayWon = awayScore > homeScore;
      
      const homeTryScorers = distributeTries(allPlayers, homeTries, homeTactics);
      const awayTryScorers = distributeTries(allPlayers, awayTries, awayTactics);
      
      const fixtureStats: any[] = [];
      
      for (let i = 0; i < positionFields.length; i++) {
        const field = positionFields[i];
        const jerseyNumber = i + 1;
        const minutes = minutesPlayed[i];
        
        const homePlayerId = homeTactics[field];
        if (homePlayerId) {
          const player = playersMap[homePlayerId];
          if (player) {
            const stats = generatePlayerStats(player, jerseyNumber, minutes);
            const tries = homeTryScorers[homePlayerId] || 0;
            const isKicker = homeTactics.goal_kicker === homePlayerId;
            const goals = isKicker ? homeConv + homePen : 0;
            const points = (tries * 4) + (goals * 2);
            const rating = calculatePlayerRating({ ...stats, tries, goals }, jerseyNumber, false);
            
            // Calculate MOTM influence score with game context
            const motmInfluence = calculateMotmInfluence(
              { ...stats, tries, goals },
              jerseyNumber,
              { totalPoints, margin, teamWon: homeWon }
            );
            
            const statEntry = {
              fixture_id: fixture.id,
              player_id: homePlayerId,
              team_id: fixture.home_team_id,
              jersey_number: jerseyNumber,
              player_name: `${player.first_name.charAt(0)}. ${player.last_name}`,
              ovr: player.overall,
              points, tries, goals_made: goals, goals_attempted: 0,
              metres: stats.metres, tackles: stats.tackles,
              missed_tackles: stats.missedTackles, errors: stats.errors,
              minutes_played: minutes, rating,
              motm_influence: motmInfluence
            };
            
            fixtureStats.push(statEntry);
            fatigueUpdates[homePlayerId] = Math.min(100, (player.fatigue || 0) + 15);
          }
        }
        
        const awayPlayerId = awayTactics[field];
        if (awayPlayerId) {
          const player = playersMap[awayPlayerId];
          if (player) {
            const stats = generatePlayerStats(player, jerseyNumber, minutes);
            const tries = awayTryScorers[awayPlayerId] || 0;
            const isKicker = awayTactics.goal_kicker === awayPlayerId;
            const goals = isKicker ? awayConv + awayPen : 0;
            const points = (tries * 4) + (goals * 2);
            const rating = calculatePlayerRating({ ...stats, tries, goals }, jerseyNumber, false);
            
            const motmInfluence = calculateMotmInfluence(
              { ...stats, tries, goals },
              jerseyNumber,
              { totalPoints, margin, teamWon: awayWon }
            );
            
            const statEntry = {
              fixture_id: fixture.id,
              player_id: awayPlayerId,
              team_id: fixture.away_team_id,
              jersey_number: jerseyNumber,
              player_name: `${player.first_name.charAt(0)}. ${player.last_name}`,
              ovr: player.overall,
              points, tries, goals_made: goals, goals_attempted: 0,
              metres: stats.metres, tackles: stats.tackles,
              missed_tackles: stats.missedTackles, errors: stats.errors,
              minutes_played: minutes, rating,
              motm_influence: motmInfluence
            };
            
            fixtureStats.push(statEntry);
            fatigueUpdates[awayPlayerId] = Math.min(100, (player.fatigue || 0) + 15);
          }
        }
      }
      
      // Find MOTM based on INFLUENCE score, not just rating
      let motmPlayer: any = null;
      let motmInfluenceScore = -999;
      let motmStatIndex = -1;
      
      for (let i = 0; i < fixtureStats.length; i++) {
        const stat = fixtureStats[i];
        if (stat.motm_influence > motmInfluenceScore) {
          motmInfluenceScore = stat.motm_influence;
          motmPlayer = playersMap[stat.player_id];
          motmStatIndex = i;
        }
      }
      
      // Boost MOTM rating to 9 minimum
      if (motmStatIndex >= 0) {
        fixtureStats[motmStatIndex].rating = Math.max(9, fixtureStats[motmStatIndex].rating);
      }
      
      // Remove motm_influence before inserting (not a DB column)
      const cleanStats = fixtureStats.map(({ motm_influence, ...rest }) => rest);
      allPlayerStats.push(...cleanStats);
      
      allMatchResults.push({
        fixture_id: fixture.id,
        season: SEASON,
        round: currentRound,
        home_team_id: fixture.home_team_id,
        away_team_id: fixture.away_team_id,
        home_score: homeScore,
        away_score: awayScore,
        motm_player_id: motmPlayer?.id || null,
        motm_score: motmInfluenceScore
      });
      
      const homeWin = homeScore > awayScore;
      const awayWin = awayScore > homeScore;
      const draw = homeScore === awayScore;
      
      if (!teamUpdates[homeTeam.id]) {
        teamUpdates[homeTeam.id] = { ...homeTeam };
      }
      teamUpdates[homeTeam.id].wins += homeWin ? 1 : 0;
      teamUpdates[homeTeam.id].draws += draw ? 1 : 0;
      teamUpdates[homeTeam.id].losses += awayWin ? 1 : 0;
      teamUpdates[homeTeam.id].points_for += homeScore;
      teamUpdates[homeTeam.id].points_against += awayScore;
      
      if (!teamUpdates[awayTeam.id]) {
        teamUpdates[awayTeam.id] = { ...awayTeam };
      }
      teamUpdates[awayTeam.id].wins += awayWin ? 1 : 0;
      teamUpdates[awayTeam.id].draws += draw ? 1 : 0;
      teamUpdates[awayTeam.id].losses += homeWin ? 1 : 0;
      teamUpdates[awayTeam.id].points_for += awayScore;
      teamUpdates[awayTeam.id].points_against += homeScore;
      
      const homeResult = homeWin ? 'win' : awayWin ? 'loss' : 'draw';
      const awayResult = awayWin ? 'win' : homeWin ? 'loss' : 'draw';
      const homeTitle = homeWin ? '🏆 Victory!' : awayWin ? '😢 Defeat' : '🤝 Draw';
      const awayTitle = awayWin ? '🏆 Victory!' : homeWin ? '😢 Defeat' : '🤝 Draw';
      
      // Game type description for notifications
      let gameTypeDesc = '';
      if (totalPoints < 24) gameTypeDesc = 'Defensive grind. ';
      else if (totalPoints > 44) gameTypeDesc = 'High-scoring shootout! ';
      if (margin <= 4) gameTypeDesc += 'Nail-biter finish!';
      
      allNotifications.push({
        team_id: homeTeam.id,
        type: `match_${homeResult}`,
        title: homeTitle,
        message: `${homeTeam.name} ${homeWin ? 'defeated' : awayWin ? 'lost to' : 'drew with'} ${awayTeam.name} ${homeScore}-${awayScore}. ${gameTypeDesc}${homeTacticalBonus.description}`,
        fixture_id: fixture.id
      });
      
      allNotifications.push({
        team_id: awayTeam.id,
        type: `match_${awayResult}`,
        title: awayTitle,
        message: `${awayTeam.name} ${awayWin ? 'defeated' : homeWin ? 'lost to' : 'drew with'} ${homeTeam.name} ${awayScore}-${homeScore}. ${gameTypeDesc}${awayTacticalBonus.description}`,
        fixture_id: fixture.id
      });
      
      if (motmPlayer) {
        // Describe WHY they got MOTM
        const motmStats = fixtureStats[motmStatIndex];
        let motmReason = '';
        if (motmStats.tries >= 2) motmReason = `${motmStats.tries} tries`;
        else if (motmStats.tries === 1 && motmStats.metres > 100) motmReason = `try + ${motmStats.metres}m`;
        else if (motmStats.tackles > 40) motmReason = `${motmStats.tackles} tackles`;
        else if (motmStats.metres > 150) motmReason = `${motmStats.metres} metres`;
        else if (motmStats.goals_made > 0) motmReason = `${motmStats.goals_made} goals`;
        else motmReason = 'dominant performance';
        
        allNotifications.push({
          team_id: motmPlayer.team_id,
          type: 'motm',
          title: '⭐ Man of the Match!',
          message: `${motmPlayer.first_name} ${motmPlayer.last_name} (${motmPlayer.position}) won MOTM with ${motmReason}! +5 XP`,
          player_id: motmPlayer.id,
          fixture_id: fixture.id
        });
        
        const otherTeamId = motmPlayer.team_id === fixture.home_team_id ? fixture.away_team_id : fixture.home_team_id;
        allNotifications.push({
          team_id: otherTeamId,
          type: 'motm_opponent',
          title: '⭐ Opponent MOTM',
          message: `${motmPlayer.first_name} ${motmPlayer.last_name} (${teamsMap[motmPlayer.team_id]?.name}) won MOTM`,
          player_id: motmPlayer.id,
          fixture_id: fixture.id
        });
      }
      
      logs.push(`${homeTeam.name} ${homeScore} - ${awayScore} ${awayTeam.name} | MOTM: ${motmPlayer?.first_name || 'N/A'} ${motmPlayer?.last_name || ''}`);
    }
    
    const fixtureIds = roundFixtures.map(f => f.id);
    
    if (allPlayerStats.length > 0) {
      await supabase.from('player_match_stats').insert(allPlayerStats);
    }
    if (allMatchResults.length > 0) {
      await supabase.from('match_results').insert(allMatchResults);
    }
    if (allNotifications.length > 0) {
      await supabase.from('notifications').insert(allNotifications);
    }
    
    await supabase.from('fixtures').update({ played: true }).in('id', fixtureIds);
    
    for (const [teamId, data] of Object.entries(teamUpdates)) {
      await supabase.from('teams').update({
        wins: data.wins,
        draws: data.draws,
        losses: data.losses,
        points_for: data.points_for,
        points_against: data.points_against
      }).eq('id', teamId);
    }
    
    const fatiguePlayerIds = Object.keys(fatigueUpdates);
    if (fatiguePlayerIds.length > 0) {
      await supabase.rpc('increment_fatigue', { player_ids: fatiguePlayerIds, amount: 15 });
    }
    
    // TRAINING
    let improvements = 0;
    const PROGRESS_STAGES = ['NONE', 'POOR', 'FAIR', 'GOOD', 'VERY GOOD', 'EXCELLENT'];
    const STAT_CHANCES: Record<string, number> = { 'NONE': 0, 'POOR': 15, 'FAIR': 35, 'GOOD': 55, 'VERY GOOD': 75, 'EXCELLENT': 90 };
    const STAT_TRAINING = ['Speed', 'Strength', 'Power', 'Passing', 'Stamina', 'Tackling', 'Kicking'];
    
    const trainingPlayers = allPlayers.filter(p => p.current_training);
    const trainingNotifications: any[] = [];
    
    for (const player of trainingPlayers) {
      const updates: Record<string, any> = {};
      const training = player.current_training;
      const progress = player.training_progress || 'NONE';
      const potential = player.potential || 70;
      const potentialBonus = (potential - 60) / 2;
      
      if (training === 'Rest') {
        updates.fatigue = Math.max(0, (player.fatigue || 0) - 25);
      } else {
        updates.fatigue = Math.min(100, (player.fatigue || 0) + 5);
        
        if (progress !== 'EXCELLENT' && rollChance(60 + potentialBonus)) {
          const idx = PROGRESS_STAGES.indexOf(progress);
          if (idx < PROGRESS_STAGES.length - 1) {
            updates.training_progress = PROGRESS_STAGES[idx + 1];
          }
        }
        
        const effectiveProgress = updates.training_progress || progress;
        const chance = (STAT_CHANCES[effectiveProgress] || 0) + potentialBonus;
        
        if (chance > 0 && rollChance(chance) && STAT_TRAINING.includes(training)) {
          const statKey = training.toLowerCase();
          const current = player[statKey];
          if (current < 99) {
            const gain = Math.random() < 0.5 ? 1 : Math.random() < 0.85 ? 2 : 3;
            const newStat = Math.min(99, current + gain);
            updates[statKey] = newStat;
            
            const newOverall = Math.round((
              (updates.speed ?? player.speed) +
              (updates.strength ?? player.strength) +
              (updates.power ?? player.power) +
              (updates.passing ?? player.passing) +
              (updates.stamina ?? player.stamina) +
              (updates.tackling ?? player.tackling) +
              (updates.kicking ?? player.kicking)
            ) / 7);
            
            updates.overall = newOverall;
            improvements++;
            
            if (newOverall !== player.overall) {
              updates.ovr_change = newOverall - player.overall;
              updates.ovr_changed_at = new Date().toISOString();
              
              if (newOverall > player.overall) {
                trainingNotifications.push({
                  team_id: player.team_id,
                  type: 'player_improvement',
                  title: '⭐ Player Improved!',
                  message: `${player.first_name} ${player.last_name} increased ${training}! Overall now ${newOverall}`,
                  player_id: player.id
                });
              }
            }
          }
        }
      }
      
      if (Object.keys(updates).length > 0) {
        await supabase.from('players').update(updates).eq('id', player.id);
      }
    }
    
    if (trainingNotifications.length > 0) {
      await supabase.from('notifications').insert(trainingNotifications);
    }
    
    logs.push(`Training: ${improvements} players improved`);
    
    return NextResponse.json({
      success: true,
      round: currentRound,
      matches: logs,
      improvements,
      playersLoaded: allPlayers.length
    });
    
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}