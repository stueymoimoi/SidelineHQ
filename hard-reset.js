const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials - UPDATE THE KEY!
const supabaseUrl = 'https://souktfzlcdpzwebwfeqd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdWt0ZnpsY2RwendlYndmZXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwODM0MTUsImV4cCI6MjA4MzY1OTQxNX0.-gXuE4CGRG_TsAw4oMlqGV55-B6-jar5vaBFIAj193A';

const supabase = createClient(supabaseUrl, supabaseKey);

// Player name data
const firstNames = [
  'Jack', 'Noah', 'Oliver', 'William', 'Leo', 'Henry', 'Charlie', 'Mason',
  'Oscar', 'Archie', 'Hunter', 'Beau', 'Finn', 'Logan', 'Max', 'Harry',
  'Reece', 'Kai', 'Jayden', 'Zac', 'Connor', 'Cody', 'Bailey', 'Tevita',
  'Sione', 'Junior', 'Tyrell', 'Jermaine', 'David', 'Chris', 'Adam', 'Matt',
  'Ben', 'Sam', 'Ryan', 'Nathan', 'Luke', 'Josh', 'Blake', 'Jarrod',
  'Dylan', 'Ethan', 'Liam', 'James', 'Thomas', 'Daniel', 'Michael', 'Will'
];

const lastNames = [
  'Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Johnson', 'White',
  'Martin', 'Thompson', 'Anderson', 'Walker', 'Harris', 'Clark', 'Lewis', 'Young',
  'Hall', 'King', 'Wright', 'Scott', 'Green', 'Baker', 'Hill', 'Mitchell',
  'Taumalolo', 'Fifita', 'Papalii', 'Taupau', 'Manu', 'Fotu', 'Vunipola', 'Koloi',
  'Finau', 'Latu', 'Vea', 'Maka', 'Folau', 'Tuipulotu', 'Pulu', 'Samoa',
  'Grant', 'Roberts', 'Owen', 'Fleming', 'Steele', 'Payne', 'Holland', 'Niko'
];

const positions = [
  'Fullback', 'Winger', 'Centre', 'Five-Eighth', 'Halfback',
  'Prop', 'Hooker', 'Second Row', 'Lock'
];

const positionWeights = {
  'Fullback': 5,
  'Winger': 13,
  'Centre': 13,
  'Five-Eighth': 5,
  'Halfback': 8,
  'Prop': 18,
  'Hooker': 8,
  'Second Row': 22,
  'Lock': 8
};

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

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomPosition() {
  const weighted = [];
  for (const [pos, weight] of Object.entries(positionWeights)) {
    for (let i = 0; i < weight; i++) {
      weighted.push(pos);
    }
  }
  return weighted[randomBetween(0, weighted.length - 1)];
}

function generatePlayer(teamId, isU21) {
  const firstName = firstNames[randomBetween(0, firstNames.length - 1)];
  const lastName = lastNames[randomBetween(0, lastNames.length - 1)];
  const position = getRandomPosition();
  
  // Age: U21 = 18-20, Senior = 21-34
  const age = isU21 ? randomBetween(18, 20) : randomBetween(21, 34);
  
  // Stats based on age (younger = lower but more potential)
  let baseOvr;
  if (age <= 20) baseOvr = randomBetween(55, 72);
  else if (age <= 23) baseOvr = randomBetween(65, 80);
  else if (age <= 28) baseOvr = randomBetween(70, 88);
  else if (age <= 31) baseOvr = randomBetween(68, 85);
  else baseOvr = randomBetween(60, 78);
  
  // Individual stats vary around base
  const speed = Math.min(99, Math.max(40, baseOvr + randomBetween(-8, 8)));
  const strength = Math.min(99, Math.max(40, baseOvr + randomBetween(-8, 8)));
  const skill = Math.min(99, Math.max(40, baseOvr + randomBetween(-8, 8)));
  const stamina = Math.min(99, Math.max(40, baseOvr + randomBetween(-8, 8)));
  const defense = Math.min(99, Math.max(40, baseOvr + randomBetween(-8, 8)));
  
  const overall = Math.round((speed + strength + skill + stamina + defense) / 5);
  
  // Kicking based on position
  let kicking;
  if (['Fullback', 'Halfback'].includes(position)) {
    kicking = randomBetween(65, 90);
  } else if (['Five-Eighth'].includes(position)) {
    kicking = randomBetween(60, 85);
  } else if (['Hooker', 'Centre'].includes(position)) {
    kicking = randomBetween(45, 70);
  } else if (['Winger'].includes(position)) {
    kicking = randomBetween(45, 70);
  } else {
    kicking = randomBetween(30, 60);
  }
  
  // Hidden potential
  const potRoll = Math.random() * 100;
  let potential;
  if (potRoll < 1.5) {
    potential = randomBetween(91, 95); // Generational
  } else if (potRoll < 6) {
    potential = randomBetween(86, 90); // Gun
  } else if (potRoll < 18) {
    potential = randomBetween(81, 85); // Good
  } else if (potRoll < 58) {
    potential = randomBetween(71, 80); // Solid
  } else {
    potential = randomBetween(60, 70); // Journeyman
  }
  // Potential can't be lower than current
  potential = Math.max(potential, overall);
  potential = Math.min(potential, 95);
  
  // Secondary position (30% chance)
  let secondaryPosition = null;
  if (Math.random() < 0.30) {
    const links = positionLinks[position] || [];
    if (links.length > 0) {
      secondaryPosition = links[randomBetween(0, links.length - 1)];
    }
  }
  
  return {
    team_id: teamId,
    first_name: firstName,
    last_name: lastName,
    position: position,
    secondary_position: secondaryPosition,
    age: age,
    overall: overall,
    speed: speed,
    strength: strength,
    skill: skill,
    stamina: stamina,
    defense: defense,
    kicking: kicking,
    potential: potential,
    is_u21: isU21,
    fatigue: 0,
    current_training: null,
    training_progress: 'NONE'
  };
}

async function hardReset() {
  console.log('🔄 SidelineHQ HARD RESET');
  console.log('========================\n');
  console.log('⚠️  This will DELETE all players and regenerate everything!\n');
  
  // Step 1: Clear all data
  console.log('🗑️  Clearing data...');
  
  console.log('   - Deleting player match ratings...');
  await supabase.from('player_match_ratings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  console.log('   - Deleting match results...');
  await supabase.from('match_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  console.log('   - Deleting tactics...');
  await supabase.from('team_tactics').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  console.log('   - Deleting players...');
  await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  console.log('   - Resetting team standings...');
  await supabase.from('teams').update({
    wins: 0,
    losses: 0,
    draws: 0,
    points_for: 0,
    points_against: 0
  }).neq('id', '00000000-0000-0000-0000-000000000000');
  
  console.log('✅ All data cleared!\n');
  
  // Step 2: Get all teams
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, division')
    .order('division', { ascending: true })
    .order('name', { ascending: true });
  
  console.log(`📋 Found ${teams.length} teams\n`);
  
  // Step 3: Generate players for each team
  console.log('👥 Generating players...\n');
  
  let totalPlayers = 0;
  let generational = 0;
  let guns = 0;
  
  for (const team of teams) {
    const players = [];
    
    // 17 senior players
    for (let i = 0; i < 17; i++) {
      players.push(generatePlayer(team.id, false));
    }
    
    // 3 U21 players
    for (let i = 0; i < 3; i++) {
      players.push(generatePlayer(team.id, true));
    }
    
    // Insert players
    const { error } = await supabase.from('players').insert(players);
    
    if (error) {
      console.log(`❌ ${team.name}: Error - ${error.message}`);
    } else {
      // Count gems
      const teamGens = players.filter(p => p.potential >= 91).length;
      const teamGuns = players.filter(p => p.potential >= 86 && p.potential < 91).length;
      generational += teamGens;
      guns += teamGuns;
      
      const gemText = teamGens > 0 ? ` 💎x${teamGens}` : '';
      const gunText = teamGuns > 0 ? ` ⭐x${teamGuns}` : '';
      console.log(`✅ ${team.name} (Div ${team.division}): 20 players${gemText}${gunText}`);
      totalPlayers += 20;
    }
  }
  
  console.log('\n========================');
  console.log('📊 RESET COMPLETE!\n');
  console.log(`👥 Total Players: ${totalPlayers}`);
  console.log(`💎 Generational Talents: ${generational}`);
  console.log(`⭐ Guns: ${guns}`);
  
  console.log('\n🎯 Next Steps:');
  console.log('   1. Run: node generate-tactics.js');
  console.log('   2. Sign up and pick your team');
  console.log('   3. Invite mates');
  console.log('   4. Run: node generate-fixtures-v2.js');
  console.log('   5. Start Season 0!');
}

hardReset();
