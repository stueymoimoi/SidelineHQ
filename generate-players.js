const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const supabaseUrl = 'https://souktfzlcdpzwebwfeqd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdWt0ZnpsY2RwendlYndmZXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwODM0MTUsImV4cCI6MjA4MzY1OTQxNX0.-gXuE4CGRG_TsAw4oMlqGV55-B6-jar5vaBFIAj193A';

const supabase = createClient(supabaseUrl, supabaseKey);

// Name pools
const firstNames = [
  // Aussie (80%)
  'Jack', 'Tom', 'Ryan', 'Cooper', 'Lachlan', 'Josh', 'Matt', 'Ben', 'Luke', 'Sam',
  'Jake', 'Dylan', 'Ethan', 'Will', 'James', 'Daniel', 'Michael', 'Chris', 'Nathan', 'Adam',
  'Blake', 'Connor', 'Riley', 'Bailey', 'Zac', 'Jayden', 'Beau', 'Kai', 'Reece', 'Harry',
  'Oscar', 'Charlie', 'Max', 'Archie', 'Leo', 'Henry', 'Mason', 'Logan', 'Hunter', 'Finn',
  'Noah', 'Oliver', 'George', 'Angus', 'Patrick', 'Sean', 'Brendan', 'Scott', 'Craig', 'Shane',
  'Marcus', 'Aaron', 'Kyle', 'Brett', 'Corey', 'Joel', 'Troy', 'Gavin', 'Dean', 'Darren',
  // Islander (15%)
  'Sione', 'Tevita', 'Joseph', 'David', 'Junior', 'William', 'Malakai', 'Isaiah', 'Josiah', 'John',
  // Indigenous/Mixed (5%)
  'Cody', 'Tyrell', 'Jermaine', 'Kurtley', 'Jarrod'
];

const lastNames = [
  // Aussie (70%)
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Wilson', 'Taylor', 'Anderson', 'Thomas', 'Jackson',
  'White', 'Harris', 'Martin', 'Thompson', 'Walker', 'Mitchell', 'Robinson', 'Clark', 'Lewis', 'Young',
  'King', 'Wright', 'Scott', 'Green', 'Baker', 'Hill', 'Moore', 'Kelly', 'Hall', 'Cooper',
  'Murray', 'Palmer', 'Stewart', 'Turner', 'Collins', 'Morgan', 'Bell', 'Ward', 'Cox', 'Russell',
  'Gray', 'Reynolds', 'Harvey', 'Graham', 'Stone', 'Webb', 'Gibson', 'Ellis', 'Chapman', 'Tucker',
  'Grant', 'Harper', 'Warren', 'Gordon', 'Ford', 'Spencer', 'Lawrence', 'Newton', 'Burton', 'Douglas',
  'Day', 'Knight', 'Rose', 'Lane', 'Mills', 'Pearce', 'Hunt', 'Holmes', 'Black', 'Burns',
  'Walsh', 'Burke', 'Dunn', 'Barker', 'Marsh', 'Cross', 'Payne', 'Sharp', 'Steele', 'Holt',
  'Carr', 'Fleming', 'Holland', 'Watts', 'Owen', 'Fields', 'Lyons', 'Frost', 'Mann', 'Drake',
  'Booth', 'Reid', 'Craig', 'Dawson', 'Dean', 'Hardy', 'Griffith', 'Stephens', 'Arnold', 'Page',
  // Islander (25%)
  'Tuipulotu', 'Havili', 'Folau', 'Tali', 'Maka', 'Latu', 'Vea', 'Ahki', 'Niko', 'Moala',
  'Fotu', 'Tupou', 'Sao', 'Vaka', 'Tonga', 'Samoa', 'Finau', 'Koloi', 'Pulu', 'Manu',
  // Mixed (5%)
  'Edwards', 'Roberts', 'Phillips', 'Campbell', 'Bennett', 'Barnes'
];

const positions = ['Fullback', 'Winger', 'Centre', 'Five-Eighth', 'Halfback', 'Prop', 'Hooker', 'Second Row', 'Lock', 'Utility'];

// Helper functions
function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePlayerName(usedNames) {
  let name;
  let attempts = 0;
  do {
    name = `${randomFrom(firstNames)} ${randomFrom(lastNames)}`;
    attempts++;
  } while (usedNames.has(name) && attempts < 100);
  usedNames.add(name);
  return name.split(' ');
}

function generateAttributes(overall, position) {
  const variance = 8;
  let speed, strength, skill, stamina, defense;
  
  // Position-based attribute weighting
  if (position === 'Fullback' || position === 'Winger') {
    speed = Math.min(99, Math.max(50, overall + randomBetween(-2, 8)));
    strength = Math.min(99, Math.max(50, overall + randomBetween(-10, 2)));
    skill = Math.min(99, Math.max(50, overall + randomBetween(-3, 5)));
  } else if (position === 'Prop' || position === 'Lock') {
    speed = Math.min(99, Math.max(50, overall + randomBetween(-12, -2)));
    strength = Math.min(99, Math.max(50, overall + randomBetween(2, 10)));
    skill = Math.min(99, Math.max(50, overall + randomBetween(-8, 2)));
  } else if (position === 'Halfback' || position === 'Five-Eighth') {
    speed = Math.min(99, Math.max(50, overall + randomBetween(-4, 4)));
    strength = Math.min(99, Math.max(50, overall + randomBetween(-8, 0)));
    skill = Math.min(99, Math.max(50, overall + randomBetween(2, 10)));
  } else {
    speed = Math.min(99, Math.max(50, overall + randomBetween(-5, 5)));
    strength = Math.min(99, Math.max(50, overall + randomBetween(-5, 5)));
    skill = Math.min(99, Math.max(50, overall + randomBetween(-5, 5)));
  }
  
  stamina = Math.min(99, Math.max(50, overall + randomBetween(-5, 5)));
  defense = Math.min(99, Math.max(50, overall + randomBetween(-5, 5)));
  
  return { speed, strength, skill, stamina, defense };
}

function generateSquad(teamOverall, usedNames) {
  const players = [];
  
  // Squad structure: 17 senior + 3 academy
  const seniorPositions = [
    'Fullback', 'Winger', 'Winger', 'Centre', 'Centre',
    'Five-Eighth', 'Halfback', 'Prop', 'Prop', 'Hooker',
    'Second Row', 'Second Row', 'Lock', 'Utility', 'Utility', 'Utility', 'Utility'
  ];
  
  const academyPositions = ['Halfback', 'Prop', 'Centre'];
  
  // Generate senior players with ratings around team overall
  seniorPositions.forEach((position, index) => {
    // Star players (first 3-4)
    let playerOverall;
    if (index < 2) {
      playerOverall = teamOverall + randomBetween(2, 6);
    } else if (index < 6) {
      playerOverall = teamOverall + randomBetween(-1, 4);
    } else if (index < 10) {
      playerOverall = teamOverall + randomBetween(-3, 2);
    } else if (index < 13) {
      playerOverall = teamOverall + randomBetween(-5, 0);
    } else {
      playerOverall = teamOverall + randomBetween(-8, -2);
    }
    
    playerOverall = Math.min(95, Math.max(55, playerOverall));
    
    const [firstName, lastName] = generatePlayerName(usedNames);
    const age = randomBetween(22, 32);
    const attrs = generateAttributes(playerOverall, position);
    
    players.push({
      first_name: firstName,
      last_name: lastName,
      position: position,
      age: age,
      overall: playerOverall,
      ...attrs,
      is_academy: false,
      academy_weeks: 0
    });
  });
  
  // Generate academy players (younger, lower rated)
  academyPositions.forEach(position => {
    const playerOverall = teamOverall + randomBetween(-18, -10);
    const [firstName, lastName] = generatePlayerName(usedNames);
    const age = randomBetween(18, 19);
    const attrs = generateAttributes(playerOverall, position);
    
    players.push({
      first_name: firstName,
      last_name: lastName,
      position: position,
      age: age,
      overall: Math.max(55, playerOverall),
      ...attrs,
      is_academy: true,
      academy_weeks: 0
    });
  });
  
  return players;
}

async function main() {
  console.log('🏉 SidelineHQ Player Generator');
  console.log('==============================\n');
  
  // Get teams that don't have players yet (excluding Division 1 which we did manually)
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name, overall_rating, division')
    .gt('division', 1)
    .order('division', { ascending: true });
  
  if (teamsError) {
    console.error('Error fetching teams:', teamsError);
    return;
  }
  
  console.log(`Found ${teams.length} teams to generate players for\n`);
  
  const usedNames = new Set();
  let totalPlayers = 0;
  
  for (const team of teams) {
    console.log(`Generating squad for ${team.name} (Div ${team.division}, ${team.overall_rating} OVR)...`);
    
    const squad = generateSquad(team.overall_rating, usedNames);
    
    // Add team_id to each player
    const playersWithTeam = squad.map(player => ({
      ...player,
      team_id: team.id
    }));
    
    // Insert players
    const { error: insertError } = await supabase
      .from('players')
      .insert(playersWithTeam);
    
    if (insertError) {
      console.error(`Error inserting players for ${team.name}:`, insertError);
    } else {
      console.log(`✅ ${team.name} - ${squad.length} players created`);
      totalPlayers += squad.length;
    }
  }
  
  console.log('\n==============================');
  console.log(`🎉 Done! Created ${totalPlayers} players for ${teams.length} teams`);
}

main();