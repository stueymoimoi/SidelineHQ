/**
 * SidelineHQ Tactical System
 * Rock-paper-scissors style tactical matchups
 */

import type { AttackFocus, DefenseFocus, TacticalBonusResult } from './types';

// ===========================================
// TACTICAL BONUS CALCULATION
// ===========================================

/**
 * Calculate tactical bonus based on attack vs defense matchup
 * 
 * @param attackFocus - The attacking team's tactic
 * @param defenseFocus - The defending team's tactic
 * @returns Bonus value and description
 * 
 * @example
 * calculateTacticalBonus('raid_left', 'shift_right');
 * // { bonus: 10, description: '⬅️ Left raid found space' }
 */
export function calculateTacticalBonus(
  attackFocus: AttackFocus | string,
  defenseFocus: DefenseFocus | string
): TacticalBonusResult {
  // Off the Cuff is high variance - random outcome
  if (attackFocus === 'off_the_cuff') {
    return calculateOffTheCuffBonus();
  }

  // Raid Left matchups
  if (attackFocus === 'raid_left') {
    if (defenseFocus === 'shift_right') {
      return { bonus: 10, description: '⬅️ Left raid found space' };
    }
    if (defenseFocus === 'shift_left') {
      return { bonus: -2, description: '⬅️ Left raid met stacked defense' };
    }
    return { bonus: 3, description: '⬅️ Left raid made ground' };
  }

  // Raid Right matchups
  if (attackFocus === 'raid_right') {
    if (defenseFocus === 'shift_left') {
      return { bonus: 10, description: '➡️ Right raid exploited the edge' };
    }
    if (defenseFocus === 'shift_right') {
      return { bonus: -2, description: '➡️ Right raid was shut down' };
    }
    return { bonus: 3, description: '➡️ Right raid made ground' };
  }

  // Up the Guts matchups
  if (attackFocus === 'up_the_guts') {
    if (defenseFocus === 'brick_wall') {
      return { bonus: -3, description: '💪 Forwards met a brick wall' };
    }
    if (defenseFocus === 'shift_left' || defenseFocus === 'shift_right') {
      return { bonus: 8, description: '💪 Forwards punched through' };
    }
    return { bonus: 2, description: '💪 Forwards made hard yards' };
  }

  // Structured (default) - safe but low bonus
  return { bonus: 1, description: '📋 Structured attack probed for openings' };
}

/**
 * Calculate bonus for Off the Cuff attack style
 * High risk, high reward - random outcome
 */
function calculateOffTheCuffBonus(): TacticalBonusResult {
  const roll = Math.random() * 100;

  if (roll < 40) {
    // 40% chance: Magic happens
    return { bonus: 15, description: '🎲 Off the Cuff magic!' };
  }
  
  if (roll < 75) {
    // 35% chance: Nothing special
    return { bonus: 0, description: '🎲 Off the Cuff: Nothing came off' };
  }
  
  // 25% chance: Backfires
  return { bonus: -10, description: '🎲 Off the Cuff backfired!' };
}

/**
 * Get description of an attack style
 */
export function getAttackDescription(attackFocus: AttackFocus): string {
  const descriptions: Record<AttackFocus, string> = {
    'structured': 'Run set plays, balanced attack',
    'raid_left': 'Target left edge with backs',
    'raid_right': 'Target right edge with backs',
    'up_the_guts': 'Punch through middle with forwards',
    'off_the_cuff': 'High risk, high reward plays'
  };
  return descriptions[attackFocus];
}

/**
 * Get description of a defense style
 */
export function getDefenseDescription(defenseFocus: DefenseFocus): string {
  const descriptions: Record<DefenseFocus, string> = {
    'line_speed': 'Rush up and pressure',
    'shift_left': 'Overload left side coverage',
    'shift_right': 'Overload right side coverage',
    'brick_wall': 'Stack the middle defense'
  };
  return descriptions[defenseFocus];
}