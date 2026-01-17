/**
 * SidelineHQ Origin Match Simulation
 * 
 * Simulates State of Origin matches using the same engine as club matches.
 * Generates player stats, determines MOTM, calculates fatigue.
 */

import type { Player } from '@/lib/game-engine/types';
import type { OriginSquad } from './selection';

import { generatePlayerStats } from '@/lib/game-engine/player-stats';
import { calculatePlayerRating } from '@/lib/game-engine/ratings';
import { calculateMotmInfluence, buildMotmReason } from '@/lib/game-engine/motm';
import { calculateTries, calculateKickingStats, calculateScore, distributeTries } from '@/lib/game-engine/scoring';
import {
  HOME_ADVANTAGE,
  FATIGUE_PER_MATCH,
  MINUTES_BY_JERSEY,
  MOTM_MIN_RATING,
  POSITION_FIELDS,
} from '@/lib/game-engine/constants';

// ============================================
// TYPES
// ============================================

export interface OriginPlayerStatRecord {
  origin_fixture_id: string;
  player_id: string;
  team: 'NSW' | 'QLD';
  jersey_number: number;
  player_name: string;
  ovr: number;
  points: number;
  tries: number;
  try_assists: number;
  goals_made: number;
  goals_attempted: number;
  metres: number;
  tackles: number;
  missed_tackles: number;
  errors: number;
  line_breaks: number;
  tackle_breaks: number;
  minutes_played: number;
  rating: number;
}

export interface OriginMatchResult {
  homeTeam: 'NSW' | 'QLD';
  awayTeam: 'NSW' | 'QLD';
  homeScore: number;
  awayScore: number;
  winner: 'NSW' | 'QLD' | null;  // null = draw
  homeStats: OriginPlayerStatRecord[];
  awayStats: OriginPlayerStatRecord[];
  motmPlayerId: string | null;
  motmTeam: 'NSW' | 'QLD' | null;
  motmReason: string;
  fatigueUpdates: Record<string, number>;  // playerId -> new fatigue value
}

// ============================================
// INTERNAL TYPES
// ============================================

interface StatWithMotm extends OriginPlayerStatRecord {
  _motm_influence: number;
}

// ============================================
// MAIN SIMULATION FUNCTION
// ============================================

/**
 * Simulate an Origin match between two squads
 * 
 * @param homeSquad - Home team Origin squad
 * @param awaySquad - Away team Origin squad
 * @param fixtureId - Origin fixture UUID
 * @param playersMap - Map of player ID to Player object
 * @returns Complete match result with stats
 */
export function simulateOriginMatch(
  homeSquad: OriginSquad,
  awaySquad: OriginSquad,
  fixtureId: string,
  playersMap: Record<string, Player>
): OriginMatchResult {
  
  // === Calculate Team Strengths ===
  const homeStarters = homeSquad.players.filter(p => p.jerseyNumber <= 13);
  const awayStarters = awaySquad.players.filter(p => p.jerseyNumber <= 13);
  
  const homeBaseStrength = homeStarters.reduce(
    (sum, p) => sum + (p.player.match_power || p.player.overall || 50), 0
  ) / Math.max(homeStarters.length, 1);
  
  const awayBaseStrength = awayStarters.reduce(
    (sum, p) => sum + (p.player.match_power || p.player.overall || 50), 0
  ) / Math.max(awayStarters.length, 1);
  
  // Apply home advantage
  const homeStrength = homeBaseStrength + HOME_ADVANTAGE;
  const awayStrength = awayBaseStrength;
  
  // === Calculate Scoring ===
  const { homeTries, awayTries } = calculateTries(homeStrength, awayStrength);
  
  const homeKickingStat = homeSquad.goalKicker?.kicking || 60;
  const awayKickingStat = awaySquad.goalKicker?.kicking || 60;
  
  const homeKicking = calculateKickingStats(homeTries, homeKickingStat);
  const awayKicking = calculateKickingStats(awayTries, awayKickingStat);
  
  const homeScore = calculateScore(homeTries, homeKicking.conversions, homeKicking.penalties);
  const awayScore = calculateScore(awayTries, awayKicking.conversions, awayKicking.penalties);
  
  // === Build Tactics Objects for Try Distribution ===
  const homeTactics: Record<string, string> = {};
  const awayTactics: Record<string, string> = {};
  
  homeSquad.players.forEach(p => {
    const field = POSITION_FIELDS[p.jerseyNumber - 1];
    if (field) homeTactics[field] = p.player.id;
  });
  
  awaySquad.players.forEach(p => {
    const field = POSITION_FIELDS[p.jerseyNumber - 1];
    if (field) awayTactics[field] = p.player.id;
  });
  
  homeTactics.goal_kicker = homeSquad.goalKicker?.id || '';
  awayTactics.goal_kicker = awaySquad.goalKicker?.id || '';
  
  // Distribute tries among players
  const homeTryDist = distributeTries(playersMap, homeTries, homeTactics as any);
  const awayTryDist = distributeTries(playersMap, awayTries, awayTactics as any);
  
  // === Game Context ===
  const totalPoints = homeScore + awayScore;
  const margin = Math.abs(homeScore - awayScore);
  const homeWon = homeScore > awayScore;
  const awayWon = awayScore > homeScore;
  
  // === Generate Player Stats ===
  const homeStats: StatWithMotm[] = [];
  const awayStats: StatWithMotm[] = [];
  const fatigueUpdates: Record<string, number> = {};
  
  // Home team stats
  for (const selection of homeSquad.players) {
    const player = selection.player;
    const minutes = MINUTES_BY_JERSEY[selection.jerseyNumber] ?? 0;
    const baseStats = generatePlayerStats(player, selection.jerseyNumber, minutes);
    
    const tries = homeTryDist.tryScorers[player.id] || 0;
    const tryAssists = homeTryDist.tryAssisters[player.id] || 0;
    const isKicker = homeSquad.goalKicker?.id === player.id;
    const goals = isKicker ? homeKicking.conversions + homeKicking.penalties : 0;
    const points = (tries * 4) + (goals * 2);
    
    const fullStats = { ...baseStats, tries, tryAssists, goals };
    const rating = calculatePlayerRating(fullStats, selection.jerseyNumber, false, selection.isCaptain);
    const motmInfluence = calculateMotmInfluence(
      fullStats,
      selection.jerseyNumber,
      { totalPoints, margin, teamWon: homeWon },
      selection.isCaptain
    );
    
    homeStats.push({
      origin_fixture_id: fixtureId,
      player_id: player.id,
      team: homeSquad.team,
      jersey_number: selection.jerseyNumber,
      player_name: `${player.first_name.charAt(0)}. ${player.last_name}`,
      ovr: player.overall,
      points,
      tries,
      try_assists: tryAssists,
      goals_made: goals,
      goals_attempted: isKicker ? homeTries + (homeKicking.penalties > 0 ? 1 : 0) : 0,
      metres: baseStats.metres,
      tackles: baseStats.tackles,
      missed_tackles: baseStats.missedTackles,
      errors: baseStats.errors,
      line_breaks: baseStats.lineBreaks,
      tackle_breaks: baseStats.tackleBreaks,
      minutes_played: minutes,
      rating,
      _motm_influence: motmInfluence
    });
    
    // Calculate fatigue
    const currentFatigue = player.fatigue || 0;
    fatigueUpdates[player.id] = Math.min(100, currentFatigue + FATIGUE_PER_MATCH);
  }
  
  // Away team stats
  for (const selection of awaySquad.players) {
    const player = selection.player;
    const minutes = MINUTES_BY_JERSEY[selection.jerseyNumber] ?? 0;
    const baseStats = generatePlayerStats(player, selection.jerseyNumber, minutes);
    
    const tries = awayTryDist.tryScorers[player.id] || 0;
    const tryAssists = awayTryDist.tryAssisters[player.id] || 0;
    const isKicker = awaySquad.goalKicker?.id === player.id;
    const goals = isKicker ? awayKicking.conversions + awayKicking.penalties : 0;
    const points = (tries * 4) + (goals * 2);
    
    const fullStats = { ...baseStats, tries, tryAssists, goals };
    const rating = calculatePlayerRating(fullStats, selection.jerseyNumber, false, selection.isCaptain);
    const motmInfluence = calculateMotmInfluence(
      fullStats,
      selection.jerseyNumber,
      { totalPoints, margin, teamWon: awayWon },
      selection.isCaptain
    );
    
    awayStats.push({
      origin_fixture_id: fixtureId,
      player_id: player.id,
      team: awaySquad.team,
      jersey_number: selection.jerseyNumber,
      player_name: `${player.first_name.charAt(0)}. ${player.last_name}`,
      ovr: player.overall,
      points,
      tries,
      try_assists: tryAssists,
      goals_made: goals,
      goals_attempted: isKicker ? awayTries + (awayKicking.penalties > 0 ? 1 : 0) : 0,
      metres: baseStats.metres,
      tackles: baseStats.tackles,
      missed_tackles: baseStats.missedTackles,
      errors: baseStats.errors,
      line_breaks: baseStats.lineBreaks,
      tackle_breaks: baseStats.tackleBreaks,
      minutes_played: minutes,
      rating,
      _motm_influence: motmInfluence
    });
    
    const currentFatigue = player.fatigue || 0;
    fatigueUpdates[player.id] = Math.min(100, currentFatigue + FATIGUE_PER_MATCH);
  }
  
  // === Determine MOTM ===
  const allStats = [...homeStats, ...awayStats];
  let motmStat: StatWithMotm | null = null;
  let motmInfluenceScore = -Infinity;
  
  for (const stat of allStats) {
    if (stat._motm_influence > motmInfluenceScore) {
      motmInfluenceScore = stat._motm_influence;
      motmStat = stat;
    }
  }
  
  // Boost MOTM rating to minimum
  if (motmStat) {
    motmStat.rating = Math.max(MOTM_MIN_RATING, motmStat.rating);
  }
  
  // Build MOTM reason
  const motmReason = motmStat ? buildMotmReason({
    tries: motmStat.tries,
    tryAssists: motmStat.try_assists,
    goals: motmStat.goals_made,
    metres: motmStat.metres,
    tackles: motmStat.tackles,
    missedTackles: motmStat.missed_tackles,
    errors: motmStat.errors,
    lineBreaks: motmStat.line_breaks,
    tackleBreaks: motmStat.tackle_breaks
  }) : '';
  
  // === Clean Stats (remove internal fields) ===
  const cleanHomeStats: OriginPlayerStatRecord[] = homeStats.map(
    ({ _motm_influence, ...rest }) => rest
  );
  const cleanAwayStats: OriginPlayerStatRecord[] = awayStats.map(
    ({ _motm_influence, ...rest }) => rest
  );
  
  // === Determine Winner ===
  let winner: 'NSW' | 'QLD' | null = null;
  if (homeScore > awayScore) {
    winner = homeSquad.team;
  } else if (awayScore > homeScore) {
    winner = awaySquad.team;
  }
  
  return {
    homeTeam: homeSquad.team,
    awayTeam: awaySquad.team,
    homeScore,
    awayScore,
    winner,
    homeStats: cleanHomeStats,
    awayStats: cleanAwayStats,
    motmPlayerId: motmStat?.player_id || null,
    motmTeam: motmStat?.team || null,
    motmReason,
    fatigueUpdates
  };
}
