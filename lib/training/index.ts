/**
 * SidelineHQ Training System v3.0
 * 
 * Training Points System - Players accumulate points toward stat gains
 * 
 * Features:
 * - Points-based progression (no more RNG stages)
 * - Progress persists when switching stats (frozen, not lost)
 * - Vague progress labels for user feedback
 * - Age-based modifiers (young learn faster)
 * - Hidden training affinities (bonus points)
 * - Stat decline for aging players
 * - Position-specific retirement system
 * - REST only works if player didn't play (Jan 31 update)
 * 
 * @author SidelineHQ
 * @version 3.1
 */

import type { Player, Notification } from '../game-engine/types';
import {
  TRAINABLE_STATS,
  FATIGUE_PER_TRAINING,
  REST_RECOVERY,
  TRAINING_POINT_THRESHOLDS,
  TRAINING_SESSION_QUALITY,
  TRAINING_AGE_MODIFIERS,
  TRAINING_AFFINITY_BONUS,
  getTrainingProgressLabel,
  getAgeBracket,
} from '../game-engine/constants';
import { 
  calculateTraitModifiers, 
  type PlayerTraitData 
} from '../game-engine/traits';

// ===========================================
// CONSTANTS (kept for decline/retirement)
// ===========================================

/** Stat tier names for notifications (0-7 scale) */
const STAT_TIER_NAMES: Record<number, string> = {
  0: 'None',
  1: 'Bad',
  2: 'Poor',
  3: 'OK',
  4: 'Good',
  5: 'Great',
  6: 'Excellent',
  7: 'Elite'
};

/** Position-specific decline and retirement ages */
const POSITION_AGE_CONFIG: Record<string, {
  declineStart: number;
  baseRetire: number;
  retireRange: [number, number];
  primaryDeclineStats: string[];
  declineRate: 'fast' | 'medium' | 'slow';
}> = {
  'Fullback': {
    declineStart: 30,
    baseRetire: 34,
    retireRange: [32, 36],
    primaryDeclineStats: ['speed', 'stamina'],
    declineRate: 'fast'
  },
  'Winger': {
    declineStart: 30,
    baseRetire: 34,
    retireRange: [32, 36],
    primaryDeclineStats: ['speed', 'stamina'],
    declineRate: 'fast'
  },
  'Centre': {
    declineStart: 30,
    baseRetire: 34,
    retireRange: [32, 36],
    primaryDeclineStats: ['speed', 'power'],
    declineRate: 'fast'
  },
  'Five-Eighth': {
    declineStart: 31,
    baseRetire: 35,
    retireRange: [33, 37],
    primaryDeclineStats: ['speed', 'power'],
    declineRate: 'medium'
  },
  'Halfback': {
    declineStart: 32,
    baseRetire: 36,
    retireRange: [34, 38],
    primaryDeclineStats: ['speed', 'stamina'],
    declineRate: 'slow'
  },
  'Prop': {
    declineStart: 31,
    baseRetire: 35,
    retireRange: [33, 37],
    primaryDeclineStats: ['speed', 'stamina'],
    declineRate: 'slow'
  },
  'Hooker': {
    declineStart: 33,
    baseRetire: 36,
    retireRange: [34, 38],
    primaryDeclineStats: ['speed', 'power'],
    declineRate: 'slow'
  },
  'Second Row': {
    declineStart: 30,
    baseRetire: 34,
    retireRange: [32, 36],
    primaryDeclineStats: ['speed', 'stamina'],
    declineRate: 'medium'
  },
  'Lock': {
    declineStart: 30,
    baseRetire: 34,
    retireRange: [32, 36],
    primaryDeclineStats: ['speed', 'power'],
    declineRate: 'medium'
  }
};

/** Durability modifiers for retirement age */
const DURABILITY_MODIFIERS: Record<string, number> = {
  'fragile': -2,
  'normal': 0,
  'durable': 1,
  'ironman': 2
};

/** Position primary stats (protected from "use it or lose it" for young players) */
const POSITION_PRIMARY_STATS: Record<string, string[]> = {
  'Fullback': ['speed', 'passing', 'kicking'],
  'Winger': ['speed', 'power'],
  'Centre': ['speed', 'strength', 'passing'],
  'Five-Eighth': ['passing', 'kicking', 'speed'],
  'Halfback': ['passing', 'kicking'],
  'Prop': ['strength', 'power', 'tackling'],
  'Hooker': ['passing', 'tackling', 'stamina'],
  'Second Row': ['strength', 'power', 'tackling'],
  'Lock': ['tackling', 'stamina', 'strength']
};

/** Physical stats (decline faster for old players) */
const PHYSICAL_STATS = ['speed', 'stamina', 'power', 'strength'];

/** All trainable stat keys (lowercase) */
const ALL_STAT_KEYS = ['speed', 'strength', 'power', 'passing', 'stamina', 'tackling', 'kicking'];

// ===========================================
// TYPES
// ===========================================

export interface TrainingResult {
  playerId: string;
  updates: Partial<Player> & { id?: string };
  improved: boolean;
  declined: boolean;
  restSkipped: boolean;
  notification?: Notification;
}

export interface RetirementCheck {
  playerId: string;
  shouldRetire: boolean;
  retirementAge: number;
  notification?: Notification;
}

export interface AffinityData {
  [stat: string]: 'high' | 'medium';
}

export interface TrainingPointsData {
  [stat: string]: number;
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Roll a percentage chance
 */
function rollChance(percent: number): boolean {
  return Math.random() * 100 < percent;
}

/**
 * Get stat tier name from value (0-7)
 */
function getStatTierName(value: number): string {
  return STAT_TIER_NAMES[Math.max(0, Math.min(7, value))] || 'Unknown';
}

/**
 * Safely get a stat value from a player
 */
function getPlayerStat(player: Player, stat: string): number {
  const key = stat.toLowerCase();
  switch (key) {
    case 'speed': return player.speed ?? 0;
    case 'strength': return player.strength ?? 0;
    case 'power': return player.power ?? 0;
    case 'passing': return player.passing ?? 0;
    case 'stamina': return player.stamina ?? 0;
    case 'tackling': return player.tackling ?? 0;
    case 'kicking': return player.kicking ?? 0;
    default: return 0;
  }
}

/**
 * Calculate overall rating from stats (sum of 7 stats)
 */
function calculateOverall(player: Player, updates: Partial<Player>): number {
  return (
    (updates.speed ?? player.speed ?? 0) +
    (updates.strength ?? player.strength ?? 0) +
    (updates.power ?? player.power ?? 0) +
    (updates.passing ?? player.passing ?? 0) +
    (updates.stamina ?? player.stamina ?? 0) +
    (updates.tackling ?? player.tackling ?? 0) +
    (updates.kicking ?? player.kicking ?? 0)
  );
}

/**
 * Get player's training affinity for a stat
 */
function getAffinity(player: Player, stat: string): 'high' | 'medium' | 'none' {
  const affinity = player.training_affinity as AffinityData | null | undefined;
  if (!affinity) return 'none';
  return affinity[stat.toLowerCase()] || 'none';
}

/**
 * Get player's training points data
 */
function getTrainingPoints(player: Player): TrainingPointsData {
  return (player.training_points as TrainingPointsData) || {};
}

/**
 * Get position config with fallback
 */
function getPositionConfig(position: string) {
  return POSITION_AGE_CONFIG[position] || POSITION_AGE_CONFIG['Lock'];
}

/**
 * Extract trait data from player for modifier calculation
 */
function getPlayerTraitData(player: Player): PlayerTraitData {
  return {
    visibleTrait: (player.visible_trait as PlayerTraitData['visibleTrait']) || null,
    visibleTraitPositive: player.visible_trait_positive ?? null,
    hiddenTrait: (player.hidden_trait as PlayerTraitData['hiddenTrait']) || null,
  };
}

/**
 * Roll for session quality and return points earned
 */
function rollSessionQuality(): { quality: string; points: number } {
  const roll = Math.random() * 100;
  let cumulative = 0;
  
  for (const [quality, config] of Object.entries(TRAINING_SESSION_QUALITY)) {
    cumulative += config.chance;
    if (roll < cumulative) {
      return { quality, points: config.points };
    }
  }
  
  // Fallback to FAIR
  return { quality: 'FAIR', points: TRAINING_SESSION_QUALITY.FAIR.points };
}

// ===========================================
// AFFINITY GENERATION
// ===========================================

/**
 * Generate training affinities for a new player
 */
export function generateTrainingAffinity(position: string): AffinityData {
  const affinity: AffinityData = {};
  const allStats = [...ALL_STAT_KEYS];
  const primaryStats = POSITION_PRIMARY_STATS[position] || [];
  
  const numHigh = Math.random() < 0.5 ? 1 : 2;
  const numMedium = Math.random() < 0.5 ? 1 : 2;
  
  const usedStats: string[] = [];
  
  // Assign HIGH affinities
  for (let i = 0; i < numHigh; i++) {
    let stat: string | undefined;
    
    if (Math.random() < 0.7 && primaryStats.length > 0) {
      const availablePrimary = primaryStats.filter(s => !usedStats.includes(s));
      if (availablePrimary.length > 0) {
        stat = availablePrimary[Math.floor(Math.random() * availablePrimary.length)];
      } else {
        const availableStats = allStats.filter(s => !usedStats.includes(s));
        stat = availableStats[Math.floor(Math.random() * availableStats.length)];
      }
    } else {
      const availableStats = allStats.filter(s => !usedStats.includes(s));
      stat = availableStats[Math.floor(Math.random() * availableStats.length)];
    }
    
    if (stat) {
      affinity[stat] = 'high';
      usedStats.push(stat);
    }
  }
  
  // Assign MEDIUM affinities
  for (let i = 0; i < numMedium; i++) {
    const availableStats = allStats.filter(s => !usedStats.includes(s));
    if (availableStats.length === 0) break;
    
    const stat = availableStats[Math.floor(Math.random() * availableStats.length)];
    affinity[stat] = 'medium';
    usedStats.push(stat);
  }
  
  return affinity;
}

/**
 * Generate durability for a new player
 */
export function generateDurability(): 'fragile' | 'normal' | 'durable' | 'ironman' {
  const roll = Math.random() * 100;
  if (roll < 15) return 'fragile';
  if (roll < 65) return 'normal';
  if (roll < 90) return 'durable';
  return 'ironman';
}

// ===========================================
// TRAINING POINTS PROCESSING (v3.1)
// ===========================================

/**
 * Process training for a single player using Training Points System
 * 
 * @param player - The player to process
 * @param playedThisRound - Whether this player played in the current round's match
 *                          If true and player is on REST, REST benefit is SKIPPED
 */
export function processPlayerTraining(
  player: Player,
  playedThisRound: boolean = false
): TrainingResult {
  const updates: Partial<Player> = {};
  let improved = false;
  let declined = false;
  let restSkipped = false;
  let notification: Notification | undefined;

  const currentTraining = player.current_training;
  const age = player.age || 25;
  const ageBracket = getAgeBracket(age);

  // ===========================================
  // REST MODE - Only works if player didn't play
  // ===========================================
  if (currentTraining === 'Rest') {
    if (playedThisRound) {
      // Player was set to REST but played in the match
      // REST benefit is SKIPPED - they get no recovery bonus
      restSkipped = true;
      // Progress stays frozen, no fatigue change from training
      return { 
        playerId: player.id, 
        updates: {}, 
        improved: false, 
        declined: false, 
        restSkipped 
      };
    } else {
      // Player actually rested - they get full REST recovery
      updates.fatigue = Math.max(0, (player.fatigue || 0) - REST_RECOVERY);
      // Progress stays frozen - no changes to training_points
      return { 
        playerId: player.id, 
        updates, 
        improved: false, 
        declined: false, 
        restSkipped: false 
      };
    }
  }

  // ===========================================
  // NO TRAINING - Check for stat decline only
  // ===========================================
  if (!currentTraining) {
    const declineResult = processStatDecline(player);
    if (declineResult.declined) {
      return { ...declineResult, restSkipped: false };
    }
    return { 
      playerId: player.id, 
      updates: {}, 
      improved: false, 
      declined: false, 
      restSkipped: false 
    };
  }

  // ===========================================
  // ACTIVE TRAINING - Training Points System
  // ===========================================

  // Training adds fatigue
  updates.fatigue = Math.min(100, (player.fatigue || 0) + FATIGUE_PER_TRAINING);

  const statKey = currentTraining.toLowerCase();
  const isTrainableStat = TRAINABLE_STATS.some(s => s.toLowerCase() === statKey);
  
  if (!isTrainableStat) {
    // Invalid training stat, just return with fatigue update
    return { 
      playerId: player.id, 
      updates, 
      improved: false, 
      declined: false, 
      restSkipped: false 
    };
  }

  // Get current training points
  let trainingPoints = getTrainingPoints(player);
  const currentPoints = trainingPoints[statKey] || 0;
  const currentStat = getPlayerStat(player, statKey);
  const MAX_STAT = 7; // 0-7 scale

  // Get threshold for next stat level
  const threshold = TRAINING_POINT_THRESHOLDS[currentStat] || 999;

  // If already at max stat, no training benefit
  if (currentStat >= MAX_STAT) {
    updates.last_training_stat = currentTraining;
    return { 
      playerId: player.id, 
      updates, 
      improved: false, 
      declined: false, 
      restSkipped: false 
    };
  }

  // ===========================================
  // CALCULATE POINTS EARNED THIS SESSION
  // ===========================================

  // Roll session quality
  const session = rollSessionQuality();
  let pointsEarned = session.points;

  // Age modifier
  const ageModifier = TRAINING_AGE_MODIFIERS[ageBracket] || 0;
  pointsEarned += ageModifier;

  // Affinity modifier
  const affinity = getAffinity(player, statKey);
  if (affinity === 'high') {
    pointsEarned += TRAINING_AFFINITY_BONUS.high;
  }

  // Prodigy trait bonus (increases chance of excellent session)
  const traitData = getPlayerTraitData(player);
  const traitMods = calculateTraitModifiers(traitData, {
    isHome: false,
    isFinals: false,
    isOrigin: false,
    currentMargin: 0,
    marginAtHalftime: 0,
    isSecondHalf: false,
    opponentTeamId: '',
  }, {
    previousGameWon: null,
    seasonsAtClub: 1,
    gamesAtClubSinceTransfer: 99,
    isCaptain: false,
    isStarting: true,
    currentFitness: 100 - (player.fatigue || 0),
  });

  // Apply Prodigy bonus as extra point chance
  if (traitMods.trainingMultiplier > 1) {
    const bonusChance = (traitMods.trainingMultiplier - 1) * 100; // e.g., 1.2 = 20%
    if (rollChance(bonusChance)) {
      pointsEarned += 1;
    }
  }

  // Minimum 1 point per session
  pointsEarned = Math.max(1, pointsEarned);

  // ===========================================
  // UPDATE TRAINING POINTS
  // ===========================================

  const newPoints = currentPoints + pointsEarned;
  
  // Update the training points object
  trainingPoints = { ...trainingPoints, [statKey]: newPoints };
  updates.training_points = trainingPoints;
  updates.last_training_stat = currentTraining;

  // ===========================================
  // CHECK FOR STAT IMPROVEMENT
  // ===========================================

  if (newPoints >= threshold) {
    // STAT GAINED!
    const newStat = currentStat + 1;
    
    // Set the updated stat
    (updates as Record<string, unknown>)[statKey] = newStat;
    
    // Reset points for this stat to 0
    trainingPoints = { ...trainingPoints, [statKey]: 0 };
    updates.training_points = trainingPoints;
    
    // Recalculate overall
    const newOverall = calculateOverall(player, updates);
    updates.overall = newOverall;
    improved = true;

    // Create notification
    const statName = currentTraining.charAt(0).toUpperCase() + currentTraining.slice(1);
    const oldTier = getStatTierName(currentStat);
    const newTier = getStatTierName(newStat);
    
    notification = {
      team_id: player.team_id!,
      type: 'player_improvement',
      title: '⬆️ Player Improved!',
      message: `${player.first_name} ${player.last_name}'s ${statName} increased from ${oldTier} to ${newTier} through training! Overall now ${newOverall}.`,
      player_id: player.id
    };
  }

  return { 
    playerId: player.id, 
    updates, 
    improved, 
    declined, 
    notification, 
    restSkipped: false 
  };
}

// ===========================================
// STAT DECLINE PROCESSING
// ===========================================

/**
 * Process stat decline for aging players
 */
export function processStatDecline(player: Player): TrainingResult {
  const updates: Partial<Player> = {};
  let declined = false;
  let notification: Notification | undefined;

  const age = player.age || 25;
  const position = player.position || 'Lock';
  const positionConfig = getPositionConfig(position);
  const currentTraining = player.current_training;

  // ===========================================
  // OLD PLAYER DECLINE (30+)
  // ===========================================
  if (age >= positionConfig.declineStart) {
    const yearsOverDecline = age - positionConfig.declineStart;
    
    let baseDeclineChance: number;
    if (yearsOverDecline <= 1) baseDeclineChance = 2;
    else if (yearsOverDecline <= 3) baseDeclineChance = 4;
    else if (yearsOverDecline <= 5) baseDeclineChance = 7;
    else baseDeclineChance = 10;

    for (const stat of ALL_STAT_KEYS) {
      if (currentTraining && currentTraining.toLowerCase() === stat) continue;
      
      const isPhysical = PHYSICAL_STATS.includes(stat);
      const isPrimaryDecline = positionConfig.primaryDeclineStats.includes(stat);
      
      let declineChance = baseDeclineChance;
      if (isPhysical) declineChance *= 1.5;
      if (isPrimaryDecline) declineChance *= 1.25;
      
      if (positionConfig.declineRate === 'fast') declineChance *= 1.2;
      else if (positionConfig.declineRate === 'slow') declineChance *= 0.8;

      if (rollChance(declineChance)) {
        const currentStat = getPlayerStat(player, stat);
        
        if (currentStat > 0) {
          const drop = Math.random() < 0.9 ? 1 : 2;
          const newStat = Math.max(0, currentStat - drop);
          
          if (newStat < currentStat) {
            (updates as Record<string, unknown>)[stat] = newStat;
            declined = true;

            if (!notification) {
              const statName = stat.charAt(0).toUpperCase() + stat.slice(1);
              const oldTier = getStatTierName(currentStat);
              const newTier = getStatTierName(newStat);
              
              notification = {
                team_id: player.team_id!,
                type: 'player_decline',
                title: '⬇️ Player Declining',
                message: `${player.first_name} ${player.last_name} (${age}) is showing signs of age. ${statName} dropped from ${oldTier} to ${newTier}.`,
                player_id: player.id
              };
            }
          }
        }
      }
    }
  }

  // ===========================================
  // YOUNG PLAYER "USE IT OR LOSE IT" (18-25)
  // ===========================================
  if (age >= 18 && age <= 25 && !declined) {
    const primaryStats = POSITION_PRIMARY_STATS[position] || [];
    const useItOrLoseItChance = age <= 21 ? 0.5 : 1;
    
    for (const stat of ALL_STAT_KEYS) {
      if (primaryStats.includes(stat)) continue;
      if (currentTraining && currentTraining.toLowerCase() === stat) continue;
      
      const currentStat = getPlayerStat(player, stat);
      if (currentStat > 4) continue;
      
      if (rollChance(useItOrLoseItChance)) {
        const newStat = Math.max(0, currentStat - 1);
        
        if (newStat < currentStat) {
          (updates as Record<string, unknown>)[stat] = newStat;
          declined = true;

          const statName = stat.charAt(0).toUpperCase() + stat.slice(1);
          const oldTier = getStatTierName(currentStat);
          const newTier = getStatTierName(newStat);
          
          notification = {
            team_id: player.team_id!,
            type: 'player_decline',
            title: '⬇️ Skill Fading',
            message: `${player.first_name} ${player.last_name}'s ${statName} has dropped from ${oldTier} to ${newTier} due to lack of use.`,
            player_id: player.id
          };
          
          break;
        }
      }
    }
  }

  if (declined) {
    const newOverall = calculateOverall(player, updates);
    updates.overall = newOverall;
  }

  return { 
    playerId: player.id, 
    updates, 
    improved: false, 
    declined, 
    notification,
    restSkipped: false 
  };
}

// ===========================================
// RETIREMENT PROCESSING
// ===========================================

/**
 * Check if a player should retire (run at end of season)
 */
export function checkRetirement(player: Player): RetirementCheck {
  const age = player.age || 25;
  const position = player.position || 'Lock';
  const durability = (player.durability as string) || 'normal';
  
  const positionConfig = getPositionConfig(position);
  const durabilityMod = DURABILITY_MODIFIERS[durability] || 0;
  
  const retirementAge = positionConfig.baseRetire + durabilityMod;
  const minRetireAge = positionConfig.retireRange[0] + durabilityMod;
  const maxRetireAge = positionConfig.retireRange[1] + durabilityMod;
  
  if (age < minRetireAge) {
    return { playerId: player.id, shouldRetire: false, retirementAge };
  }
  
  if (age >= maxRetireAge) {
    return {
      playerId: player.id,
      shouldRetire: true,
      retirementAge,
      notification: {
        team_id: player.team_id!,
        type: 'player_retired',
        title: '👋 Player Retired',
        message: `${player.first_name} ${player.last_name} (${age}) has announced their retirement after a decorated career. Thank you for the memories!`,
        player_id: player.id
      }
    };
  }
  
  const yearsFromRetire = age - retirementAge;
  let retireChance: number;
  
  if (yearsFromRetire <= -2) retireChance = 5;
  else if (yearsFromRetire === -1) retireChance = 15;
  else if (yearsFromRetire === 0) retireChance = 40;
  else if (yearsFromRetire === 1) retireChance = 70;
  else retireChance = 100;

  const shouldRetire = rollChance(retireChance);
  
  if (shouldRetire) {
    return {
      playerId: player.id,
      shouldRetire: true,
      retirementAge,
      notification: {
        team_id: player.team_id!,
        type: 'player_retired',
        title: '👋 Player Retired',
        message: `${player.first_name} ${player.last_name} (${age}) has announced their retirement. Thank you for the memories!`,
        player_id: player.id
      }
    };
  }
  
  if (yearsFromRetire >= -2 && yearsFromRetire < 0) {
    return {
      playerId: player.id,
      shouldRetire: false,
      retirementAge,
      notification: {
        team_id: player.team_id!,
        type: 'retirement_warning',
        title: '⚠️ Considering Retirement',
        message: `${player.first_name} ${player.last_name} (${age}) is entering the twilight of their career. They may retire in the next 1-2 seasons.`,
        player_id: player.id
      }
    };
  }
  
  return { playerId: player.id, shouldRetire: false, retirementAge };
}

// ===========================================
// BATCH PROCESSING
// ===========================================

/**
 * Process training for all players (called by cron job)
 * 
 * @param players - All players to process
 * @param playedThisRound - Set of player IDs who played in the current round
 *                          Players in this set will have REST benefits SKIPPED
 */
export function processAllTraining(
  players: Player[],
  playedThisRound: Set<string> = new Set()
): {
  playerUpdates: { id: string; [key: string]: unknown }[];
  notifications: Notification[];
  improvementCount: number;
  declineCount: number;
  restSkippedCount: number;
} {
  const playerUpdates: { id: string; [key: string]: unknown }[] = [];
  const notifications: Notification[] = [];
  let improvementCount = 0;
  let declineCount = 0;
  let restSkippedCount = 0;

  for (const player of players) {
    const didPlay = playedThisRound.has(player.id);
    const result = processPlayerTraining(player, didPlay);

    if (Object.keys(result.updates).length > 0) {
      playerUpdates.push({ id: result.playerId, ...result.updates });
    }

    if (result.improved) improvementCount++;
    if (result.declined) declineCount++;
    if (result.restSkipped) restSkippedCount++;
    if (result.notification) notifications.push(result.notification);
  }

  return { 
    playerUpdates, 
    notifications, 
    improvementCount, 
    declineCount, 
    restSkippedCount 
  };
}

/**
 * Process end-of-season retirement checks for all players
 */
export function processAllRetirements(players: Player[]): {
  retiredPlayerIds: string[];
  notifications: Notification[];
} {
  const retiredPlayerIds: string[] = [];
  const notifications: Notification[] = [];

  for (const player of players) {
    const result = checkRetirement(player);
    
    if (result.shouldRetire) {
      retiredPlayerIds.push(player.id);
    }
    
    if (result.notification) {
      notifications.push(result.notification);
    }
  }

  return { retiredPlayerIds, notifications };
}
