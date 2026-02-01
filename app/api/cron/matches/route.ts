/**
 * SidelineHQ Cron: MATCHES
 * 
 * Phase 1 of 4 - Runs at 6:00pm AEST (8:00 UTC)
 * - Sets maintenance mode ON
 * - Simulates matches (or Origin)
 * - Processes injuries
 * - Updates fatigue (with baseline recovery)
 * 
 * Schedule: 0 8 * * 0,2,4
 * 
 * FATIGUE SYSTEM (Rebalanced Jan 31):
 * - Both fatigue AND recovery scale by minutes played
 * - Net +2 per 80 mins → slow decline, rewards rotation
 * - Origin: 10-13 fatigue (random)
 * - REST only works in training cron if player didn't play
 */

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import {
  SEASON,
  HOME_ADVANTAGE,
  COACHING_BONUS,
  FATIGUE_PER_MATCH,
  BASELINE_RECOVERY,
  POSITION_FIELDS,
  MOTM_MIN_RATING,
  REST_RECOVERY,
  MINUTES_WITH_ROTATION,
  calculateFatigueByMinutes,
  getMinutesForPlayer,
  getOriginFatigue,
} from '@/lib/game-engine/constants';

import type { Player, Team, Fixture, TeamTactics, Notification } from '@/lib/game-engine/types';

import { generatePlayerStats } from '@/lib/game-engine/player-stats';
import { calculatePlayerRating } from '@/lib/game-engine/ratings';
import { calculateMotmInfluence, buildMotmReason } from '@/lib/game-engine/motm';
import { calculateTacticalBonus } from '@/lib/game-engine/tactics';
import { calculateTries, calculateKickingStats, calculateScore, distributeTries } from '@/lib/game-engine/scoring';
import { processMatchInjuries, saveInjuries, processInjuryRecoveries } from '@/lib/game-engine/injury-processing';
import { awardCoachXP } from '@/lib/coaches/xp';
import { generateMatchEventsFromStats } from '@/lib/game-engine/match-events';

import { 
  selectOriginSquad, 
  isOriginRound, 
} from '@/lib/origin/selection';
import { simulateOriginMatch } from '@/lib/origin/simulation';

import { 
  calculateTraitModifiers, 
  type PlayerTraitData,
  type GameContext,
  type MatchContext,
} from '@/lib/game-engine/traits';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getPlayerTraitData(player: Player): PlayerTraitData {
  return {
    visibleTrait: (player.visible_trait as PlayerTraitData['visibleTrait']) || null,
    visibleTraitPositive: player.visible_trait_positive ?? null,
    hiddenTrait: (player.hidden_trait as PlayerTraitData['hiddenTrait']) || null,
  };
}

function generateAutoTactics(players: Player[]): Partial<TeamTactics> {
  if (players.length < 13) return {};
  const sorted = [...players].sort((a, b) => (b.overall || 0) - (a.overall || 0));
  return {
    attack_focus: 'structured' as any,
    defense_focus: 'slide' as any,
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

/**
 * Calculate fatigue for a playing player
 * UPDATED: Both fatigue AND recovery scale by minutes played
 * 
 * Net fatigue per match:
 * - 80-min starter: +2 (12 gain - 10 recovery)
 * - 80-min starter on REST: +1 (12 gain - 11 recovery) ← veteran maintenance mode
 * - 55-min prop: +1.4 (8.25 gain - 6.875 recovery)
 * - 30-min bench: +0.75 (4.5 gain - 3.75 recovery)
 */
function calculatePlayerFatigue(
  currentFatigue: number,
  minutesPlayed: number,
  traitFatigueMultiplier: number,
  isOnRest: boolean = false
): number {
  // Step 1: Recovery scales with minutes (reflects conditioning from play time)
  // REST players get +1 bonus recovery (veteran maintenance mode)
  const baseRecovery = BASELINE_RECOVERY + (isOnRest ? 1 : 0);
  const recoveryAmount = Math.round(baseRecovery * (minutesPlayed / 80));
  const afterRecovery = Math.max(0, currentFatigue - recoveryAmount);
  
  // Step 2: Calculate fatigue gained from this match (already scales by minutes)
  const baseFatigueGain = calculateFatigueByMinutes(minutesPlayed, FATIGUE_PER_MATCH);
  const fatigueGain = Math.round(baseFatigueGain * traitFatigueMultiplier);
  
  // Step 3: Apply match fatigue, cap at 100
  return Math.min(100, afterRecovery + fatigueGain);
}

/**
 * Calculate fatigue for a non-playing player (rest recovery)
 * Applies baseline recovery PLUS additional rest bonus
 */
function calculateRestFatigue(currentFatigue: number): number {
  // Step 1: Apply baseline recovery
  const afterBaseline = Math.max(0, currentFatigue - BASELINE_RECOVERY);
  
  // Step 2: Apply additional rest bonus (30% of remaining)
  const afterRestBonus = Math.round(afterBaseline * (1 - 0.30));
  
  return Math.max(0, afterRestBonus);
}

export async function GET(request: Request) {
  const startTime = Date.now();
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
    // SET MAINTENANCE MODE ON
    // ===========================================
    await supabase.from('game_state').update({ 
      maintenance: true, 
      current_phase: 'matches',
      last_cron_run: new Date().toISOString()
    }).eq('id', 1);
    logs.push('🔧 Maintenance mode ON');

    // ===========================================
    // PHASE 1: LOAD ALL DATA
    // ===========================================
    
    const [fixturesRes, teamsRes, tacticsRes, players1, players2, players3, coachesRes] = await Promise.all([
      supabase.from('fixtures').select('*').eq('season', SEASON).eq('played', false).order('round', { ascending: true }),
      supabase.from('teams').select('*'),
      supabase.from('team_tactics').select('*'),
      supabase.from('players').select('*').range(0, 999),
      supabase.from('players').select('*').range(1000, 1999),
      supabase.from('players').select('*').range(2000, 2999),
      supabase.from('coaches').select('id, team_id')
    ]);
    
    const fixtures = fixturesRes.data || [];
    const teams = teamsRes.data || [];
    const allTactics = tacticsRes.data || [];
    const allPlayers = [...(players1.data || []), ...(players2.data || []), ...(players3.data || [])];
    
    logs.push(`Data loaded in ${Date.now() - startTime}ms`);
    
    if (fixtures.length === 0) {
      await supabase.from('game_state').update({ maintenance: false, current_phase: null }).eq('id', 1);
      return NextResponse.json({ success: true, message: 'Season complete!' });
    }
    
    const currentRound = fixtures[0].round;
    const roundFixtures = fixtures.filter((f: Fixture) => f.round === currentRound);
    
    logs.push(`Processing Round ${currentRound} - ${roundFixtures.length} fixtures`);
    
    // Build lookup maps
    const teamsMap: Record<string, Team> = {};
    teams.forEach((t: Team) => { teamsMap[t.id] = t; });
    
    const tacticsMap: Record<string, any> = {};
    allTactics.forEach((t: any) => { tacticsMap[t.team_id] = t; });
    
    const playersMap: Record<string, Player> = {};
    allPlayers.forEach((p: Player) => { playersMap[p.id] = p; });
    
    const teamRosters: Record<string, Player[]> = {};
    allPlayers.forEach((p: Player) => {
      if (p.team_id) {
        if (!teamRosters[p.team_id]) teamRosters[p.team_id] = [];
        teamRosters[p.team_id].push(p);
      }
    });
    
    const coachedTeams = new Set((coachesRes.data || []).map((c: any) => c.team_id));
    
    // Build coach lookup: team_id -> coach_id
    const teamCoachMap: Record<string, string> = {};
    (coachesRes.data || []).forEach((c: any) => {
      if (c.team_id) teamCoachMap[c.team_id] = c.id;
    });
    
    // ===========================================
    // PHASE 2: SIMULATE MATCHES
    // ===========================================
    
    const allPlayerStats: any[] = [];
    const allMatchResults: any[] = [];
    const allNotifications: Notification[] = [];
    const teamUpdates: Record<string, any> = {};
    const fatigueUpdates: Record<string, number> = {};
    
    const isOrigin = isOriginRound(currentRound);
    
    if (isOrigin) {
      logs.push(`🏉 ORIGIN ROUND ${currentRound}`);
      
      const { data: originFixture } = await supabase
        .from('origin_fixtures')
        .select('*')
        .eq('round', currentRound)
        .eq('season', SEASON)
        .single();
      
      if (originFixture && !originFixture.played) {
        const nswSquad = selectOriginSquad(allPlayers, 'NSW');
        const qldSquad = selectOriginSquad(allPlayers, 'QLD');
        
        logs.push(`NSW: ${nswSquad.players.length}, QLD: ${qldSquad.players.length}`);
        
        const selections = [
          ...nswSquad.players.map(p => ({
            origin_fixture_id: originFixture.id,
            player_id: p.player.id,
            team: 'NSW' as const,
            jersey_number: p.jerseyNumber,
            position_name: p.positionName,
            is_captain: p.isCaptain
          })),
          ...qldSquad.players.map(p => ({
            origin_fixture_id: originFixture.id,
            player_id: p.player.id,
            team: 'QLD' as const,
            jersey_number: p.jerseyNumber,
            position_name: p.positionName,
            is_captain: p.isCaptain
          }))
        ];
        
        if (selections.length > 0) {
          await supabase.from('origin_selections').insert(selections);
        }
        
        const homeSquad = originFixture.home_team === 'NSW' ? nswSquad : qldSquad;
        const awaySquad = originFixture.home_team === 'NSW' ? qldSquad : nswSquad;
        
        const originResult = simulateOriginMatch(homeSquad, awaySquad, originFixture.id, playersMap);
        
        const nswScore = originResult.homeTeam === 'NSW' ? originResult.homeScore : originResult.awayScore;
        const qldScore = originResult.homeTeam === 'QLD' ? originResult.homeScore : originResult.awayScore;
        
        logs.push(`Origin Game ${originFixture.game_number}: NSW ${nswScore} - ${qldScore} QLD`);
        
        const allOriginStats = [...originResult.homeStats, ...originResult.awayStats];
        if (allOriginStats.length > 0) {
          await supabase.from('origin_player_stats').insert(allOriginStats);
        }
        
        await supabase.from('origin_fixtures').update({
          played: true,
          home_score: originResult.homeScore,
          away_score: originResult.awayScore,
          motm_player_id: originResult.motmPlayerId,
          motm_reason: originResult.motmReason
        }).eq('id', originFixture.id);
        
        if (originResult.winner) {
          const { data: series } = await supabase
            .from('origin_series')
            .select('*')
            .eq('season', SEASON)
            .single();
          
          if (series) {
            const newNswWins = series.nsw_wins + (originResult.winner === 'NSW' ? 1 : 0);
            const newQldWins = series.qld_wins + (originResult.winner === 'QLD' ? 1 : 0);
            const seriesWinner = newNswWins >= 2 ? 'NSW' : newQldWins >= 2 ? 'QLD' : null;
            
            await supabase.from('origin_series').update({
              nsw_wins: newNswWins,
              qld_wins: newQldWins,
              series_winner: seriesWinner,
              series_status: seriesWinner ? 'complete' : 'in_progress'
            }).eq('id', series.id);
            
            if (seriesWinner) {
              logs.push(`🏆 ${seriesWinner} wins the Origin Series!`);
            }
          }
        }
        
        // Origin players: baseline recovery + Origin fatigue (10-13 random)
        const originSquadIds = new Set([
          ...nswSquad.players.map(p => p.player.id),
          ...qldSquad.players.map(p => p.player.id)
        ]);

        originSquadIds.forEach(playerId => {
          const player = playersMap[playerId];
          if (player) {
            const afterRecovery = Math.max(0, (player.fatigue || 0) - BASELINE_RECOVERY);
            const originFatigue = getOriginFatigue(); // Random 10-13
            fatigueUpdates[playerId] = Math.min(100, afterRecovery + originFatigue);
          }
        });
        
        // Origin injuries
        const originPlayingIds = Array.from(originSquadIds);
        const { injuries: originInjuries, notifications: originInjuryNotifications } = await processMatchInjuries(
          supabase, originPlayingIds, playersMap, SEASON, currentRound, 'origin'
        );
        
        if (originInjuries.length > 0) {
          await saveInjuries(supabase, originInjuries, SEASON, currentRound, 'origin');
          allNotifications.push(...originInjuryNotifications);
          logs.push(`Origin Injuries: ${originInjuries.length}`);
        }
        
        // Non-Origin players: full rest recovery
        const originPlayerIds = new Set(originSquadIds);
        for (const player of allPlayers) {
          if (player.team_id && !originPlayerIds.has(player.id)) {
            fatigueUpdates[player.id] = calculateRestFatigue(player.fatigue || 0);
          }
        }
        
        // Origin notifications
        const winnerName = originResult.winner === 'NSW' ? 'NSW Blues' : originResult.winner === 'QLD' ? 'QLD Maroons' : null;
        const loserName = originResult.winner === 'NSW' ? 'QLD Maroons' : originResult.winner === 'QLD' ? 'NSW Blues' : null;
        
        for (const team of teams) {
          allNotifications.push({
            team_id: team.id,
            type: 'origin_result' as any,
            title: `🏉 Origin Game ${originFixture.game_number} Result`,
            message: originResult.winner 
              ? `${winnerName} defeated ${loserName} ${Math.max(nswScore, qldScore)}-${Math.min(nswScore, qldScore)}`
              : `Origin ended in a ${nswScore}-${qldScore} draw!`
          });
        }
        
        if (originResult.motmPlayerId) {
          const motmPlayer = playersMap[originResult.motmPlayerId];
          if (motmPlayer?.team_id) {
            allNotifications.push({
              team_id: motmPlayer.team_id,
              type: 'origin_motm' as any,
              title: '⭐ Origin Man of the Match!',
              message: `${motmPlayer.first_name} ${motmPlayer.last_name} won Origin MOTM!`,
              player_id: motmPlayer.id
            });
          }
        }
      }
    } else {
      // ===========================================
      // CLUB MATCHES
      // ===========================================
      logs.push(`Simulating ${roundFixtures.length} club matches`);
      
      for (const fixture of roundFixtures) {
        const homeTeam = teamsMap[fixture.home_team_id];
        const awayTeam = teamsMap[fixture.away_team_id];
        if (!homeTeam || !awayTeam) continue;
        
        let homeTactics = tacticsMap[fixture.home_team_id];
        let awayTactics = tacticsMap[fixture.away_team_id];
        
        const homePlayers = teamRosters[fixture.home_team_id] || [];
        const awayPlayers = teamRosters[fixture.away_team_id] || [];
        
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
        
        const homeTacticalBonus = calculateTacticalBonus(
          homeTactics.attack_focus || 'structured',
          awayTactics.defense_focus || 'slide'
        );
        const awayTacticalBonus = calculateTacticalBonus(
          awayTactics.attack_focus || 'structured',
          homeTactics.defense_focus || 'slide'
        );
        
        const hasHomeCoach = coachedTeams.has(fixture.home_team_id);
        const hasAwayCoach = coachedTeams.has(fixture.away_team_id);
        
        const homeStrength = homeBaseStrength + HOME_ADVANTAGE + homeTacticalBonus.bonus + (hasHomeCoach ? COACHING_BONUS : 0);
        const awayStrength = awayBaseStrength + awayTacticalBonus.bonus + (hasAwayCoach ? COACHING_BONUS : 0);
        
        const { homeTries, awayTries } = calculateTries(homeStrength, awayStrength);
        
        const homeKicker = playersMap[homeTactics.goal_kicker];
        const awayKicker = playersMap[awayTactics.goal_kicker];
        
        const homeKicking = calculateKickingStats(homeTries, homeKicker?.kicking || 4);
        const awayKicking = calculateKickingStats(awayTries, awayKicker?.kicking || 4);
        
        const homeScore = calculateScore(homeTries, homeKicking.conversions, homeKicking.penalties);
        const awayScore = calculateScore(awayTries, awayKicking.conversions, awayKicking.penalties);
        
        const totalPoints = homeScore + awayScore;
        const margin = Math.abs(homeScore - awayScore);
        const homeWon = homeScore > awayScore;
        const awayWon = awayScore > homeScore;
        const draw = homeScore === awayScore;
        
        const homeTryDist = distributeTries(playersMap, homeTries, homeTactics);
        const awayTryDist = distributeTries(playersMap, awayTries, awayTactics);
        
        const gameContext: GameContext = {
          isHome: true,
          isFinals: currentRound > 18,
          isOrigin: false,
          currentMargin: homeScore - awayScore,
          marginAtHalftime: Math.round((homeScore - awayScore) * 0.4),
          isSecondHalf: true,
          opponentTeamId: '',
        };
        
        const fixtureStats: any[] = [];
        
        for (let i = 0; i < POSITION_FIELDS.length; i++) {
          const field = POSITION_FIELDS[i];
          const jerseyNumber = i + 1;
          
          // Home player
          const homePlayerId = homeTactics[field];
          if (homePlayerId && playersMap[homePlayerId]) {
            const player = playersMap[homePlayerId];
            const minutes = getMinutesForPlayer(jerseyNumber, player.position);
            const isCaptain = homeTactics.captain === homePlayerId;
            const isStarting = jerseyNumber <= 13;
            
            const homeGameContext: GameContext = {
              ...gameContext,
              isHome: true,
              currentMargin: homeScore - awayScore,
              marginAtHalftime: Math.round((homeScore - awayScore) * 0.4),
              opponentTeamId: fixture.away_team_id,
            };
            
            const matchContext: MatchContext = {
              previousGameWon: null,
              seasonsAtClub: 1,
              gamesAtClubSinceTransfer: 99,
              isCaptain,
              isStarting,
              currentFitness: 100 - (player.fatigue || 0),
            };
            
            const traitData = getPlayerTraitData(player);
            const traitMods = calculateTraitModifiers(traitData, homeGameContext, matchContext);
            
            const baseStats = generatePlayerStats(player, jerseyNumber, minutes);
            
            const stats = {
              metres: Math.round(baseStats.metres * traitMods.statsMultiplier * traitMods.metreMultiplier),
              tackles: Math.round(baseStats.tackles * traitMods.statsMultiplier * traitMods.tackleMultiplier),
              missedTackles: baseStats.missedTackles,
              errors: baseStats.errors,
              lineBreaks: Math.round(baseStats.lineBreaks * traitMods.statsMultiplier),
              tackleBreaks: Math.round(baseStats.tackleBreaks * traitMods.statsMultiplier),
            };
            
            const tries = homeTryDist.tryScorers[homePlayerId] || 0;
            const tryAssists = homeTryDist.tryAssisters[homePlayerId] || 0;
            const isKicker = homeTactics.goal_kicker === homePlayerId;
            const goals = isKicker ? homeKicking.conversions + homeKicking.penalties : 0;
            const points = (tries * 4) + (goals * 2);
            
            const fullStats = { ...stats, tries, tryAssists, goals };
            const rating = calculatePlayerRating(fullStats, jerseyNumber, false, isCaptain);
            const motmInfluence = calculateMotmInfluence(
              fullStats, jerseyNumber,
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
            
            // Calculate fatigue with baseline recovery (scaled by minutes)
            // REST players get +1 bonus recovery (veteran maintenance mode)
            const minutesPlayed = MINUTES_WITH_ROTATION[jerseyNumber] || 80;
            const isOnRest = player.current_training === 'Rest';
            fatigueUpdates[homePlayerId] = calculatePlayerFatigue(
              player.fatigue || 0,
              minutesPlayed,
              traitMods.fatigueMultiplier,
              isOnRest
            );
          }
          
          // Away player
          const awayPlayerId = awayTactics[field];
          if (awayPlayerId && playersMap[awayPlayerId]) {
            const player = playersMap[awayPlayerId];
            const minutes = getMinutesForPlayer(jerseyNumber, player.position);
            const isCaptain = awayTactics.captain === awayPlayerId;
            const isStarting = jerseyNumber <= 13;
            
            const awayGameContext: GameContext = {
              ...gameContext,
              isHome: false,
              currentMargin: awayScore - homeScore,
              marginAtHalftime: Math.round((awayScore - homeScore) * 0.4),
              opponentTeamId: fixture.home_team_id,
            };
            
            const matchContext: MatchContext = {
              previousGameWon: null,
              seasonsAtClub: 1,
              gamesAtClubSinceTransfer: 99,
              isCaptain,
              isStarting,
              currentFitness: 100 - (player.fatigue || 0),
            };
            
            const traitData = getPlayerTraitData(player);
            const traitMods = calculateTraitModifiers(traitData, awayGameContext, matchContext);
            
            const baseStats = generatePlayerStats(player, jerseyNumber, minutes);
            
            const stats = {
              metres: Math.round(baseStats.metres * traitMods.statsMultiplier * traitMods.metreMultiplier),
              tackles: Math.round(baseStats.tackles * traitMods.statsMultiplier * traitMods.tackleMultiplier),
              missedTackles: baseStats.missedTackles,
              errors: baseStats.errors,
              lineBreaks: Math.round(baseStats.lineBreaks * traitMods.statsMultiplier),
              tackleBreaks: Math.round(baseStats.tackleBreaks * traitMods.statsMultiplier),
            };
            
            const tries = awayTryDist.tryScorers[awayPlayerId] || 0;
            const tryAssists = awayTryDist.tryAssisters[awayPlayerId] || 0;
            const isKicker = awayTactics.goal_kicker === awayPlayerId;
            const goals = isKicker ? awayKicking.conversions + awayKicking.penalties : 0;
            const points = (tries * 4) + (goals * 2);
            
            const fullStats = { ...stats, tries, tryAssists, goals };
            const rating = calculatePlayerRating(fullStats, jerseyNumber, false, isCaptain);
            const motmInfluence = calculateMotmInfluence(
              fullStats, jerseyNumber,
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
            
            // Calculate fatigue with baseline recovery (scaled by minutes)
            // REST players get +1 bonus recovery (veteran maintenance mode)
            const minutesPlayed = MINUTES_WITH_ROTATION[jerseyNumber] || 80;
            const isOnRest = player.current_training === 'Rest';
            fatigueUpdates[awayPlayerId] = calculatePlayerFatigue(
              player.fatigue || 0,
              minutesPlayed,
              traitMods.fatigueMultiplier,
              isOnRest
            );
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
        
        if (motmStatIndex >= 0) {
          fixtureStats[motmStatIndex].rating = Math.max(MOTM_MIN_RATING, fixtureStats[motmStatIndex].rating);
        }
        
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
        
        const cleanStats = fixtureStats.map(({ _motm_influence, _is_captain, ...rest }) => rest);
        allPlayerStats.push(...cleanStats);
        
        // Match events
        const matchResult = {
          fixture_id: fixture.id,
          home_team_id: fixture.home_team_id,
          away_team_id: fixture.away_team_id,
          home_score: homeScore,
          away_score: awayScore
        };
        const matchEvents = generateMatchEventsFromStats(matchResult, cleanStats);
        if (matchEvents.length > 0) {
          await supabase.from('match_events').insert(matchEvents);
        }
        
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
          message: `${homeTeam.name} ${homeWon ? 'defeated' : awayWon ? 'lost to' : 'drew with'} ${awayTeam.name} ${homeScore}-${awayScore}. ${gameTypeDesc}`,
          fixture_id: fixture.id
        });
        
        allNotifications.push({
          team_id: awayTeam.id,
          type: `match_${awayResult}` as any,
          title: awayWon ? '🏆 Victory!' : homeWon ? '😢 Defeat' : '🤝 Draw',
          message: `${awayTeam.name} ${awayWon ? 'defeated' : homeWon ? 'lost to' : 'drew with'} ${homeTeam.name} ${awayScore}-${homeScore}. ${gameTypeDesc}`,
          fixture_id: fixture.id
        });
        
        if (motmPlayer) {
          allNotifications.push({
            team_id: motmPlayer.team_id!,
            type: 'motm',
            title: '⭐ Man of the Match!',
            message: `${motmPlayer.first_name} ${motmPlayer.last_name} won MOTM! ${motmReason}`,
            player_id: motmPlayer.id,
            fixture_id: fixture.id
          });
        }
        
        // Match injuries
        const matchPlayerIds = fixtureStats.map(s => s.player_id);
        const { injuries: matchInjuries, notifications: injuryNotifications } = await processMatchInjuries(
          supabase, matchPlayerIds, playersMap, SEASON, currentRound, 'match'
        );
        
        if (matchInjuries.length > 0) {
          await saveInjuries(supabase, matchInjuries, SEASON, currentRound, 'match');
          allNotifications.push(...injuryNotifications);
        }
        
        logs.push(`${homeTeam.name} ${homeScore}-${awayScore} ${awayTeam.name}`);
        
        // Award Coach XP
        const homeCoachId = teamCoachMap[homeTeam.id];
        const awayCoachId = teamCoachMap[awayTeam.id];
        
        if (homeCoachId) {
          if (homeWon) {
            await awardCoachXP(homeCoachId, 'WIN');
            if (margin >= 20) await awardCoachXP(homeCoachId, 'WIN_BLOWOUT_BONUS');
          } else if (draw) {
            await awardCoachXP(homeCoachId, 'DRAW');
          } else {
            await awardCoachXP(homeCoachId, 'LOSS');
          }
        }
        
        if (awayCoachId) {
          if (awayWon) {
            await awardCoachXP(awayCoachId, 'WIN');
            if (margin >= 20) await awardCoachXP(awayCoachId, 'WIN_BLOWOUT_BONUS');
          } else if (draw) {
            await awardCoachXP(awayCoachId, 'DRAW');
          } else {
            await awardCoachXP(awayCoachId, 'LOSS');
          }
        }
      }
      
      // Rest recovery for non-playing players (baseline + 30% bonus)
      const playingPlayerIds = new Set(Object.keys(fatigueUpdates));
      for (const player of allPlayers) {
        if (player.team_id && !playingPlayerIds.has(player.id)) {
          fatigueUpdates[player.id] = calculateRestFatigue(player.fatigue || 0);
        }
      }
    }
    
    // ===========================================
    // PHASE 3: SAVE DATA
    // ===========================================
    
    const fixtureIds = roundFixtures.map((f: Fixture) => f.id);
    
    await Promise.all([
      allPlayerStats.length > 0 ? supabase.from('player_match_stats').insert(allPlayerStats) : Promise.resolve(),
      allMatchResults.length > 0 ? supabase.from('match_results').insert(allMatchResults) : Promise.resolve(),
      allNotifications.length > 0 ? supabase.from('notifications').insert(allNotifications) : Promise.resolve(),
      !isOrigin && fixtureIds.length > 0 ? supabase.from('fixtures').update({ played: true }).in('id', fixtureIds) : Promise.resolve(),
    ]);
    
    if (!isOrigin) {
      await Promise.all(
        Object.entries(teamUpdates).map(([teamId, data]) =>
          supabase.from('teams').update({
            wins: data.wins, draws: data.draws, losses: data.losses,
            points_for: data.points_for, points_against: data.points_against
          }).eq('id', teamId)
        )
      );
    }
    
    // Fatigue updates in chunks
    if (Object.keys(fatigueUpdates).length > 0) {
      const fatigueChunks = Object.entries(fatigueUpdates);
      const chunkSize = 100;
      for (let i = 0; i < fatigueChunks.length; i += chunkSize) {
        const chunk = fatigueChunks.slice(i, i + chunkSize);
        await Promise.all(chunk.map(([playerId, fatigue]) =>
          supabase.from('players').update({ fatigue }).eq('id', playerId)
        ));
      }
    }
    
    // Injury recoveries
    const { recoveredCount, notifications: recoveryNotifications } = await processInjuryRecoveries(
      supabase, currentRound, SEASON
    );
    if (recoveredCount > 0) {
      await supabase.from('notifications').insert(recoveryNotifications);
    }
    
    const totalTime = Date.now() - startTime;
    logs.push(`✅ Matches complete in ${totalTime}ms`);
    
    return NextResponse.json({
      success: true,
      phase: 'matches',
      round: currentRound,
      isOrigin,
      matches: isOrigin ? 1 : roundFixtures.length,
      executionTime: totalTime,
      logs
    });
    
  } catch (error) {
    console.error('Matches cron error:', error);
    await supabase.from('game_state').update({ maintenance: false, current_phase: 'error' }).eq('id', 1);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
