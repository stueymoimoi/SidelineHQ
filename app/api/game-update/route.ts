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

export async function GET() {
  const logs: string[] = [];
  
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
    
    // Get teams
    const { data: teams } = await supabase.from('teams').select('*').eq('division', 1);
    const teamsMap: Record<string, any> = {};
    teams?.forEach((t: any) => { teamsMap[t.id] = t; });
    
    // Calculate ladder positions
    const sortedTeams = [...(teams || [])].sort((a, b) => {
      const aPoints = (a.wins * 2) + a.draws;
      const bPoints = (b.wins * 2) + b.draws;
      if (bPoints !== aPoints) return bPoints - aPoints;
      return (b.points_for - b.points_against) - (a.points_for - a.points_against);
    });
    const ladderPositions: Record<string, number> = {};
    sortedTeams.forEach((t, i) => { ladderPositions[t.id] = i + 1; });
    
    // Simulate each match
    for (const fixture of roundFixtures) {
      const homeTeam = teamsMap[fixture.home_team_id];
      const awayTeam = teamsMap[fixture.away_team_id];
      
      // Get team strengths (average of top 13 players)
      const { data: homePlayers } = await supabase
        .from('players')
        .select('overall, fatigue')
        .eq('team_id', fixture.home_team_id)
        .order('overall', { ascending: false })
        .limit(13);
      
      const { data: awayPlayers } = await supabase
        .from('players')
        .select('overall, fatigue')
        .eq('team_id', fixture.away_team_id)
        .order('overall', { ascending: false })
        .limit(13);
      
      const homeStrength = (homePlayers?.reduce((sum: number, p: any) => sum + p.overall, 0) || 0) / 13 + HOME_ADVANTAGE;
      const awayStrength = (awayPlayers?.reduce((sum: number, p: any) => sum + p.overall, 0) || 0) / 13;
      
      // Get goal kickers
      const { data: homeTactics } = await supabase
        .from('team_tactics')
        .select('goal_kicker')
        .eq('team_id', fixture.home_team_id)
        .single();
      
      const { data: awayTactics } = await supabase
        .from('team_tactics')
        .select('goal_kicker')
        .eq('team_id', fixture.away_team_id)
        .single();
      
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
      
      // Calculate tries
      const strengthDiff = homeStrength - awayStrength;
      const homeTries = Math.max(0, Math.round(BASE_TRIES + (strengthDiff / 20) + (Math.random() - 0.5) * 4));
      const awayTries = Math.max(0, Math.round(BASE_TRIES - (strengthDiff / 20) + (Math.random() - 0.5) * 4));
      
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
      
      // Save result
      await supabase.from('match_results').insert({
        fixture_id: fixture.id,
        home_team_id: fixture.home_team_id,
        away_team_id: fixture.away_team_id,
        home_score: homeScore,
        away_score: awayScore
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
      
      logs.push(`${homeTeam.city} ${homeScore} - ${awayScore} ${awayTeam.city}`);
      
      // Create notifications for both teams
      const homeResult = homeWin ? 'win' : awayWin ? 'loss' : 'draw';
      const awayResult = awayWin ? 'win' : homeWin ? 'loss' : 'draw';
      
      const homeTitle = homeWin ? '🏆 Victory!' : awayWin ? '😢 Defeat' : '🤝 Draw';
      const awayTitle = awayWin ? '🏆 Victory!' : homeWin ? '😢 Defeat' : '🤝 Draw';
      
      const homeMsg = homeWin 
        ? `Congratulations! ${homeTeam.city} ${homeTeam.name} defeated ${awayTeam.city} ${awayTeam.name} ${homeScore}-${awayScore}`
        : awayWin
        ? `${homeTeam.city} ${homeTeam.name} lost to ${awayTeam.city} ${awayTeam.name} ${homeScore}-${awayScore}`
        : `${homeTeam.city} ${homeTeam.name} drew with ${awayTeam.city} ${awayTeam.name} ${homeScore}-${awayScore}`;
      
      const awayMsg = awayWin
        ? `Congratulations! ${awayTeam.city} ${awayTeam.name} defeated ${homeTeam.city} ${homeTeam.name} ${awayScore}-${homeScore}`
        : homeWin
        ? `${awayTeam.city} ${awayTeam.name} lost to ${homeTeam.city} ${homeTeam.name} ${awayScore}-${homeScore}`
        : `${awayTeam.city} ${awayTeam.name} drew with ${homeTeam.city} ${homeTeam.name} ${awayScore}-${homeScore}`;
      
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
        
        // Progress advancement
        if (progress !== 'EXCELLENT' && rollChance(60 + potentialBonus)) {
          const idx = PROGRESS_STAGES.indexOf(progress);
          if (idx < PROGRESS_STAGES.length - 1) {
            updates.training_progress = PROGRESS_STAGES[idx + 1];
          }
        }
        
        // Stat improvement
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
            
            // Create notification for player improvement
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
    
    // Get all free agents with claims
    const { data: freeAgents } = await supabase
      .from('free_agents')
      .select('*, players(*)')
      .eq('claimed', false)
      .lte('available_round', currentRound);
    
    for (const freeAgent of freeAgents || []) {
      // Get all claims for this free agent
      const { data: claims } = await supabase
        .from('free_agent_claims')
        .select('*')
        .eq('free_agent_id', freeAgent.id);
      
      if (!claims || claims.length === 0) continue;
      
      // Score each claim
      const scoredClaims = [];
      
      for (const claim of claims) {
        // Get team's squad
        const { data: squadPlayers } = await supabase
          .from('players')
          .select('position')
          .eq('team_id', claim.team_id);
        
        const squadSize = squadPlayers?.length || 0;
        const samePositionCount = squadPlayers?.filter(p => p.position === freeAgent.players.position).length || 0;
        const ladderPos = ladderPositions[claim.team_id] || 5;
        
        // Calculate priority score (higher = better chance)
        // Lower ladder position = higher priority (10th place gets 10 points, 1st gets 1)
        const ladderScore = ladderPos;
        // Smaller squad = higher priority
        const squadScore = (22 - squadSize);
        // Fewer of same position = higher priority
        const needScore = Math.max(0, 4 - samePositionCount) * 2;
        
        const totalScore = ladderScore + squadScore + needScore + Math.random() * 2; // Small random factor
        
        scoredClaims.push({
          ...claim,
          score: totalScore,
          teamName: teamsMap[claim.team_id]?.name || 'Unknown'
        });
      }
      
      // Sort by score (highest first)
      scoredClaims.sort((a, b) => b.score - a.score);
      
      const winner = scoredClaims[0];
      const winnerTeam = teamsMap[winner.team_id];
      
      // Process the winner
      // If they nominated a player to release, do it
      if (winner.release_player_id) {
        // Get the player being released
        const { data: releasedPlayer } = await supabase
          .from('players')
          .select('*')
          .eq('id', winner.release_player_id)
          .single();
        
        if (releasedPlayer) {
          // Add to free agents
          await supabase.from('free_agents').insert({
            player_id: winner.release_player_id,
            released_by_team_id: winner.team_id,
            available_round: currentRound + 1
          });
          
          // Remove from team
          await supabase.from('players').delete().eq('id', winner.release_player_id);
          
          // Notify ALL teams about the release
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
      
      // Move free agent player to winning team
      await supabase.from('players').update({ team_id: winner.team_id }).eq('id', freeAgent.player_id);
      
      // Mark free agent as claimed
      await supabase.from('free_agents').update({ claimed: true }).eq('id', freeAgent.id);
      
      // Notify winner
      await supabase.from('notifications').insert({
        team_id: winner.team_id,
        type: 'free_agent_won',
        title: '✅ Free Agent Signed!',
        message: `You successfully signed ${freeAgent.players.first_name} ${freeAgent.players.last_name} (${freeAgent.players.position}, ${freeAgent.players.overall} OVR)!`,
        player_id: freeAgent.player_id
      });
      
      // Notify losers
      for (const loser of scoredClaims.slice(1)) {
        await supabase.from('notifications').insert({
          team_id: loser.team_id,
          type: 'free_agent_lost',
          title: '❌ Free Agent Request Failed',
          message: `${freeAgent.players.first_name} ${freeAgent.players.last_name} signed with ${winnerTeam?.name || 'another team'} instead.`,
          player_id: freeAgent.player_id
        });
      }
      
      // Notify ALL teams about the signing (league news)
      for (const t of teams || []) {
        if (t.id !== winner.team_id) { // Winner already got a notification
          await supabase.from('notifications').insert({
            team_id: t.id,
            type: 'league_news',
            title: '📰 Free Agent Signed',
            message: `${winnerTeam?.name} signed ${freeAgent.players.first_name} ${freeAgent.players.last_name} (${freeAgent.players.position}, ${freeAgent.players.overall} OVR, Age ${freeAgent.players.age}) from free agency.`
          });
        }
      }
      
      // Delete all claims for this free agent
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
