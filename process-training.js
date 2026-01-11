const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials - UPDATE THE KEY!
const supabaseUrl = 'https://souktfzlcdpzwebwfeqd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdWt0ZnpsY2RwendlYndmZXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwODM0MTUsImV4cCI6MjA4MzY1OTQxNX0.-gXuE4CGRG_TsAw4oMlqGV55-B6-jar5vaBFIAj193A';

const supabase = createClient(supabaseUrl, supabaseKey);

const PROGRESS_LEVELS = ['POOR', 'FAIR', 'GOOD', 'VERY GOOD', 'EXCELLENT'];

const TRAINING_TYPES = {
  'Speed Drills': 'speed',
  'Gym': 'strength', 
  'Ball Skills': 'skill',
  'Conditioning': 'stamina',
  'Defense Drills': 'defense',
  'Position Training': 'position',
  'Rest': 'rest'
};

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getProgressChance(potential, age) {
  // Higher potential = faster progress
  let baseChance = 0.5;
  
  if (potential >= 91) baseChance = 0.75;
  else if (potential >= 86) baseChance = 0.65;
  else if (potential >= 81) baseChance = 0.60;
  else if (potential >= 71) baseChance = 0.50;
  else baseChance = 0.40;
  
  // Younger = faster progress
  if (age <= 21) baseChance += 0.10;
  else if (age <= 24) baseChance += 0.05;
  else if (age >= 30) baseChance -= 0.10;
  else if (age >= 33) baseChance -= 0.20;
  
  return Math.min(0.85, Math.max(0.25, baseChance));
}

function getStatGainChance(progressLevel) {
  // Chance of +1 stat at each progress level
  switch (progressLevel) {
    case 'POOR': return 0;
    case 'FAIR': return 0.05;
    case 'GOOD': return 0.15;
    case 'VERY GOOD': return 0.30;
    case 'EXCELLENT': return 0.60;
    default: return 0;
  }
}

async function processTraining() {
  console.log('💪 Processing Training Updates');
  console.log('==============================\n');
  
  // Get all players with active training
  const { data: players, error } = await supabase
    .from('players')
    .select('*, teams(name)')
    .not('current_training', 'is', null)
    .neq('current_training', '');
  
  if (error) {
    console.error('Error fetching players:', error);
    return;
  }
  
  if (players.length === 0) {
    console.log('❌ No players currently training.');
    console.log('   Assign training first using assign-training.js');
    return;
  }
  
  console.log(`Found ${players.length} players in training\n`);
  
  let progressedCount = 0;
  let stuckCount = 0;
  let statGainCount = 0;
  let restedCount = 0;
  const highlights = [];
  
  for (const player of players) {
    const training = player.current_training;
    const currentProgress = player.training_progress || 'POOR';
    const currentIndex = PROGRESS_LEVELS.indexOf(currentProgress);
    
    // Handle Rest separately
    if (training === 'Rest') {
      const newFatigue = Math.max(0, (player.fatigue || 0) - 20);
      await supabase
        .from('players')
        .update({ fatigue: newFatigue })
        .eq('id', player.id);
      restedCount++;
      continue;
    }
    
    // Calculate progress chance
    const progressChance = getProgressChance(player.potential, player.age);
    const progressed = Math.random() < progressChance;
    
    let newProgress = currentProgress;
    let newIndex = currentIndex;
    
    if (progressed && currentIndex < PROGRESS_LEVELS.length - 1) {
      // Move up one level
      newIndex = currentIndex + 1;
      newProgress = PROGRESS_LEVELS[newIndex];
      progressedCount++;
    } else {
      stuckCount++;
    }
    
    // Check for stat gain
    const statGainChance = getStatGainChance(newProgress);
    const gainedStat = Math.random() < statGainChance;
    
    let updates = { training_progress: newProgress };
    let statGained = null;
    
    if (gainedStat) {
      const stat = TRAINING_TYPES[training];
      
      if (stat === 'position') {
        // Position training - improve secondary position rating
        if (player.secondary_position && player.position_ratings) {
          const ratings = player.position_ratings;
          const secPos = player.secondary_position;
          const currentRating = ratings[secPos] || 70;
          const newRating = Math.min(100, currentRating + randomBetween(1, 3));
          ratings[secPos] = newRating;
          updates.position_ratings = ratings;
          statGained = `${secPos} rating ${currentRating} → ${newRating}`;
          
          // If rating hits 95+, they become truly dual-position
          if (newRating >= 95) {
            highlights.push(`🌟 ${player.first_name} ${player.last_name} mastered ${secPos}!`);
          }
        }
      } else if (stat && stat !== 'rest') {
        // Regular stat training
        const currentStat = player[stat] || 70;
        const newStat = Math.min(99, currentStat + 1);
        updates[stat] = newStat;
        statGained = `${stat} ${currentStat} → ${newStat}`;
        
        // Recalculate overall (average of 5 stats)
        const newOverall = Math.round(
          ((stat === 'speed' ? newStat : player.speed) +
           (stat === 'strength' ? newStat : player.strength) +
           (stat === 'skill' ? newStat : player.skill) +
           (stat === 'stamina' ? newStat : player.stamina) +
           (stat === 'defense' ? newStat : player.defense)) / 5
        );
        updates.overall = newOverall;
      }
      
      // Reset progress after stat gain
      updates.training_progress = 'POOR';
      statGainCount++;
      
      highlights.push(`📈 ${player.first_name} ${player.last_name} (${player.teams?.name}): +1 ${statGained}`);
    }
    
    // Add fatigue from training
    updates.fatigue = Math.min(100, (player.fatigue || 0) + randomBetween(3, 8));
    
    await supabase
      .from('players')
      .update(updates)
      .eq('id', player.id);
  }
  
  console.log('==============================');
  console.log('📊 TRAINING RESULTS:\n');
  console.log(`⬆️  Progressed: ${progressedCount}`);
  console.log(`➡️  Stuck: ${stuckCount}`);
  console.log(`💪 Stat gains: ${statGainCount}`);
  console.log(`😴 Rested: ${restedCount}`);
  
  if (highlights.length > 0) {
    console.log('\n🌟 HIGHLIGHTS:\n');
    highlights.forEach(h => console.log(h));
  }
  
  console.log('\n✅ Training update complete!');
}

processTraining();
