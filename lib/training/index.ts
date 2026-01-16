/**
 * SidelineHQ Training System
 * Player development and stat improvement logic
 * 
 * FIXED: Progress now resets to 'NONE' after stat improvement
 */

import type { Player, ProgressStage, Notification } from '../game-engine/types';
import {
  PROGRESS_STAGES,
  STAT_IMPROVEMENT_CHANCES,
  TRAINABLE_STATS,
  TRAINING_ADVANCE_BASE_CHANCE,
  FATIGUE_PER_TRAINING,
  REST_RECOVERY
} from '../game-engine/constants';
import { rollChance } from '../game-engine/scoring';

// ===========================================
// TYPES
// ===========================================

export interface TrainingResult {
  playerId: string;
  updates: Record<string, any>;
  improved: boolean;
  notification?: Notification;
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get the next progress stage
 */
function getNextProgressStage(current: ProgressStage): ProgressStage | null {
  const idx = PROGRESS_STAGES.indexOf(current);
  if (idx < 0 || idx >= PROGRESS_STAGES.length - 1) return null;
  return PROGRESS_STAGES[idx + 1];
}

/**
 * Calculate stat gain amount
 * 50% chance +1, 35% chance +2, 15% chance +3
 */
function calculateStatGain(): number {
  const roll = Math.random();
  if (roll < 0.5) return 1;
  if (roll < 0.85) return 2;
  return 3;
}

/**
 * Calculate overall rating from stats
 * OVR = sum of all 7 stats (not averaged - matches your tier system)
 */
function calculateOverall(player: Player, updates: Record<string, any>): number {
  return (
    (updates.speed ?? player.speed) +
    (updates.strength ?? player.strength) +
    (updates.power ?? player.power) +
    (updates.passing ?? player.passing) +
    (updates.stamina ?? player.stamina) +
    (updates.tackling ?? player.tackling) +
    (updates.kicking ?? player.kicking)
  );
}

// ===========================================
// MAIN TRAINING FUNCTION
// ===========================================

/**
 * Process training for a single player
 * 
 * Training Flow:
 * 1. Each update has a 60% (+potential bonus) chance to advance progress
 * 2. Progress goes: NONE → POOR → FAIR → GOOD → VERY GOOD → EXCELLENT
 * 3. At each stage, there's a chance for stat improvement based on progress level
 * 4. When stat improves, progress RESETS to NONE (this was missing before!)
 * 
 * @param player - The player to train
 * @returns Training result with updates and optional notification
 */
export function processPlayerTraining(player: Player): TrainingResult {
  const updates: Record<string, any> = {};
  let improved = false;
  let notification: Notification | undefined;

  const training = player.current_training;
  const currentProgress = (player.training_progress || 'NONE') as ProgressStage;
  const potential = player.potential || 70;
  const potentialBonus = (potential - 60) / 2; // -5 to +20 based on potential 50-100

  // ===========================================
  // REST MODE - Just recover fatigue
  // ===========================================
  if (training === 'Rest') {
    updates.fatigue = Math.max(0, (player.fatigue || 0) - REST_RECOVERY);
    return { playerId: player.id, updates, improved: false };
  }

  // ===========================================
  // NO TRAINING - Skip
  // ===========================================
  if (!training) {
    return { playerId: player.id, updates, improved: false };
  }

  // ===========================================
  // ACTIVE TRAINING
  // ===========================================

  // Training adds fatigue
  updates.fatigue = Math.min(100, (player.fatigue || 0) + FATIGUE_PER_TRAINING);

  // Determine effective progress for this update
  let effectiveProgress = currentProgress;

  // Chance to advance progress stage (unless already at EXCELLENT)
  if (currentProgress !== 'EXCELLENT') {
    const advanceChance = TRAINING_ADVANCE_BASE_CHANCE + potentialBonus;
    
    if (rollChance(advanceChance)) {
      const nextStage = getNextProgressStage(currentProgress);
      if (nextStage) {
        updates.training_progress = nextStage;
        effectiveProgress = nextStage;
      }
    }
  }

  // ===========================================
  // STAT IMPROVEMENT CHECK
  // ===========================================

  const improvementChance = (STAT_IMPROVEMENT_CHANCES[effectiveProgress] || 0) + potentialBonus;

  if (improvementChance > 0 && rollChance(improvementChance)) {
    const statKey = training.toLowerCase();
    
    // Verify this is a trainable stat
    const isTrainableStat = TRAINABLE_STATS.some(s => s.toLowerCase() === statKey);
    
    if (isTrainableStat) {
      const currentStat = (player as any)[statKey] as number;
      
      // Cap at 8 (Elite tier) - stats are 1-8, not 1-99
      const MAX_STAT = 8;
      
      if (currentStat < MAX_STAT) {
        const gain = calculateStatGain();
        const newStat = Math.min(MAX_STAT, currentStat + gain);
        
        // Only process if stat actually increased
        if (newStat > currentStat) {
          updates[statKey] = newStat;

          // ✅ FIX: Reset progress after improvement!
          updates.training_progress = 'NONE';

          // Recalculate overall (sum of all 7 stats)
          const newOverall = calculateOverall(player, updates);
          updates.overall = newOverall;
          improved = true;

          // Create notification for improvement
          const statName = training.charAt(0).toUpperCase() + training.slice(1);
          const oldTier = getStatTierName(currentStat);
          const newTier = getStatTierName(newStat);
          
          notification = {
            team_id: player.team_id!,
            type: 'player_improvement',
            title: '⭐ Player Improved!',
            message: `${player.first_name} ${player.last_name}'s ${statName} increased from ${oldTier} to ${newTier}! Overall now ${newOverall}.`,
            player_id: player.id
          };
        }
      }
    }
  }

  return { playerId: player.id, updates, improved, notification };
}

/**
 * Convert stat number to tier name for notifications
 */
function getStatTierName(value: number): string {
  const tiers: Record<number, string> = {
    1: 'None',
    2: 'Poor',
    3: 'Fair',
    4: 'OK',
    5: 'Good',
    6: 'Very Good',
    7: 'Excellent',
    8: 'Elite',
  };
  return tiers[Math.max(1, Math.min(8, value))] || 'Unknown';
}

/**
 * Process training for all players
 * 
 * @param players - Array of all players to process
 * @returns Object with all updates and notifications
 */
export function processAllTraining(players: Player[]): {
  playerUpdates: { id: string; [key: string]: any }[];
  notifications: Notification[];
  improvementCount: number;
} {
  const playerUpdates: { id: string; [key: string]: any }[] = [];
  const notifications: Notification[] = [];
  let improvementCount = 0;

  // Only process players with active training
  const trainingPlayers = players.filter(p => p.current_training);

  for (const player of trainingPlayers) {
    const result = processPlayerTraining(player);

    // Only add to updates if there are actual changes
    if (Object.keys(result.updates).length > 0) {
      playerUpdates.push({ id: result.playerId, ...result.updates });
    }

    if (result.improved) {
      improvementCount++;
    }

    if (result.notification) {
      notifications.push(result.notification);
    }
  }

  return { playerUpdates, notifications, improvementCount };
}
