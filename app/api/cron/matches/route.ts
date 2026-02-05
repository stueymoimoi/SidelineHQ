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
 * OPTIMISED Feb 5: Batched all DB writes to avoid 60s timeout.
 * ~500 individual queries → ~15 batched queries.
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
  COACH_XP_REWARDS,
  getCoachLevel,
} from '@/lib/game-engine/constants';

import type { Player, Team, Fixture, TeamTactics, Notification } from '@/lib/game-engine/types';

import { generatePlayerStats } from '@/lib/game-engine/player-stats';
import { calculatePlayerRating } from '@/lib/game-engine/ratings';
import { calculateMotmInfluence, buildMotmReason } from '@/lib/game-engine/motm';
import { calculateTacticalBonus } from '@/lib/game-engine/tactics';
import { calculateTries, calculateKickingStats, calculateScore, distributeTries } from '@/lib/game-engine/scoring';
import { processMatchInjuries, saveInjuries, processInjuryRecoveries } from '@/lib/game-engine/injury-processing';
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
 */
function calculatePlayerFatigue(
  currentFatigue: number,
  minutesPlayed: number,
  traitFatigueMultiplier: number,
  isOnRest: boolean = false
): number {
  const baseRecovery = BASELINE_RECOVERY + (isOnRest ? 1 : 0);
  const afterRecovery = Math.max(0, currentFatigue - baseRecovery);
  const baseFatigueGain = calculateFatigueByMinutes(minutesPlayed, FATIGUE_PER_MATCH);
  const fatigueGain = Math.round(baseFatigueGain * traitFatigueMultiplier);
  return Math.min(100, afterRecovery + fatigueGain);
}

/**
 * Calculate fatigue for a non-playing player (rest recovery)
 */
function calculateRestFatigue(currentFatigue: number): number {
  const afterBaseline = Math.max(0, currentFatigue - BASELINE_RECOVERY);
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
      supabase.from('coaches').select('id, team_id, current_streak')
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
    
    // Determine the actual current round (considering Origin rounds)
    const nextFixtureRound = fixtures[0].round;

    const { data: pendingOrigin } = await supabase
      .from('origin_fixtures')
      .select('round')
      .eq('season', SEASON)
      .eq('played', false)
      .lt('round', nextFixtureRound)
      .order('round', { ascending: true })
      .limit(1);

    const currentRound = (pendingOrigin && pendingOrigin.length > 0) 
      ? pendingOrigin[0].round 
      : nextFixtureRound;

    const isOrigin = isOriginRound(currentRound);
    const roundFixtures = isOrigin ? [] : fixtures.filter((f: Fixture) => f.round === currentRound);

    logs.push(`Processing Round ${currentRound} - ${isOrigin ? 'ORIGIN' : `${roundFixtures.length} fixtures`}`);
    
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
    
    const teamCoachMap: Record<string, { id: string; streak: number }> = {};
    (coachesRes.data || []).forEach((c: any) => {
      if (c.team_id) teamCoachMap[c.team_id] = { id: c.id, streak: c.current_streak || 0 };
    });
    
    const streakUpdates: Record<string, number> = {};
    
    // ===========================================
    // PHASE 2: SIMULATE MATCHES
    // ===========================================
    
    const allPlayerStats: any[] = [];
    const allMatchResults: any[] = [];
    const allMatchEvents: any[] = [];          // BATCHED — was per-fixture insert
    const allNotifications: Notification[] = [];
    const teamUpdates: Record<string, any> = {};
    const fatigueUpdates: Record<string, number> = {};
    const allMatchPlayerIds: string[] = [];    // BATCHED — collect for bulk injury processing
    const xpAwards: { coachId: string; eventType: string }[] = []; // BATCHED — was per-fixture await
    
    
    if (isOrigin) {
      logs.push(`🏉 ORIGIN ROUND ${currentRound}`);
      
      const { data: originFixture } = await supabase
        .from('origin_fixtures')
        .select('*')
        .eq('round', currentRound)
        .eq('season', SEASON)
        .single();
      
      if (originFixture && !originFixture.played) {
        // Idempotency guard
        const { count: existingOriginStats } = await supabase
          .from('origin_player_stats')
          .select('id', { count: 'exact', head: true })
          .eq('origin_fixture_id', originFixture.id);
        
        if (existingOriginStats && existingOriginStats > 0) {
          logs.push(`⏭️ Skipping Origin fixture ${originFixture.id} — already simulated (${existingOriginStats} stats)`);
          await supabase.from('game_state').update({ maintenance: false, current_phase: null }).eq('id', 1);
          return NextResponse.json({ success: true, message: 'Origin already simulated', logs });
        }
        
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
        
        // Origin fatigue
        const originSquadIds = new Set([
          ...nswSquad.players.map(p => p.player.id),
          ...qldSquad.players.map(p => p.player.id)
        ]);

        originSquadIds.forEach(playerId => {
          const player = playersMap[playerId];
          if (player) {
            const afterRecovery = Math.max(0, (player.fatigue || 0) - BASELINE_RECOVERY);
            const originFatigue = getOriginFatigue();
            fatigueUpdates[playerId] = Math.min(100, afterRecovery + originFatigue);
          }
        });
        
        // Origin injuries — single call, not in a loop
        const originPlayingIds = Array.from(originSquadIds);
        const { injuries: originInjuries, notifications: originInjuryNotifications } = await processMatchInjuries(
          supabase, originPlayingIds, playersMap, SEASON, currentRound, 'origin'
        );
        
        if (originInjuries.length > 0) {
          await saveInjuries(supabase, originInjuries, SEASON, currentRound, 'origin');
          allNotifications.push(...originInjuryNotifications);
          logs.push(`Origin Injuries: ${originInjuries.length}`);
        }
        
        // Non-Origin players: rest recovery
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
      
      // -----------------------------------------------
      // BULK IDEMPOTENCY CHECK — one query, not 50
      // -----------------------------------------------
      const fixtureIds = roundFixtures.map((f: Fixture) => f.id);
      const { data: existingEventRows } = await supabase
        .from('match_events')
        .select('fixture_id')
        .in('fixture_id', fixtureIds);
      
      const alreadySimulated = new Set((existingEventRows || []).map((r: any) => r.fixture_id));
      const fixturesToSimulate = roundFixtures.filter((f: Fixture) => !alreadySimulated.has(f.id));
      
      if (alreadySimulated.size > 0) {
        logs.push(`⏭️ Skipping ${alreadySimulated.size} already-simulated fixtures`);
      }
      
      logs.push(`Simulating ${fixturesToSimulate.length} club matches`);
      
      // -----------------------------------------------
      // SIMULATE ALL MATCHES — pure computation, NO DB calls
      // -----------------------------------------------
      for (const fixture of fixturesToSimulate) {
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
        
        // BATCHED: Collect match events instead of inserting per fixture
        const matchResult = {
          fixture_id: fixture.id,
          home_team_id: fixture.home_team_id,
          away_team_id: fixture.away_team_id,
          home_score: homeScore,
          away_score: awayScore
        };
        const matchEvents = generateMatchEventsFromStats(matchResult, cleanStats);
        allMatchEvents.push(...matchEvents);
        
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
        
        // BATCHED: Collect playing player IDs for bulk injury processing
        allMatchPlayerIds.push(...fixtureStats.map(s => s.player_id));
        
        logs.push(`${homeTeam.name} ${homeScore}-${awayScore} ${awayTeam.name}`);
        
        // BATCHED: Collect XP awards instead of awaiting each one
        const homeCoach = teamCoachMap[homeTeam.id];
        const awayCoach = teamCoachMap[awayTeam.id];
        
        if (homeCoach) {
          if (homeWon) {
            const oldStreak = homeCoach.streak;
            const newStreak = oldStreak > 0 ? oldStreak + 1 : 1;
            streakUpdates[homeCoach.id] = newStreak;
            homeCoach.streak = newStreak;
            
            xpAwards.push({ coachId: homeCoach.id, eventType: 'WIN' });
            if (margin >= 20) xpAwards.push({ coachId: homeCoach.id, eventType: 'WIN_BLOWOUT_BONUS' });
            if (newStreak >= 3) xpAwards.push({ coachId: homeCoach.id, eventType: 'WIN_STREAK_BONUS' });
          } else if (draw) {
            streakUpdates[homeCoach.id] = 0;
            homeCoach.streak = 0;
            xpAwards.push({ coachId: homeCoach.id, eventType: 'DRAW' });
          } else {
            const oldStreak = homeCoach.streak;
            const newStreak = oldStreak < 0 ? oldStreak - 1 : -1;
            streakUpdates[homeCoach.id] = newStreak;
            homeCoach.streak = newStreak;
            xpAwards.push({ coachId: homeCoach.id, eventType: 'LOSS' });
          }
        }
        
        if (awayCoach) {
          if (awayWon) {
            const oldStreak = awayCoach.streak;
            const newStreak = oldStreak > 0 ? oldStreak + 1 : 1;
            streakUpdates[awayCoach.id] = newStreak;
            awayCoach.streak = newStreak;
            
            xpAwards.push({ coachId: awayCoach.id, eventType: 'WIN' });
            if (margin >= 20) xpAwards.push({ coachId: awayCoach.id, eventType: 'WIN_BLOWOUT_BONUS' });
            if (newStreak >= 3) xpAwards.push({ coachId: awayCoach.id, eventType: 'WIN_STREAK_BONUS' });
          } else if (draw) {
            streakUpdates[awayCoach.id] = 0;
            awayCoach.streak = 0;
            xpAwards.push({ coachId: awayCoach.id, eventType: 'DRAW' });
          } else {
            const oldStreak = awayCoach.streak;
            const newStreak = oldStreak < 0 ? oldStreak - 1 : -1;
            streakUpdates[awayCoach.id] = newStreak;
            awayCoach.streak = newStreak;
            xpAwards.push({ coachId: awayCoach.id, eventType: 'LOSS' });
          }
        }
      }
      
      // Rest recovery for non-playing players
      const playingPlayerIds = new Set(Object.keys(fatigueUpdates));
      for (const player of allPlayers) {
        if (player.team_id && !playingPlayerIds.has(player.id)) {
          fatigueUpdates[player.id] = calculateRestFatigue(player.fatigue || 0);
        }
      }
      
      // -----------------------------------------------
      // BATCHED: Process all injuries in one call
      // -----------------------------------------------
      if (allMatchPlayerIds.length > 0) {
        const { injuries: matchInjuries, notifications: injuryNotifications } = await processMatchInjuries(
          supabase, allMatchPlayerIds, playersMap, SEASON, currentRound, 'match'
        );
        
        if (matchInjuries.length > 0) {
          await saveInjuries(supabase, matchInjuries, SEASON, currentRound, 'match');
          allNotifications.push(...injuryNotifications);
          logs.push(`Match injuries: ${matchInjuries.length}`);
        }
      }
    }
    
    // ===========================================
    // PHASE 3: SAVE ALL DATA (BATCHED)
    // ===========================================
    
    const saveStart = Date.now();
    
    const fixtureIds = roundFixtures.map((f: Fixture) => f.id);
    
    // First batch: all inserts in parallel
    await Promise.all([
      allPlayerStats.length > 0 ? supabase.from('player_match_stats').insert(allPlayerStats) : Promise.resolve(),
      allMatchResults.length > 0 ? supabase.from('match_results').insert(allMatchResults) : Promise.resolve(),
      allMatchEvents.length > 0 ? supabase.from('match_events').insert(allMatchEvents) : Promise.resolve(),
      allNotifications.length > 0 ? supabase.from('notifications').insert(allNotifications) : Promise.resolve(),
      !isOrigin && fixtureIds.length > 0 ? supabase.from('fixtures').update({ played: true }).in('id', fixtureIds) : Promise.resolve(),
    ]);
    
    logs.push(`Inserts done in ${Date.now() - saveStart}ms`);
    
    // Second batch: team updates in parallel
    if (!isOrigin && Object.keys(teamUpdates).length > 0) {
      await Promise.all(
        Object.entries(teamUpdates).map(([teamId, data]) =>
          supabase.from('teams').update({
            wins: data.wins, draws: data.draws, losses: data.losses,
            points_for: data.points_for, points_against: data.points_against
          }).eq('id', teamId)
        )
      );
      logs.push(`Team updates done in ${Date.now() - saveStart}ms`);
    }
    
    // Third batch: fatigue — use bulk SQL instead of individual updates
    if (Object.keys(fatigueUpdates).length > 0) {
      // Build a single SQL CASE statement to update all players at once
      const cases = Object.entries(fatigueUpdates)
        .map(([id, fatigue]) => `WHEN '${id}' THEN ${fatigue}`)
        .join(' ');
      const playerIds = Object.keys(fatigueUpdates)
        .map(id => `'${id}'`)
        .join(',');
      
      const { error: fatigueError } = await supabase.rpc('bulk_update_fatigue', {
        player_ids: Object.keys(fatigueUpdates),
        fatigue_values: Object.values(fatigueUpdates)
      }).single();
      
      // Fallback: if RPC doesn't exist yet, use chunked updates
      if (fatigueError) {
        logs.push(`⚠️ bulk_update_fatigue RPC not found, using chunked fallback`);
        const fatigueChunks = Object.entries(fatigueUpdates);
        const chunkSize = 200;
        for (let i = 0; i < fatigueChunks.length; i += chunkSize) {
          const chunk = fatigueChunks.slice(i, i + chunkSize);
          await Promise.all(chunk.map(([playerId, fatigue]) =>
            supabase.from('players').update({ fatigue }).eq('id', playerId)
          ));
        }
      }
      
      logs.push(`Fatigue updates done in ${Date.now() - saveStart}ms`);
    }
    
    // Fourth batch: coach XP + streaks — single DB call per coach
    if (xpAwards.length > 0 || Object.keys(streakUpdates).length > 0) {
      // Sum XP per coach in memory
      const coachXPTotals: Record<string, number> = {};
      for (const award of xpAwards) {
        const xpAmount = COACH_XP_REWARDS[award.eventType as keyof typeof COACH_XP_REWARDS] || 0;
        coachXPTotals[award.coachId] = (coachXPTotals[award.coachId] || 0) + xpAmount;
      }
      
      // Load current XP for coaches who earned XP (one query)
      const coachIdsWithXP = Object.keys(coachXPTotals);
      let coachCurrentData: Record<string, { xp: number; level: number; coach_name: string; team_id: string }> = {};
      
      if (coachIdsWithXP.length > 0) {
        const { data: coachRows } = await supabase
          .from('coaches')
          .select('id, xp, level, coach_name, team_id')
          .in('id', coachIdsWithXP);
        
        for (const c of (coachRows || [])) {
          coachCurrentData[c.id] = { xp: c.xp || 0, level: c.level || 1, coach_name: c.coach_name || 'Coach', team_id: c.team_id };
        }
      }
      
      // Calculate new XP/levels and build updates
      const coachUpdatePromises: Promise<any>[] = [];
      const levelUpNotifications: any[] = [];
      
      for (const [coachId, xpGain] of Object.entries(coachXPTotals)) {
        const current = coachCurrentData[coachId];
        if (!current) continue;
        
        const newTotal = current.xp + xpGain;
        const { level: newLevel, title: newTitle } = getCoachLevel(newTotal);
        const leveledUp = newLevel > current.level;
        
        const updateData: any = { xp: newTotal, level: newLevel };
        if (streakUpdates[coachId] !== undefined) {
          updateData.current_streak = streakUpdates[coachId];
          delete streakUpdates[coachId]; // handled here
        }
        
        coachUpdatePromises.push(
          Promise.resolve(supabase.from('coaches').update(updateData).eq('id', coachId))
        );
        
        if (leveledUp && current.team_id) {
          levelUpNotifications.push({
            team_id: current.team_id,
            type: 'coach_level_up',
            title: `${current.coach_name} promoted to ${newTitle}!`,
            message: `Congratulations! Your coaching career has progressed to Level ${newLevel}: ${newTitle}. Keep building your legacy!`,
          });
        }
      }
      
      // Any remaining streak-only updates (coaches with no XP this round)
      for (const [coachId, streak] of Object.entries(streakUpdates)) {
        coachUpdatePromises.push(
          Promise.resolve(supabase.from('coaches').update({ current_streak: streak }).eq('id', coachId))
        );
      }
      
      await Promise.all(coachUpdatePromises);
      
      if (levelUpNotifications.length > 0) {
        await supabase.from('notifications').insert(levelUpNotifications);
      }
      
      logs.push(`XP + streaks done in ${Date.now() - saveStart}ms (${xpAwards.length} awards, ${Object.keys(coachXPTotals).length} coaches)`);
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