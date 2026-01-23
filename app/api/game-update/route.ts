/**
 * SidelineHQ Game Update API
 * 
 * Cron endpoint that simulates matches, processes training, and handles free agents.
 * Runs at 6pm AEST on Tue/Thu/Sun.
 * 
 * Schedule: 0 8 * * 0,2,4 (8am UTC = 6pm AEST)
 * 
 * OPTIMIZATIONS:
 * - Parallel database operations where possible
 * - Batch inserts instead of individual inserts
 * - Minimized database round-trips
 * - Pre-built lookup maps for O(1) access
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
  REST_RECOVERY,
  MINUTES_WITH_ROTATION,
  calculateFatigueByMinutes,
  getMinutesForPlayer,
} from '@/lib/game-engine/constants';

import type { Player, Team, Fixture, TeamTactics, Notification } from '@/lib/game-engine/types';

import { generatePlayerStats } from '@/lib/game-engine/player-stats';
import { calculatePlayerRating } from '@/lib/game-engine/ratings';
import { calculateMotmInfluence, buildMotmReason } from '@/lib/game-engine/motm';
import { calculateTacticalBonus } from '@/lib/game-engine/tactics';
import { calculateTries, calculateKickingStats, calculateScore, distributeTries } from '@/lib/game-engine/scoring';
import { processAllTraining } from '@/lib/training';
import { processMatchInjuries, saveInjuries, processInjuryRecoveries } from '@/lib/game-engine/injury-processing';
import { generateMatchEventsFromStats } from '@/lib/game-engine/match-events';
import { processAllTeamFinances, processContractCountdown, processAIContractRenewals, ENABLE_FINANCES } from '@/lib/finances';
import { autoFillAllTeamTactics } from '@/lib/tactics/auto-lineup';

// Origin imports
import { 
  selectOriginSquad, 
  isOriginRound, 
} from '@/lib/origin/selection';
import { simulateOriginMatch } from '@/lib/origin/simulation';

import { 
  calculateTraitModifiers, 
  DEFAULT_MODIFIERS,
  type PlayerTraitData,
  type GameContext,
  type MatchContext,
  type TraitModifiers
} from '@/lib/game-engine/traits';

// ===========================================
// SUPABASE CLIENT (Service Role for admin ops)
// ===========================================

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ===========================================
// EXTRACT TRAIT DATA FROM PLAYER
// ===========================================

function getPlayerTraitData(player: Player): PlayerTraitData {
  return {
    visibleTrait: (player.visible_trait as PlayerTraitData['visibleTrait']) || null,
    visibleTraitPositive: player.visible_trait_positive ?? null,
    hiddenTrait: (player.hidden_trait as PlayerTraitData['hiddenTrait']) || null,
  };
}
// ===========================================
// MORALE PERFORMANCE MODIFIER
// ===========================================

function getMoraleMultiplier(morale: number): number {
  switch (morale) {
    case 5: return 1.05;  // Ecstatic: +5%
    case 4: return 1.02;  // Happy: +2%
    case 3: return 1.00;  // Content: +0%
    case 2: return 0.97;  // Unhappy: -3%
    case 1: return 0.92;  // Angry: -8%
    default: return 1.00;
  }
}
// ===========================================
// AUTO-GENERATE TACTICS FOR UNMANAGED TEAMS
// ===========================================

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

// ===========================================
// MAIN API HANDLER
// ===========================================

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
    // PHASE 1: LOAD ALL DATA (Parallel)
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
    
    logs.push(`Data loaded in ${Date.now() - startTime}ms`);
    
    if (fixtures.length === 0) {
      return NextResponse.json({ success: true, message: 'Season complete!' });
    }
    
    const currentRound = fixtures[0].round;
    const roundFixtures = fixtures.filter((f: Fixture) => f.round === currentRound);
    
    logs.push(`Processing Round ${currentRound} - ${roundFixtures.length} fixtures, ${allPlayers.length} players`);
    
    // Build lookup maps for O(1) access
    const teamsMap: Record<string, Team> = {};
    teams.forEach((t: Team) => { teamsMap[t.id] = t; });
    
    const tacticsMap: Record<string, any> = {};
    allTactics.forEach((t: any) => { tacticsMap[t.team_id] = t; });
    
    const playersMap: Record<string, Player> = {};
    allPlayers.forEach((p: Player) => { playersMap[p.id] = p; });
    
    // Build team roster map for quick squad lookups
    const teamRosters: Record<string, Player[]> = {};
    allPlayers.forEach((p: Player) => {
      if (p.team_id) {
        if (!teamRosters[p.team_id]) teamRosters[p.team_id] = [];
        teamRosters[p.team_id].push(p);
      }
    });
    
    const coachedTeams = new Set((coachesRes.data || []).map((c: any) => c.team_id));

    // ===========================================
    // PHASE 1.5A: PROCESS INJURY RECOVERIES (BEFORE MATCHES)
    // ===========================================
    // This MUST run before match simulation so recovered players are available
    // and injured players can be auto-replaced in lineups
    
    const { recoveredCount, notifications: recoveryNotifications } = await processInjuryRecoveries(
      supabase,
      currentRound,
      SEASON
    );
    
    if (recoveredCount > 0) {
      await supabase.from('notifications').insert(recoveryNotifications);
      logs.push(`💪 Injury recoveries: ${recoveredCount} player${recoveredCount > 1 ? 's' : ''} now available`);
    }

    // ===========================================
    // PHASE 1.5B: REPLACE INJURED PLAYERS IN LINEUPS
    // ===========================================
    // Auto-replace any injured players that coaches left in their lineups
    
    const { replaceInjuredPlayersInLineups } = await import('@/lib/tactics/auto-lineup');
    const injuryReplacementResult = await replaceInjuredPlayersInLineups();
    
    if (injuryReplacementResult.playersReplaced > 0) {
      logs.push(`🔄 Injury replacements: ${injuryReplacementResult.playersReplaced} players auto-replaced in ${injuryReplacementResult.teamsFixed} teams`);
    }

    // ===========================================
    // PHASE 1.5C: AUTO-FILL INCOMPLETE TEAM TACTICS
    // ===========================================
    
    const autoLineupResult = await autoFillAllTeamTactics();
    if (autoLineupResult.updated > 0) {
      logs.push(`Auto-filled tactics for ${autoLineupResult.updated} teams`);
    }
    if (autoLineupResult.errors.length > 0) {
      logs.push(`Auto-lineup errors: ${autoLineupResult.errors.slice(0, 3).join(', ')}`);
    }

    // Refresh tactics data after auto-fill
    const refreshedTacticsRes = await supabase.from('team_tactics').select('*');
    (refreshedTacticsRes.data || []).forEach((t: TeamTactics) => { 
      tacticsMap[t.team_id] = t; 
    });

    // ===========================================
    // PHASE 2: SIMULATE MATCHES
    // ===========================================
    
    const allPlayerStats: any[] = [];
    const allMatchResults: any[] = [];
    const allNotifications: Notification[] = [];
    const teamUpdates: Record<string, any> = {};
    const fatigueUpdates: Record<string, number> = {};
    
    // ===========================================
    // ORIGIN CHECK: Handle Origin rounds differently
    // ===========================================
    
    const isOrigin = isOriginRound(currentRound);
    
    if (isOrigin) {
      logs.push(`🏉 ORIGIN ROUND ${currentRound} - No club matches`);
      
      // Get Origin fixture for this round
      const { data: originFixture } = await supabase
        .from('origin_fixtures')
        .select('*')
        .eq('round', currentRound)
        .eq('season', SEASON)
        .single();
      
      if (originFixture && !originFixture.played) {
        // Select squads (returns OriginSquad objects)
        const nswSquad = selectOriginSquad(allPlayers, 'NSW');
        const qldSquad = selectOriginSquad(allPlayers, 'QLD');
        
        logs.push(`NSW Squad: ${nswSquad.players.length} players`);
        logs.push(`QLD Squad: ${qldSquad.players.length} players`);
        
        // Save selections to database
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
        
        // Determine home/away based on fixture
        const homeSquad = originFixture.home_team === 'NSW' ? nswSquad : qldSquad;
        const awaySquad = originFixture.home_team === 'NSW' ? qldSquad : nswSquad;
        
        // Simulate Origin match
        const originResult = simulateOriginMatch(homeSquad, awaySquad, originFixture.id, playersMap);
        
        const nswScore = originResult.homeTeam === 'NSW' ? originResult.homeScore : originResult.awayScore;
        const qldScore = originResult.homeTeam === 'QLD' ? originResult.homeScore : originResult.awayScore;
        
        logs.push(`Origin Game ${originFixture.game_number}: NSW ${nswScore} - ${qldScore} QLD`);
        
        // Save stats
        const allOriginStats = [...originResult.homeStats, ...originResult.awayStats];
        if (allOriginStats.length > 0) {
          await supabase.from('origin_player_stats').insert(allOriginStats);
        }
        
        // Update fixture
        await supabase.from('origin_fixtures').update({
          played: true,
          home_score: originResult.homeScore,
          away_score: originResult.awayScore,
          motm_player_id: originResult.motmPlayerId,
          motm_reason: originResult.motmReason
        }).eq('id', originFixture.id);
        
        // Update series wins
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
        
        // Apply fatigue from Origin result
        Object.entries(originResult.fatigueUpdates).forEach(([playerId, fatigue]) => {
          fatigueUpdates[playerId] = fatigue;
        });
        // ===========================================
        // ORIGIN INJURY CHECK
        // ===========================================
        const originPlayingIds = Object.keys(originResult.fatigueUpdates);
        const { injuries: originInjuries, notifications: originInjuryNotifications } = await processMatchInjuries(
          supabase,
          originPlayingIds,
          playersMap,
          SEASON,
          currentRound,
          'origin'
        );
        
        if (originInjuries.length > 0) {
          await saveInjuries(supabase, originInjuries, SEASON, currentRound, 'origin');
          allNotifications.push(...originInjuryNotifications);
          logs.push(`Origin Injuries: ${originInjuries.map(i => `${i.playerName} (${i.injuryName})`).join(', ')}`);
        }
        // REST recovery for non-Origin players
        const originPlayerIds = new Set(Object.keys(originResult.fatigueUpdates));
        for (const player of allPlayers) {
          if (player.team_id && !originPlayerIds.has(player.id)) {
            fatigueUpdates[player.id] = Math.max(0, (player.fatigue || 0) - REST_RECOVERY);
          }
        }
        
        logs.push(`Origin fatigue applied, non-Origin players rested`);
        
        // Send Origin notifications to all teams
        const winnerName = originResult.winner === 'NSW' ? 'NSW Blues' : originResult.winner === 'QLD' ? 'QLD Maroons' : null;
        const loserName = originResult.winner === 'NSW' ? 'QLD Maroons' : originResult.winner === 'QLD' ? 'NSW Blues' : null;
        
        for (const team of teams) {
          allNotifications.push({
            team_id: team.id,
            type: 'origin_result' as any,
            title: `🏉 Origin Game ${originFixture.game_number} Result`,
            message: originResult.winner 
              ? `${winnerName} defeated ${loserName} ${Math.max(nswScore, qldScore)}-${Math.min(nswScore, qldScore)}`
              : `Origin Game ${originFixture.game_number} ended in a ${nswScore}-${qldScore} draw!`
          });
        }
        
        // MOTM notification
        if (originResult.motmPlayerId) {
          const motmPlayer = playersMap[originResult.motmPlayerId];
          if (motmPlayer?.team_id) {
            allNotifications.push({
              team_id: motmPlayer.team_id,
              type: 'origin_motm' as any,
              title: '⭐ Origin Man of the Match!',
              message: `${motmPlayer.first_name} ${motmPlayer.last_name} won Origin MOTM! ${originResult.motmReason}`,
              player_id: motmPlayer.id
            });
          }
        }
      }
    }
    
    // ===========================================
    // CLUB MATCHES (Only if NOT Origin round)
    // ===========================================
    
    if (!isOrigin) {
      logs.push(`Simulating ${roundFixtures.length} club matches`);
      
      for (const fixture of roundFixtures) {
        const homeTeam = teamsMap[fixture.home_team_id];
        const awayTeam = teamsMap[fixture.away_team_id];
        if (!homeTeam || !awayTeam) continue;
        
        // Get or generate tactics
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
        
        // Calculate tactical bonuses
        const homeTacticalBonus = calculateTacticalBonus(
          homeTactics.attack_focus || 'structured',
          awayTactics.defense_focus || 'slide'
        );
        const awayTacticalBonus = calculateTacticalBonus(
          awayTactics.attack_focus || 'structured',
          homeTactics.defense_focus || 'slide'
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
        
        const homeKicking = calculateKickingStats(homeTries, homeKicker?.kicking || 4);
        const awayKicking = calculateKickingStats(awayTries, awayKicker?.kicking || 4);
        
        const homeScore = calculateScore(homeTries, homeKicking.conversions, homeKicking.penalties);
        const awayScore = calculateScore(awayTries, awayKicking.conversions, awayKicking.penalties);
        
        // Game context
        const totalPoints = homeScore + awayScore;
        const margin = Math.abs(homeScore - awayScore);
        const homeWon = homeScore > awayScore;
        const awayWon = awayScore > homeScore;
        const draw = homeScore === awayScore;
        
        // Distribute tries and assists
        const homeTryDist = distributeTries(playersMap, homeTries, homeTactics);
        const awayTryDist = distributeTries(playersMap, awayTries, awayTactics);
        
        // Build game context for trait calculations
        const gameContext: GameContext = {
          isHome: true,
          isFinals: currentRound > 18,
          isOrigin: false,
          currentMargin: homeScore - awayScore,
          marginAtHalftime: Math.round((homeScore - awayScore) * 0.4),
          isSecondHalf: true,
          opponentTeamId: '',
        };
        
        // Generate player stats
        const fixtureStats: any[] = [];
        
        for (let i = 0; i < POSITION_FIELDS.length; i++) {
          const field = POSITION_FIELDS[i];
          const jerseyNumber = i + 1;
        
          
          // Home team player
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
            
            const moraleMultiplier = getMoraleMultiplier(player.morale ?? 3);
            
            const stats = {
              metres: Math.round(baseStats.metres * traitMods.statsMultiplier * traitMods.metreMultiplier * moraleMultiplier),
              tackles: Math.round(baseStats.tackles * traitMods.statsMultiplier * traitMods.tackleMultiplier * moraleMultiplier),
              missedTackles: baseStats.missedTackles,
              errors: baseStats.errors,
              lineBreaks: Math.round(baseStats.lineBreaks * traitMods.statsMultiplier * moraleMultiplier),
              tackleBreaks: Math.round(baseStats.tackleBreaks * traitMods.statsMultiplier * moraleMultiplier),
            };
            
            const tries = homeTryDist.tryScorers[homePlayerId] || 0;
            const tryAssists = homeTryDist.tryAssisters[homePlayerId] || 0;
            const isKicker = homeTactics.goal_kicker === homePlayerId;
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
            
            const minutesPlayed = MINUTES_WITH_ROTATION[jerseyNumber] || 80;
            const baseFatigueGain = calculateFatigueByMinutes(minutesPlayed, FATIGUE_PER_MATCH);
            const fatigueGain = Math.round(baseFatigueGain * traitMods.fatigueMultiplier);
            fatigueUpdates[homePlayerId] = Math.min(100, (player.fatigue || 0) + fatigueGain);
          }
          
          // Away team player
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
            
            const moraleMultiplier = getMoraleMultiplier(player.morale ?? 3);
            
            const stats = {
              metres: Math.round(baseStats.metres * traitMods.statsMultiplier * traitMods.metreMultiplier * moraleMultiplier),
              tackles: Math.round(baseStats.tackles * traitMods.statsMultiplier * traitMods.tackleMultiplier * moraleMultiplier),
              missedTackles: baseStats.missedTackles,
              errors: baseStats.errors,
              lineBreaks: Math.round(baseStats.lineBreaks * traitMods.statsMultiplier * moraleMultiplier),
              tackleBreaks: Math.round(baseStats.tackleBreaks * traitMods.statsMultiplier * moraleMultiplier),
            };
            
            const tries = awayTryDist.tryScorers[awayPlayerId] || 0;
            const tryAssists = awayTryDist.tryAssisters[awayPlayerId] || 0;
            const isKicker = awayTactics.goal_kicker === awayPlayerId;
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
            
            const minutesPlayed = MINUTES_WITH_ROTATION[jerseyNumber] || 80;
            const baseFatigueGain = calculateFatigueByMinutes(minutesPlayed, FATIGUE_PER_MATCH);
            const fatigueGain = Math.round(baseFatigueGain * traitMods.fatigueMultiplier);
            fatigueUpdates[awayPlayerId] = Math.min(100, (player.fatigue || 0) + fatigueGain);
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

// Generate match events for timeline
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
        // ===========================================
        // INJURY CHECK FOR THIS MATCH
        // ===========================================
        const matchPlayerIds = fixtureStats.map(s => s.player_id);
        const { injuries: matchInjuries, notifications: injuryNotifications } = await processMatchInjuries(
          supabase,
          matchPlayerIds,
          playersMap,
          SEASON,
          currentRound,
          'match'
        );
        
        if (matchInjuries.length > 0) {
          await saveInjuries(supabase, matchInjuries, SEASON, currentRound, 'match');
          allNotifications.push(...injuryNotifications);
          
          // Reduce minutes for injured players (they left the field early)
          for (const injury of matchInjuries) {
            const statIndex = fixtureStats.findIndex(s => s.player_id === injury.playerId);
            if (statIndex !== -1) {
              fixtureStats[statIndex].minutes_played = injury.minuteInjured;
            }
          }
          
          logs.push(`  ↳ Injuries: ${matchInjuries.map(i => `${i.playerName} (${i.injuryName}, ${i.minuteInjured}')`).join(', ')}`);
        }
        logs.push(`${homeTeam.name} ${homeScore} - ${awayScore} ${awayTeam.name}`);
      }
      // ===========================================
      // REST RECOVERY FOR NON-PLAYING PLAYERS
      // ===========================================
      const playingPlayerIds = new Set(Object.keys(fatigueUpdates));
      
      for (const player of allPlayers) {
        if (player.team_id && !playingPlayerIds.has(player.id)) {
          // Player didn't play - apply 30% fatigue recovery
          const currentFatigue = player.fatigue || 0;
          const newFatigue = Math.round(currentFatigue * 0.7); // 30% reduction
          fatigueUpdates[player.id] = Math.max(0, newFatigue);
        }
      }
      
      logs.push(`REST recovery applied to ${allPlayers.length - playingPlayerIds.size} non-playing players`);
    } // End of club matches block
    
    logs.push(`Matches simulated in ${Date.now() - startTime}ms`);
    
    // ===========================================
    // PHASE 3: SAVE MATCH DATA (Parallel batch writes)
    // ===========================================
    
    const fixtureIds = roundFixtures.map((f: Fixture) => f.id);
    
    await Promise.all([
      allPlayerStats.length > 0 
        ? supabase.from('player_match_stats').insert(allPlayerStats)
        : Promise.resolve(),
      allMatchResults.length > 0 
        ? supabase.from('match_results').insert(allMatchResults)
        : Promise.resolve(),
      allNotifications.length > 0 
        ? supabase.from('notifications').insert(allNotifications)
        : Promise.resolve(),
      !isOrigin && fixtureIds.length > 0
        ? supabase.from('fixtures').update({ played: true }).in('id', fixtureIds)
        : Promise.resolve(),
    ]);
    
    // Batch team updates (parallel) - only for club matches
    if (!isOrigin) {
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
    }
    
    // Batch fatigue updates
    if (Object.keys(fatigueUpdates).length > 0) {
      const fatigueChunks = Object.entries(fatigueUpdates);
      const chunkSize = 100;
      for (let i = 0; i < fatigueChunks.length; i += chunkSize) {
        const chunk = fatigueChunks.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(([playerId, fatigue]) =>
            supabase.from('players').update({ fatigue }).eq('id', playerId)
          )
        );
      }
    }
    
    logs.push(`Match data saved in ${Date.now() - startTime}ms`);
    
    // ===========================================
    // PHASE 4: PROCESS TRAINING
    // ===========================================
    
    const { playerUpdates, notifications: trainingNotifications, improvementCount } = processAllTraining(allPlayers);
    
    if (playerUpdates.length > 0) {
      const chunkSize = 100;
      for (let i = 0; i < playerUpdates.length; i += chunkSize) {
        const chunk = playerUpdates.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(update =>
            supabase.from('players').update(update).eq('id', update.id)
          )
        );
      }
    }
    
    if (trainingNotifications.length > 0) {
      await supabase.from('notifications').insert(trainingNotifications);
    }
    
    logs.push(`Training: ${improvementCount} players improved`);
    // ===========================================
    // PHASE 4.3: PROCESS MORALE
    // ===========================================
    
    try {
      const moraleUpdates: { id: string; morale: number }[] = [];
      const moraleNotifications: Notification[] = [];
      
      // Get transfer listed players
      const { data: transferListedPlayers } = await supabase
        .from('player_contracts')
        .select('player_id')
        .eq('is_transfer_listed', true);
      const transferListedIds = new Set((transferListedPlayers || []).map(p => p.player_id));
      
      // Calculate team results for this round
      const teamResults: Record<string, { result: 'win' | 'draw' | 'loss'; streak: number }> = {};
      for (const result of allMatchResults) {
        const homeWon = result.home_score > result.away_score;
        const awayWon = result.away_score > result.home_score;
        
        teamResults[result.home_team_id] = {
          result: homeWon ? 'win' : awayWon ? 'loss' : 'draw',
          streak: 0
        };
        teamResults[result.away_team_id] = {
          result: awayWon ? 'win' : homeWon ? 'loss' : 'draw',
          streak: 0
        };
      }
      
      // Calculate streaks from recent results
      for (const teamId of Object.keys(teamResults)) {
        const { data: recentResults } = await supabase
          .from('match_results')
          .select('home_team_id, away_team_id, home_score, away_score')
          .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
          .order('round', { ascending: false })
          .limit(3);
        
        if (recentResults && recentResults.length >= 3) {
          let winStreak = 0;
          let lossStreak = 0;
          
          for (const r of recentResults) {
            const isHome = r.home_team_id === teamId;
            const won = isHome ? r.home_score > r.away_score : r.away_score > r.home_score;
            if (won) winStreak++;
            else break;
          }
          
          for (const r of recentResults) {
            const isHome = r.home_team_id === teamId;
            const lost = isHome ? r.home_score < r.away_score : r.away_score < r.home_score;
            if (lost) lossStreak++;
            else break;
          }
          
          teamResults[teamId].streak = winStreak >= 3 ? winStreak : (lossStreak >= 3 ? -lossStreak : 0);
        }
      }
      
      // Build sets for playing time checks
      const playersWhoStarted = new Set(allPlayerStats.filter(s => s.jersey_number <= 13).map(s => s.player_id));
      const playersOnBench = new Set(allPlayerStats.filter(s => s.jersey_number > 13).map(s => s.player_id));
      const motmPlayers = new Set(allMatchResults.filter(r => r.motm_player_id).map(r => r.motm_player_id));
      
      // Get injured players
      const { data: injuredPlayers } = await supabase
        .from('injuries')
        .select('player_id')
        .eq('recovered', false);
      const injuredIds = new Set((injuredPlayers || []).map(p => p.player_id));
      
      // Process each player
      for (const player of allPlayers) {
        if (!player.team_id) continue;
        
        let change = 0;
        const currentMorale = player.morale || 3;
        
        // Team result
        const teamResult = teamResults[player.team_id];
        if (teamResult) {
          if (teamResult.result === 'win') change += 1;
          else if (teamResult.result === 'loss') change -= 1;
          
          if (teamResult.streak >= 3) change += 1;
          else if (teamResult.streak <= -3) change -= 1;
        }
        
        // Playing time
        if (playersWhoStarted.has(player.id)) {
          change += 1;
        } else if (playersOnBench.has(player.id)) {
          // Bench = no change
        } else if (!injuredIds.has(player.id)) {
          change -= 1; // Healthy but not selected
        }
        
        // MOTM bonus
        if (motmPlayers.has(player.id)) {
          change += 2;
        }
        
        // Transfer listed penalty
        if (transferListedIds.has(player.id)) {
          change -= 1;
        }
        
        // Apply with clamping (1-5)
        const newMorale = Math.max(1, Math.min(5, currentMorale + change));
        
        if (newMorale !== currentMorale) {
          moraleUpdates.push({ id: player.id, morale: newMorale });
          
          if (newMorale === 1 && currentMorale > 1) {
            moraleNotifications.push({
              team_id: player.team_id,
              type: 'morale_angry' as any,
              title: '😠 Player Unhappy',
              message: `${player.first_name} ${player.last_name} is angry and considering their future.`,
              player_id: player.id
            });
          } else if (newMorale === 5 && currentMorale < 5) {
            moraleNotifications.push({
              team_id: player.team_id,
              type: 'morale_ecstatic' as any,
              title: '🎉 Player Thriving',
              message: `${player.first_name} ${player.last_name} is loving life at the club!`,
              player_id: player.id
            });
          }
        }
      }
      
      // Batch update
      if (moraleUpdates.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < moraleUpdates.length; i += chunkSize) {
          const chunk = moraleUpdates.slice(i, i + chunkSize);
          await Promise.all(
            chunk.map(u => supabase.from('players').update({ morale: u.morale }).eq('id', u.id))
          );
        }
      }
      
      if (moraleNotifications.length > 0) {
        await supabase.from('notifications').insert(moraleNotifications);
      }
      
      const improved = moraleUpdates.filter(u => u.morale > (playersMap[u.id]?.morale || 3)).length;
      logs.push(`😊 Morale: ${improved} up, ${moraleUpdates.length - improved} down`);
      
    } catch (moraleError) {
      logs.push(`😊 Morale error (non-fatal): ${moraleError}`);
    }
    
    // ===========================================
    // PHASE 4.5: PROCESS FINANCES
    // ===========================================
    // Every cron: Match revenue, bonuses, contract countdown
    // Sundays only: Wages, grants, facility upkeep
    
    if (ENABLE_FINANCES) {
      try {
        const today = new Date();
        const isSunday = today.getUTCDay() === 0;
        
        // Reset weekly transfer counts on Sunday
        if (isSunday) {
          await supabase.from('teams').update({ weekly_transfers_used: 0 }).gte('weekly_transfers_used', 0);
          logs.push(`🔄 Weekly transfer counts reset`);
          
          // ===========================================
          // SUNDAY: INTERNATIONAL FREE AGENT INJECTION
          // ===========================================
          try {
            const numNewPlayers = Math.random() < 0.5 ? 1 : 2; // 1-2 players
            const internationalNotifications: Notification[] = [];
            
            for (let i = 0; i < numNewPlayers; i++) {
              // Generate international player
              const NATIONALITIES = ['ENG', 'NZL', 'FIJ', 'TON', 'SAM', 'PNG'];
              const POSITIONS = ['Prop', 'Hooker', 'Second Row', 'Lock', 'Halfback', 'Five-Eighth', 'Centre', 'Winger', 'Fullback'];
              const NAMES: Record<string, { first: string[], last: string[] }> = {
                ENG: { first: ['Jack', 'Tom', 'Harry', 'George', 'Charlie', 'Sam', 'Joe', 'Ben'], last: ['Smith', 'Jones', 'Williams', 'Taylor', 'Brown', 'Davies', 'Wilson', 'Evans'] },
                NZL: { first: ['Tane', 'Nikau', 'Manu', 'Josh', 'Shaun', 'Joseph', 'Dylan', 'Brandon'], last: ['Manu', 'Williams', 'Harris', 'Hughes', 'Smith', 'Johnson', 'Hurrell', 'Hiku'] },
                TON: { first: ['Jason', 'Tevita', 'Sione', 'Manu', 'Daniel', 'David', 'Junior', 'Ata'], last: ['Taumalolo', 'Fifita', 'Kaufusi', 'Pangai', 'Fonua', 'Tupou', 'Haas', 'Vea'] },
                SAM: { first: ['Jarome', 'Brian', 'Junior', 'Anthony', 'Josh', 'Spencer', 'Joseph', 'Manu'], last: ['Luai', "To'o", 'Papalii', 'Aloiai', 'Leilua', 'Tago', 'Paulo', 'Leota'] },
                FIJ: { first: ['Maika', 'Suliasi', 'Viliame', 'Semi', 'Kevin', 'Mikaele', 'Henry', 'Pio'], last: ['Sivo', 'Vunivalu', 'Naiqama', 'Koroibete', 'Radradra', 'Koroisau', 'Tuisova', 'Yato'] },
                PNG: { first: ['David', 'James', 'Michael', 'John', 'Justin', 'Alex', 'Marcus', 'Xavier'], last: ['Lam', 'Segeyaro', 'Mead', 'Boas', 'Ottio', 'Kila', 'Olam', 'Albert'] }
              };
              
              const nationality = NATIONALITIES[Math.floor(Math.random() * NATIONALITIES.length)];
              const position = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
              const firstName = NAMES[nationality].first[Math.floor(Math.random() * NAMES[nationality].first.length)];
              const lastName = NAMES[nationality].last[Math.floor(Math.random() * NAMES[nationality].last.length)];
              const age = 19 + Math.floor(Math.random() * 5); // 19-23
              
              // Generate stats (OVR 18-28)
              const baseStats = () => 1 + Math.floor(Math.random() * 4); // 1-4
              const stats = {
                speed: baseStats(),
                strength: baseStats(),
                power: baseStats(),
                passing: baseStats(),
                stamina: baseStats(),
                tackling: baseStats(),
                kicking: baseStats(),
              };
              const overall = Object.values(stats).reduce((a, b) => a + b, 0);
              
              // 5% hidden gem chance
              const isHiddenGem = Math.random() < 0.05;
              const trainingAffinity: Record<string, string> = {};
              ['speed', 'strength', 'power', 'passing', 'stamina', 'tackling', 'kicking'].forEach(stat => {
                if (isHiddenGem) {
                  const roll = Math.random();
                  trainingAffinity[stat] = roll < 0.4 ? 'high' : roll < 0.8 ? 'medium' : 'low';
                } else {
                  const roll = Math.random();
                  trainingAffinity[stat] = roll < 0.05 ? 'high' : roll < 0.2 ? 'medium' : roll < 0.5 ? 'low' : 'none';
                }
              });
              
              // Calculate match power
              const POSITION_STATS: Record<string, { primary: string[], secondary: string[] }> = {
                'Prop': { primary: ['strength', 'tackling'], secondary: ['stamina', 'passing'] },
                'Hooker': { primary: ['passing', 'stamina'], secondary: ['tackling', 'speed'] },
                'Second Row': { primary: ['strength', 'tackling'], secondary: ['stamina', 'passing'] },
                'Lock': { primary: ['tackling', 'stamina'], secondary: ['strength', 'passing'] },
                'Halfback': { primary: ['passing', 'kicking'], secondary: ['speed', 'stamina'] },
                'Five-Eighth': { primary: ['passing', 'kicking'], secondary: ['speed', 'tackling'] },
                'Centre': { primary: ['tackling', 'passing'], secondary: ['speed', 'strength'] },
                'Winger': { primary: ['speed', 'passing'], secondary: ['stamina', 'tackling'] },
                'Fullback': { primary: ['speed', 'passing'], secondary: ['kicking', 'tackling'] }
              };
              const posStats = POSITION_STATS[position];
              let matchPower = 0;
              Object.entries(stats).forEach(([stat, value]) => {
                if (posStats.primary.includes(stat)) matchPower += value * 4;
                else if (posStats.secondary.includes(stat)) matchPower += value * 2;
                else matchPower += value;
              });
              
              // Dominant side for sided positions
              let dominantSide = null;
              if (['Winger', 'Centre', 'Second Row'].includes(position)) {
                const sideRoll = Math.random();
                dominantSide = sideRoll < 0.4 ? 'left' : sideRoll < 0.8 ? 'right' : 'both';
              }
              
              // Insert player (no team)
              const { data: newPlayer, error: playerError } = await supabase
                .from('players')
                .insert({
                  team_id: null,
                  first_name: firstName,
                  last_name: lastName,
                  position,
                  age,
                  nationality,
                  state: null,
                  ...stats,
                  overall,
                  match_power: matchPower,
                  goal_kicking: 10 + Math.floor(Math.random() * 40),
                  goal_kick_attempts: 0,
                  goal_kick_successes: 0,
                  fatigue: 0,
                  training_progress: 'NONE',
                  training_affinity: trainingAffinity,
                  dominant_side: dominantSide,
                  retiring_end_of_season: false,
                })
                .select('id, first_name, last_name, position, overall, nationality')
                .single();
              
              if (playerError || !newPlayer) {
                logs.push(`🌏 Error creating international: ${playerError?.message}`);
                continue;
              }
              
              // Add to free agents pool
              await supabase.from('free_agents').insert({
                player_id: newPlayer.id,
                released_by_team_id: null,
                available_round: currentRound,
                claimed: false
              });
              
              // Notify all teams
              const countryNames: Record<string, string> = {
                ENG: 'England', NZL: 'New Zealand', FIJ: 'Fiji', TON: 'Tonga', SAM: 'Samoa', PNG: 'Papua New Guinea'
              };
              
              for (const team of teams) {
                internationalNotifications.push({
                  team_id: team.id,
                  type: 'international_arrival' as any,
                  title: '🌏 International Arrival',
                  message: `${newPlayer.first_name} ${newPlayer.last_name} (${newPlayer.position}, ${newPlayer.overall} OVR) from ${countryNames[newPlayer.nationality]} has entered the free agent pool!`,
                  player_id: newPlayer.id
                });
              }
              
              logs.push(`🌏 International: ${newPlayer.first_name} ${newPlayer.last_name} (${nationality}, ${position}, ${overall} OVR)${isHiddenGem ? ' ⭐ HIDDEN GEM!' : ''}`);
            }
            
            if (internationalNotifications.length > 0) {
              await supabase.from('notifications').insert(internationalNotifications);
            }
          } catch (intlError) {
            logs.push(`🌏 International injection error (non-fatal): ${intlError}`);
          }
        }
        
        logs.push(`💰 Processing finances (Sunday: ${isSunday})...`);
        
        
        // Process team finances (handles Sunday vs non-Sunday internally)
        const financeResults = await processAllTeamFinances(supabase, SEASON, currentRound, isSunday);
        const successCount = financeResults.filter(r => r.success).length;
        logs.push(`💰 Finances: ${successCount}/${financeResults.length} teams processed`);
        
        // AI Contract Renewals - process before countdown so AI teams renew expiring contracts
        const aiRenewalResult = await processAIContractRenewals(supabase, currentRound);
        logs.push(`🤖 AI Renewals: ${aiRenewalResult.renewed} renewed, ${aiRenewalResult.released} releasing`);
        
        // Contract countdown - every cron run
        const contractResult = await processContractCountdown(supabase);
        logs.push(`📝 Contracts: ${contractResult.updated} updated, ${contractResult.expired} expired`);
        
      } catch (financeError) {
        logs.push(`💰 Finance error (non-fatal): ${financeError}`);
        console.error('Finance processing error:', financeError);
      }
    }
    
    // ===========================================
    // PHASE 5: PROCESS FREE AGENTS (Skip on Origin rounds)
    // ===========================================
    
    if (!isOrigin) {
      const { data: freeAgentsWithClaims } = await supabase
        .from('free_agents')
        .select('*, players(*)')
        .eq('claimed', false)
        .lte('available_round', currentRound);
      
      if (freeAgentsWithClaims && freeAgentsWithClaims.length > 0) {
        const freeAgentIds = freeAgentsWithClaims.map(fa => fa.id);
        const { data: allClaims } = await supabase
          .from('free_agent_claims')
          .select('*')
          .in('free_agent_id', freeAgentIds);
        
        const claimsByFreeAgent: Record<string, any[]> = {};
        (allClaims || []).forEach(claim => {
          if (!claimsByFreeAgent[claim.free_agent_id]) {
            claimsByFreeAgent[claim.free_agent_id] = [];
          }
          claimsByFreeAgent[claim.free_agent_id].push(claim);
        });
        
        let freeAgentSignings = 0;
        const freeAgentNotifications: Notification[] = [];
        const playerUpdatesToApply: { id: string; team_id: string | null }[] = [];
        const freeAgentUpdates: string[] = [];
        const newFreeAgents: any[] = [];
        const claimsToDelete: string[] = [];
        
        for (const freeAgent of freeAgentsWithClaims) {
          const claims = claimsByFreeAgent[freeAgent.id] || [];
          if (claims.length === 0) continue;
          
          const player = freeAgent.players;
          if (!player) continue;
          
          const teamScores: { teamId: string; score: number; releasePlayerId: string | null }[] = [];
          
          for (const claim of claims) {
            const claimingTeam = teamsMap[claim.team_id];
            if (!claimingTeam) continue;
            
            const squadSize = (teamRosters[claim.team_id] || []).length;
            if (squadSize >= 25) continue;
            
            let score = (10 - claimingTeam.division) * 5;
            score += (claimingTeam.wins * 2) + claimingTeam.draws;
            score += (25 - squadSize) * 2;
            score += Math.random() * 10;
            
            // AI teams get priority boost when squad is low
            const isAITeam = !coachedTeams.has(claim.team_id);
            if (isAITeam) {
              if (squadSize <= 20) score += 100; // Desperate AI
              else if (squadSize <= 22) score += 50; // Low squad AI
            }
            
            teamScores.push({ teamId: claim.team_id, score, releasePlayerId: claim.release_player_id });
          }
          
          if (teamScores.length === 0) continue;
          
          teamScores.sort((a, b) => b.score - a.score);
          const winner = teamScores[0];
          const winningTeam = teamsMap[winner.teamId];
          
          playerUpdatesToApply.push({ id: player.id, team_id: winner.teamId });
          freeAgentUpdates.push(freeAgent.id);
          claimsToDelete.push(freeAgent.id);
          
          if (winner.releasePlayerId) {
            const releasedPlayer = playersMap[winner.releasePlayerId];
            playerUpdatesToApply.push({ id: winner.releasePlayerId, team_id: null });
            newFreeAgents.push({
              player_id: winner.releasePlayerId,
              released_by_team_id: winner.teamId,
              available_round: currentRound + 1,
              claimed: false
            });
            
            if (releasedPlayer) {
              freeAgentNotifications.push({
                team_id: winner.teamId,
                type: 'player_released' as any,
                title: '👋 Player Released',
                message: `${releasedPlayer.first_name} ${releasedPlayer.last_name} (${releasedPlayer.position}, ${releasedPlayer.overall} OVR) has been released to make room.`,
                player_id: releasedPlayer.id
              });
              
              for (const team of teams) {
                if (team.id !== winner.teamId) {
                  freeAgentNotifications.push({
                    team_id: team.id,
                    type: 'new_free_agent' as any,
                    title: '🏪 New Free Agent',
                    message: `${releasedPlayer.first_name} ${releasedPlayer.last_name} (${releasedPlayer.position}, ${releasedPlayer.overall} OVR) released by ${winningTeam?.name}.`,
                    player_id: releasedPlayer.id
                  });
                }
              }
            }
          }
          
          freeAgentNotifications.push({
            team_id: winner.teamId,
            type: 'free_agent_signed' as any,
            title: '🎉 Free Agent Signed!',
            message: `${player.first_name} ${player.last_name} (${player.position}, ${player.overall} OVR) has joined your squad!`,
            player_id: player.id
          });
          
          for (const team of teams) {
            if (team.id !== winner.teamId) {
              freeAgentNotifications.push({
                team_id: team.id,
                type: 'free_agent_announcement' as any,
                title: '📋 Free Agent Signed',
                message: `${player.first_name} ${player.last_name} (${player.position}, ${player.overall} OVR) signed with ${winningTeam?.name}.`,
                player_id: player.id
              });
            }
          }
          
          freeAgentSignings++;
          logs.push(`Free Agent: ${player.first_name} ${player.last_name} → ${winningTeam?.name}`);
        }
        
        await Promise.all([
          ...playerUpdatesToApply.map(p => 
            supabase.from('players').update({ team_id: p.team_id }).eq('id', p.id)
          ),
          freeAgentUpdates.length > 0
            ? supabase.from('free_agents').update({ claimed: true }).in('id', freeAgentUpdates)
            : Promise.resolve(),
          newFreeAgents.length > 0
            ? supabase.from('free_agents').insert(newFreeAgents)
            : Promise.resolve(),
          claimsToDelete.length > 0
            ? supabase.from('free_agent_claims').delete().in('free_agent_id', claimsToDelete)
            : Promise.resolve(),
          freeAgentNotifications.length > 0
            ? supabase.from('notifications').insert(freeAgentNotifications)
            : Promise.resolve(),
        ]);
        
        logs.push(`Free Agents: ${freeAgentSignings} signed`);
      }
    }
    
    // ===========================================
    // DONE
    // ===========================================
    
    const totalTime = Date.now() - startTime;
    logs.push(`Total execution: ${totalTime}ms`);
    
    return NextResponse.json({
      success: true,
      round: currentRound,
      matches: isOrigin ? 1 : roundFixtures.length,
      isOriginRound: isOrigin,
      logs,
      improvements: improvementCount,
      playersLoaded: allPlayers.length,
      executionTime: totalTime
    });
    
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error),
      executionTime: Date.now() - startTime
    }, { status: 500 });
  }
}
