import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Config
const SEASON = 0;
const HOME_ADVANTAGE = 3;
const BASE_TRIES = 4;

function rollChance(pct: number) {
  return Math.random() * 100 < pct;
}

function calculateMatchPerformance(player: any): number {
  const baseScore = player.overall;
  const fatigueMultiplier = 1 - (player.fatigue / 200);
  const variance = 0.8 + (Math.random() * 0.4);
  return baseScore * fatigueMultiplier * variance;
}

function getPositionConfig(jerseyNumber: number) {
  const configs: Record<number, { metresBase: number; tacklesBase: number; touchesBase: number }> = {
    1:  { metresBase: 80, tacklesBase: 4, touchesBase: 15 },
    2:  { metresBase: 45, tacklesBase: 5, touchesBase: 8 },
    3:  { metresBase: 50, tacklesBase: 8, touchesBase: 10 },
    4:  { metresBase: 50, tacklesBase: 8, touchesBase: 10 },
    5:  { metresBase: 45, tacklesBase: 5, touchesBase: 8 },
    6:  { metresBase: 55, tacklesBase: 10, touchesBase: 18 },
    7:  { metresBase: 40, tacklesBase: 10, touchesBase: 25 },
    8:  { metresBase: 85, tacklesBase: 25, touchesBase: 12 },
    9:  { metresBase: 45, tacklesBase: 35, touchesBase: 30 },
    10: { metresBase: 80, tacklesBase: 25, touchesBase: 12 },
    11: { metresBase: 65, tacklesBase: 20, touchesBase: 10 },
    12: { metresBase: 65, tacklesBase: 20, touchesBase: 10 },
    13: { metresBase: 70, tacklesBase: 25, touchesBase: 12 },
    14: { metresBase: 35, tacklesBase: 12, touchesBase: 6 },
    15: { metresBase: 35, tacklesBase: 12, touchesBase: 6 },
    16: { metresBase: 30, tacklesBase: 10, touchesBase: 5 },
    17: { metresBase: 30, tacklesBase: 10, touchesBase: 5 },
  };
  return configs[jerseyNumber] || configs[14];
}

function getMissChance(tacklingStat: number): number {
  if (tacklingStat >= 90) return 0.02;
  if (tacklingStat >= 80) return 0.04;
  if (tacklingStat >= 70) return 0.06;
  if (tacklingStat >= 60) return 0.09;
  if (tacklingStat >= 50) return 0.12;
  if (tacklingStat >= 40) return 0.15;
  return 0.20;
}

function getErrorChance(passingStat: number): number {
  if (passingStat >= 90) return 0.01;
  if (passingStat >= 80) return 0.02;
  if (passingStat >= 70) return 0.03;
  if (passingStat >= 60) return 0.05;
  if (passingStat >= 50) return 0.07;
  if (passingStat >= 40) return 0.10;
  return 0.15;
}

function generatePlayerStats(
  player: any,
  jerseyNumber: number,
  minutes: number
): { metres: number; tackles: number; missedTackles: number; errors: number } {
  
  if (minutes === 0) {
    return { metres: 0, tackles: 0, missedTackles: 0, errors: 0 };
  }

  const config = getPositionConfig(jerseyNumber);
  const minutesFactor = minutes / 80;

  const speedBonus = ((player.speed || 50) - 50) / 5;
  const powerBonus = ((player.power || 50) - 50) / 6;
  const metresVariance = 0.7 + Math.random() * 0.6;
  const metres = Math.max(0, Math.round((config.metresBase + speedBonus + powerBonus) * minutesFactor * metresVariance));

  const staminaBonus = ((player.stamina || 50) - 50) / 10;
  const tacklesVariance = 0.75 + Math.random() * 0.5;
  const tackles = Math.max(0, Math.round((config.tacklesBase + staminaBonus) * minutesFactor * tacklesVariance));

  const missChance = getMissChance(player.tackling || 50);
  let missedTackles = 0;
  const tackleAttempts = tackles + Math.floor(Math.random() * 5);
  for (let i = 0; i < tackleAttempts; i++) {
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

function distributeTries(
  players: any[],
  totalTries: number,
  attackStyle: string,
  tactics: any
): Record<string, number> {
  const tryScorers: Record<string, number> = {};
  
  const baseWeights: Record<number, number> = {
    1: 15, 2: 20, 3: 12, 4: 12, 5: 20, 6: 10, 7: 8,
    8: 5, 9: 8, 10: 4, 11: 10, 12: 10, 13: 8,
    14: 3, 15: 3, 16: 2, 17: 2
  };

  const styleModifiers: Record<string, Record<number, number>> = {
    'raid_left': { 4: 1.5, 5: 1.8, 11: 1.4 },
    'raid_right': { 2: 1.8, 3: 1.5, 12: 1.4 },
    'up_the_guts': { 8: 1.5, 9: 1.5, 10: 1.5, 13: 1.5 },
    'off_the_cuff': { 1: 1.4, 6: 1.4, 7: 1.3 },
    'structured': {}
  };

  const modifiers = styleModifiers[attackStyle] || {};

  const positionFields = [
    'pos_fullback', 'pos_winger_r', 'pos_centre_r', 'pos_centre_l', 'pos_winger_l',
    'pos_five_eighth', 'pos_halfback', 'pos_prop_l', 'pos_hooker', 'pos_prop_r',
    'pos_second_row_l', 'pos_second_row_r', 'pos_lock', 'bench_1', 'bench_2', 'bench_3', 'bench_4'
  ];

  const weightedPlayers: { id: string; weight: number }[] = [];

  positionFields.forEach((field, index) => {
    const jerseyNum = index + 1;
    const playerId = tactics?.[field];
    if (playerId) {
      const player = players.find(p => p.id === playerId);
      const baseWeight = baseWeights[jerseyNum] || 5;
      const modifier = modifiers[jerseyNum] || 1;
      const speedBonus = ((player?.speed || 50) - 50) / 25;
      const powerBonus = ((player?.power || 50) - 50) / 30;
      
      weightedPlayers.push({
        id: playerId,
        weight: Math.max(1, (baseWeight * modifier) + speedBonus + powerBonus)
      });
    }
  });

  for (let i = 0; i < totalTries; i++) {
    const totalWeight = weightedPlayers.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const wp of weightedPlayers) {
      random -= wp.weight;
      if (random <= 0) {
        tryScorers[wp.id] = (tryScorers[wp.id] || 0) + 1;
        break;
      }
    }
  }

  return tryScorers;
}

function calculateTacticalBonus(
  attackFocus: string,
  defenseFocus: string,
  attackingPlayers: any[],
  tactics: any
): { bonus: number; description: string } {
  let bonus = 0;
  let description = '';

  const getPlayerOverall = (id: string | null) => {
    if (!id) return 50;
    const player = attackingPlayers.find(p => p.id === id);
    return player?.overall || 50;
  };

  const halfback = getPlayerOverall(tactics?.pos_halfback);
  const fiveEighth = getPlayerOverall(tactics?.pos_five_eighth);
  const spineAvg = (halfback + fiveEighth) / 2;

  const propL = getPlayerOverall(tactics?.pos_prop_l);
  const propR = getPlayerOverall(tactics?.pos_prop_r);
  const hooker = getPlayerOverall(tactics?.pos_hooker);
  const lock = getPlayerOverall(tactics?.pos_lock);
  const forwardAvg = (propL + propR + hooker + lock) / 4;

  if (attackFocus === 'off_the_cuff') {
    const spineBonus = (spineAvg - 50) / 100;
    const roll = Math.random() * 100;
    
    if (roll < 40 + (spineBonus * 20)) {
      bonus = 15;
      description = '🎲 Off the Cuff magic! Playing with freedom';
    } else if (roll < 75 + (spineBonus * 10)) {
      bonus = 0;
      description = '🎲 Off the Cuff: Nothing came off';
    } else {
      bonus = -10;
      description = '🎲 Off the Cuff backfired! Too many errors';
    }
    return { bonus, description };
  }

  if (attackFocus === 'raid_left') {
    if (defenseFocus === 'shift_right') {
      bonus = 10;
      description = '⬅️ Left edge raid found space on the right-loaded defense';
    } else if (defenseFocus === 'shift_left') {
      bonus = -2;
      description = '⬅️ Left raid met a stacked left-side defense';
    } else if (defenseFocus === 'brick_wall') {
      bonus = 5;
      description = '⬅️ Left edge raid stretched the packed middle';
    }
    const spineImpact = (spineAvg - 55) / 10;
    bonus += spineImpact;
  }

  if (attackFocus === 'raid_right') {
    if (defenseFocus === 'shift_left') {
      bonus = 10;
      description = '➡️ Right edge raid exploited the left-loaded defense';
    } else if (defenseFocus === 'shift_right') {
      bonus = -2;
      description = '➡️ Right raid met a stacked right-side defense';
    } else if (defenseFocus === 'brick_wall') {
      bonus = 5;
      description = '➡️ Right edge raid stretched the packed middle';
    }
    const spineImpact = (spineAvg - 55) / 10;
    bonus += spineImpact;
  }

  if (attackFocus === 'up_the_guts') {
    if (defenseFocus === 'brick_wall') {
      bonus = -3;
      description = '💪 Forward charges met a brick wall defense';
    } else if (defenseFocus === 'shift_left' || defenseFocus === 'shift_right') {
      bonus = 8;
      description = '💪 Forwards punched through the undermanned middle';
    } else if (defenseFocus === 'line_speed') {
      bonus = 2;
      description = '💪 Forwards absorbed the line speed and made meters';
    }
    const forwardImpact = (forwardAvg - 55) / 8;
    bonus += forwardImpact;
  }

  if (attackFocus === 'structured') {
    if (defenseFocus === 'line_speed') {
      bonus = 2;
      description = '📋 Structured attack handled the pressure well';
    } else {
      bonus = 1;
      description = '📋 Structured attack probed for openings';
    }
  }

  if (defenseFocus === 'line_speed' && attackFocus !== 'structured') {
    bonus -= 2;
  }

  return { bonus, description };
}

export async function GET(request: Request) {
  const logs: string[] = [];
  
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron');
  
  if (!isVercelCron && secret !== 'frost2026') {
    return NextResponse.json({ 
      success: false, 
      error: 'Manual trigger blocked. Add ?secret=frost2026 to force run.' 
    });
  }
  
  try {
    const { data: fixtures } = await supabase
      .from('fixtures')
      .select('*')
      .eq('season', SEASON)
      .eq('played', false)
      .order('round', { ascending: true });
    
    if (!fixtures || fixtures.length === 0) {
      return NextResponse.json({ success: true, message: 'Season complete!' });
    }
    
    const currentRound = fixtures[0].round;
    const roundFixtures = fixtures.filter((f: { round: number }) => f.round === currentRound);
    
    logs.push(`Simulating Round ${currentRound}`);
    
    const { data: teams } = await supabase.from('teams').select('*');
    const teamsMap: Record<string, any> = {};
    teams?.forEach((t: any) => { teamsMap[t.id] = t; });
    
    const divisionLadders: Record<number, Record<string, number>> = {};
    for (let div = 1; div <= 10; div++) {
      const divTeams = (teams || []).filter(t => t.division === div);
      const sorted = [...divTeams].sort((a, b) => {
        const aPoints = (a.wins * 2) + a.draws;
        const bPoints = (b.wins * 2) + b.draws;
        if (bPoints !== aPoints) return bPoints - aPoints;
        return (b.points_for - b.points_against) - (a.points_for - a.points_against);
      });
      divisionLadders[div] = {};
      sorted.forEach((t, i) => { divisionLadders[div][t.id] = i + 1; });
    }
    
    const ladderPositions: Record<string, number> = {};
    Object.values(divisionLadders).forEach(divLadder => {
      Object.assign(ladderPositions, divLadder);
    });
    
    for (const fixture of roundFixtures) {
      const homeTeam = teamsMap[fixture.home_team_id];
      const awayTeam = teamsMap[fixture.away_team_id];
      
      if (!homeTeam || !awayTeam) {
        logs.push(`Skipping fixture - missing team`);
        continue;
      }
      
      let { data: homeTactics } = await supabase
        .from('team_tactics')
        .select('*')
        .eq('team_id', fixture.home_team_id)
        .single();
      
      let { data: awayTactics } = await supabase
        .from('team_tactics')
        .select('*')
        .eq('team_id', fixture.away_team_id)
        .single();

      const { data: homePlayers } = await supabase
        .from('players')
        .select('id, first_name, last_name, position, overall, fatigue, team_id, speed, strength, power, passing, stamina, tackling, kicking')
        .eq('team_id', fixture.home_team_id)
        .order('overall', { ascending: false })
        .limit(17);
      
      const { data: awayPlayers } = await supabase
        .from('players')
        .select('id, first_name, last_name, position, overall, fatigue, team_id, speed, strength, power, passing, stamina, tackling, kicking')
        .eq('team_id', fixture.away_team_id)
        .order('overall', { ascending: false })
        .limit(17);

      if (!homeTactics && homePlayers && homePlayers.length >= 13) {
        homeTactics = {
          team_id: fixture.home_team_id,
          attack_focus: 'structured',
          defense_focus: 'line_speed',
          pos_fullback: homePlayers[0]?.id,
          pos_winger_r: homePlayers[1]?.id,
          pos_centre_r: homePlayers[2]?.id,
          pos_centre_l: homePlayers[3]?.id,
          pos_winger_l: homePlayers[4]?.id,
          pos_five_eighth: homePlayers[5]?.id,
          pos_halfback: homePlayers[6]?.id,
          pos_prop_l: homePlayers[7]?.id,
          pos_hooker: homePlayers[8]?.id,
          pos_prop_r: homePlayers[9]?.id,
          pos_second_row_l: homePlayers[10]?.id,
          pos_second_row_r: homePlayers[11]?.id,
          pos_lock: homePlayers[12]?.id,
          bench_1: homePlayers[13]?.id,
          bench_2: homePlayers[14]?.id,
          bench_3: homePlayers[15]?.id,
          bench_4: homePlayers[16]?.id,
          goal_kicker: homePlayers[6]?.id
        };
      }

      if (!awayTactics && awayPlayers && awayPlayers.length >= 13) {
        awayTactics = {
          team_id: fixture.away_team_id,
          attack_focus: 'structured',
          defense_focus: 'line_speed',
          pos_fullback: awayPlayers[0]?.id,
          pos_winger_r: awayPlayers[1]?.id,
          pos_centre_r: awayPlayers[2]?.id,
          pos_centre_l: awayPlayers[3]?.id,
          pos_winger_l: awayPlayers[4]?.id,
          pos_five_eighth: awayPlayers[5]?.id,
          pos_halfback: awayPlayers[6]?.id,
          pos_prop_l: awayPlayers[7]?.id,
          pos_hooker: awayPlayers[8]?.id,
          pos_prop_r: awayPlayers[9]?.id,
          pos_second_row_l: awayPlayers[10]?.id,
          pos_second_row_r: awayPlayers[11]?.id,
          pos_lock: awayPlayers[12]?.id,
          bench_1: awayPlayers[13]?.id,
          bench_2: awayPlayers[14]?.id,
          bench_3: awayPlayers[15]?.id,
          bench_4: awayPlayers[16]?.id,
          goal_kicker: awayPlayers[6]?.id
        };
      }
      
      const homeBaseStrength = (homePlayers?.slice(0, 13).reduce((sum: number, p: any) => sum + p.overall, 0) || 0) / 13;
      const awayBaseStrength = (awayPlayers?.slice(0, 13).reduce((sum: number, p: any) => sum + p.overall, 0) || 0) / 13;
      
      const homeAttack = homeTactics?.attack_focus || 'structured';
      const homeDefense = homeTactics?.defense_focus || 'line_speed';
      const awayAttack = awayTactics?.attack_focus || 'structured';
      const awayDefense = awayTactics?.defense_focus || 'line_speed';
      
      const homeTacticalBonus = calculateTacticalBonus(homeAttack, awayDefense, homePlayers || [], homeTactics);
      const awayTacticalBonus = calculateTacticalBonus(awayAttack, homeDefense, awayPlayers || [], awayTactics);
      
      const homeStrength = homeBaseStrength + HOME_ADVANTAGE + homeTacticalBonus.bonus;
      const awayStrength = awayBaseStrength + awayTacticalBonus.bonus;
      
      const allPlayers = [...(homePlayers || []), ...(awayPlayers || [])];
      let motmPlayer: any = null;
      let motmScore = 0;
      
      for (const player of allPlayers) {
        const performance = calculateMatchPerformance(player);
        if (performance > motmScore) {
          motmScore = performance;
          motmPlayer = player;
        }
      }
      
      let homeKicking = 60;
      let awayKicking = 60;
      
      if (homeTactics?.goal_kicker) {
        const { data: kicker } = await supabase.from('players').select('kicking').eq('id', homeTactics.goal_kicker).single();
        if (kicker) homeKicking = kicker.kicking;
      }
      
      if (awayTactics?.goal_kicker) {
        const { data: kicker } = await supabase.from('players').select('kicking').eq('id', awayTactics.goal_kicker).single();
        if (kicker) awayKicking = kicker.kicking;
      }
      
      const strengthDiff = homeStrength - awayStrength;
      const homeTries = Math.max(0, Math.round(BASE_TRIES + (strengthDiff / 15) + (Math.random() - 0.5) * 4));
      const awayTries = Math.max(0, Math.round(BASE_TRIES - (strengthDiff / 15) + (Math.random() - 0.5) * 4));
      
      let homeConv = 0, awayConv = 0;
      for (let i = 0; i < homeTries; i++) if (rollChance(homeKicking)) homeConv++;
      for (let i = 0; i < awayTries; i++) if (rollChance(awayKicking)) awayConv++;
      
      const homePen = rollChance(30) ? (rollChance(30) ? 2 : 1) : 0;
      const awayPen = rollChance(30) ? (rollChance(30) ? 2 : 1) : 0;
      
      const homeScore = (homeTries * 4) + (homeConv * 2) + (homePen * 2);
      const awayScore = (awayTries * 4) + (awayConv * 2) + (awayPen * 2);

      const positionFields = [
        'pos_fullback', 'pos_winger_r', 'pos_centre_r', 'pos_centre_l', 'pos_winger_l',
        'pos_five_eighth', 'pos_halfback', 'pos_prop_l', 'pos_hooker', 'pos_prop_r',
        'pos_second_row_l', 'pos_second_row_r', 'pos_lock', 'bench_1', 'bench_2', 'bench_3', 'bench_4'
      ];

      const minutesPlayed = [80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 25, 20, 10, 0];

      const homeTryScorers = distributeTries(homePlayers || [], homeTries, homeAttack, homeTactics);
      const awayTryScorers = distributeTries(awayPlayers || [], awayTries, awayAttack, awayTactics);

      const homePlayerStats = [];
      for (let i = 0; i < positionFields.length; i++) {
        const field = positionFields[i];
        const playerId = homeTactics?.[field];
        const jerseyNumber = i + 1;
        const minutes = minutesPlayed[i];
        
        if (playerId) {
          const player = homePlayers?.find(p => p.id === playerId);
          if (player) {
            const stats = generatePlayerStats(player, jerseyNumber, minutes);
            const tries = homeTryScorers[playerId] || 0;
            const isKicker = homeTactics?.goal_kicker === playerId;
            const goalsMade = isKicker ? homeConv + homePen : 0;
            const goalsAttempted = isKicker ? homeTries + (homePen > 0 ? Math.ceil(homePen / 2) + 1 : 0) : 0;
            const points = (tries * 4) + (goalsMade * 2);
            
            homePlayerStats.push({
              fixture_id: fixture.id,
              player_id: playerId,
              team_id: fixture.home_team_id,
              jersey_number: jerseyNumber,
              player_name: `${player.first_name.charAt(0)}. ${player.last_name}`,
              ovr: player.overall,
              points: points,
              tries: tries,
              goals_made: goalsMade,
              goals_attempted: goalsAttempted,
              metres: minutes > 0 ? stats.metres : 0,
              tackles: minutes > 0 ? stats.tackles : 0,
              missed_tackles: minutes > 0 ? stats.missedTackles : 0,
              errors: minutes > 0 ? stats.errors : 0,
              minutes_played: minutes
            });
          }
        }
      }

      const awayPlayerStats = [];
      for (let i = 0; i < positionFields.length; i++) {
        const field = positionFields[i];
        const playerId = awayTactics?.[field];
        const jerseyNumber = i + 1;
        const minutes = minutesPlayed[i];
        
        if (playerId) {
          const player = awayPlayers?.find(p => p.id === playerId);
          if (player) {
            const stats = generatePlayerStats(player, jerseyNumber, minutes);
            const tries = awayTryScorers[playerId] || 0;
            const isKicker = awayTactics?.goal_kicker === playerId;
            const goalsMade = isKicker ? awayConv + awayPen : 0;
            const goalsAttempted = isKicker ? awayTries + (awayPen > 0 ? Math.ceil(awayPen / 2) + 1 : 0) : 0;
            const points = (tries * 4) + (goalsMade * 2);
            
            awayPlayerStats.push({
              fixture_id: fixture.id,
              player_id: playerId,
              team_id: fixture.away_team_id,
              jersey_number: jerseyNumber,
              player_name: `${player.first_name.charAt(0)}. ${player.last_name}`,
              ovr: player.overall,
              points: points,
              tries: tries,
              goals_made: goalsMade,
              goals_attempted: goalsAttempted,
              metres: minutes > 0 ? stats.metres : 0,
              tackles: minutes > 0 ? stats.tackles : 0,
              missed_tackles: minutes > 0 ? stats.missedTackles : 0,
              errors: minutes > 0 ? stats.errors : 0,
              minutes_played: minutes
            });
          }
        }
      }

      if (homePlayerStats.length > 0) {
        await supabase.from('player_match_stats').insert(homePlayerStats);
      }
      if (awayPlayerStats.length > 0) {
        await supabase.from('player_match_stats').insert(awayPlayerStats);
      }
      
      await supabase.from('match_results').insert({
        fixture_id: fixture.id,
        home_team_id: fixture.home_team_id,
        away_team_id: fixture.away_team_id,
        home_score: homeScore,
        away_score: awayScore,
        motm_player_id: motmPlayer?.id || null,
        motm_score: motmScore
      });
      
      await supabase.from('fixtures').update({ played: true }).eq('id', fixture.id);
      
      const homeWin = homeScore > awayScore;
      const awayWin = awayScore > homeScore;
      const draw = homeScore === awayScore;
      
      await supabase.from('teams').update({
        wins: homeTeam.wins + (homeWin ? 1 : 0),
        draws: homeTeam.draws + (draw ? 1 : 0),
        losses: homeTeam.losses + (awayWin ? 1 : 0),
        points_for: homeTeam.points_for + homeScore,
        points_against: homeTeam.points_against + awayScore
      }).eq('id', homeTeam.id);
      
      await supabase.from('teams').update({
        wins: awayTeam.wins + (awayWin ? 1 : 0),
        draws: awayTeam.draws + (draw ? 1 : 0),
        losses: awayTeam.losses + (homeWin ? 1 : 0),
        points_for: awayTeam.points_for + awayScore,
        points_against: awayTeam.points_against + homeScore
      }).eq('id', awayTeam.id);
      
      const { data: homeLineup } = await supabase.from('team_tactics').select('*').eq('team_id', fixture.home_team_id).single();
      const { data: awayLineup } = await supabase.from('team_tactics').select('*').eq('team_id', fixture.away_team_id).single();
      
      const posFields = ['pos_fullback', 'pos_winger_l', 'pos_winger_r', 'pos_centre_l', 'pos_centre_r',
        'pos_five_eighth', 'pos_halfback', 'pos_prop_l', 'pos_prop_r', 'pos_hooker',
        'pos_second_row_l', 'pos_second_row_r', 'pos_lock', 'bench_1', 'bench_2', 'bench_3', 'bench_4'];
      
      for (const field of posFields) {
        if (homeLineup?.[field]) {
          const { data: p } = await supabase.from('players').select('fatigue').eq('id', homeLineup[field]).single();
          if (p) await supabase.from('players').update({ fatigue: Math.min(100, p.fatigue + 15) }).eq('id', homeLineup[field]);
        }
        if (awayLineup?.[field]) {
          const { data: p } = await supabase.from('players').select('fatigue').eq('id', awayLineup[field]).single();
          if (p) await supabase.from('players').update({ fatigue: Math.min(100, p.fatigue + 15) }).eq('id', awayLineup[field]);
        }
      }
      
      logs.push(`${homeTeam.name} ${homeScore} - ${awayScore} ${awayTeam.name} | MOTM: ${motmPlayer?.first_name} ${motmPlayer?.last_name}`);
      
      const homeResult = homeWin ? 'win' : awayWin ? 'loss' : 'draw';
      const awayResult = awayWin ? 'win' : homeWin ? 'loss' : 'draw';
      
      const homeTitle = homeWin ? '🏆 Victory!' : awayWin ? '😢 Defeat' : '🤝 Draw';
      const awayTitle = awayWin ? '🏆 Victory!' : homeWin ? '😢 Defeat' : '🤝 Draw';
      
      const homeMsg = homeWin 
        ? `${homeTeam.name} defeated ${awayTeam.name} ${homeScore}-${awayScore}. ${homeTacticalBonus.description}`
        : awayWin
        ? `${homeTeam.name} lost to ${awayTeam.name} ${homeScore}-${awayScore}. ${homeTacticalBonus.description}`
        : `${homeTeam.name} drew with ${awayTeam.name} ${homeScore}-${awayScore}. ${homeTacticalBonus.description}`;
      
      const awayMsg = awayWin
        ? `${awayTeam.name} defeated ${homeTeam.name} ${awayScore}-${homeScore}. ${awayTacticalBonus.description}`
        : homeWin
        ? `${awayTeam.name} lost to ${homeTeam.name} ${awayScore}-${homeScore}. ${awayTacticalBonus.description}`
        : `${awayTeam.name} drew with ${homeTeam.name} ${awayScore}-${homeScore}. ${awayTacticalBonus.description}`;
      
      await supabase.from('notifications').insert({
        team_id: homeTeam.id,
        type: `match_${homeResult}`,
        title: homeTitle,
        message: homeMsg,
        fixture_id: fixture.id
      });
      
      await supabase.from('notifications').insert({
        team_id: awayTeam.id,
        type: `match_${awayResult}`,
        title: awayTitle,
        message: awayMsg,
        fixture_id: fixture.id
      });
      
      if (motmPlayer) {
        const motmTeam = teamsMap[motmPlayer.team_id];
        
        await supabase.from('notifications').insert({
          team_id: motmPlayer.team_id,
          type: 'motm',
          title: '⭐ Man of the Match!',
          message: `${motmPlayer.first_name} ${motmPlayer.last_name} (${motmPlayer.position}) was awarded Man of the Match! +5 XP`,
          player_id: motmPlayer.id,
          fixture_id: fixture.id
        });
        
        const { data: motmCoach } = await supabase
          .from('coaches')
          .select('id, xp')
          .eq('team_id', motmPlayer.team_id)
          .single();
        
        if (motmCoach) {
          await supabase
            .from('coaches')
            .update({ xp: (motmCoach.xp || 0) + 5 })
            .eq('id', motmCoach.id);
        }
        
        const otherTeamId = motmPlayer.team_id === fixture.home_team_id 
          ? fixture.away_team_id 
          : fixture.home_team_id;
        
        await supabase.from('notifications').insert({
          team_id: otherTeamId,
          type: 'motm_opponent',
          title: '⭐ Opponent MOTM',
          message: `${motmPlayer.first_name} ${motmPlayer.last_name} (${motmTeam?.name}) was Man of the Match`,
          player_id: motmPlayer.id,
          fixture_id: fixture.id
        });
      }
    }
    
    const { data: trainingPlayers } = await supabase
      .from('players')
      .select('*')
      .not('current_training', 'is', null);
    
    let improvements = 0;
    const PROGRESS_STAGES = ['NONE', 'POOR', 'FAIR', 'GOOD', 'VERY GOOD', 'EXCELLENT'];
    const STAT_CHANCES: Record<string, number> = { 'NONE': 0, 'POOR': 15, 'FAIR': 35, 'GOOD': 55, 'VERY GOOD': 75, 'EXCELLENT': 90 };
    const STAT_TRAINING = ['Speed', 'Strength', 'Power', 'Passing', 'Stamina', 'Tackling', 'Kicking'];
    
    for (const player of trainingPlayers || []) {
      const updates: Record<string, any> = {};
      const training = player.current_training;
      const progress = player.training_progress || 'NONE';
      const potential = player.potential || 70;
      const potentialBonus = (potential - 60) / 2;
      
      if (training === 'Rest') {
        updates.fatigue = Math.max(0, player.fatigue - 25);
      } else {
        updates.fatigue = Math.min(100, player.fatigue + 5);
        
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
            const roll = Math.random() * 100;
            const gain = roll < 50 ? 1 : roll < 85 ? 2 : 3;
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
            
            if (newOverall > player.overall) {
              await supabase.from('notifications').insert({
                team_id: player.team_id,
                type: 'player_improvement',
                title: '⭐ Player Improved!',
                message: `${player.first_name} ${player.last_name} increased ${training} from ${current} to ${newStat}! Overall now ${newOverall} (was ${player.overall})`,
                player_id: player.id
              });
            }
          }
        }
      }
      
      if (Object.keys(updates).length > 0) {
        await supabase.from('players').update(updates).eq('id', player.id);
      }
    }
    
    logs.push(`Training: ${improvements} players improved`);
    
    let freeAgentMoves = 0;
    
    const { data: freeAgents } = await supabase
      .from('free_agents')
      .select('*, players(*)')
      .eq('claimed', false)
      .lte('available_round', currentRound);
    
    for (const freeAgent of freeAgents || []) {
      const { data: claims } = await supabase
        .from('free_agent_claims')
        .select('*')
        .eq('free_agent_id', freeAgent.id);
      
      if (!claims || claims.length === 0) continue;
      
      const scoredClaims = [];
      
      for (const claim of claims) {
        const { data: squadPlayers } = await supabase
          .from('players')
          .select('position')
          .eq('team_id', claim.team_id);
        
        const squadSize = squadPlayers?.length || 0;
        const samePositionCount = squadPlayers?.filter(p => p.position === freeAgent.players.position).length || 0;
        const ladderPos = ladderPositions[claim.team_id] || 5;
        
        const ladderScore = ladderPos;
        const squadScore = (22 - squadSize);
        const needScore = Math.max(0, 4 - samePositionCount) * 2;
        
        const totalScore = ladderScore + squadScore + needScore + Math.random() * 2;
        
        scoredClaims.push({
          ...claim,
          score: totalScore,
          teamName: teamsMap[claim.team_id]?.name || 'Unknown'
        });
      }
      
      scoredClaims.sort((a, b) => b.score - a.score);
      
      const winner = scoredClaims[0];
      const winnerTeam = teamsMap[winner.team_id];
      
      if (winner.release_player_id) {
        const { data: releasedPlayer } = await supabase
          .from('players')
          .select('*')
          .eq('id', winner.release_player_id)
          .single();
        
        if (releasedPlayer) {
          await supabase.from('free_agents').insert({
            player_id: winner.release_player_id,
            released_by_team_id: winner.team_id,
            available_round: currentRound + 1
          });
          
          await supabase.from('players').delete().eq('id', winner.release_player_id);
          
          for (const t of teams || []) {
            await supabase.from('notifications').insert({
              team_id: t.id,
              type: 'league_news',
              title: '🏪 Player Released to Free Agents',
              message: `${winnerTeam?.name} released ${releasedPlayer.first_name} ${releasedPlayer.last_name} (${releasedPlayer.position}, ${releasedPlayer.overall} OVR, Age ${releasedPlayer.age}). Available next round.`
            });
          }
        }
      }
      
      await supabase.from('players').update({ team_id: winner.team_id }).eq('id', freeAgent.player_id);
      await supabase.from('free_agents').update({ claimed: true }).eq('id', freeAgent.id);
      
      await supabase.from('notifications').insert({
        team_id: winner.team_id,
        type: 'free_agent_won',
        title: '✅ Free Agent Signed!',
        message: `You successfully signed ${freeAgent.players.first_name} ${freeAgent.players.last_name} (${freeAgent.players.position}, ${freeAgent.players.overall} OVR)!`,
        player_id: freeAgent.player_id
      });
      
      for (const loser of scoredClaims.slice(1)) {
        await supabase.from('notifications').insert({
          team_id: loser.team_id,
          type: 'free_agent_lost',
          title: '❌ Free Agent Request Failed',
          message: `${freeAgent.players.first_name} ${freeAgent.players.last_name} signed with ${winnerTeam?.name || 'another team'} instead.`,
          player_id: freeAgent.player_id
        });
      }
      
      for (const t of teams || []) {
        if (t.id !== winner.team_id) {
          await supabase.from('notifications').insert({
            team_id: t.id,
            type: 'league_news',
            title: '📰 Free Agent Signed',
            message: `${winnerTeam?.name} signed ${freeAgent.players.first_name} ${freeAgent.players.last_name} (${freeAgent.players.position}, ${freeAgent.players.overall} OVR, Age ${freeAgent.players.age}) from free agency.`
          });
        }
      }
      
      await supabase.from('free_agent_claims').delete().eq('free_agent_id', freeAgent.id);
      
      freeAgentMoves++;
      logs.push(`Free Agent: ${freeAgent.players.last_name} → ${winnerTeam?.city || 'Unknown'}`);
    }
    
    logs.push(`Free Agents: ${freeAgentMoves} players moved`);
    
    return NextResponse.json({
      success: true,
      round: currentRound,
      matches: logs,
      improvements,
      freeAgentMoves
    });
    
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}