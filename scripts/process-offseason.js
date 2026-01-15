const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials - UPDATE THE KEY!
const supabaseUrl = 'https://souktfzlcdpzwebwfeqd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdWt0ZnpsY2RwendlYndmZXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwODM0MTUsImV4cCI6MjA4MzY1OTQxNX0.-gXuE4CGRG_TsAw4oMlqGV55-B6-jar5vaBFIAj193A';

const supabase = createClient(supabaseUrl, supabaseKey);

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function processOffseason(season) {
  console.log('🏖️  SidelineHQ Off-Season Processor');
  console.log('====================================');
  console.log(`📅 Processing end of Season ${season}\n`);
  
  // Get all players
  const { data: players, error } = await supabase
    .from('players')
    .select('*, teams(name)');
  
  if (error) {
    console.error('Error fetching players:', error);
    return;
  }
  
  console.log(`Found ${players.length} players to process\n`);
  
  let agedUp = 0;
  let promoted = 0;
  let declined = 0;
  let retired = 0;
  
  const highlights = [];
  const retirements = [];
  const declines = [];
  const promotions = [];
  
  for (const player of players) {
    const updates = {};
    const oldAge = player.age;
    const newAge = oldAge + 1;
    
    // 1. Age up
    updates.age = newAge;
    agedUp++;
    
    // 2. Reset fatigue
    updates.fatigue = 0;
    
    // 3. Reset training
    updates.current_training = null;
    updates.training_progress = 'NONE';
    
    // 4. U21s auto-promote at 21
    if (player.is_u21 && newAge >= 21) {
      updates.is_u21 = false;
      promoted++;
      promotions.push(`🎓 ${player.first_name} ${player.last_name} (${player.teams?.name}) promoted from U21s!`);
    }
    
    // 5. Decline for older players
    let declineAmount = 0;
    
    if (newAge >= 35) {
      // 35+ - High retirement risk (30%) or heavy decline
      if (Math.random() < 0.30) {
        // Retirement!
        retired++;
        retirements.push(`👋 ${player.first_name} ${player.last_name} (${player.teams?.name}) - Age ${newAge}, ${player.overall} OVR - RETIRED`);
        
        // Delete player
        await supabase.from('players').delete().eq('id', player.id);
        continue; // Skip update, player is gone
      } else {
        // Heavy decline: -2 to -4 to random stats
        declineAmount = randomBetween(2, 4);
      }
    } else if (newAge >= 33) {
      // 33-34 - Likely decline (50% chance, -1 to -2)
      if (Math.random() < 0.50) {
        declineAmount = randomBetween(1, 2);
      }
    } else if (newAge >= 30) {
      // 30-32 - Small decline risk (20% chance, -1)
      if (Math.random() < 0.20) {
        declineAmount = 1;
      }
    }
    
    // Apply decline to random stats
    if (declineAmount > 0) {
      declined++;
      const stats = ['speed', 'strength', 'skill', 'stamina', 'defense'];
      const declinedStats = [];
      
      for (let i = 0; i < declineAmount; i++) {
        const stat = stats[randomBetween(0, stats.length - 1)];
        const oldVal = player[stat] || 70;
        const newVal = Math.max(40, oldVal - 1);
        updates[stat] = newVal;
        declinedStats.push(`${stat} ${oldVal}→${newVal}`);
      }
      
      // Recalculate OVR
      const newSpeed = updates.speed || player.speed;
      const newStrength = updates.strength || player.strength;
      const newSkill = updates.skill || player.skill;
      const newStamina = updates.stamina || player.stamina;
      const newDefense = updates.defense || player.defense;
      updates.overall = Math.round((newSpeed + newStrength + newSkill + newStamina + newDefense) / 5);
      
      declines.push(`📉 ${player.first_name} ${player.last_name} (${player.teams?.name}) Age ${newAge}: ${declinedStats.join(', ')}`);
    }
    
    // Update player
    await supabase.from('players').update(updates).eq('id', player.id);
  }
  
  // Print results
  console.log('====================================');
  console.log('📊 OFF-SEASON RESULTS:\n');
  console.log(`🎂 Aged up: ${agedUp} players`);
  console.log(`🎓 Promoted from U21s: ${promoted}`);
  console.log(`📉 Declined: ${declined}`);
  console.log(`👋 Retired: ${retired}`);
  
  if (promotions.length > 0) {
    console.log('\n🎓 PROMOTIONS:');
    promotions.forEach(p => console.log(p));
  }
  
  if (declines.length > 0) {
    console.log('\n📉 DECLINES:');
    declines.slice(0, 20).forEach(d => console.log(d));
    if (declines.length > 20) {
      console.log(`   ... and ${declines.length - 20} more`);
    }
  }
  
  if (retirements.length > 0) {
    console.log('\n👋 RETIREMENTS:');
    retirements.forEach(r => console.log(r));
  }
  
  console.log('\n====================================');
  console.log('✅ Off-season complete!');
  console.log('🏉 Ready for Season ' + (season + 1) + '!');
}

// Get season from command line or default to 0
const season = parseInt(process.argv[2]) || 0;
processOffseason(season);
