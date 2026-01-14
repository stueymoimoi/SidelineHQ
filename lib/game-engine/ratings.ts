/**
 * SidelineHQ Rating Calculations
 * Pure functions for calculating player match ratings
 */

import type { FullPlayerStats, PositionConfig } from './types';
import { getPositionConfig } from './player-stats';
import {
  BASE_RATING,
  MAX_RATING,
  MIN_RATING,
  MOTM_MIN_RATING,
  RATING_MODIFIERS
} from './constants';

// ===========================================
// RATING CALCULATION
// ===========================================

/**
 * Calculate a player's match rating (1-10 scale)
 * 
 * @param stats - The player's full match stats
 * @param jerseyNumber - Jersey number (1-17) for position context
 * @param isMotm - Whether this player is Man of the Match
 * @param isCaptain - Whether this player is captain
 * @returns Rating between 1 and 10
 * 
 * @example
 * const rating = calculatePlayerRating(stats, 1, false, true);
 * // 7.8
 */
export function calculatePlayerRating(
  stats: FullPlayerStats,
  jerseyNumber: number,
  isMotm: boolean,
  isCaptain: boolean
): number {
  const config = getPositionConfig(jerseyNumber);
  let rating = BASE_RATING;

  // Metres performance relative to position expectation
  const metresRatio = stats.metres / (config.metresBase * 0.7);
  rating += Math.min(1.5, (metresRatio - 1) * 1.2);

  // Tackles performance relative to position expectation
  const tacklesRatio = stats.tackles / (config.tacklesBase * 0.7);
  rating += Math.min(1.0, (tacklesRatio - 1) * 0.8);

  // Positive contributions
  rating += stats.tries * RATING_MODIFIERS.tryBonus;
  rating += stats.tryAssists * RATING_MODIFIERS.tryAssistBonus;
  rating += stats.goals * RATING_MODIFIERS.goalBonus;
  rating += stats.lineBreaks * RATING_MODIFIERS.lineBreakBonus;
  rating += stats.tackleBreaks * RATING_MODIFIERS.tackleBreakBonus;

  // Negative contributions
  rating -= stats.missedTackles * RATING_MODIFIERS.missedTacklePenalty;
  rating -= stats.errors * RATING_MODIFIERS.errorPenalty;

  // Clean sheet bonuses
  if (stats.missedTackles === 0) {
    rating += RATING_MODIFIERS.cleanSheetTackles;
  }
  if (stats.errors === 0) {
    rating += RATING_MODIFIERS.cleanSheetErrors;
  }

  // Captain bonus
  if (isCaptain) {
    rating += RATING_MODIFIERS.captainBonus;
  }

  // MOTM guaranteed minimum
  if (isMotm) {
    rating = Math.max(rating, MOTM_MIN_RATING);
  }

  // Clamp and round to 1 decimal
  return Math.min(MAX_RATING, Math.max(MIN_RATING, Math.round(rating * 10) / 10));
}

/**
 * Get rating color class for display
 * 
 * @param rating - Player rating (1-10)
 * @returns Tailwind color class
 */
export function getRatingColor(rating: number): string {
  if (rating >= 9) return 'text-purple-400';   // Elite
  if (rating >= 8) return 'text-green-400';    // Great
  if (rating >= 7) return 'text-lime-400';     // Good
  if (rating >= 6) return 'text-yellow-400';   // Average
  if (rating >= 5) return 'text-orange-400';   // Below average
  return 'text-red-400';                        // Poor
}

/**
 * Get rating label for display
 * 
 * @param rating - Player rating (1-10)
 * @returns Human-readable label
 */
export function getRatingLabel(rating: number): string {
  if (rating >= 9) return 'Outstanding';
  if (rating >= 8) return 'Excellent';
  if (rating >= 7) return 'Good';
  if (rating >= 6) return 'Average';
  if (rating >= 5) return 'Below Par';
  return 'Poor';
}