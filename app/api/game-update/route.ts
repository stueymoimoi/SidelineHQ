// @ts-nocheck
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SEASON = 0;
const HOME_ADVANTAGE = 3;
const BASE_TRIES = 4;

function rollChance(pct: number) {
  return Math.random() * 100 < pct;
}

function getPositionConfig(jerseyNumber: number) {
  const configs: Record<number, { metresBase: number; tacklesBase: number; touchesBase: number }> = {
    1:  { metresBase: 120, tacklesBase: 8, touchesBase: 18 },
    2:  { metresBase: 100, tacklesBase: 10, touchesBase: 12 },
    3:  { metresBase: 110, tacklesBase: 18, touchesBase: 14 },
    4:  { metresBase: 110, tacklesBase: 18, touchesBase: 14 },
    5:  { metresBase: 100, tacklesBase: 10, touchesBase: 12 },
    6:  { metresBase: 80, tacklesBase: 22, touchesBase: 22 },
    7:  { metresBase: 50, tacklesBase: 28, touchesBase: 35 },
    8:  { metresBase: 140, tacklesBase: 32, touchesBase: 14 },
    9:  { metresBase: 60, tacklesBase: 48, touchesBase: 40 },
    10: { metresBase: 140, tacklesBase: 32, touchesBase: 14 },
    11: { metresBase: 120, tacklesBase: 36, touchesBase: 14 },
    12: { metresBase: 120, tacklesBase: 36, touchesBase: 14 },
    13: { metresBase: 130, tacklesBase: 42, touchesBase: 16 },
    14: { metresBase: 60, tacklesBase: 18, touchesBase: 8 },
    15: { metresBase: 55, tacklesBase: 16, touchesBase: 8 },
    16: { metresBase: 50, tacklesBase: 14, touchesBase: 6 },
    17: { metresBase: 45, tacklesBase: 12, touchesBase: 5 },
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
  if (passingStat >= 90) return 0.01;
  if (passingStat >= 80) return 0.02;
  if (passingStat >= 70) return 0.03;
  if (passingStat >= 60) return 0.04;
  if (passingStat >= 50) return 0.05;
  if (passingStat >= 40) return 0.07;
  return 0.10;
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
  let rating = 6.5;
  
  const metresRatio = stats.metres / (config.metresBase * 0.9);
  rating += Math.min(1.5, (metresRatio - 1) * 1.5);
  
  const tacklesRatio = stats.tackles / (config.tacklesBase * 0.9);
  rating += Math.min(1.0, (tacklesRatio - 1) * 1.0);
  
  rating += stats.tries * 0.8;
  rating += stats.goals * 0.3;
  rating -= stats.missedTackles * 0.08;
  rating -= stats.errors * 0.10;
  
  if (isMotm) rating = Math.max(rating, 8.5);
  
  return Math.min(10, Math.max(1, Math.round(rating * 10) / 10));
}

function calculateTacticalBonus(attackFocus: string, defenseFocus: string, players: any[], tactics: any) {
  let bonus = 0;
  let description = '';

  const getOvr = (id: string | null) => {
    if (!id) return 50;
    const p = players.find(x => x.id === id);
    return p?.overall || 50;
  };

  const spineAvg = (getOvr(tactics?.pos_halfback) + getOvr(tactics?.pos_five_eighth)) / 2;
  const forwardAvg = (getOvr(tactics?.pos_prop_l) + getOvr(tactics?.pos_prop_r) + getOvr(tactics?.pos_hooker) + getOvr(tactics?.pos_lock)) / 4;

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

function distributeTries(players: any[], totalTries: number, tactics: any): Record<string, number> {
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
      const player = players.find(p => p.id === playerId);
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
  const logs: string[] = [];
  
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron');
  
  if (!isVercelCron && secret !== 'frost2026') {
    return NextResponse.json({ success: false, error: 'Add ?secret=frost2026' });
  }
  
  try {
    // Load fixtures and teams
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
    const roundFixtures = fixtures.filter(f => f.round === currentRound);
    
    logs.push(`Simulating Round ${currentRound}`);
    
    const { data: teams } = await supabase.from('teams').select('*');
    const teamsMap: Record<string, any> = {};
    teams?.forEach(t => { teamsMap[t.id] = t; });
    
    const positionFields = [
      'pos_fullback', 'pos_winger_r', 'pos_centre_r', 'pos_centre_l', 'pos_winger_l',
      'pos_five_eighth', 'pos_halfback', 'pos_prop_l', 'pos_hooker', 'pos_prop_r',
      'pos_second_row_l', 'pos_second_row_r', 'pos_lock', 'bench_1', 'bench_2', 'bench_3', 'bench_4'
    ];
    const minutesPlayed = [80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 25, 20, 10, 0];
    
    // Process each match
    for (const fixture of roundFixtures) {
      const homeTeam = teamsMap[fixture.home_team_id];
      const awayTeam = teamsMap[fixture.away_team_id];
      if (!homeTeam || !awayTeam) continue;
      
      // Fetch players for BOTH teams
      const { data: allMatchPlayers } = await supabase
        .from('players')
        .select('*')
        .in('team_id', [fixture.home_team_id, fixture.away_team_id]);
      
      const homePlayers = (allMatchPlayers || []).filter(p => p.team_id === fixture.home_team_id);
      const awayPlayers = (allMatchPlayers || []).filter(p => p.team_id === fixture.away_team_id);
      
      // Fetch tactics
      const { data: homeTacticsData } = await supabase
        .from('team_tactics')
        .select('*')
        .eq('team_id', fixture.home_team_id)
        .single();
      
      const { data: awayTacticsData } = await supabase
        .from('team_tactics')
        .select('*')
        .eq('team_id', fixture.away_team_id)
        .single();
      
      // Auto-generate tactics if missing
      const sortedHome = [...homePlayers].sort((a, b) => b.overall - a.overall);
      const sortedAway = [...awayPlayers].sort((a, b) => b.overall - a.overall);
      
      const homeTactics = homeTacticsData || {
        attack_focus: 'structured', defense_focus: 'line_speed',
        pos_fullback: sortedHome[0]?.id, pos_winger_r: sortedHome[1]?.id,
        pos_centre_r: sortedHome[2]?.id, pos_centre_l: sortedHome[3]?.id,
        pos_winger_l: sortedHome[4]?.id, pos_five_eighth: sortedHome[5]?.id,
        pos_halfback: sortedHome[6]?.id, pos_prop_l: sortedHome[7]?.id,
        pos_hooker: sortedHome[8]?.id, pos_prop_r: sortedHome[9]?.id,
        pos_second_row_l: sortedHome[10]?.id, pos_second_row_r: sortedHome[11]?.id,
        pos_lock: sortedHome[12]?.id, bench_1: sortedHome[13]?.id,
        bench_2: sortedHome[14]?.id, bench_3: sortedHome[15]?.id, bench_4: sortedHome[16]?.id,
        goal_kicker: sortedHome[6]?.id
      };
      
      const awayTactics = awayTacticsData || {
        attack_focus: 'structured', defense_focus: 'line_speed',
        pos_fullback: sortedAway[0]?.id, pos_winger_r: sortedAway[1]?.id,
        pos_centre_r: sortedAway[2]?.id, pos_centre_l: sortedAway[3]?.id,
        pos_winger_l: sortedAway[4]?.id, pos_five_eighth: sortedAway[5]?.id,
        pos_halfback: sortedAway[6]?.id, pos_prop_l: sortedAway[7]?.id,
        pos_hooker: sortedAway[8]?.id, pos_prop_r: sortedAway[9]?.id,
        pos_second_row_l: sortedAway[10]?.id, pos_second_row_r: sortedAway[11]?.id,
        pos_lock: sortedAway[12]?.id, bench_1: sortedAway[13]?.id,
        bench_2: sortedAway[14]?.id, bench_3: sortedAway[15]?.id, bench_4: sortedAway[16]?.id,
        goal_kicker: sortedAway[6]?.id
      };
      
      // Calculate team strengths
      const homeStarterIds = positionFields.slice(0, 13).map(f => homeTactics[f]).filter(Boolean);
      const awayStarterIds = positionFields.slice(0, 13).map(f => awayTactics[f]).filter(Boolean);
      
      const homeBaseStrength = homeStarterIds.length > 0 
        ? homeStarterIds.reduce((sum, id) => sum + (homePlayers.find(p => p.id === id)?.overall || 30), 0) / homeStarterIds.length
        : 30;
      const awayBaseStrength = awayStarterIds.length > 0
        ? awayStarterIds.reduce((sum, id) => sum + (awayPlayers.find(p => p.id === id)?.overall || 30), 0) / awayStarterIds.length
        : 30;
      
      const homeTacticalBonus = calculateTacticalBonus(
        homeTactics.attack_focus || 'structured',
        awayTactics.defense_focus || 'line_speed',
        homePlayers, homeTactics
      );
      const awayTacticalBonus = calculateTacticalBonus(
        awayTactics.attack_focus || 'structured',
        homeTactics.defense_focus || 'line_speed',
        awayPlayers, awayTactics
      );
      
      const homeStrength = homeBaseStrength + HOME_ADVANTAGE + homeTacticalBonus.bonus;
      const awayStrength = awayBaseStrength + awayTacticalBonus.bonus;
      
      // Find MOTM
      let motmPlayer: any = null;
      let motmScore = 0;
      for (const p of [...homePlayers, ...awayPlayers]) {
        const score = p.overall * (1 - p.fatigue / 200) * (0.8 + Math.random() * 0.4);
        if (score > motmScore) { motmScore = score; motmPlayer = p; }
      }
      
      // Kicking stats
      const homeKicker = homePlayers.find(p => p.id === homeTactics.goal_kicker);
      const awayKicker = awayPlayers.find(p => p.id === awayTactics.goal_kicker);
      const homeKicking = homeKicker?.kicking || 60;
      const awayKicking = awayKicker?.kicking || 60;
      
      // Calculate scores
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
      
      // Distribute tries
      const homeTryScorers = distributeTries(homePlayers, homeTries, homeTactics);
      const awayTryScorers = distributeTries(awayPlayers, awayTries, awayTactics);
      
      // Generate player stats
      const allPlayerStats: any[] = [];
      
      for (let i = 0; i < positionFields.length; i++) {
        const field = positionFields[i];
        const jerseyNumber = i + 1;
        const minutes = minutesPlayed[i];
        
        // Home team
        const homePlayerId = homeTactics[field];
        if (homePlayerId) {
          const player = homePlayers.find(p => p.id === homePlayerId);
          if (player) {
            const stats = generatePlayerStats(player, jerseyNumber, minutes);
            const tries = homeTryScorers[homePlayerId] || 0;
            const isKicker = homeTactics.goal_kicker === homePlayerId;
            const goals = isKicker ? homeConv + homePen : 0;
            const points = (tries * 4) + (goals * 2);
            const isMotm = motmPlayer?.id === homePlayerId;
            const rating = calculatePlayerRating({ ...stats, tries, goals }, jerseyNumber, isMotm);
            
            allPlayerStats.push({
              fixture_id: fixture.id,
              player_id: homePlayerId,
              team_id: fixture.home_team_id,
              jersey_number: jerseyNumber,
              player_name: `${player.first_name.charAt(0)}. ${player.last_name}`,
              ovr: player.overall,
              points, tries, goals_made: goals, goals_attempted: 0,
              metres: stats.metres, tackles: stats.tackles,
              missed_tackles: stats.missedTackles, errors: stats.errors,
              minutes_played: minutes, rating
            });
          }
        }
        
        // Away team
        const awayPlayerId = awayTactics[field];
        if (awayPlayerId) {
          const player = awayPlayers.find(p => p.id === awayPlayerId);
          if (player) {
            const stats = generatePlayerStats(player, jerseyNumber, minutes);
            const tries = awayTryScorers[awayPlayerId] || 0;
            const isKicker = awayTactics.goal_kicker === awayPlayerId;
            const goals = isKicker ? awayConv + awayPen : 0;
            const points = (tries * 4) + (goals * 2);
            const isMotm = motmPlayer?.id === awayPlayerId;
            const rating = calculatePlayerRating({ ...stats, tries, goals }, jerseyNumber, isMotm);
            
            allPlayerStats.push({
              fixture_id: fixture.id,
              player_id: awayPlayerId,
              team_id: fixture.away_team_id,
              jersey_number: jerseyNumber,
              player_name: `${player.first_name.charAt(0)}. ${player.last_name}`,
              ovr: player.overall,
              points, tries, goals_made: goals, goals_attempted: 0,
              metres: stats.metres, tackles: stats.tackles,
              missed_tackles: stats.missedTackles, errors: stats.errors,
              minutes_played: minutes, rating
            });
          }
        }
      }
      
      // Insert player stats
      if (allPlayerStats.length > 0) {
        await supabase.from('player_match_stats').insert(allPlayerStats);
      }
      
      // Insert match result
      await supabase.from('match_results').insert({
        fixture_id: fixture.id,
        season: SEASON,
        round: currentRound,
        home_team_id: fixture.home_team_id,
        away_team_id: fixture.away_team_id,
        home_score: homeScore,
        away_score: awayScore,
        motm_player_id: motmPlayer?.id || null,
        motm_score: motmScore
      });
      
      // Mark fixture as played
      await supabase.from('fixtures').update({ played: true }).eq('id', fixture.id);
      
      // Update team standings
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
      
      // Update fatigue for players who played
      const playedIds = allPlayerStats.map(s => s.player_id);
      if (playedIds.length > 0) {
        for (const pid of playedIds) {
          const p = [...homePlayers, ...awayPlayers].find(x => x.id === pid);
          if (p) {
            await supabase.from('players').update({ 
              fatigue: Math.min(100, (p.fatigue || 0) + 15) 
            }).eq('id', pid);
          }
        }
      }
      
      // Notifications
      const homeResult = homeWin ? 'win' : awayWin ? 'loss' : 'draw';
      const awayResult = awayWin ? 'win' : homeWin ? 'loss' : 'draw';
      const homeTitle = homeWin ? '🏆 Victory!' : awayWin ? '😢 Defeat' : '🤝 Draw';
      const awayTitle = awayWin ? '🏆 Victory!' : homeWin ? '😢 Defeat' : '🤝 Draw';
      
      await supabase.from('notifications').insert([
        {
          team_id: homeTeam.id,
          type: `match_${homeResult}`,
          title: homeTitle,
          message: `${homeTeam.name} ${homeWin ? 'defeated' : awayWin ? 'lost to' : 'drew with'} ${awayTeam.name} ${homeScore}-${awayScore}. ${homeTacticalBonus.description}`,
          fixture_id: fixture.id
        },
        {
          team_id: awayTeam.id,
          type: `match_${awayResult}`,
          title: awayTitle,
          message: `${awayTeam.name} ${awayWin ? 'defeated' : homeWin ? 'lost to' : 'drew with'} ${homeTeam.name} ${awayScore}-${homeScore}. ${awayTacticalBonus.description}`,
          fixture_id: fixture.id
        }
      ]);
      
      if (motmPlayer) {
        await supabase.from('notifications').insert({
          team_id: motmPlayer.team_id,
          type: 'motm',
          title: '⭐ Man of the Match!',
          message: `${motmPlayer.first_name} ${motmPlayer.last_name} (${motmPlayer.position}) was awarded Man of the Match! +5 XP`,
          player_id: motmPlayer.id,
          fixture_id: fixture.id
        });
        
        const otherTeamId = motmPlayer.team_id === fixture.home_team_id ? fixture.away_team_id : fixture.home_team_id;
        await supabase.from('notifications').insert({
          team_id: otherTeamId,
          type: 'motm_opponent',
          title: '⭐ Opponent MOTM',
          message: `${motmPlayer.first_name} ${motmPlayer.last_name} (${teamsMap[motmPlayer.team_id]?.name}) was Man of the Match`,
          player_id: motmPlayer.id,
          fixture_id: fixture.id
        });
        
        // Coach XP
        await supabase.rpc('increment_coach_xp', { p_team_id: motmPlayer.team_id, amount: 5 });
      }
      
      logs.push(`${homeTeam.name} ${homeScore} - ${awayScore} ${awayTeam.name} | MOTM: ${motmPlayer?.first_name || 'N/A'} ${motmPlayer?.last_name || ''}`);
    }
    
    // TRAINING
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
          const statKey = training.toLowerCase() as keyof typeof player;
          const current = player[statKey] as number;
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
                await supabase.from('notifications').insert({
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
    
    logs.push(`Training: ${improvements} players improved`);
    
    return NextResponse.json({
      success: true,
      round: currentRound,
      matches: logs,
      improvements
    });
    
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
