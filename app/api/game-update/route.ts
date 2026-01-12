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

// Calculate match performance for MOTM
function calculateMatchPerformance(player: any): number {
  const baseScore = player.overall;
  const fatigueMultiplier = 1 - (player.fatigue / 200);
  const variance = 0.8 + (Math.random() * 0.4);
  return baseScore * fatigueMultiplier * variance;
}

// Calculate tactical bonus/penalty
function calculateTacticalBonus(
  attackFocus: string,
  defenseFocus: string,
  attackingPlayers: any[],
  tactics: any
): { bonus: number; description: string } {
  let bonus = 0;
  let description = '';

  // Get key player averages for position-based bonuses
  const getPlayerOverall = (id: string | null) => {
    if (!id) return 50;
    const player = attackingPlayers.find(p => p.id === id);
    return player?.overall || 50;
  };

  // Spine players (for edge attacks)
  const halfback = getPlayerOverall(tactics?.pos_halfback);
  const fiveEighth = getPlayerOverall(tactics?.pos_five_eighth);
  const spineAvg = (halfback + fiveEighth) / 2;

  // Forward pack (for middle attacks)
  const propL = getPlayerOverall(tactics?.pos_prop_l);
  const propR = getPlayerOverall(tactics?.pos_prop_r);
  const hooker = getPlayerOverall(tactics?.pos_hooker);
  const lock = getPlayerOverall(tactics?.pos_lock);
  const forwardAvg = (propL + propR + hooker + lock) / 4;

  // OFF THE CUFF - High risk, high reward
  if (attackFocus === 'off_the_cuff') {
    const spineBonus = (spineAvg - 50) / 100; // Better halves = better odds
    const roll = Math.random() * 100;
    
    if (roll < 40 + (spineBonus * 20)) {
      // It clicks! Big bonus
      bonus = 15;
      description = '🎲 Off the Cuff magic! Playing with freedom';
    } else if (roll < 75 + (spineBonus * 10)) {
      // Meh, nothing special
      bonus = 0;
      description = '🎲 Off the Cuff: Nothing came off';
    } else {
      // Falls apart
      bonus = -10;
      description = '🎲 Off the Cuff backfired! Too many errors';
    }
    return { bonus, description };
  }

  // RAID LEFT vs Defense
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
    // Spine bonus for edge attacks
    const spineImpact = (spineAvg - 55) / 10;
    bonus += spineImpact;
  }

  // RAID RIGHT vs Defense
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
    // Spine bonus for edge attacks
    const spineImpact = (spineAvg - 55) / 10;
    bonus += spineImpact;
  }

  // UP THE GUTS vs Defense
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
    // Forward pack bonus for middle attacks
    const forwardImpact = (forwardAvg - 55) / 8;
    bonus += forwardImpact;
  }

  // STRUCTURED vs Defense
  if (attackFocus === 'structured') {
    // Structured is safe, small bonuses
    if (defenseFocus === 'line_speed') {
      bonus = 2;
      description = '📋 Structured attack handled the pressure well';
    } else {
      bonus = 1;
      description = '📋 Structured attack probed for openings';
    }
  }

  // LINE SPEED defense bonus
  if (defenseFocus === 'line_speed' && attackFocus !== 'structured') {
    bonus -= 2; // Pressure causes errors
  }

  return { bonus, description };
}

export async function GET(request: Request) {
  const logs: string[] = [];
  
  // Safety check - prevent accidental manual runs
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
    // Find next round to simulate
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
    
    // Get ALL teams
    const { data: teams } = await supabase.from('teams').select('*');
    const teamsMap: Record<string, any> = {};
    teams?.forEach((t: any) => { teamsMap[t.id] = t; });
    
    // Calculate ladder positions (per division)
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
    
    // Simulate each match
    for (const fixture of roundFixtures) {
      const homeTeam = teamsMap[fixture.home_team_id];
      const awayTeam = teamsMap[fixture.away_team_id];
      
      if (!homeTeam || !awayTeam) {
        logs.push(`Skipping fixture - missing team`);
        continue;
      }
      
      // Get team tactics
      const { data: homeTactics } = await supabase
        .from('team_tactics')
        .select('*')
        .eq('team_id', fixture.home_team_id)
        .single();
      
      const { data: awayTactics } = await supabase
        .from('team_tactics')
        .select('*')
        .eq('team_id', fixture.away_team_id)
        .single();

      // Get team strengths (top 13 players with full data for MOTM)
      const { data: homePlayers } = await supabase
        .from('players')
        .select('id, first_name, last_name, position, overall, fatigue, team_id')
        .eq('team_id', fixture.home_team_id)
        .order('overall', { ascending: false })
        .limit(17);
      
      const { data: awayPlayers } = await supabase
        .from('players')
        .select('id, first_name, last_name, position, overall, fatigue, team_id')
        .eq('team_id', fixture.away_team_id)
        .order('overall', { ascending: false })
        .limit(17);
      
      // Base strength (top 13 average)
      const homeBaseStrength = (homePlayers?.slice(0, 13).reduce((sum: number, p: any) => sum + p.overall, 0) || 0) / 13;
      const awayBaseStrength = (awayPlayers?.slice(0, 13).reduce((sum: number, p: any) => sum + p.overall, 0) || 0) / 13;
      
      // Get attack/defense focus (default to structured/line_speed)
      const homeAttack = homeTactics?.attack_focus || 'structured';
      const homeDefense = homeTactics?.defense_focus || 'line_speed';
      const awayAttack = awayTactics?.attack_focus || 'structured';
      const awayDefense = awayTactics?.defense_focus || 'line_speed';
      
      // Calculate tactical bonuses
      const homeTacticalBonus = calculateTacticalBonus(homeAttack, awayDefense, homePlayers || [], homeTactics);
      const awayTacticalBonus = calculateTacticalBonus(awayAttack, homeDefense, awayPlayers || [], awayTactics);
      
      // Final strength with tactics and home advantage
      const homeStrength = homeBaseStrength + HOME_ADVANTAGE + homeTacticalBonus.bonus;
      const awayStrength = awayBaseStrength + awayTacticalBonus.bonus;
      
      // Calculate MOTM from all 26 players
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
      
      // Get goal kickers
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
      
      // Calculate tries (now influenced by tactics)
      const strengthDiff = homeStrength - awayStrength;
      const homeTries = Math.max(0, Math.round(BASE_TRIES + (strengthDiff / 15) + (Math.random() - 0.5) * 4));
      const awayTries = Math.max(0, Math.round(BASE_TRIES - (strengthDiff / 15) + (Math.random() - 0.5) * 4));
      
      // Conversions
      let homeConv = 0, awayConv = 0;
      for (let i = 0; i < homeTries; i++) if (rollChance(homeKicking)) homeConv++;
      for (let i = 0; i < awayTries; i++) if (rollChance(awayKicking)) awayConv++;
      
      // Penalties
      const homePen = rollChance(30) ? (rollChance(30) ? 2 : 1) : 0;
      const awayPen = rollChance(30) ? (rollChance(30) ? 2 : 1) : 0;
      
      // Final scores
      const homeScore = (homeTries * 4) + (homeConv * 2) + (homePen * 2);
      const awayScore = (awayTries * 4) + (awayConv * 2) + (awayPen * 2);
      
      // Save result with MOTM
      await supabase.from('match_results').insert({
        fixture_id: fixture.id,
        home_team_id: fixture.home_team_id,
        away_team_id: fixture.away_team_id,
        home_score: homeScore,
        away_score: awayScore,
        motm_player_id: motmPlayer?.id || null,
        motm_score: motmScore
      });
      
      // Mark played
      await supabase.from('fixtures').update({ played: true }).eq('id', fixture.id);
      
      // Update standings
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
      
      // Add fatigue to players who played (+15%)
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
      
      // Create notifications for both teams
      const homeResult = homeWin ? 'win' : awayWin ? 'loss' : 'draw';
      const awayResult = awayWin ? 'win' : homeWin ? 'loss' : 'draw';
      
      const homeTitle = homeWin ? '🏆 Victory!' : awayWin ? '😢 Defeat' : '🤝 Draw';
      const awayTitle = awayWin ? '🏆 Victory!' : homeWin ? '😢 Defeat' : '🤝 Draw';
      
      // Include tactical summary in notifications
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
      
      // MOTM notification + XP bonus
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
    
    // Process training
    const { data: trainingPlayers } = await supabase
      .from('players')
      .select('*')
      .not('current_training', 'is', null);
    
    let improvements = 0;
    const PROGRESS_STAGES = ['NONE', 'POOR', 'FAIR', 'GOOD', 'VERY GOOD', 'EXCELLENT'];
    const STAT_CHANCES: Record<string, number> = { 'NONE': 0, 'POOR': 15, 'FAIR': 35, 'GOOD': 55, 'VERY GOOD': 75, 'EXCELLENT': 90 };
    const STAT_TRAINING = ['Speed', 'Strength', 'Skill', 'Stamina', 'Defense'];
    
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
              (updates.skill ?? player.skill) +
              (updates.stamina ?? player.stamina) +
              (updates.defense ?? player.defense)
            ) / 5);
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
    
    // Process free agent claims
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