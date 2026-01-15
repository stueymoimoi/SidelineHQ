const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Australian first names
const firstNames = [
  'Jack', 'Oliver', 'Noah', 'William', 'Leo', 'Lucas', 'Thomas', 'Henry', 'Charlie', 'James',
  'Ethan', 'Liam', 'Mason', 'Logan', 'Alexander', 'Sebastian', 'Mateo', 'Daniel', 'Michael', 'Owen',
  'Samuel', 'David', 'Joseph', 'Carter', 'Luke', 'Anthony', 'Dylan', 'Isaac', 'Nathan', 'Caleb',
  'Ryan', 'Hunter', 'Joshua', 'Andrew', 'Connor', 'Eli', 'Aaron', 'Tyler', 'Levi', 'Christian',
  'Cooper', 'Harrison', 'Archie', 'Oscar', 'Riley', 'Jayden', 'Kai', 'Blake', 'Max', 'Ben',
  'Jake', 'Finn', 'Angus', 'Mitchell', 'Patrick', 'Billy', 'Lachlan', 'Brodie', 'Bailey', 'Zac',
  'Tane', 'Sione', 'Malakai', 'Tevita', 'Junior', 'Benji', 'Latrell', 'Kalyn', 'Payne', 'Reece'
];

// Australian/Pacific last names for rugby league
const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Wilson', 'Taylor', 'Anderson', 'Thomas', 'Moore',
  'Martin', 'Thompson', 'White', 'Harris', 'Clark', 'Lewis', 'Walker', 'Hall', 'Young', 'King',
  'Wright', 'Green', 'Adams', 'Nelson', 'Mitchell', 'Roberts', 'Turner', 'Phillips', 'Campbell', 'Evans',
  'Collins', 'Stewart', 'Morris', 'Rogers', 'Cook', 'Cooper', 'Bailey', 'Bell', 'Kelly', 'Howard',
  'Taumalolo', 'Fifita', 'Haas', 'Papalii', 'Taupau', 'Kikau', 'Luai', 'Tuipulotu', 'Manu', 'Fonua',
  'Leilua', 'Frizell', 'Murray', 'Cleary', 'Munster', 'Ponga', 'Tedesco', 'Trbojevic', 'Holmes', 'Papenhuyzen',
  'Hunt', 'Reynolds', 'Moses', 'Mahoney', 'Grant', 'Yeo', 'Crichton', 'Wighton', 'Staggs', 'Tupou',
  'Edwards', 'Walsh', 'Hughes', 'Hynes', 'Burton', 'Martin', 'Finau', 'Maka', 'Vea', 'Pangai'
];

// Position requirements for starting XIII
const STARTING_POSITIONS = [
  { position: 'Fullback', count: 1 },
  { position: 'Winger', count: 2 },
  { position: 'Centre', count: 2 },
  { position: 'Five-Eighth', count: 1 },
  { position: 'Halfback', count: 1 },
  { position: 'Prop', count: 2 },
  { position: 'Hooker', count: 1 },
  { position: 'Second Row', count: 2 },
  { position: 'Lock', count: 1 },
];

// Bench depth positions (4-5 forwards, 2-3 backs)
const BENCH_FORWARDS = ['Prop', 'Second Row', 'Lock', 'Hooker'];
const BENCH_BACKS = ['Fullback', 'Winger', 'Centre', 'Five-Eighth', 'Halfback'];

// Position-specific stat weights
const positionStats = {
  'Fullback': { speed: [70, 95], strength: [50, 75], skill: [70, 95], stamina: [70, 90], defense: [55, 80] },
  'Winger': { speed: [75, 99], strength: [50, 75], skill: [65, 90], stamina: [70, 90], defense: [50, 75] },
  'Centre': { speed: [65, 90], strength: [60, 85], skill: [65, 90], stamina: [70, 90], defense: [60, 85] },
  'Five-Eighth': { speed: [60, 85], strength: [50, 75], skill: [75, 99], stamina: [65, 85], defense: [55, 80] },
  'Halfback': { speed: [55, 80], strength: [45, 70], skill: [80, 99], stamina: [65, 85], defense: [50, 75] },
  'Prop': { speed: [40, 65], strength: [80, 99], skill: [45, 70], stamina: [70, 90], defense: [70, 95] },
  'Hooker': { speed: [55, 80], strength: [65, 85], skill: [70, 90], stamina: [75, 95], defense: [65, 85] },
  'Second Row': { speed: [55, 80], strength: [70, 95], skill: [55, 80], stamina: [75, 95], defense: [70, 90] },
  'Lock': { speed: [50, 75], strength: [75, 95], skill: [60, 85], stamina: [80, 99], defense: [75, 95] },
};

// Kicking ranges by position
const kickingRanges = {
  'Fullback': [65, 90],
  'Halfback': [65, 90],
  'Five-Eighth': [60, 85],
  'Hooker': [45, 70],
  'Centre': [45, 70],
  'Winger': [45, 70],
  'Prop': [30, 55],
  'Second Row': [35, 60],
  'Lock': [35, 60],
};

// Secondary position links
const positionLinks = {
  'Fullback': ['Five-Eighth', 'Winger', 'Centre'],
  'Winger': ['Centre', 'Fullback'],
  'Centre': ['Winger', 'Five-Eighth', 'Second Row'],
  'Five-Eighth': ['Halfback', 'Fullback', 'Centre'],
  'Halfback': ['Five-Eighth', 'Hooker'],
  'Prop': ['Second Row', 'Lock'],
  'Hooker': ['Halfback', 'Lock'],
  'Second Row': ['Prop', 'Lock', 'Centre'],
  'Lock': ['Second Row', 'Prop'],
};

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePotential() {
  const roll = Math.random() * 100;
  if (roll < 1.5) return randomBetween(91, 95);      // Generational: 1.5%
  if (roll < 6) return randomBetween(86, 90);        // Gun: 4.5%
  if (roll < 18) return randomBetween(81, 85);       // Good: 12%
  if (roll < 58) return randomBetween(71, 80);       // Solid: 40%
  return randomBetween(60, 70);                       // Journeyman: 42%
}

function generatePlayer(teamId, position, usedNames) {
  let firstName, lastName, fullName;
  
  // Generate unique name
  do {
    firstName = getRandomElement(firstNames);
    lastName = getRandomElement(lastNames);
    fullName = `${firstName} ${lastName}`;
  } while (usedNames.has(fullName));
  
  usedNames.add(fullName);
  
  const age = randomBetween(18, 34);
  const potential = generatePotential();
  
  // Generate stats based on position
  const stats = positionStats[position];
  const speed = randomBetween(stats.speed[0], stats.speed[1]);
  const strength = randomBetween(stats.strength[0], stats.strength[1]);
  const skill = randomBetween(stats.skill[0], stats.skill[1]);
  const stamina = randomBetween(stats.stamina[0], stats.stamina[1]);
  const defense = randomBetween(stats.defense[0], stats.defense[1]);
  
  // Calculate OVR
  let overall = Math.round((speed + strength + skill + stamina + defense) / 5);
  
  // Age-based caps
  if (age <= 20) overall = Math.min(overall, 75);
  else if (age <= 23) overall = Math.min(overall, 85);
  
  // Kicking stat
  const kickRange = kickingRanges[position];
  const kicking = randomBetween(kickRange[0], kickRange[1]);
  
  // Secondary position (higher chance for gems)
  let secondary_position = null;
  const secondaryChance = potential >= 91 ? 0.45 : potential >= 86 ? 0.35 : potential >= 81 ? 0.30 : 0.25;
  
  if (Math.random() < secondaryChance) {
    const links = positionLinks[position];
    if (links && links.length > 0) {
      secondary_position = getRandomElement(links);
    }
  }
  
  return {
    team_id: teamId,
    first_name: firstName,
    last_name: lastName,
    position,
    secondary_position,
    age,
    speed,
    strength,
    skill,
    stamina,
    defense,
    kicking,
    overall,
    potential,
    fatigue: 0,
    is_u21: false,
    current_training: null,
    training_progress: 'NONE',
  };
}

async function hardReset() {
  console.log('🔄 Starting HARD RESET...\n');
  
  // Delete existing data
  console.log('🗑️  Deleting existing data...');
  await supabase.from('player_match_ratings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('match_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('team_tactics').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // Reset team standings
  await supabase.from('teams').update({
    wins: 0,
    draws: 0,
    losses: 0,
    points_for: 0,
    points_against: 0
  }).neq('id', '00000000-0000-0000-0000-000000000000');
  
  console.log('✅ Existing data deleted\n');
  
  // Get all teams
  const { data: teams } = await supabase.from('teams').select('id, name').order('name');
  
  if (!teams || teams.length === 0) {
    console.log('❌ No teams found!');
    return;
  }
  
  console.log(`📋 Generating players for ${teams.length} teams...\n`);
  
  const usedNames = new Set();
  let allPlayers = [];
  let totalGenerational = 0;
  let totalGuns = 0;
  
  for (const team of teams) {
    const teamPlayers = [];
    
    // Generate starting XIII (guaranteed positions)
    for (const posReq of STARTING_POSITIONS) {
      for (let i = 0; i < posReq.count; i++) {
        const player = generatePlayer(team.id, posReq.position, usedNames);
        teamPlayers.push(player);
      }
    }
    
    // Generate 7 bench/depth players
    // 4-5 forwards, 2-3 backs (randomize the split)
    const forwardCount = Math.random() < 0.5 ? 4 : 5;
    const backCount = 7 - forwardCount;
    
    // Add forwards
    for (let i = 0; i < forwardCount; i++) {
      const position = getRandomElement(BENCH_FORWARDS);
      const player = generatePlayer(team.id, position, usedNames);
      teamPlayers.push(player);
    }
    
    // Add backs
    for (let i = 0; i < backCount; i++) {
      const position = getRandomElement(BENCH_BACKS);
      const player = generatePlayer(team.id, position, usedNames);
      teamPlayers.push(player);
    }
    
    // Count gems
    for (const p of teamPlayers) {
      if (p.potential >= 91) totalGenerational++;
      else if (p.potential >= 86) totalGuns++;
    }
    
    allPlayers = allPlayers.concat(teamPlayers);
    console.log(`✅ ${team.name}: ${teamPlayers.length} players`);
  }
  
  // Insert all players in batches
  console.log('\n📤 Inserting players into database...');
  const batchSize = 100;
  for (let i = 0; i < allPlayers.length; i += batchSize) {
    const batch = allPlayers.slice(i, i + batchSize);
    const { error } = await supabase.from('players').insert(batch);
    if (error) {
      console.error('Error inserting batch:', error);
    }
  }
  
  console.log('\n========================================');
  console.log('🎉 HARD RESET COMPLETE!');
  console.log('========================================');
  console.log(`👥 Total Players: ${allPlayers.length}`);
  console.log(`💎 Generational Talents: ${totalGenerational}`);
  console.log(`⭐ Guns: ${totalGuns}`);
  console.log('\n🎯 Next Steps:');
  console.log('   1. Run: node generate-tactics.js');
  console.log('   2. Sign up and pick your team');
  console.log('   3. Invite mates');
  console.log('   4. Run: node generate-fixtures-v2.js');
  console.log('   5. Start Season 0!');
}

hardReset();
