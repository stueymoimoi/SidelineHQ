/**
 * process-training.js
 * 
 * Run this script during each update (Tues/Thurs/Sun 6pm) to:
 * 1. Advance training progress based on potential
 * 2. Roll for stat improvements based on progress level
 * 3. Reduce fatigue for players on Rest
 * 4. Handle position learning
 * 
 * Usage: node process-training.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Progress stages in order
const PROGRESS_STAGES = ['NONE', 'POOR', 'FAIR', 'GOOD', 'VERY GOOD', 'EXCELLENT'];

// Base chance of advancing to next progress stage (modified by potential)
const PROGRESS_ADVANCE_BASE_CHANCE = 60; // 60% base chance to advance

// Base chance of stat improvement at each progress level (DOUBLED from original)
const STAT_IMPROVEMENT_CHANCES = {
  'NONE': 0,
  'POOR': 15,
  'FAIR': 35,
  'GOOD': 55,
  'VERY GOOD': 75,
  'EXCELLENT': 90
};

// Stat training types
const STAT_TRAINING = ['Speed', 'Strength', 'Skill', 'Stamina', 'Defense'];

// Position to related stats mapping (for training primary position)
const POSITION_STATS = {
  'Fullback': ['speed', 'skill', 'defense'],
  'Winger': ['speed', 'skill'],
  'Centre': ['speed', 'strength', 'defense'],
  'Five-Eighth': ['skill', 'speed'],
  'Halfback': ['skill', 'speed', 'stamina'],
  'Prop': ['strength', 'defense', 'stamina'],
  'Hooker': ['skill', 'defense', 'stamina'],
  'Second Row': ['strength', 'defense', 'stamina'],
  'Lock': ['strength', 'defense', 'stamina']
};

// Fatigue reduction when resting
const REST_FATIGUE_REDUCTION = 25;

// How much fatigue increases from training (non-rest)
const TRAINING_FATIGUE_INCREASE = 5;

/**
 * Calculate potential bonus for chances
 * Potential 60 = +0%, Potential 95 = +17.5%
 */
function getPotentialBonus(potential) {
  return (potential - 60) / 2;
}

/**
 * Roll a percentage chance
 */
function rollChance(percentage) {
  return Math.random() * 100 < percentage;
}

/**
 * Get next progress stage
 */
function getNextStage(currentStage) {
  const currentIndex = PROGRESS_STAGES.indexOf(currentStage || 'NONE');
  if (currentIndex === -1 || currentIndex >= PROGRESS_STAGES.length - 1) {
    return currentStage || 'NONE'; // Already at EXCELLENT or invalid
  }
  return PROGRESS_STAGES[currentIndex + 1];
}

/**
 * Process a single player's training
 */
async function processPlayerTraining(player) {
  const updates = {};
  const logs = [];
  
  const training = player.current_training;
  const progress = player.training_progress || 'NONE';
  const potential = player.potential || 70;
  
  if (!training) {
    logs.push(`${player.first_name} ${player.last_name}: No training assigned`);
    return { updates, logs };
  }
  
  // Handle REST
  if (training === 'Rest') {
    const newFatigue = Math.max(0, player.fatigue - REST_FATIGUE_REDUCTION);
    updates.fatigue = newFatigue;
    logs.push(`${player.first_name} ${player.last_name}: Rested, fatigue ${player.fatigue}% → ${newFatigue}%`);
    return { updates, logs };
  }
  
  // Non-rest training increases fatigue slightly
  updates.fatigue = Math.min(100, player.fatigue + TRAINING_FATIGUE_INCREASE);
  
  // Check for progress advancement (if not already at EXCELLENT)
  if (progress !== 'EXCELLENT') {
    const advanceChance = PROGRESS_ADVANCE_BASE_CHANCE + getPotentialBonus(potential);
    if (rollChance(advanceChance)) {
      const newProgress = getNextStage(progress);
      updates.training_progress = newProgress;
      logs.push(`${player.first_name} ${player.last_name}: Progress ${progress} → ${newProgress} (${advanceChance.toFixed(0)}% chance)`);
    } else {
      logs.push(`${player.first_name} ${player.last_name}: Progress stayed at ${progress}`);
    }
  }
  
  // Roll for stat improvement
  const effectiveProgress = updates.training_progress || progress;
  const baseChance = STAT_IMPROVEMENT_CHANCES[effectiveProgress] || 0;
  const totalChance = baseChance + getPotentialBonus(potential);
  
  if (baseChance > 0 && rollChance(totalChance)) {
    // Stat improvement success!
    
    if (STAT_TRAINING.includes(training)) {
      // Direct stat training
      const statKey = training.toLowerCase();
      const currentStat = player[statKey];
      
      // Cap stats at 99
      if (currentStat < 99) {
        // Roll for improvement amount: 50% +1, 35% +2, 15% +3
        const roll = Math.random() * 100;
        let improvement;
        if (roll < 50) improvement = 1;
        else if (roll < 85) improvement = 2;
        else improvement = 3;
        
        const newStat = Math.min(99, currentStat + improvement);
        updates[statKey] = newStat;
        
        // Recalculate overall
        const newOverall = calculateOverall({
          ...player,
          [statKey]: newStat
        });
        updates.overall = newOverall;
        
        logs.push(`${player.first_name} ${player.last_name}: ⭐ ${training} improved ${currentStat} → ${newStat} (+${improvement})! Overall now ${newOverall}`);
      }
      
    } else if (POSITION_STATS[training]) {
      // Position training
      
      if (training === player.position) {
        // Training primary position - improve a related stat
        const relatedStats = POSITION_STATS[training];
        const statToImprove = relatedStats[Math.floor(Math.random() * relatedStats.length)];
        const currentStat = player[statToImprove];
        
        if (currentStat < 99) {
          // Roll for improvement amount: 50% +1, 35% +2, 15% +3
          const roll = Math.random() * 100;
          let improvement;
          if (roll < 50) improvement = 1;
          else if (roll < 85) improvement = 2;
          else improvement = 3;
          
          const newStat = Math.min(99, currentStat + improvement);
          updates[statToImprove] = newStat;
          
          const newOverall = calculateOverall({
            ...player,
            [statToImprove]: newStat
          });
          updates.overall = newOverall;
          
          logs.push(`${player.first_name} ${player.last_name}: ⭐ ${training} mastery improved ${statToImprove} ${currentStat} → ${newStat}! Overall now ${newOverall}`);
        }
        
      } else if (training === player.secondary_position) {
        // Training secondary position - improve proficiency (simulate with skill improvement)
        const currentSkill = player.skill;
        if (currentSkill < 99) {
          // Roll for improvement amount: 50% +1, 35% +2, 15% +3
          const roll = Math.random() * 100;
          let improvement;
          if (roll < 50) improvement = 1;
          else if (roll < 85) improvement = 2;
          else improvement = 3;
          
          const newSkill = Math.min(99, currentSkill + improvement);
          updates.skill = newSkill;
          
          const newOverall = calculateOverall({
            ...player,
            skill: newSkill
          });
          updates.overall = newOverall;
          
          logs.push(`${player.first_name} ${player.last_name}: ⭐ ${training} proficiency improved! Skill ${currentSkill} → ${newSkill}`);
        }
        
      } else {
        // Learning new position - after enough progress, it becomes secondary
        if (effectiveProgress === 'EXCELLENT' && !player.secondary_position) {
          updates.secondary_position = training;
          logs.push(`${player.first_name} ${player.last_name}: 🎉 LEARNED NEW POSITION: ${training} is now a secondary position!`);
        } else if (effectiveProgress === 'EXCELLENT' && player.secondary_position && player.secondary_position !== training) {
          // Already has a secondary, this replaces it
          updates.secondary_position = training;
          logs.push(`${player.first_name} ${player.last_name}: 🔄 REPLACED SECONDARY: ${player.secondary_position} → ${training}`);
        } else {
          logs.push(`${player.first_name} ${player.last_name}: Learning ${training}... (progress: ${effectiveProgress})`);
        }
      }
    }
  } else if (baseChance > 0) {
    logs.push(`${player.first_name} ${player.last_name}: Training ${training} at ${effectiveProgress} - no improvement this week (${totalChance.toFixed(0)}% chance)`);
  }
  
  return { updates, logs };
}

/**
 * Calculate overall rating from stats
 */
function calculateOverall(player) {
  const stats = [player.speed, player.strength, player.skill, player.stamina, player.defense];
  const sum = stats.reduce((a, b) => a + b, 0);
  return Math.round(sum / 5);
}

/**
 * Main function
 */
async function main() {
  console.log('==========================================');
  console.log('🏋️  PROCESSING TRAINING');
  console.log('==========================================\n');
  
  // Get all players with training assigned
  const { data: players, error } = await supabase
    .from('players')
    .select('*')
    .not('current_training', 'is', null);
  
  if (error) {
    console.error('Error fetching players:', error);
    return;
  }
  
  console.log(`Found ${players.length} players with training assigned\n`);
  
  let totalImprovements = 0;
  let totalProgressions = 0;
  let newPositionsLearned = 0;
  
  for (const player of players) {
    const { updates, logs } = await processPlayerTraining(player);
    
    // Log all messages
    logs.forEach(log => console.log(log));
    
    // Track stats
    if (updates.overall && updates.overall > player.overall) totalImprovements++;
    if (updates.training_progress) totalProgressions++;
    if (updates.secondary_position && updates.secondary_position !== player.secondary_position) newPositionsLearned++;
    
    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('players')
        .update(updates)
        .eq('id', player.id);
      
      if (updateError) {
        console.error(`Error updating ${player.first_name} ${player.last_name}:`, updateError);
      }
    }
    
    console.log(''); // Blank line between players
  }
  
  console.log('==========================================');
  console.log('📊 TRAINING SUMMARY');
  console.log('==========================================');
  console.log(`Players trained: ${players.length}`);
  console.log(`Progress advancements: ${totalProgressions}`);
  console.log(`Stat improvements: ${totalImprovements}`);
  console.log(`New positions learned: ${newPositionsLearned}`);
  console.log('==========================================\n');
}

main();
