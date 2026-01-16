/**
 * SidelineHQ Training System v2.0
 * 
 * Complete player development system including:
 * - Stat training with progress stages
 * - Age-based modifiers (young learn faster, old decline)
 * - Hidden training affinities (discovered through observation)
 * - Stat decline for aging players
 * - "Use it or lose it" for young players (rare)
 * - Position-specific retirement system
 * 
 * @author SidelineHQ
 * @version 2.0
 */

import type { Player, ProgressStage, Notification } from '../game-engine/types';
import {
  TRAINABLE_STATS,
  FATIGUE_PER_TRAINING,
  REST_RECOVERY
} from '../game-engine/constants';
import { 
  calculateTraitModifiers, 
  type PlayerTraitData 
} from '../game-engine/traits';
// ===========================================
// CONSTANTS
// ===========================================

/** Base chance to advance training progress (60%) */
const TRAINING_ADVANCE_BASE_CHANCE = 60;

/** Stat improvement chances by progress stage (rebalanced for slower progression) */
const STAT_IMPROVEMENT_CHANCES: Record<string, number> = {
  'NONE': 2,
  'POOR': 5,
  'FAIR': 10,
  'GOOD': 20,
  'VERY GOOD': 35,
  'EXCELLENT': 50
};

/** Stat tier names for notifications */
const STAT_TIER_NAMES: Record<number, string> = {
  1: 'None',
  2: 'Poor',
  3: 'Fair',
  4: 'OK',
  5: 'Good',
  6: 'Very Good',
  7: 'Excellent',
  8: 'Elite'
};

/** Age brackets for training modifiers */
const AGE_TRAINING_MODIFIERS: Record<string, { advance: number; gain: number }> = {
  'young': { advance: 10, gain: 10 },      // 18-21
  'prime': { advance: 0, gain: 0 },        // 22-27
  'veteran': { advance: -10, gain: -5 },   // 28-31
  'old': { advance: -20, gain: -10 }       // 32+
};

/** Affinity bonus modifiers */
const AFFINITY_MODIFIERS: Record<string, { advance: number; gain: number }> = {
  'high': { advance: 15, gain: 15 },
  'medium': { advance: 5, gain: 5 },
  'none': { advance: 0, gain: 0 }
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
 * Get age bracket for a player
 */
function getAgeBracket(age: number): 'young' | 'prime' | 'veteran' | 'old' {
  if (age <= 21) return 'young';
  if (age <= 27) return 'prime';
  if (age <= 31) return 'veteran';
  return 'old';
}

/**
 * Get the next progress stage
 */
function getNextProgressStage(current: string): string | null {
  const stages = ['NONE', 'POOR', 'FAIR', 'GOOD', 'VERY GOOD', 'EXCELLENT'];
  const idx = stages.indexOf(current);
  if (idx < 0 || idx >= stages.length - 1) return null;
  return stages[idx + 1];
}

/**
 * Get stat tier name from value (1-8)
 */
function getStatTierName(value: number): string {
  return STAT_TIER_NAMES[Math.max(1, Math.min(8, value))] || 'Unknown';
}

/**
 * Safely get a stat value from a player
 */
function getPlayerStat(player: Player, stat: string): number {
  const key = stat.toLowerCase();
  switch (key) {
    case 'speed': return player.speed ?? 1;
    case 'strength': return player.strength ?? 1;
    case 'power': return player.power ?? 1;
    case 'passing': return player.passing ?? 1;
    case 'stamina': return player.stamina ?? 1;
    case 'tackling': return player.tackling ?? 1;
    case 'kicking': return player.kicking ?? 1;
    default: return 1;
  }
}

/**
 * Calculate overall rating from stats (sum of 7 stats)
 */
function calculateOverall(player: Player, updates: Partial<Player>): number {
  return (
    (updates.speed ?? player.speed ?? 1) +
    (updates.strength ?? player.strength ?? 1) +
    (updates.power ?? player.power ?? 1) +
    (updates.passing ?? player.passing ?? 1) +
    (updates.stamina ?? player.stamina ?? 1) +
    (updates.tackling ?? player.tackling ?? 1) +
    (updates.kicking ?? player.kicking ?? 1)
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
// ===========================================
// AFFINITY GENERATION
// ===========================================

/**
 * Generate training affinities for a new player
 * 
 * Each player gets:
 * - 1-2 HIGH affinities (+15% to advance and gain)
 * - 1-2 MEDIUM affinities (+5% to advance and gain)
 * - 70% chance affinities align with position
 * - 30% chance for unexpected affinities (discovery moments)
 */
export function generateTrainingAffinity(position: string): AffinityData {
  const affinity: AffinityData = {};
  const allStats = [...ALL_STAT_KEYS];
  const primaryStats = POSITION_PRIMARY_STATS[position] || [];
  
  // Determine number of affinities
  const numHigh = Math.random() < 0.5 ? 1 : 2;
  const numMedium = Math.random() < 0.5 ? 1 : 2;
  
  const usedStats: string[] = [];
  
  // Assign HIGH affinities
  for (let i = 0; i < numHigh; i++) {
    let stat: string | undefined;
    
    // 70% chance to align with position primary stats
    if (Math.random() < 0.7 && primaryStats.length > 0) {
      const availablePrimary = primaryStats.filter(s => !usedStats.includes(s));
      if (availablePrimary.length > 0) {
        stat = availablePrimary[Math.floor(Math.random() * availablePrimary.length)];
      } else {
        const availableStats = allStats.filter(s => !usedStats.includes(s));
        stat = availableStats[Math.floor(Math.random() * availableStats.length)];
      }
    } else {
      // 30% chance for unexpected stat (discovery moment!)
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
  if (roll < 15) return 'fragile';      // 15%
  if (roll < 65) return 'normal';       // 50%
  if (roll < 90) return 'durable';      // 25%
  return 'ironman';                      // 10%
}

// ===========================================
// TRAINING PROCESSING
// ===========================================

/**
 * Process training for a single player
 */
export function processPlayerTraining(player: Player): TrainingResult {
  const updates: Partial<Player> = {};
  let improved = false;
  let declined = false;
  let notification: Notification | undefined;

  const training = player.current_training;
  const currentProgress = player.training_progress || 'NONE';
  const age = player.age || 25;
  const ageBracket = getAgeBracket(age);
  const ageModifiers = AGE_TRAINING_MODIFIERS[ageBracket];

  // ===========================================
  // REST MODE - Recover fatigue
  // ===========================================
  if (training === 'Rest') {
    updates.fatigue = Math.max(0, (player.fatigue || 0) - REST_RECOVERY);
    return { playerId: player.id, updates, improved: false, declined: false };
  }

  // ===========================================
  // NO TRAINING - Check for stat decline only
  // ===========================================
  if (!training) {
    const declineResult = processStatDecline(player);
    if (declineResult.declined) {
      return declineResult;
    }
    return { playerId: player.id, updates: {}, improved: false, declined: false };
  }

  // ===========================================
  // ACTIVE TRAINING
  // ===========================================

  // Training adds fatigue
  updates.fatigue = Math.min(100, (player.fatigue || 0) + FATIGUE_PER_TRAINING);

  // Get affinity for trained stat
  const statAffinity = getAffinity(player, training);
  const affinityModifiers = AFFINITY_MODIFIERS[statAffinity];

  // Calculate trait modifiers (for Prodigy training bonus)
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

  // Calculate advance chance (with Prodigy bonus if applicable)
  const baseAdvanceChance = TRAINING_ADVANCE_BASE_CHANCE + ageModifiers.advance + affinityModifiers.advance;
  const advanceChance = Math.round(baseAdvanceChance * traitMods.trainingMultiplier);
  let effectiveProgress = currentProgress;

  // Chance to advance progress stage (unless already at EXCELLENT)
  if (currentProgress !== 'EXCELLENT' && rollChance(advanceChance)) {
    const nextStage = getNextProgressStage(currentProgress);
    if (nextStage) {
      updates.training_progress = nextStage;
      effectiveProgress = nextStage;
    }
  }

  // ===========================================
  // STAT IMPROVEMENT CHECK
  // ===========================================

  const baseImprovementChance = STAT_IMPROVEMENT_CHANCES[effectiveProgress] || 0;
  const improvementChance = baseImprovementChance + ageModifiers.gain + affinityModifiers.gain;

  if (improvementChance > 0 && rollChance(improvementChance)) {
    const statKey = training.toLowerCase();
    
    // Verify this is a trainable stat
    const isTrainableStat = TRAINABLE_STATS.some(s => s.toLowerCase() === statKey);
    
    if (isTrainableStat) {
      const currentStat = getPlayerStat(player, statKey);
      const MAX_STAT = 8;
      
      if (currentStat < MAX_STAT) {
        // Calculate stat gain (50% +1, 35% +2, 15% +3)
        const gainRoll = Math.random();
        let gain = 1;
        if (gainRoll >= 0.85) gain = 3;
        else if (gainRoll >= 0.5) gain = 2;
        
        const newStat = Math.min(MAX_STAT, currentStat + gain);
        
        if (newStat > currentStat) {
          // Set the updated stat
          (updates as Record<string, unknown>)[statKey] = newStat;
          
          // Reset progress after improvement
          updates.training_progress = 'NONE';
          
          // Recalculate overall
          const newOverall = calculateOverall(player, updates);
          updates.overall = newOverall;
          improved = true;

          // Create notification
          const statName = training.charAt(0).toUpperCase() + training.slice(1);
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
      }
    }
  }

  return { playerId: player.id, updates, improved, declined, notification };
}

// ===========================================
// STAT DECLINE PROCESSING
// ===========================================

/**
 * Process stat decline for aging players
 * 
 * Old players (30+): Physical stats decline faster
 * Young players (18-25): Non-position stats can decline (rare "use it or lose it")
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
    
    // Base decline chance increases with age
    let baseDeclineChance: number;
    if (yearsOverDecline <= 1) baseDeclineChance = 2;
    else if (yearsOverDecline <= 3) baseDeclineChance = 4;
    else if (yearsOverDecline <= 5) baseDeclineChance = 7;
    else baseDeclineChance = 10;

    // Check each stat for decline
    for (const stat of ALL_STAT_KEYS) {
      // Skip if player is training this stat (training protects from decline)
      if (currentTraining && currentTraining.toLowerCase() === stat) continue;
      
      // Physical stats decline faster
      const isPhysical = PHYSICAL_STATS.includes(stat);
      const isPrimaryDecline = positionConfig.primaryDeclineStats.includes(stat);
      
      let declineChance = baseDeclineChance;
      if (isPhysical) declineChance *= 1.5;
      if (isPrimaryDecline) declineChance *= 1.25;
      
      // Apply decline rate modifier
      if (positionConfig.declineRate === 'fast') declineChance *= 1.2;
      else if (positionConfig.declineRate === 'slow') declineChance *= 0.8;

      if (rollChance(declineChance)) {
        const currentStat = getPlayerStat(player, stat);
        
        if (currentStat > 1) {
          // 90% chance -1, 10% chance -2
          const drop = Math.random() < 0.9 ? 1 : 2;
          const newStat = Math.max(1, currentStat - drop);
          
          if (newStat < currentStat) {
            (updates as Record<string, unknown>)[stat] = newStat;
            declined = true;

            // Create notification for first decline found
            if (!notification) {
              const statName = stat.charAt(0).toUpperCase() + stat.slice(1);
              const oldTier = getStatTierName(currentStat);
              const newTier = getStatTierName(newStat);
              
              notification = {
                team_id: player.team_id!,
                type: 'player_decline' ,
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
    const useItOrLoseItChance = age <= 21 ? 0.5 : 1; // 0.5% for 18-21, 1% for 22-25
    
    for (const stat of ALL_STAT_KEYS) {
      // Skip primary position stats (protected)
      if (primaryStats.includes(stat)) continue;
      
      // Skip if player is training this stat
      if (currentTraining && currentTraining.toLowerCase() === stat) continue;
      
      // Only affects low stats (tier 4 or below)
      const currentStat = getPlayerStat(player, stat);
      if (currentStat > 4) continue;
      
      if (rollChance(useItOrLoseItChance)) {
        const newStat = Math.max(1, currentStat - 1);
        
        if (newStat < currentStat) {
          (updates as Record<string, unknown>)[stat] = newStat;
          declined = true;

          const statName = stat.charAt(0).toUpperCase() + stat.slice(1);
          const oldTier = getStatTierName(currentStat);
          const newTier = getStatTierName(newStat);
          
          notification = {
            team_id: player.team_id!,
            type: 'player_decline' ,
            title: '⬇️ Skill Fading',
            message: `${player.first_name} ${player.last_name}'s ${statName} has dropped from ${oldTier} to ${newTier} due to lack of use.`,
            player_id: player.id
          };
          
          break; // Only one "use it or lose it" decline per round
        }
      }
    }
  }

  // Recalculate overall if any stat declined
  if (declined) {
    const newOverall = calculateOverall(player, updates);
    updates.overall = newOverall;
  }

  return { playerId: player.id, updates, improved: false, declined, notification };
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
  
  // Calculate this player's actual retirement age
  const retirementAge = positionConfig.baseRetire + durabilityMod;
  const minRetireAge = positionConfig.retireRange[0] + durabilityMod;
  const maxRetireAge = positionConfig.retireRange[1] + durabilityMod;
  
  // Not old enough to consider retirement
  if (age < minRetireAge) {
    return { playerId: player.id, shouldRetire: false, retirementAge };
  }
  
  // Forced retirement at max age
  if (age >= maxRetireAge) {
    return {
      playerId: player.id,
      shouldRetire: true,
      retirementAge,
      notification: {
        team_id: player.team_id!,
        type: 'player_retired' ,
        title: '👋 Player Retired',
        message: `${player.first_name} ${player.last_name} (${age}) has announced their retirement after a decorated career. Thank you for the memories!`,
        player_id: player.id
      }
    };
  }
  
  // Calculate retirement chance based on age
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
        type: 'player_retired' ,
        title: '👋 Player Retired',
        message: `${player.first_name} ${player.last_name} (${age}) has announced their retirement. Thank you for the memories!`,
        player_id: player.id
      }
    };
  }
  
  // Warning notification if within 2 years of retirement age
  if (yearsFromRetire >= -2 && yearsFromRetire < 0) {
    return {
      playerId: player.id,
      shouldRetire: false,
      retirementAge,
      notification: {
        team_id: player.team_id!,
        type: 'retirement_warning' ,
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
 */
export function processAllTraining(players: Player[]): {
  playerUpdates: { id: string; [key: string]: unknown }[];
  notifications: Notification[];
  improvementCount: number;
  declineCount: number;
} {
  const playerUpdates: { id: string; [key: string]: unknown }[] = [];
  const notifications: Notification[] = [];
  let improvementCount = 0;
  let declineCount = 0;

  for (const player of players) {
    // Process training (includes decline check for non-training players)
    const result = processPlayerTraining(player);

    if (Object.keys(result.updates).length > 0) {
      playerUpdates.push({ id: result.playerId, ...result.updates });
    }

    if (result.improved) improvementCount++;
    if (result.declined) declineCount++;
    if (result.notification) notifications.push(result.notification);
  }

  return { playerUpdates, notifications, improvementCount, declineCount };
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
