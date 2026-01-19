// scripts/topup-international-players.ts
// One-time script to top up all teams to 25 players with young internationals
// Run with: npx ts-node scripts/topup-international-players.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================
// CONSTANTS
// ============================================

const TARGET_SQUAD_SIZE = 25;

const INTERNATIONAL_NATIONALITIES = ['ENG', 'NZL', 'FIJ', 'TON', 'SAM', 'PNG'];

const NAME_POOLS: Record<string, { firstNames: string[], lastNames: string[] }> = {
  ENG: {
    firstNames: ['Jack', 'Tom', 'James', 'Harry', 'George', 'Oliver', 'Charlie', 'William', 'Henry', 'Thomas', 'Sam', 'Joe', 'Ben', 'Luke', 'Ryan', 'Liam', 'Jake', 'Max', 'Callum', 'Ethan', 'Josh', 'Alfie', 'Archie', 'Oscar'],
    lastNames: ['Smith', 'Jones', 'Williams', 'Taylor', 'Brown', 'Davies', 'Wilson', 'Evans', 'Thompson', 'Roberts', 'Johnson', 'Walker', 'Wright', 'Robinson', 'Hall', 'Clarke', 'Green', 'Wood', 'Harris', 'Martin', 'Jackson', 'White', 'Lewis', 'Scott']
  },
  NZL: {
    firstNames: ['Tane', 'Nikau', 'Rawiri', 'Wiremu', 'Manaaki', 'Ihaia', 'Kauri', 'Tamati', 'Tipene', 'Hemi', 'Matiu', 'Pita', 'Rewi', 'Tama', 'Eru', 'Josh', 'Shaun', 'Benji', 'Manu', 'Kieran', 'Joseph', 'Jordan', 'Dylan', 'Brandon'],
    lastNames: ['Taukeiaho', 'Manu', 'Tuivasa-Sheck', 'Rapana', 'Nikora', 'Tapine', 'Williams', 'Harris', 'Thompson', 'Hughes', 'Smith', 'Johnson', 'Marshall', 'Henare', 'Mannering', 'Hurrell', 'Hiku', 'Lino', 'Nikorima', 'Kearney', 'Laulala', 'Sipley', 'Afoa', 'Curran']
  },
  TON: {
    firstNames: ['Jason', 'Manu', 'Tevita', 'Sione', 'Taniela', 'Siliva', 'Konrad', 'Daniel', 'David', 'Felise', 'Sitili', 'Kotoni', 'Will', 'Junior', 'Ata', 'Sio', 'Fotu', 'Tui', 'Viliami', 'Malakai', 'Michael', 'Mosese'],
    lastNames: ['Taumalolo', 'Fifita', 'Havili', 'Kaufusi', 'Pangai', 'Fonua', 'Fainu', 'Katoa', 'Tatola', 'Tupou', 'Lolohea', 'Maumalo', 'Koloamatangi', 'Hopoate', 'Finau', 'Tonga', 'Folau', 'Fotuaika', 'Haas', 'Taupau', 'Talakai', 'Vea', 'Langi']
  },
  SAM: {
    firstNames: ['Jarome', 'Brian', 'Junior', 'Anthony', 'Martin', 'Tim', 'Josh', 'Luciano', 'Spencer', 'Chanel', 'Jaydn', 'Isaiah', 'Stephen', 'Francis', 'Joseph', 'Danny', 'Manu', 'Tino', 'Tyrone', 'Sebastian', 'Jerome', 'Penani', 'Leone'],
    lastNames: ['Luai', "To'o", 'Papalii', 'Aloiai', 'Milford', 'Afoa', 'Leilua', 'Lafai', 'Talagi', 'Tago', 'Crichton', 'Tagataese', 'Faamausili', 'Tuimavave', 'Paulo', 'Tuilagi', 'Sao', 'Sauiluma', 'Gavet', 'Peteru', 'Amone', 'Levi', 'Soliola', 'Vitale']
  },
  FIJ: {
    firstNames: ['Maika', 'Suliasi', 'Marcelo', 'Viliame', 'Semi', 'Apisai', 'Kevin', 'Mikaele', 'Tariq', 'Henry', 'Brayden', 'Taane', 'Pio', 'Api', 'Sitiveni', 'Waisea', 'Joeli', 'Josefa', 'Nemani', 'Iowane', 'Setareki', 'Penioni', 'Kini'],
    lastNames: ['Sivo', 'Vunivalu', 'Naiqama', 'Koroibete', 'Tuqiri', 'Radradra', 'Koroisau', 'Waqaniburotu', 'Nakubuwai', 'Uluinayau', 'Bai', 'Mataka', 'Nawaqanitawase', 'Lovobalavu', 'Naivalu', 'Tuisova', 'Botia', 'Yato', 'Mata', 'Natogo', 'Qera', 'Delai']
  },
  PNG: {
    firstNames: ['David', 'James', 'Michael', 'John', 'Paul', 'William', 'Justin', 'Alex', 'Marcus', 'Nene', 'Wartovo', 'Kato', 'Enock', 'Thompson', 'Wellington', 'Edwin', 'Norman', 'Watson', 'Xavier', 'Lachlan', 'Terry', 'Roderick', 'Emmanuel', 'Nixon'],
    lastNames: ['Lam', 'Aiton', 'Segeyaro', 'Mead', 'Boas', 'Songoro', 'Ottio', 'Mundo', 'Kila', 'Ako', 'Mamando', 'Simon', 'Tep', 'Numbaru', 'Kahu', 'Namba', 'Gimai', 'Morea', 'Wangi', 'Ongogo', 'Minga', 'Olam', 'Silas', 'Albert']
  }
};

const POSITIONS = ['Prop', 'Hooker', 'Second Row', 'Lock', 'Halfback', 'Five-Eighth', 'Centre', 'Winger', 'Fullback'];

const POSITION_STATS: Record<string, { primary: string[], secondary: string[], minor: string[], negligible: string[] }> = {
  'Prop': { primary: ['strength', 'tackling'], secondary: ['stamina', 'passing'], minor: ['speed'], negligible: ['kicking'] },
  'Hooker': { primary: ['passing', 'stamina'], secondary: ['tackling', 'speed'], minor: ['strength'], negligible: ['kicking'] },
  'Second Row': { primary: ['strength', 'tackling'], secondary: ['stamina', 'passing'], minor: ['speed'], negligible: ['kicking'] },
  'Lock': { primary: ['tackling', 'stamina'], secondary: ['strength', 'passing'], minor: ['speed'], negligible: ['kicking'] },
  'Halfback': { primary: ['passing', 'kicking'], secondary: ['speed', 'stamina'], minor: ['tackling'], negligible: ['strength'] },
  'Five-Eighth': { primary: ['passing', 'kicking'], secondary: ['speed', 'tackling'], minor: ['stamina'], negligible: ['strength'] },
  'Centre': { primary: ['tackling', 'passing'], secondary: ['speed', 'strength'], minor: ['stamina'], negligible: ['kicking'] },
  'Winger': { primary: ['speed', 'passing'], secondary: ['stamina', 'tackling'], minor: ['strength'], negligible: ['kicking'] },
  'Fullback': { primary: ['speed', 'passing'], secondary: ['kicking', 'tackling'], minor: ['stamina'], negligible: ['strength'] }
};

const VISIBLE_TRAITS = ['fiery', 'confident', 'showman', 'composed', 'clutch', 'prodigy', 'leader', 'loyal'];
const HIDDEN_TRAITS = ['big_game_player', 'front_runner', 'iron_man', 'glass_cannon', 'impact_sub', 'workhorse', 'x_factor'];
const TRAINING_AFFINITIES = ['speed', 'strength', 'power', 'passing', 'stamina', 'tackling', 'kicking'];
const AFFINITY_LEVELS = ['none', 'low', 'medium', 'high'];

// ============================================
// HELPER FUNCTIONS
// ============================================

const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const randomChoice = <T,>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

const generateTrainingAffinity = (isHiddenGem: boolean): Record<string, string> => {
  const affinity: Record<string, string> = {};
  
  for (const stat of TRAINING_AFFINITIES) {
    if (isHiddenGem) {
      // Hidden gems: 40% high, 40% medium, 15% low, 5% none
      const roll = Math.random();
      if (roll < 0.40) affinity[stat] = 'high';
      else if (roll < 0.80) affinity[stat] = 'medium';
      else if (roll < 0.95) affinity[stat] = 'low';
      else affinity[stat] = 'none';
    } else {
      // Normal players: 5% high, 15% medium, 30% low, 50% none
      const roll = Math.random();
      if (roll < 0.05) affinity[stat] = 'high';
      else if (roll < 0.20) affinity[stat] = 'medium';
      else if (roll < 0.50) affinity[stat] = 'low';
      else affinity[stat] = 'none';
    }
  }
  
  return affinity;
};

const generatePlayer = (teamId: string): any => {
  // Random nationality (international only)
  const nationality = randomChoice(INTERNATIONAL_NATIONALITIES);
  const namePool = NAME_POOLS[nationality];
  
  // Random name
  const firstName = randomChoice(namePool.firstNames);
  const lastName = randomChoice(namePool.lastNames);
  
  // Random position
  const position = randomChoice(POSITIONS);
  
  // Age: 19-23
  const age = randomInt(19, 23);
  
  // Generate stats (OVR target: 18-28)
  // To get OVR 18-28, we need 7 stats averaging 2.5-4
  const posStats = POSITION_STATS[position];
  const stats: Record<string, number> = {};
  
  // Base range for lower OVR players
  const baseMin = 1;
  const baseMax = 4;
  
  ['speed', 'strength', 'power', 'passing', 'stamina', 'tackling', 'kicking'].forEach(stat => {
    let min = baseMin;
    let max = baseMax;
    
    if (posStats.primary.includes(stat)) {
      min += 1; max += 1;
    } else if (posStats.secondary.includes(stat)) {
      // normal
    } else if (posStats.minor.includes(stat)) {
      max -= 1;
    } else if (posStats.negligible.includes(stat)) {
      min = 1; max -= 1;
    }
    
    min = Math.max(1, min);
    max = Math.max(min, Math.min(8, max));
    stats[stat] = randomInt(min, max);
  });
  
  // Calculate OVR
  let overall = Object.values(stats).reduce((sum, val) => sum + val, 0);
  
  // Clamp OVR to 18-28 range by adjusting stats
  while (overall > 28) {
    const highestStat = Object.entries(stats).reduce((a, b) => stats[a[0]] > stats[b[0]] ? a : b)[0];
    if (stats[highestStat] > 1) {
      stats[highestStat]--;
      overall--;
    } else break;
  }
  
  while (overall < 18) {
    const lowestStat = Object.entries(stats).reduce((a, b) => stats[a[0]] < stats[b[0]] ? a : b)[0];
    if (stats[lowestStat] < 8) {
      stats[lowestStat]++;
      overall++;
    } else break;
  }
  
  // Calculate match power
  let matchPower = 0;
  Object.entries(stats).forEach(([stat, value]) => {
    if (posStats.primary.includes(stat)) {
      matchPower += value * 4;
    } else if (posStats.secondary.includes(stat)) {
      matchPower += value * 2;
    } else if (posStats.minor.includes(stat)) {
      matchPower += value * 1;
    }
  });
  
  // Goal kicking (low for most internationals)
  const goalKicking = randomInt(10, 50);
  
  // Traits (10% chance of visible trait)
  const hasVisibleTrait = Math.random() < 0.10;
  const visibleTrait = hasVisibleTrait ? randomChoice(VISIBLE_TRAITS) : null;
  const visibleTraitPositive = hasVisibleTrait ? Math.random() < 0.6 : null;
  
  // Hidden trait (15% chance)
  const hasHiddenTrait = Math.random() < 0.15;
  const hiddenTrait = hasHiddenTrait ? randomChoice(HIDDEN_TRAITS) : null;
  
  // Hidden gem chance (5%)
  const isHiddenGem = Math.random() < 0.05;
  const trainingAffinity = generateTrainingAffinity(isHiddenGem);
  
  // Durability
  const durabilityRoll = Math.random();
  let durability = 'normal';
  if (durabilityRoll < 0.10) durability = 'fragile';
  else if (durabilityRoll < 0.20) durability = 'durable';
  else if (durabilityRoll < 0.25) durability = 'ironman';
  
  // Dominant side for sided positions
  let dominantSide = null;
  if (['Winger', 'Centre', 'Second Row'].includes(position)) {
    const sideRoll = Math.random();
    if (sideRoll < 0.4) dominantSide = 'left';
    else if (sideRoll < 0.8) dominantSide = 'right';
    else dominantSide = 'both';
  }
  
  return {
    team_id: teamId,
    first_name: firstName,
    last_name: lastName,
    position,
    age,
    nationality,
    state: null, // Not Origin eligible
    speed: stats.speed,
    strength: stats.strength,
    power: stats.power,
    passing: stats.passing,
    stamina: stats.stamina,
    tackling: stats.tackling,
    kicking: stats.kicking,
    overall,
    match_power: matchPower,
    goal_kicking: goalKicking,
    goal_kick_attempts: 0,
    goal_kick_successes: 0,
    fatigue: 0,
    training_progress: 'NONE',
    training_affinity: trainingAffinity,
    visible_trait: visibleTrait,
    visible_trait_positive: visibleTraitPositive,
    hidden_trait: hiddenTrait,
    durability,
    dominant_side: dominantSide,
    retiring_end_of_season: false,
  };
};

// ============================================
// MAIN FUNCTION
// ============================================

async function main() {
  console.log('🌏 International Player Top-Up Script');
  console.log('=====================================\n');
  
  // Get all teams with their player counts
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name, division');
  
  if (teamsError || !teams) {
    console.error('Failed to fetch teams:', teamsError);
    return;
  }
  
  console.log(`Found ${teams.length} teams\n`);
  
  let totalPlayersAdded = 0;
  let totalContractsCreated = 0;
  
  for (const team of teams) {
    // Get current squad size
    const { count } = await supabase
      .from('players')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', team.id);
    
    const currentSize = count || 0;
    const playersNeeded = TARGET_SQUAD_SIZE - currentSize;
    
    if (playersNeeded <= 0) {
      console.log(`✅ ${team.name} (Div ${team.division}): Already has ${currentSize} players`);
      continue;
    }
    
    console.log(`📋 ${team.name} (Div ${team.division}): ${currentSize} players, adding ${playersNeeded}...`);
    
    // Generate players
    const newPlayers: any[] = [];
    for (let i = 0; i < playersNeeded; i++) {
      newPlayers.push(generatePlayer(team.id));
    }
    
    // Insert players
    const { data: insertedPlayers, error: insertError } = await supabase
      .from('players')
      .insert(newPlayers)
      .select('id, first_name, last_name, overall, nationality');
    
    if (insertError) {
      console.error(`  ❌ Error inserting players:`, insertError.message);
      continue;
    }
    
    if (!insertedPlayers || insertedPlayers.length === 0) {
      console.error(`  ❌ No players inserted`);
      continue;
    }
    
    totalPlayersAdded += insertedPlayers.length;
    
    // Create contracts for new players
    const contracts = insertedPlayers.map(player => ({
      player_id: player.id,
      team_id: team.id,
      weekly_wage: player.overall * 50000, // OVR × $500 in cents
      weeks_remaining: randomInt(8, 15), // 8-15 weeks remaining
      total_weeks: 20, // 2 seasons
      ovr_at_signing: player.overall,
    }));
    
    const { error: contractError } = await supabase
      .from('player_contracts')
      .insert(contracts);
    
    if (contractError) {
      console.error(`  ❌ Error creating contracts:`, contractError.message);
    } else {
      totalContractsCreated += contracts.length;
    }
    
    // Log sample players
    const sample = insertedPlayers.slice(0, 2);
    sample.forEach(p => {
      console.log(`  + ${p.first_name} ${p.last_name} (${p.nationality}, OVR ${p.overall})`);
    });
    if (insertedPlayers.length > 2) {
      console.log(`  + ... and ${insertedPlayers.length - 2} more`);
    }
  }
  
  console.log('\n=====================================');
  console.log(`✅ Done! Added ${totalPlayersAdded} players, ${totalContractsCreated} contracts`);
}

main().catch(console.error);
