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
        
        const homeKicking = calculateKickingStats(homeTries, homeKicker?.kicking || 60);
        const awayKicking = calculateKickingStats(awayTries, awayKicker?.kicking || 60);
        
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
          logs.push(`  ↳ Injuries: ${matchInjuries.map(i => `${i.playerName} (${i.injuryName})`).join(', ')}`);
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
    // PHASE 3.5: PROCESS INJURY RECOVERIES
    // ===========================================
    
    const { recoveredCount, notifications: recoveryNotifications } = await processInjuryRecoveries(
      supabase,
      currentRound,
      SEASON
    );
    
    if (recoveredCount > 0) {
      await supabase.from('notifications').insert(recoveryNotifications);
      logs.push(`Injuries: ${recoveredCount} player${recoveredCount > 1 ? 's' : ''} recovered`);
    }
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
