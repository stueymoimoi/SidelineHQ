/**
 * SidelineHQ Player Stats Generation
 * Pure functions for generating match statistics
 * 
 * UPDATED: Feb 14, 2026
 * - Removed random LB/TB chances
 * - Line breaks now ONLY from: tries (85%), assists (35%), high metres bonus
 * - Tackle breaks now ONLY from: metres-based carries, tries (50-60%)
 * - No more random outliers like 4 LB from 69m
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
 * Get missed tackle chance based on tackling stat (0-7 scale)
 */
export function getMissChance(tacklingStat: number): number {
  for (const threshold of MISS_CHANCE_THRESHOLDS) {
    if (tacklingStat >= threshold.min) {
      return threshold.chance;
    }
  }
  return 0.12;
}

/**
 * Get error chance based on passing stat (0-7 scale)
 */
export function getErrorChance(passingStat: number): number {
  for (const threshold of ERROR_CHANCE_THRESHOLDS) {
    if (passingStat >= threshold.min) {
      return threshold.chance;
    }
  }
  return 0.05;
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
// STAT CALCULATIONS (Recalibrated for 0-7)
// ===========================================

/** Midpoint of 0-7 scale */
const STAT_MID = 3.5;

/**
 * Calculate metres gained
 * Speed 0 → ~-14m penalty, Speed 7 → ~+14m bonus
 * Power follows same pattern with slightly less impact
 */
export function calculateMetres(
  player: Pick<Player, 'speed' | 'power'>,
  config: PositionConfig,
  minutesFactor: number
): number {
  const speedBonus = ((player.speed ?? 3) - STAT_MID) * 4;
  const powerBonus = ((player.power ?? 3) - STAT_MID) * 3;
  const variance = 0.75 + Math.random() * 0.5;

  return Math.max(0, Math.round(
    (config.metresBase + speedBonus + powerBonus) * minutesFactor * variance
  ));
}

/**
 * Calculate tackles made
 * Stamina 0 → ~-5 tackles, Stamina 7 → ~+5 tackles
 */
export function calculateTackles(
  player: Pick<Player, 'stamina'>,
  config: PositionConfig,
  minutesFactor: number
): number {
  const staminaBonus = ((player.stamina ?? 3) - STAT_MID) * 1.5;
  const variance = 0.8 + Math.random() * 0.4;

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
  const missChance = getMissChance(player.tackling ?? 3);
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
  const errorChance = getErrorChance(player.passing ?? 3);
  const touches = Math.round(config.touchesBase * minutesFactor);

  let errors = 0;
  for (let i = 0; i < touches; i++) {
    if (Math.random() < errorChance) errors++;
  }

  return errors;
}

/**
 * Calculate line breaks — EVENT-DRIVEN ONLY
 *
 * Derived from what actually happened:
 * 1. Try scorers almost always broke the line (85% per try)
 * 2. Try assisters sometimes broke the line (35%)
 * 3. High-metre backs get bonus LBs (kick returns, outside breaks)
 *
 * NO random chance for low-metre players.
 * Real NRL: Backs 0-3 avg, Forwards 0-1 avg, Elite 3-5
 */
export function calculateLineBreaks(
  player: Pick<Player, 'speed' | 'power'>,
  jerseyNumber: number,
  metres: number,
  tries: number,
  tryAssists: number
): number {
  let lineBreaks = 0;

  // 1. Try scorers broke the line (85% chance per try)
  for (let i = 0; i < tries; i++) {
    if (Math.random() < 0.85) lineBreaks++;
  }

  // 2. Try assisters sometimes broke the line (35% chance per assist)
  for (let i = 0; i < tryAssists; i++) {
    if (Math.random() < 0.35) lineBreaks++;
  }

  // 3. High-metre bonus — players who ran a lot probably broke the line
  const metreThreshold = isBack(jerseyNumber) ? 140 : 180;
  if (metres > metreThreshold) {
    const excessMetres = metres - metreThreshold;
    const bonusChances = Math.floor(excessMetres / 40) + 1;
    const speed = player.speed ?? 3;
    const lbChance = 0.15 + (speed / 7) * 0.35;

    for (let i = 0; i < bonusChances; i++) {
      if (Math.random() < lbChance) lineBreaks++;
    }
  }

  return lineBreaks;
}

/**
 * Calculate tackle breaks — EVENT-DRIVEN ONLY
 *
 * Derived from metres gained + physical dominance:
 * 1. Metres-based: more carries = more chances to bust tackles
 *    - Backs run at smaller defenders so break MORE often per carry
 *    - Forwards run at bigger defenders but carry more often
 * 2. Try scorers often busted a tackle on the try run
 *
 * NO random power bonus.
 * Real NRL: Backs 0-8 (big metre games), Forwards 2-6 avg, Elite 8-10
 */
export function calculateTackleBreaks(
  player: Pick<Player, 'power' | 'strength' | 'speed'>,
  jerseyNumber: number,
  metres: number,
  tries: number
): number {
  let tackleBreaks = 0;

  const power = player.power ?? 3;
  const strength = player.strength ?? 3;

  // 1. Metres-based tackle breaks
  //    breakRate: how often a carry busts through
  //    - Backs: higher break rate (smaller defenders) but fewer carries per metre
  //    - Forwards: lower break rate (bigger defenders) but carry more often
  //
  //    Back breakRate:  stats 0+0 = 8%, stats 7+7 = 28% — powerful backs dominate
  //    Fwd breakRate:   stats 0+0 = 5%, stats 7+7 = 22.5%
  const isBackPlayer = isBack(jerseyNumber) || jerseyNumber === 7; // halfbacks run at backs too      

  const breakRate = isBackPlayer
    ? 0.08 + ((power + strength) / 14) * 0.20   // Backs: 8%-28% per carry
    : 0.05 + ((power + strength) / 14) * 0.175; // Forwards: 5%-22.5% per carry

  // Backs take longer runs (fewer discrete carries), forwards take short hitups
  const metresPerCarry = isBackPlayer ? 10 : 8;
  const carries = Math.max(1, Math.floor(metres / metresPerCarry));

  for (let i = 0; i < carries; i++) {
    if (Math.random() < breakRate) tackleBreaks++;
  }

  // 2. Try scorers often busted a tackle on the try run
  const tryBreakChance = isForward(jerseyNumber) ? 0.60 : 0.50;
  for (let i = 0; i < tries; i++) {
    if (Math.random() < tryBreakChance) tackleBreaks++;
  }

  return tackleBreaks;
}

// ===========================================
// MAIN STAT GENERATION
// ===========================================

/**
 * Base stats that don't depend on try distribution.
 * Called BEFORE tries are distributed.
 */
export interface BaseStats {
  metres: number;
  tackles: number;
  missedTackles: number;
  errors: number;
}

/**
 * Generate base match stats for a player (metres, tackles, missed tackles, errors).
 * Line breaks and tackle breaks are calculated separately after try distribution.
 */
export function generateBaseStats(
  player: Pick<Player, 'speed' | 'strength' | 'power' | 'passing' | 'stamina' | 'tackling'>,
  jerseyNumber: number,
  minutes: number
): BaseStats {
  if (minutes === 0) {
    return { metres: 0, tackles: 0, missedTackles: 0, errors: 0 };
  }

  const config = getPositionConfig(jerseyNumber);
  const minutesFactor = minutes / 80;

  const metres = calculateMetres(player, config, minutesFactor);
  const tackles = calculateTackles(player, config, minutesFactor);
  const missedTackles = calculateMissedTackles(player, tackles);
  const errors = calculateErrors(player, config, minutesFactor);

  return { metres, tackles, missedTackles, errors };
}

/**
 * Generate line breaks and tackle breaks AFTER try distribution is known.
 */
export function generateEventDrivenStats(
  player: Pick<Player, 'speed' | 'power' | 'strength'>,
  jerseyNumber: number,
  metres: number,
  tries: number,
  tryAssists: number
): { lineBreaks: number; tackleBreaks: number } {
  const lineBreaks = calculateLineBreaks(player, jerseyNumber, metres, tries, tryAssists);
  const tackleBreaks = calculateTackleBreaks(player, jerseyNumber, metres, tries);

  return { lineBreaks, tackleBreaks };
}

/**
 * LEGACY: Generate all match stats in one call (kept for backward compatibility).
 * Calculates LB/TB without try info so they'll be lower.
 * Prefer generateBaseStats + generateEventDrivenStats separately.
 */
export function generatePlayerStats(
  player: Pick<Player, 'speed' | 'strength' | 'power' | 'passing' | 'stamina' | 'tackling'>,
  jerseyNumber: number,
  minutes: number
): GeneratedStats {
  if (minutes === 0) {
    return {
      metres: 0, tackles: 0, missedTackles: 0,
      errors: 0, lineBreaks: 0, tackleBreaks: 0
    };
  }

  const base = generateBaseStats(player, jerseyNumber, minutes);
  const eventStats = generateEventDrivenStats(player, jerseyNumber, base.metres, 0, 0);

  return {
    ...base,
    lineBreaks: eventStats.lineBreaks,
    tackleBreaks: eventStats.tackleBreaks
  };
}