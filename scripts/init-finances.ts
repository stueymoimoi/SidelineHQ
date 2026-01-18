// ============================================
// SidelineHQ Financial System v3.0
// Initialize Team Finances & Player Contracts
// ============================================
// Run with: npx tsx scripts/init-finances.ts
// ============================================

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================
// CITY TYPE MAPPING
// ============================================

type CityType = 'capital' | 'major' | 'large' | 'medium' | 'small';

const CITY_TYPES: Record<string, CityType> = {
  // Capitals (25,000 capacity)
  'Sydney': 'capital',
  'Melbourne': 'capital',
  'Brisbane': 'capital',
  'Perth': 'capital',
  'Adelaide': 'capital',
  'Hobart': 'capital',
  'Darwin': 'capital',
  'Canberra': 'capital',

  // Major cities (20,000 capacity)
  'Gold Coast': 'major',
  'Newcastle': 'major',
  'Wollongong': 'major',
  'Geelong': 'major',
  'Townsville': 'major',
  'Cairns': 'major',
  'Toowoomba': 'major',
  'Ballarat': 'major',
  'Bendigo': 'major',
  'Launceston': 'major',

  // Large cities (15,000 capacity)
  'Central Coast': 'large',
  'Sunshine Coast': 'large',
  'Albury': 'large',
  'Wodonga': 'large',
  'Mackay': 'large',
  'Rockhampton': 'large',
  'Bunbury': 'large',
  'Bundaberg': 'large',
  'Hervey Bay': 'large',
  'Wagga Wagga': 'large',
  'Coffs Harbour': 'large',
  'Gladstone': 'large',
  'Tamworth': 'large',
  'Dubbo': 'large',
  'Orange': 'large',
  'Mildura': 'large',
  'Shepparton': 'large',
  'Port Macquarie': 'large',
  'Warrnambool': 'large',
  'Geraldton': 'large',
  'Kalgoorlie': 'large',
  'Albany': 'large',

  // Medium towns (10,000 capacity)
  'Lismore': 'medium',
  'Bathurst': 'medium',
  'Mount Gambier': 'medium',
  'Mount Isa': 'medium',
  'Grafton': 'medium',
  'Gympie': 'medium',
  'Maryborough': 'medium',
  'Emerald': 'medium',
  'Roma': 'medium',
  'Armidale': 'medium',
  'Broken Hill': 'medium',
  'Devonport': 'medium',
  'Burnie': 'medium',
  'Broome': 'medium',
  'Karratha': 'medium',
  'Port Hedland': 'medium',
  'Alice Springs': 'medium',
  'Katherine': 'medium',
  'Whyalla': 'medium',
  'Port Augusta': 'medium',
  'Byron Bay': 'medium',
  'Moree': 'medium',

  // Small towns (5,000 capacity) - everything else
};

function getCityType(city: string): CityType {
  return CITY_TYPES[city] || 'small';
}

function getStadiumCapacity(cityType: CityType): number {
  const capacities: Record<CityType, number> = {
    capital: 25000,
    major: 20000,
    large: 15000,
    medium: 10000,
    small: 5000,
  };
  return capacities[cityType];
}

function getStartingBalance(division: number): number {
  const balances: Record<number, number> = {
    1: 1200000000,   // $12M
    2: 1100000000,   // $11M
    3: 1000000000,   // $10M
    4: 900000000,    // $9M
    5: 800000000,    // $8M
    6: 700000000,    // $7M
    7: 600000000,    // $6M
    8: 500000000,    // $5M
    9: 400000000,    // $4M
    10: 300000000,   // $3M
  };
  return balances[division] || 500000000;
}

// ============================================
// WAGE CALCULATION
// ============================================

function calculatePlayerWage(overall: number, trainingAffinity: any): number {
  const WAGE_PER_OVR = 150000; // $1,500 in cents

  let hiddenGemMod = 1.0;
  if (trainingAffinity) {
    const affinities = Object.values(trainingAffinity) as string[];
    const highCount = affinities.filter(a => a === 'HIGH').length;
    const mediumCount = affinities.filter(a => a === 'MEDIUM').length;
    hiddenGemMod += highCount * 0.08;
    hiddenGemMod += mediumCount * 0.02;
  }

  // Random noise ±5%
  const noise = 1 + (Math.random() * 0.1 - 0.05);

  const rawWage = overall * WAGE_PER_OVR * hiddenGemMod * noise;
  return Math.round(rawWage / 100000) * 100000; // Round to nearest $1,000
}

function getInitialContractWeeks(age: number): number {
  if (age <= 22) {
    return Math.floor(Math.random() * 9) + 4; // 4-12 weeks
  } else if (age <= 28) {
    return Math.floor(Math.random() * 13) + 8; // 8-20 weeks
  } else {
    return Math.floor(Math.random() * 9) + 4; // 4-12 weeks
  }
}

// ============================================
// MAIN INITIALIZATION
// ============================================

async function initializeFinances() {
  console.log('🏉 SidelineHQ Financial System Initialization');
  console.log('============================================\n');

  // 1. Get all teams
  console.log('📋 Fetching teams...');
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name, city, division');

  if (teamsError) {
    console.error('❌ Error fetching teams:', teamsError);
    return;
  }

  console.log(`   Found ${teams.length} teams\n`);

  // 2. Initialize team_finances for each team
  console.log('💰 Creating team finances...');
  let financesCreated = 0;
  let financesSkipped = 0;

  for (const team of teams) {
    const cityType = getCityType(team.city);
    const capacity = getStadiumCapacity(cityType);
    const balance = getStartingBalance(team.division);

    const { error } = await supabase
      .from('team_finances')
      .upsert({
        team_id: team.id,
        season: 0,
        balance: balance,
        total_wages: 0, // Will calculate after contracts
        stadium_capacity: capacity,
        stadium_city_type: cityType,
        ticket_price: 20,
        weeks_in_debt: 0,
        last_processed_round: 3, // Current round
      }, {
        onConflict: 'team_id,season',
        ignoreDuplicates: true,
      });

    if (error) {
      console.error(`   ❌ Error for ${team.name}:`, error.message);
    } else {
      financesCreated++;
    }
  }

  console.log(`   ✅ Created finances for ${financesCreated} teams\n`);

  // 3. Get all players with their teams
  console.log('👥 Fetching players...');
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, team_id, overall, age, training_affinity')
    .not('team_id', 'is', null);

  if (playersError) {
    console.error('❌ Error fetching players:', playersError);
    return;
  }

  console.log(`   Found ${players.length} players\n`);

  // 4. Create contracts for all players
  console.log('📝 Creating player contracts...');
  let contractsCreated = 0;

  for (const player of players) {
    const wage = calculatePlayerWage(player.overall, player.training_affinity);
    const weeks = getInitialContractWeeks(player.age);

    const { error } = await supabase
      .from('player_contracts')
      .upsert({
        player_id: player.id,
        team_id: player.team_id,
        weekly_wage: wage,
        weeks_remaining: weeks,
        total_weeks: weeks,
        is_transfer_listed: false,
      }, {
        onConflict: 'player_id',
        ignoreDuplicates: true,
      });

    if (error) {
      console.error(`   ❌ Error for player ${player.id}:`, error.message);
    } else {
      contractsCreated++;
    }
  }

  console.log(`   ✅ Created ${contractsCreated} contracts\n`);

  // 5. Update total_wages for each team
  console.log('🧮 Calculating team wage totals...');

  for (const team of teams) {
    const { data: contracts } = await supabase
      .from('player_contracts')
      .select('weekly_wage')
      .eq('team_id', team.id);

    if (contracts) {
      const totalWages = contracts.reduce((sum, c) => sum + c.weekly_wage, 0);

      await supabase
        .from('team_finances')
        .update({ total_wages: totalWages })
        .eq('team_id', team.id)
        .eq('season', 0);
    }
  }

  console.log('   ✅ Wage totals updated\n');

  // 6. Summary
  console.log('============================================');
  console.log('🎉 Initialization complete!');
  console.log(`   Teams: ${financesCreated}`);
  console.log(`   Contracts: ${contractsCreated}`);
  console.log('============================================\n');

  // 7. Show sample data
  console.log('📊 Sample team finances:');
  const { data: sample } = await supabase
    .from('team_finances')
    .select(`
      balance,
      total_wages,
      stadium_capacity,
      stadium_city_type,
      teams!inner(name, city, division)
    `)
    .limit(5);

  if (sample) {
    sample.forEach((tf: any) => {
      console.log(`   ${tf.teams.name} (Div ${tf.teams.division})`);
      console.log(`   └─ Balance: $${(tf.balance / 100).toLocaleString()}`);
      console.log(`   └─ Wages: $${(tf.total_wages / 100).toLocaleString()}/week`);
      console.log(`   └─ Stadium: ${tf.stadium_capacity.toLocaleString()} (${tf.stadium_city_type})`);
      console.log('');
    });
  }
}

// Run it
initializeFinances().catch(console.error);