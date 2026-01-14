/**
 * SidelineHQ MOTM (Man of the Match) Calculations
 * Context-aware scoring system for determining match MVP
 */

import type { FullPlayerStats, GameContext } from './types';
import { getPositionConfig } from './player-stats';
import { FORWARD_JERSEYS, PLAYMAKER_JERSEYS, OUTSIDE_BACK_JERSEYS } from './constants';

// ===========================================
// HELPER FUNCTIONS
// ===========================================

function isForward(jerseyNumber: number): boolean {
  // Include bench players who could be forwards
  return (FORWARD_JERSEYS as readonly number[]).includes(jerseyNumber) 
    || jerseyNumber >= 14;
}

function isPlaymaker(jerseyNumber: number): boolean {
  return (PLAYMAKER_JERSEYS as readonly number[]).includes(jerseyNumber);
}

function isOutsideBack(jerseyNumber: number): boolean {
  return (OUTSIDE_BACK_JERSEYS as readonly number[]).includes(jerseyNumber);
}

// ===========================================
// MOTM INFLUENCE CALCULATION
// ===========================================

/**
 * Calculate MOTM influence score for a player
 * 
 * This is a context-aware system that weighs contributions differently
 * based on game type (high-scoring vs defensive grind) and position.
 * 
 * @param stats - The player's full match stats
 * @param jerseyNumber - Jersey number (1-17)
 * @param gameContext - Context about the match (points, margin, result)
 * @param isCaptain - Whether this player is captain
 * @returns Influence score (higher = more likely MOTM)
 * 
 * @example
 * const influence = calculateMotmInfluence(stats, 7, { totalPoints: 30, margin: 6, teamWon: true }, false);
 * // 85.5
 */
export function calculateMotmInfluence(
  stats: FullPlayerStats & { tackles: number; metres: number; missedTackles: number; errors: number; lineBreaks: number; tackleBreaks: number },
  jerseyNumber: number,
  gameContext: GameContext,
  isCaptain: boolean
): number {
  const { totalPoints, margin, teamWon } = gameContext;

  // Game type detection
  const isLowScoring = totalPoints < 24;
  const isHighScoring = totalPoints > 44;
  const isCloseGame = margin <= 6;

  // Position type
  const forward = isForward(jerseyNumber);
  const playmaker = isPlaymaker(jerseyNumber);
  const outsideBack = isOutsideBack(jerseyNumber);

  let influence = 0;

  // === TRIES ===
  let tryValue = 30;
  if (isLowScoring) tryValue = 40;           // Tries matter more in tight games
  if (outsideBack) tryValue *= 0.9;          // Expected from outside backs
  if (forward) tryValue *= 1.2;              // Forward tries are impressive
  influence += stats.tries * tryValue;

  // === TRY ASSISTS ===
  let assistValue = 20;
  if (playmaker) assistValue *= 0.9;         // Expected from playmakers
  influence += stats.tryAssists * assistValue;

  // === GOALS ===
  let goalValue = 8;
  if (isCloseGame) goalValue = 18;           // Goals win close games
  influence += stats.goals * goalValue;

  // === METRES ===
  const config = getPositionConfig(jerseyNumber);
  const metresAboveExpected = stats.metres - config.metresBase;
  let metresValue = 0.08;
  if (isLowScoring) metresValue = 0.15;      // Hard yards matter in grinds
  if (forward) metresValue *= 1.3;           // Forward metres are valuable
  if (isHighScoring) metresValue *= 0.6;     // Less important in shootouts
  influence += Math.max(0, metresAboveExpected) * metresValue;

  // === TACKLES ===
  const tacklesAboveExpected = stats.tackles - config.tacklesBase;
  let tackleValue = 0.2;
  if (isLowScoring) tackleValue = 0.4;       // Defense wins tight games
  if (forward) tackleValue *= 1.2;           // Forward tackles expected
  if (isHighScoring) tackleValue *= 0.5;     // Less important in shootouts
  influence += Math.max(0, tacklesAboveExpected) * tackleValue;

  // === LINE BREAKS ===
  influence += stats.lineBreaks * 8;

  // === TACKLE BREAKS ===
  influence += stats.tackleBreaks * 5;

  // === NEGATIVE IMPACT ===
  influence -= stats.errors * 8;
  influence -= stats.missedTackles * 4;

  // === BONUSES ===
  if (stats.errors === 0 && stats.tries > 0) {
    influence += 8;                          // Try + no errors = clinical
  }
  if (stats.missedTackles === 0 && stats.tackles > 30) {
    influence += 10;                         // Tackle machine
  }
  if (teamWon) {
    influence += 5;                          // Being on winning team helps
  }

  // === PLAYMAKER BONUS ===
  if (playmaker && stats.tries > 0 && stats.errors === 0) {
    influence += 12;                         // Complete playmaker performance
  }

  // === CAPTAIN BONUS ===
  if (isCaptain) {
    influence += 3;                          // Leadership edge
    if (teamWon) influence += 2;             // Led team to victory
  }

  return influence;
}

/**
 * Build a human-readable reason for MOTM selection
 * 
 * @param stats - The MOTM player's stats
 * @returns Formatted string describing key contributions
 * 
 * @example
 * buildMotmReason(stats);
 * // "2 tries, 3 assists, 156m"
 */
export function buildMotmReason(
  stats: FullPlayerStats & { metres: number; tackles: number; lineBreaks: number; tackleBreaks: number }
): string {
  const parts: string[] = [];

  if (stats.tries >= 1) {
    parts.push(`${stats.tries} ${stats.tries === 1 ? 'try' : 'tries'}`);
  }
  if (stats.tryAssists >= 1) {
    parts.push(`${stats.tryAssists} ${stats.tryAssists === 1 ? 'assist' : 'assists'}`);
  }
  if (stats.lineBreaks >= 2) {
    parts.push(`${stats.lineBreaks} line breaks`);
  }
  if (stats.tackleBreaks >= 4) {
    parts.push(`${stats.tackleBreaks} tackle breaks`);
  }
  if (stats.metres >= 150) {
    parts.push(`${stats.metres}m`);
  }
  if (stats.tackles >= 40) {
    parts.push(`${stats.tackles} tackles`);
  }
  if (stats.goals >= 3) {
    parts.push(`${stats.goals} goals`);
  }

  if (parts.length === 0) {
    return 'dominant performance';
  }

  return parts.slice(0, 3).join(', ');
}