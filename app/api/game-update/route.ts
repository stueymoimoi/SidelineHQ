/**
 * SidelineHQ Game Update API
 * 
 * Cron endpoint that simulates matches, processes training, and handles free agents.
 * Runs at 6pm AEST on Tue/Thu/Sun.
 * 
 * Schedule: 0 8 * * 0,2,4 (8am UTC = 6pm AEST)
 */

export const maxDuration = 60;

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Game engine imports
import {
  SEASON,
  HOME_ADVANTAGE,
  COACHING_BONUS,
  FATIGUE_PER_MATCH,
  POSITION_FIELDS,
  MINUTES_BY_JERSEY,
  MOTM_MIN_RATING,
} from '@/lib/game-engine/constants';

import type { Player, Team, Fixture, TeamTactics, Notification } from '@/lib/game-engine/types';

import { generatePlayerStats } from '@/lib/game-engine/player-stats';
import { calculatePlayerRating } from '@/lib/game-engine/ratings';
import { calculateMotmInfluence, buildMotmReason } from '@/lib/game-engine/motm';
import { calculateTacticalBonus } from '@/lib/game-engine/tactics';
import { calculateTries, calculateKickingStats, calculateScore, distributeTries } from '@/lib/game-engine/scoring';
import { processAllTraining } from '@/lib/training';

// ===========================================
// SUPABASE CLIENT
// ===========================================

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ===========================================
// AUTO-GENERATE TACTICS FOR UNMANAGED TEAMS
// ===========================================

function generateAutoTactics(players: Player[]): Partial<TeamTactics> {
  if (players.length < 13) return {};
  
  const sorted = [...players].sort((a, b) => (b.overall || 0) - (a.overall || 0));
  
  return {
    attack_focus: 'structured' as any,
    defense_focus: 'line_speed' as any,
    pos_fullback: sorted[0]?.id,
    pos_winger_r: sorted[1]?.id,
    pos_centre_r: sorted[2]?.id,
    pos_centre_l: sorted[3]?.id,
    pos_winger_l: sorted[4]?.id,
    pos_five_eighth: sorted[5]?.id,
    pos_halfback: sorted[6]?.id,
    pos_prop_l: sorted[7]?.id,
    pos_hooker: sorted[8]?.id,
    pos_prop_r: sorted[9]?.id,
    pos_second_row_l: sorted[10]?.id,
    pos_second_row_r: sorted[11]?.id,
    pos_lock: sorted[12]?.id,
    bench_1: sorted[13]?.id,
    bench_2: sorted[14]?.id,
    bench_3: sorted[15]?.id,
    bench_4: sorted[16]?.id,
    goal_kicker: sorted[6]?.id
  };
}

// ===========================================
// MAIN API HANDLER
// ===========================================

export async function GET(request: Request) {
  const supabase = getSupabase();
  const logs: string[] = [];
  
  // Auth check
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron');
  
  const CRON_SECRET = process.env.CRON_SECRET;
  if (!isVercelCron && secret !== CRON_SECRET) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // ===========================================
    // LOAD ALL DATA
    // ===========================================
    
    const [fixturesRes, teamsRes, tacticsRes, players1, players2, players3, coachesRes] = await Promise.all([
      supabase.from('fixtures').select('*').eq('season', SEASON).eq('played', false).order('round', { ascending: true }),
      supabase.from('teams').select('*'),
      supabase.from('team_tactics').select('*'),
      supabase.from('players').select('*').range(0, 999),
      supabase.from('players').select('*').range(1000, 1999),
      supabase.from('players').select('*').range(2000, 2999),
      supabase.from('coaches').select('team_id')
    ]);
    
    const fixtures = fixturesRes.data || [];
    const teams = teamsRes.data || [];
    const allTactics = tacticsRes.data || [];
    const allPlayers = [...(players1.data || []), ...(players2.data || []), ...(players3.data || [])];
    
    if (fixtures.length === 0) {
      return NextResponse.json({ success: true, message: 'Season complete!' });
    }
    
    const currentRound = fixtures[0].round;
    const roundFixtures = fixtures.filter((f: Fixture) => f.round === currentRound);
    
    logs.push(`Simulating Round ${currentRound} - ${allPlayers.length} players loaded`);
    
    // Build lookup maps for O(1) access
    const teamsMap: Record<string, Team> = {};
    teams.forEach((t: Team) => { teamsMap[t.id] = t; });
    
    const tacticsMap: Record<string, any> = {};
    allTactics.forEach((t: any) => { tacticsMap[t.team_id] = t; });
    
    const playersMap: Record<string, Player> = {};
    allPlayers.forEach((p: Player) => { playersMap[p.id] = p; });
    
    const coachedTeams = new Set((coachesRes.data || []).map((c: any) => c.team_id));
    
    // ===========================================
    // SIMULATE MATCHES
    // ===========================================
    
    const allPlayerStats: any[] = [];
    const allMatchResults: any[] = [];
    const allNotifications: Notification[] = [];
    const teamUpdates: Record<string, any> = {};
    const fatigueUpdates: Record<string, number> = {};
    
    for (const fixture of roundFixtures) {
      const homeTeam = teamsMap[fixture.home_team_id];
      const awayTeam = teamsMap[fixture.away_team_id];
      if (!homeTeam || !awayTeam) continue;
      
      // Get or generate tactics
      let homeTactics = tacticsMap[fixture.home_team_id];
      let awayTactics = tacticsMap[fixture.away_team_id];
      
      const homePlayers = allPlayers.filter((p: Player) => p.team_id === fixture.home_team_id);
      const awayPlayers = allPlayers.filter((p: Player) => p.team_id === fixture.away_team_id);
      
      if (!homeTactics) homeTactics = generateAutoTactics(homePlayers);
      if (!awayTactics) awayTactics = generateAutoTactics(awayPlayers);
      
      if (!homeTactics || !awayTactics) continue;
      
      // Calculate team strengths
      let homeStrengthTotal = 0, homeCount = 0;
      let awayStrengthTotal = 0, awayCount = 0;
      
      for (let i = 0; i < 13; i++) {
        const field = POSITION_FIELDS[i];
        const homePlayerId = homeTactics[field];
        const awayPlayerId = awayTactics[field];
        
        if (homePlayerId && playersMap[homePlayerId]) {
          homeStrengthTotal += playersMap[homePlayerId].overall || 30;
          homeCount++;
        }
        if (awayPlayerId && playersMap[awayPlayerId]) {
          awayStrengthTotal += playersMap[awayPlayerId].overall || 30;
          awayCount++;
        }
      }
      
      const homeBaseStrength = homeCount > 0 ? homeStrengthTotal / homeCount : 30;
      const awayBaseStrength = awayCount > 0 ? awayStrengthTotal / awayCount : 30;
      
      // Calculate tactical bonuses
      const homeTacticalBonus = calculateTacticalBonus(
        homeTactics.attack_focus || 'structured',
        awayTactics.defense_focus || 'line_speed'
      );
      const awayTacticalBonus = calculateTacticalBonus(
        awayTactics.attack_focus || 'structured',
        homeTactics.defense_focus || 'line_speed'
      );
      
      // Final strengths
      const hasHomeCoach = coachedTeams.has(fixture.home_team_id);
      const hasAwayCoach = coachedTeams.has(fixture.away_team_id);
      
      const homeStrength = homeBaseStrength + HOME_ADVANTAGE + homeTacticalBonus.bonus + (hasHomeCoach ? COACHING_BONUS : 0);
      const awayStrength = awayBaseStrength + awayTacticalBonus.bonus + (hasAwayCoach ? COACHING_BONUS : 0);
      
      // Calculate tries and scoring
      const { homeTries, awayTries } = calculateTries(homeStrength, awayStrength);
      
      const homeKicker = playersMap[homeTactics.goal_kicker];
      const awayKicker = playersMap[awayTactics.goal_kicker];
      
      const homeKicking = calculateKickingStats(homeTries, homeKicker?.kicking || 60);
      const awayKicking = calculateKickingStats(awayTries, awayKicker?.kicking || 60);
      
      const homeScore = calculateScore(homeTries, homeKicking.conversions, homeKicking.penalties);
      const awayScore = calculateScore(awayTries, awayKicking.conversions, awayKicking.penalties);
      
      // Game context for MOTM
      const totalPoints = homeScore + awayScore;
      const margin = Math.abs(homeScore - awayScore);
      const homeWon = homeScore > awayScore;
      const awayWon = awayScore > homeScore;
      const draw = homeScore === awayScore;
      
      // Distribute tries and assists
      const homeTryDist = distributeTries(playersMap, homeTries, homeTactics);
      const awayTryDist = distributeTries(playersMap, awayTries, awayTactics);
      
      // Generate player stats
      const fixtureStats: any[] = [];
      
      for (let i = 0; i < POSITION_FIELDS.length; i++) {
        const field = POSITION_FIELDS[i];
        const jerseyNumber = i + 1;
        const minutes = MINUTES_BY_JERSEY[jerseyNumber] ?? 0;
        
        // Home team player
        const homePlayerId = homeTactics[field];
        if (homePlayerId && playersMap[homePlayerId]) {
          const player = playersMap[homePlayerId];
          const stats = generatePlayerStats(player, jerseyNumber, minutes);
          const tries = homeTryDist.tryScorers[homePlayerId] || 0;
          const tryAssists = homeTryDist.tryAssisters[homePlayerId] || 0;
          const isKicker = homeTactics.goal_kicker === homePlayerId;
          const isCaptain = homeTactics.captain === homePlayerId;
          const goals = isKicker ? homeKicking.conversions + homeKicking.penalties : 0;
          const points = (tries * 4) + (goals * 2);
          
          const fullStats = { ...stats, tries, tryAssists, goals };
          const rating = calculatePlayerRating(fullStats, jerseyNumber, false, isCaptain);
          const motmInfluence = calculateMotmInfluence(
            fullStats,
            jerseyNumber,
            { totalPoints, margin, teamWon: homeWon },
            isCaptain
          );
          
          fixtureStats.push({
            fixture_id: fixture.id,
            player_id: homePlayerId,
            team_id: fixture.home_team_id,
            jersey_number: jerseyNumber,
            player_name: `${player.first_name.charAt(0)}. ${player.last_name}`,
            ovr: player.overall,
            points, tries, try_assists: tryAssists,
            goals_made: goals, goals_attempted: isKicker ? homeTries + (homeKicking.penalties > 0 ? 1 : 0) : 0,
            metres: stats.metres, tackles: stats.tackles,
            missed_tackles: stats.missedTackles, errors: stats.errors,
            line_breaks: stats.lineBreaks, tackle_breaks: stats.tackleBreaks,
            minutes_played: minutes, rating,
            _motm_influence: motmInfluence,
            _is_captain: isCaptain
          });
          
          fatigueUpdates[homePlayerId] = Math.min(100, (player.fatigue || 0) + FATIGUE_PER_MATCH);
        }
        
        // Away team player
        const awayPlayerId = awayTactics[field];
        if (awayPlayerId && playersMap[awayPlayerId]) {
          const player = playersMap[awayPlayerId];
          const stats = generatePlayerStats(player, jerseyNumber, minutes);
          const tries = awayTryDist.tryScorers[awayPlayerId] || 0;
          const tryAssists = awayTryDist.tryAssisters[awayPlayerId] || 0;
          const isKicker = awayTactics.goal_kicker === awayPlayerId;
          const isCaptain = awayTactics.captain === awayPlayerId;
          const goals = isKicker ? awayKicking.conversions + awayKicking.penalties : 0;
          const points = (tries * 4) + (goals * 2);
          
          const fullStats = { ...stats, tries, tryAssists, goals };
          const rating = calculatePlayerRating(fullStats, jerseyNumber, false, isCaptain);
          const motmInfluence = calculateMotmInfluence(
            fullStats,
            jerseyNumber,
            { totalPoints, margin, teamWon: awayWon },
            isCaptain
          );
          
          fixtureStats.push({
            fixture_id: fixture.id,
            player_id: awayPlayerId,
            team_id: fixture.away_team_id,
            jersey_number: jerseyNumber,
            player_name: `${player.first_name.charAt(0)}. ${player.last_name}`,
            ovr: player.overall,
            points, tries, try_assists: tryAssists,
            goals_made: goals, goals_attempted: isKicker ? awayTries + (awayKicking.penalties > 0 ? 1 : 0) : 0,
            metres: stats.metres, tackles: stats.tackles,
            missed_tackles: stats.missedTackles, errors: stats.errors,
            line_breaks: stats.lineBreaks, tackle_breaks: stats.tackleBreaks,
            minutes_played: minutes, rating,
            _motm_influence: motmInfluence,
            _is_captain: isCaptain
          });
          
          fatigueUpdates[awayPlayerId] = Math.min(100, (player.fatigue || 0) + FATIGUE_PER_MATCH);
        }
      }
      
      // Find MOTM
      let motmPlayer: Player | null = null;
      let motmInfluenceScore = -999;
      let motmStatIndex = -1;
      
      for (let i = 0; i < fixtureStats.length; i++) {
        if (fixtureStats[i]._motm_influence > motmInfluenceScore) {
          motmInfluenceScore = fixtureStats[i]._motm_influence;
          motmPlayer = playersMap[fixtureStats[i].player_id];
          motmStatIndex = i;
        }
      }
      
      // Boost MOTM rating
      if (motmStatIndex >= 0) {
        fixtureStats[motmStatIndex].rating = Math.max(MOTM_MIN_RATING, fixtureStats[motmStatIndex].rating);
      }
      
      // Build MOTM reason
      let motmReason = '';
      if (motmStatIndex >= 0) {
        const ms = fixtureStats[motmStatIndex];
        motmReason = buildMotmReason({
          tries: ms.tries,
          tryAssists: ms.try_assists,
          goals: ms.goals_made,
          metres: ms.metres,
          tackles: ms.tackles,
          missedTackles: ms.missed_tackles,
          errors: ms.errors,
          lineBreaks: ms.line_breaks,
          tackleBreaks: ms.tackle_breaks
        });
      }
      
      // Clean stats for DB (remove temp fields)
      const cleanStats = fixtureStats.map(({ _motm_influence, _is_captain, ...rest }) => rest);
      allPlayerStats.push(...cleanStats);
      
      // Match result
      allMatchResults.push({
        fixture_id: fixture.id,
        season: SEASON,
        round: currentRound,
        home_team_id: fixture.home_team_id,
        away_team_id: fixture.away_team_id,
        home_score: homeScore,
        away_score: awayScore,
        motm_player_id: motmPlayer?.id || null,
        motm_reason: motmReason
      });
      
      // Team updates
      if (!teamUpdates[homeTeam.id]) teamUpdates[homeTeam.id] = { ...homeTeam };
      teamUpdates[homeTeam.id].wins += homeWon ? 1 : 0;
      teamUpdates[homeTeam.id].draws += draw ? 1 : 0;
      teamUpdates[homeTeam.id].losses += awayWon ? 1 : 0;
      teamUpdates[homeTeam.id].points_for += homeScore;
      teamUpdates[homeTeam.id].points_against += awayScore;
      
      if (!teamUpdates[awayTeam.id]) teamUpdates[awayTeam.id] = { ...awayTeam };
      teamUpdates[awayTeam.id].wins += awayWon ? 1 : 0;
      teamUpdates[awayTeam.id].draws += draw ? 1 : 0;
      teamUpdates[awayTeam.id].losses += homeWon ? 1 : 0;
      teamUpdates[awayTeam.id].points_for += awayScore;
      teamUpdates[awayTeam.id].points_against += homeScore;
      
      // Notifications
      let gameTypeDesc = '';
      if (totalPoints < 24) gameTypeDesc = 'Defensive grind. ';
      else if (totalPoints > 44) gameTypeDesc = 'High-scoring shootout! ';
      if (margin <= 4) gameTypeDesc += 'Nail-biter finish!';
      
      const homeResult = homeWon ? 'win' : awayWon ? 'loss' : 'draw';
      const awayResult = awayWon ? 'win' : homeWon ? 'loss' : 'draw';
      
      allNotifications.push({
        team_id: homeTeam.id,
        type: `match_${homeResult}` as any,
        title: homeWon ? '🏆 Victory!' : awayWon ? '😢 Defeat' : '🤝 Draw',
        message: `${homeTeam.name} ${homeWon ? 'defeated' : awayWon ? 'lost to' : 'drew with'} ${awayTeam.name} ${homeScore}-${awayScore}. ${gameTypeDesc}${homeTacticalBonus.description}`,
        fixture_id: fixture.id
      });
      
      allNotifications.push({
        team_id: awayTeam.id,
        type: `match_${awayResult}` as any,
        title: awayWon ? '🏆 Victory!' : homeWon ? '😢 Defeat' : '🤝 Draw',
        message: `${awayTeam.name} ${awayWon ? 'defeated' : homeWon ? 'lost to' : 'drew with'} ${homeTeam.name} ${awayScore}-${homeScore}. ${gameTypeDesc}${awayTacticalBonus.description}`,
        fixture_id: fixture.id
      });
      
      // MOTM notifications
      if (motmPlayer) {
        allNotifications.push({
          team_id: motmPlayer.team_id!,
          type: 'motm',
          title: '⭐ Man of the Match!',
          message: `${motmPlayer.first_name} ${motmPlayer.last_name} (${motmPlayer.position}) won MOTM with ${motmReason}! +5 XP`,
          player_id: motmPlayer.id,
          fixture_id: fixture.id
        });
        
        const otherTeamId = motmPlayer.team_id === fixture.home_team_id ? fixture.away_team_id : fixture.home_team_id;
        allNotifications.push({
          team_id: otherTeamId,
          type: 'motm_opponent' as any,
          title: '⭐ Opponent MOTM',
          message: `${motmPlayer.first_name} ${motmPlayer.last_name} (${teamsMap[motmPlayer.team_id!]?.name}) won MOTM`,
          player_id: motmPlayer.id,
          fixture_id: fixture.id
        });
      }
      
      logs.push(`${homeTeam.name} ${homeScore} - ${awayScore} ${awayTeam.name} | MOTM: ${motmPlayer?.first_name || 'N/A'} ${motmPlayer?.last_name || ''}`);
    }
    
    // ===========================================
    // SAVE MATCH DATA
    // ===========================================
    
    const fixtureIds = roundFixtures.map((f: Fixture) => f.id);
    
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
    
    // Update teams in parallel
    await Promise.all(
      Object.entries(teamUpdates).map(([teamId, data]) =>
        supabase.from('teams').update({
          wins: data.wins,
          draws: data.draws,
          losses: data.losses,
          points_for: data.points_for,
          points_against: data.points_against
        }).eq('id', teamId)
      )
    );
    
    // Update fatigue
    const fatiguePlayerIds = Object.keys(fatigueUpdates);
    if (fatiguePlayerIds.length > 0) {
      await supabase.rpc('increment_fatigue', { player_ids: fatiguePlayerIds, amount: FATIGUE_PER_MATCH });
    }
    
    // ===========================================
    // PROCESS TRAINING
    // ===========================================
    
    const { playerUpdates, notifications: trainingNotifications, improvementCount } = processAllTraining(allPlayers);
    
    // Batch update players
    if (playerUpdates.length > 0) {
      const chunkSize = 100;
      const chunks = [];
      for (let i = 0; i < playerUpdates.length; i += chunkSize) {
        chunks.push(playerUpdates.slice(i, i + chunkSize));
      }
      
      await Promise.all(
        chunks.map(chunk =>
          Promise.all(
            chunk.map(update =>
              supabase.from('players').update(update).eq('id', update.id)
            )
          )
        )
      );
    }
    
    if (trainingNotifications.length > 0) {
      await supabase.from('notifications').insert(trainingNotifications);
    }
    
    logs.push(`Training: ${improvementCount} players improved`);
    
    // ===========================================
    // PROCESS FREE AGENTS
    // ===========================================
    
    const { data: freeAgentsWithClaims } = await supabase
      .from('free_agents')
      .select('*, players(*)')
      .eq('claimed', false)
      .lte('available_round', currentRound);
    
    let freeAgentSignings = 0;
    const freeAgentNotifications: Notification[] = [];
    
    for (const freeAgent of (freeAgentsWithClaims || [])) {
      const { data: claims } = await supabase
        .from('free_agent_claims')
        .select('*')
        .eq('free_agent_id', freeAgent.id);
      
      if (!claims || claims.length === 0) continue;
      
      const player = freeAgent.players;
      if (!player) continue;
      
      // Simple processing (keeping existing logic for now)
      const teamScores: { teamId: string; score: number; releasePlayerId: string | null }[] = [];
      
      for (const claim of claims) {
        const claimingTeam = teamsMap[claim.team_id];
        if (!claimingTeam) continue;
        
        const squadSize = allPlayers.filter((p: Player) => p.team_id === claim.team_id).length;
        if (squadSize >= 25) continue;
        
        let score = (10 - claimingTeam.division) * 5;
        score += (claimingTeam.wins * 2) + claimingTeam.draws;
        score += (25 - squadSize) * 2;
        score += Math.random() * 10;
        
        teamScores.push({ teamId: claim.team_id, score, releasePlayerId: claim.release_player_id });
      }
      
      if (teamScores.length === 0) continue;
      
      teamScores.sort((a, b) => b.score - a.score);
      const winner = teamScores[0];
      const winningTeam = teamsMap[winner.teamId];
      
      // Update player
      await supabase.from('players').update({ team_id: winner.teamId }).eq('id', player.id);
      await supabase.from('free_agents').update({ claimed: true }).eq('id', freeAgent.id);
      
      if (winner.releasePlayerId) {
        await supabase.from('players').update({ team_id: null }).eq('id', winner.releasePlayerId);
        await supabase.from('free_agents').insert({
          player_id: winner.releasePlayerId,
          released_by_team_id: winner.teamId,
          available_round: currentRound + 1,
          claimed: false
        });
      }
      
      await supabase.from('free_agent_claims').delete().eq('free_agent_id', freeAgent.id);
      
      freeAgentNotifications.push({
        team_id: winner.teamId,
        type: 'free_agent_signed',
        title: '🎉 Free Agent Signed!',
        message: `${player.first_name} ${player.last_name} (${player.position}, ${player.overall} OVR) has joined your squad!`,
        player_id: player.id
      });
      
      freeAgentSignings++;
      logs.push(`Free Agent: ${player.first_name} ${player.last_name} → ${winningTeam?.name}`);
    }
    
    if (freeAgentNotifications.length > 0) {
      await supabase.from('notifications').insert(freeAgentNotifications);
    }
    
    logs.push(`Free Agents: ${freeAgentSignings} players signed`);
    
    // ===========================================
    // RETURN RESPONSE
    // ===========================================
    
    return NextResponse.json({
      success: true,
      round: currentRound,
      matches: logs,
      improvements: improvementCount,
      playersLoaded: allPlayers.length
    });
    
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
