const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials - UPDATE THE KEY!
const supabaseUrl = 'https://souktfzlcdpzwebwfeqd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdWt0ZnpsY2RwendlYndmZXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwODM0MTUsImV4cCI6MjA4MzY1OTQxNX0.-gXuE4CGRG_TsAw4oMlqGV55-B6-jar5vaBFIAj193A';

const supabase = createClient(supabaseUrl, supabaseKey);

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Natural position links - where players might have hidden talent
const positionLinks = {
  'Fullback': ['Five-Eighth', 'Winger', 'Centre'],
  'Five-Eighth': ['Fullback', 'Halfback', 'Hooker'],
  'Halfback': ['Five-Eighth', 'Hooker'],
  'Centre': ['Winger', 'Fullback'],
  'Winger': ['Centre', 'Fullback'],
  'Prop': ['Lock', 'Second Row'],
  'Hooker': ['Halfback', 'Lock'],
  'Second Row': ['Lock', 'Prop', 'Centre'],
  'Lock': ['Second Row', 'Prop']
};

// All positions for rating generation
const allPositions = [
  'Fullback', 'Winger', 'Centre', 'Five-Eighth', 'Halfback',
  'Prop', 'Hooker', 'Second Row', 'Lock'
];

function generatePositionRatings(primaryPosition, hasSecondary, secondaryPosition) {
  const ratings = {};
  
  // Primary position = 100
  ratings[primaryPosition] = 100;
  
  // Secondary position (if has talent) = 85-95
  if (hasSecondary && secondaryPosition) {
    ratings[secondaryPosition] = randomBetween(85, 95);
  }
  
  // Linked positions (not secondary) = 65-80
  const linked = positionLinks[primaryPosition] || [];
  for (const pos of linked) {
    if (!ratings[pos]) {
      ratings[pos] = randomBetween(65, 80);
    }
  }
  
  // All other positions = 40-60
  for (const pos of allPositions) {
    if (!ratings[pos]) {
      ratings[pos] = randomBetween(40, 60);
    }
  }
  
  return ratings;
}

async function main() {
  console.log('🏉 Assigning Position Talents');
  console.log('=============================\n');
  
  // Get all players
  const { data: players, error } = await supabase
    .from('players')
    .select('id, first_name, last_name, position, overall, potential, team_id');
  
  if (error) {
    console.error('Error fetching players:', error);
    return;
  }
  
  console.log(`Found ${players.length} players\n`);
  
  let withSecondary = 0;
  let noSecondary = 0;
  const dualPosition = [];
  
  for (const player of players) {
    const primary = player.position;
    const linked = positionLinks[primary] || [];
    
    // 25% chance of having a hidden secondary position talent
    // Higher potential = higher chance (35% for guns, 45% for generational)
    let secondaryChance = 0.25;
    if (player.potential >= 91) secondaryChance = 0.45;
    else if (player.potential >= 86) secondaryChance = 0.35;
    else if (player.potential >= 81) secondaryChance = 0.30;
    
    const hasSecondary = Math.random() < secondaryChance;
    let secondaryPosition = null;
    
    if (hasSecondary && linked.length > 0) {
      // Pick a random linked position as secondary
      secondaryPosition = linked[Math.floor(Math.random() * linked.length)];
      withSecondary++;
      
      dualPosition.push({
        name: `${player.first_name} ${player.last_name}`,
        primary: primary,
        secondary: secondaryPosition,
        overall: player.overall,
        potential: player.potential
      });
    } else {
      noSecondary++;
    }
    
    // Generate position ratings
    const ratings = generatePositionRatings(primary, hasSecondary, secondaryPosition);
    
    // Update player
    const { error: updateError } = await supabase
      .from('players')
      .update({
        secondary_position: secondaryPosition,
        position_ratings: ratings
      })
      .eq('id', player.id);
    
    if (updateError) {
      console.error(`Error updating ${player.first_name} ${player.last_name}:`, updateError);
    }
  }
  
  console.log('=============================');
  console.log('📊 RESULTS:\n');
  console.log(`✅ Players with secondary position: ${withSecondary}`);
  console.log(`➖ Players with no secondary: ${noSecondary}`);
  console.log(`\n📋 Dual-position players (${dualPosition.length}):\n`);
  
  // Show some examples (top 20 by potential)
  dualPosition.sort((a, b) => b.potential - a.potential);
  dualPosition.slice(0, 20).forEach(p => {
    const potLabel = p.potential >= 91 ? '💎' : p.potential >= 86 ? '⭐' : '';
    console.log(`${potLabel} ${p.name}: ${p.primary} / ${p.secondary} (${p.overall} OVR, ${p.potential} POT)`);
  });
  
  console.log('\n✅ Done! Position talents assigned.');
}

main();
