const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials - UPDATE THE KEY!
const supabaseUrl = 'https://souktfzlcdpzwebwfeqd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdWt0ZnpsY2RwendlYndmZXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwODM0MTUsImV4cCI6MjA4MzY1OTQxNX0.-gXuE4CGRG_TsAw4oMlqGV55-B6-jar5vaBFIAj193A';

const supabase = createClient(supabaseUrl, supabaseKey);

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePotential(currentOvr, age, isU21) {
  const roll = Math.random() * 100;
  let potential;
  
  if (roll < 1.5) {
    // 1.5% - Generational (91-95)
    potential = randomBetween(91, 95);
  } else if (roll < 6) {
    // 4.5% - Gun (86-90)
    potential = randomBetween(86, 90);
  } else if (roll < 18) {
    // 12% - Good (81-85)
    potential = randomBetween(81, 85);
  } else if (roll < 58) {
    // 40% - Solid (71-80)
    potential = randomBetween(71, 80);
  } else {
    // 42% - Journeyman (60-70)
    potential = randomBetween(60, 70);
  }
  
  // Ensure potential is at least current OVR
  potential = Math.max(potential, currentOvr);
  
  // Cap at 95
  potential = Math.min(potential, 95);
  
  return potential;
}

async function main() {
  console.log('💎 Assigning Hidden Potential to All Players');
  console.log('============================================\n');
  
  // Get all players
  const { data: players, error } = await supabase
    .from('players')
    .select('id, first_name, last_name, overall, age, is_u21, team_id');
  
  if (error) {
    console.error('Error fetching players:', error);
    return;
  }
  
  // Get teams for display
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name');
  
  const teamMap = {};
  teams.forEach(t => teamMap[t.id] = t.name);
  
  console.log(`Found ${players.length} players\n`);
  
  let generational = 0;
  let guns = 0;
  let good = 0;
  let solid = 0;
  let journeyman = 0;
  
  const gems = [];
  
  for (const player of players) {
    const potential = generatePotential(player.overall, player.age, player.is_u21);
    
    // Update player
    const { error: updateError } = await supabase
      .from('players')
      .update({ potential: potential })
      .eq('id', player.id);
    
    if (updateError) {
      console.error(`Error updating ${player.first_name} ${player.last_name}:`, updateError);
    } else {
      if (potential >= 91) {
        generational++;
        gems.push({ ...player, potential, tier: '💎 GENERATIONAL' });
      } else if (potential >= 86) {
        guns++;
        gems.push({ ...player, potential, tier: '⭐ GUN' });
      } else if (potential >= 81) {
        good++;
      } else if (potential >= 71) {
        solid++;
      } else {
        journeyman++;
      }
    }
  }
  
  // Display gems
  console.log('🏆 SPECIAL TALENTS FOUND:\n');
  gems.sort((a, b) => b.potential - a.potential);
  gems.forEach(p => {
    const team = teamMap[p.team_id] || 'Unknown Team';
    console.log(`${p.tier}: ${p.first_name} ${p.last_name} (${team})`);
    console.log(`   OVR: ${p.overall} → Potential: ${p.potential} | Age: ${p.age}\n`);
  });
  
  console.log('============================================');
  console.log('📊 FINAL DISTRIBUTION:');
  console.log(`💎 Generational (91-95): ${generational}`);
  console.log(`⭐ Guns (86-90): ${guns}`);
  console.log(`✓ Good (81-85): ${good}`);
  console.log(`• Solid (71-80): ${solid}`);
  console.log(`· Journeyman (60-70): ${journeyman}`);
  console.log(`\nTotal: ${players.length} players`);
  console.log('\n✅ Done! Hidden potential assigned to all players.');
}

main();