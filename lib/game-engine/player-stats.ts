/**
 * SidelineHQ Player Stats Generation
 * Pure functions for generating match statistics
 */

import type { Player, GeneratedStats, PositionConfig } from './types';
import {
  POSITION_CONFIGS,
  DEFAULT_POSITION_CONFIG,
  BACK_JERSEYS,
  FORWARD_JERSEYS,
  MISS_CHANCE_THRESHOLDS,
  ERROR_CHANCE_THRESHOLDS
} from './constants';

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get position configuration for a jersey number
 */
export function getPositionConfig(jerseyNumber: number): PositionConfig {
  return POSITION_CONFIGS[jerseyNumber] ?? DEFAULT_POSITION_CONFIG;
}

/**
 * Get missed tackle chance based on tackling stat
 */
export function getMissChance(tacklingStat: number): number {
  for (const threshold of MISS_CHANCE_THRESHOLDS) {
    if (tacklingStat >= threshold.min) {
      return threshold.chance;
    }
  }
  return 0.10; // Fallback for very low stats
}

/**
 * Get error chance based on passing stat
 */
export function getErrorChance(passingStat: number): number {
  for (const threshold of ERROR_CHANCE_THRESHOLDS) {
    if (passingStat >= threshold.min) {
      return threshold.chance;
    }
  }
  return 0.05; // Fallback for very low stats
}

/**
 * Check if jersey number is a back
 */
export function isBack(jerseyNumber: number): boolean {
  return (BACK_JERSEYS as readonly number[]).includes(jerseyNumber);
}

/**
 * Check if jersey number is a forward
 */
export function isForward(jerseyNumber: number): boolean {
  return (FORWARD_JERSEYS as readonly number[]).includes(jerseyNumber);
}

// ===========================================
// STAT CALCULATIONS
// ===========================================

/**
 * Calculate metres gained
 */
export function calculateMetres(
  player: Pick<Player, 'speed' | 'power'>,
  config: PositionConfig,
  minutesFactor: number
): number {
  const speedBonus = ((player.speed ?? 50) - 50) / 4;
  const powerBonus = ((player.power ?? 50) - 50) / 5;
  const variance = 0.75 + Math.random() * 0.5; // 0.75 to 1.25
  
  return Math.max(0, Math.round(
    (config.metresBase + speedBonus + powerBonus) * minutesFactor * variance
  ));
}

/**
 * Calculate tackles made
 */
export function calculateTackles(
  player: Pick<Player, 'stamina'>,
  config: PositionConfig,
  minutesFactor: number
): number {
  const staminaBonus = ((player.stamina ?? 50) - 50) / 8;
  const variance = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
  
  return Math.max(0, Math.round(
    (config.tacklesBase + staminaBonus) * minutesFactor * variance
  ));
}

/**
 * Calculate missed tackles
 */
export function calculateMissedTackles(
  player: Pick<Player, 'tackling'>,
  tacklesMade: number
): number {
  const missChance = getMissChance(player.tackling ?? 50);
  const opportunities = tacklesMade + Math.floor(Math.random() * 5);
  
  let missed = 0;
  for (let i = 0; i < opportunities; i++) {
    if (Math.random() < missChance) missed++;
  }
  
  return missed;
}

/**
 * Calculate errors
 */
export function calculateErrors(
  player: Pick<Player, 'passing'>,
  config: PositionConfig,
  minutesFactor: number
): number {
  const errorChance = getErrorChance(player.passing ?? 50);
  const touches = Math.round(config.touchesBase * minutesFactor);
  
  let errors = 0;
  for (let i = 0; i < touches; i++) {
    if (Math.random() < errorChance) errors++;
  }
  
  return errors;
}

/**
 * Calculate line breaks
 * Backs get more opportunities than forwards
 */
export function calculateLineBreaks(
  player: Pick<Player, 'speed' | 'power'>,
  jerseyNumber: number,
  config: PositionConfig,
  minutesFactor: number
): number {
  const lineBreakChance = ((player.speed ?? 50) + (player.power ?? 50) - 80) / 300;
  const touches = Math.round(config.touchesBase * minutesFactor);
  const opportunityRate = isBack(jerseyNumber) ? 0.4 : 0.2;
  const opportunities = Math.floor(touches * opportunityRate);
  
  let lineBreaks = 0;
  for (let i = 0; i < opportunities; i++) {
    if (Math.random() < lineBreakChance) lineBreaks++;
  }
  
  return lineBreaks;
}

/**
 * Calculate tackle breaks
 * Forwards get more opportunities than backs
 */
export function calculateTackleBreaks(
  player: Pick<Player, 'power' | 'strength'>,
  jerseyNumber: number,
  config: PositionConfig,
  minutesFactor: number
): number {
  const tackleBreakChance = ((player.power ?? 50) + (player.strength ?? 50) - 80) / 200;
  const touches = Math.round(config.touchesBase * minutesFactor);
  const opportunityRate = isForward(jerseyNumber) ? 0.5 : 0.3;
  const opportunities = Math.floor(touches * opportunityRate);
  
  let tackleBreaks = 0;
  for (let i = 0; i < opportunities; i++) {
    if (Math.random() < tackleBreakChance) tackleBreaks++;
  }
  
  return tackleBreaks;
}

// ===========================================
// MAIN STAT GENERATION
// ===========================================

/**
 * Generate all match stats for a player
 * 
 * @param player - The player object
 * @param jerseyNumber - Jersey number (1-17)
 * @param minutes - Minutes played (0-80)
 * @returns Generated stats object
 * 
 * @example
 * const stats = generatePlayerStats(player, 1, 80);
 * // { metres: 142, tackles: 6, missedTackles: 1, errors: 0, lineBreaks: 2, tackleBreaks: 1 }
 */
export function generatePlayerStats(
  player: Pick<Player, 'speed' | 'strength' | 'power' | 'passing' | 'stamina' | 'tackling'>,
  jerseyNumber: number,
  minutes: number
): GeneratedStats {
  // No stats if didn't play
  if (minutes === 0) {
    return {
      metres: 0,
      tackles: 0,
      missedTackles: 0,
      errors: 0,
      lineBreaks: 0,
      tackleBreaks: 0
    };
  }

  const config = getPositionConfig(jerseyNumber);
  const minutesFactor = minutes / 80;

  const metres = calculateMetres(player, config, minutesFactor);
  const tackles = calculateTackles(player, config, minutesFactor);
  const missedTackles = calculateMissedTackles(player, tackles);
  const errors = calculateErrors(player, config, minutesFactor);
  const lineBreaks = calculateLineBreaks(player, jerseyNumber, config, minutesFactor);
  const tackleBreaks = calculateTackleBreaks(player, jerseyNumber, config, minutesFactor);

  return {
    metres,
    tackles,
    missedTackles,
    errors,
    lineBreaks,
    tackleBreaks
  };
}