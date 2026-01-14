/**
 * SidelineHQ Scoring System
 * Try distribution and conversion calculations
 */

import type { Player, TeamTactics, TryDistribution } from './types';
import {
  BASE_TRIES,
  POSITION_FIELDS,
  TRY_SCORER_WEIGHTS,
  TRY_ASSISTER_WEIGHTS
} from './constants';

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Roll a percentage chance
 * @param pct - Percentage chance (0-100)
 * @returns true if roll succeeds
 */
export function rollChance(pct: number): boolean {
  return Math.random() * 100 < pct;
}

// ===========================================
// TRY CALCULATIONS
// ===========================================

/**
 * Calculate number of tries for each team based on strength differential
 * 
 * @param homeStrength - Home team's calculated strength
 * @param awayStrength - Away team's calculated strength
 * @returns Object with home and away tries
 */
export function calculateTries(
  homeStrength: number,
  awayStrength: number
): { homeTries: number; awayTries: number } {
  const strengthDiff = homeStrength - awayStrength;
  
  const homeTries = Math.max(0, Math.round(
    BASE_TRIES + (strengthDiff / 10) + (Math.random() - 0.5) * 3
  ));
  
  const awayTries = Math.max(0, Math.round(
    BASE_TRIES - (strengthDiff / 10) + (Math.random() - 0.5) * 3
  ));

  return { homeTries, awayTries };
}

/**
 * Calculate conversions and penalties
 * 
 * @param tries - Number of tries to convert
 * @param kickerAccuracy - Goal kicker's kicking stat (0-100)
 * @returns Object with conversions and penalty goals
 */
export function calculateKickingStats(
  tries: number,
  kickerAccuracy: number
): { conversions: number; penalties: number } {
  let conversions = 0;
  for (let i = 0; i < tries; i++) {
    if (rollChance(kickerAccuracy)) conversions++;
  }

  // Penalty goals (30% chance to attempt, then 30% chance for 2 instead of 1)
  const penalties = rollChance(30) ? (rollChance(30) ? 2 : 1) : 0;

  return { conversions, penalties };
}

/**
 * Calculate final score from tries, conversions, and penalties
 */
export function calculateScore(
  tries: number,
  conversions: number,
  penalties: number
): number {
  return (tries * 4) + (conversions * 2) + (penalties * 2);
}

// ===========================================
// TRY DISTRIBUTION
// ===========================================

/**
 * Distribute tries and assists among players based on position weights
 * 
 * @param players - Map of all players (id -> player)
 * @param totalTries - Number of tries to distribute
 * @param tactics - Team tactics with lineup
 * @returns Object with try scorers and assisters
 * 
 * @example
 * const { tryScorers, tryAssisters } = distributeTries(playersMap, 4, tactics);
 * // tryScorers: { 'player-id-1': 2, 'player-id-2': 1, 'player-id-3': 1 }
 * // tryAssisters: { 'player-id-4': 2, 'player-id-5': 1 }
 */
export function distributeTries(
  players: Record<string, Player>,
  totalTries: number,
  tactics: TeamTactics | Record<string, any>
): TryDistribution {
  const tryScorers: Record<string, number> = {};
  const tryAssisters: Record<string, number> = {};

  // Build weighted pools for scorers and assisters
  const scorerPool: { id: string; weight: number }[] = [];
  const assisterPool: { id: string; weight: number }[] = [];

  POSITION_FIELDS.forEach((field, index) => {
    const playerId = tactics[field];
    if (!playerId) return;

    const player = players[playerId];
    if (!player) return;

    // Speed bonus for try scoring, passing bonus for assists
    const speedBonus = ((player.speed ?? 50) - 50) / 25;
    const passingBonus = ((player.passing ?? 50) - 50) / 25;

    scorerPool.push({
      id: playerId,
      weight: Math.max(1, TRY_SCORER_WEIGHTS[index] + speedBonus)
    });

    assisterPool.push({
      id: playerId,
      weight: Math.max(1, TRY_ASSISTER_WEIGHTS[index] + passingBonus)
    });
  });

  // Distribute each try
  for (let i = 0; i < totalTries; i++) {
    // Pick scorer
    const scorerId = weightedRandomPick(scorerPool);
    if (scorerId) {
      tryScorers[scorerId] = (tryScorers[scorerId] || 0) + 1;
    }

    // Pick assister (80% chance someone gets credit, can't be scorer)
    if (Math.random() < 0.8 && scorerId) {
      const filteredAssisters = assisterPool.filter(a => a.id !== scorerId);
      const assisterId = weightedRandomPick(filteredAssisters);
      if (assisterId) {
        tryAssisters[assisterId] = (tryAssisters[assisterId] || 0) + 1;
      }
    }
  }

  return { tryScorers, tryAssisters };
}

/**
 * Pick a random item from a weighted pool
 */
function weightedRandomPick(pool: { id: string; weight: number }[]): string | null {
  if (pool.length === 0) return null;

  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
  let rand = Math.random() * totalWeight;

  for (const item of pool) {
    rand -= item.weight;
    if (rand <= 0) {
      return item.id;
    }
  }

  return pool[pool.length - 1]?.id ?? null;
}

// ===========================================
// TEAM STRENGTH CALCULATION
// ===========================================

/**
 * Calculate team strength for match simulation
 * 
 * @param startingPlayers - Array of starting 13 players
 * @param homeAdvantage - Home advantage bonus (usually 3)
 * @param tacticalBonus - Bonus from tactical matchup
 * @param coachingBonus - Bonus for having a human coach
 * @returns Final team strength value
 */
export function calculateTeamStrength(
  startingPlayers: Player[],
  homeAdvantage: number = 0,
  tacticalBonus: number = 0,
  coachingBonus: number = 0
): number {
  if (startingPlayers.length === 0) return 30; // Fallback

  const avgOvr = startingPlayers
    .slice(0, 13)
    .reduce((sum, p) => sum + (p.overall ?? 30), 0) / Math.min(13, startingPlayers.length);

  return avgOvr + homeAdvantage + tacticalBonus + coachingBonus;
}