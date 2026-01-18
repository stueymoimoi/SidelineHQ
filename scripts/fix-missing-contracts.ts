// ============================================
// Fix Missing Player Contracts
// Run with: npx tsx scripts/fix-missing-contracts.ts
// ============================================

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

  const noise = 1 + (Math.random() * 0.1 - 0.05);
  const rawWage = overall * WAGE_PER_OVR * hiddenGemMod * noise;
  return Math.round(rawWage / 100000) * 100000;
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

async function fixMissingContracts() {
  console.log('🔧 Fixing missing contracts...\n');

  // Get players without contracts
  const { data: players, error } = await supabase
    .from('players')
    .select('id, team_id, overall, age, training_affinity')
    .not('team_id', 'is', null);

  if (error) {
    console.error('❌ Error fetching players:', error);
    return;
  }

  // Get existing contracts
  const { data: existingContracts } = await supabase
    .from('player_contracts')
    .select('player_id');

  const existingPlayerIds = new Set(existingContracts?.map(c => c.player_id) || []);

  // Filter to players missing contracts
  const missingPlayers = players.filter(p => !existingPlayerIds.has(p.id));

  console.log(`📋 Found ${missingPlayers.length} players without contracts\n`);

  if (missingPlayers.length === 0) {
    console.log('✅ All players have contracts!');
    return;
  }

  // Create contracts in batches
  let created = 0;
  const batchSize = 100;

  for (let i = 0; i < missingPlayers.length; i += batchSize) {
    const batch = missingPlayers.slice(i, i + batchSize);
    
    const contracts = batch.map(player => ({
      player_id: player.id,
      team_id: player.team_id,
      weekly_wage: calculatePlayerWage(player.overall, player.training_affinity),
      weeks_remaining: getInitialContractWeeks(player.age),
      total_weeks: getInitialContractWeeks(player.age),
      is_transfer_listed: false,
    }));

    const { error: insertError } = await supabase
      .from('player_contracts')
      .insert(contracts);

    if (insertError) {
      console.error(`❌ Batch error:`, insertError.message);
    } else {
      created += batch.length;
      console.log(`   ✅ Created ${created}/${missingPlayers.length} contracts`);
    }
  }

  // Update team wage totals
  console.log('\n🧮 Updating team wage totals...');

  const { data: teams } = await supabase.from('teams').select('id');

  for (const team of teams || []) {
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

  console.log('\n✅ Done! All contracts created and wage totals updated.');

  // Verify
  const { data: verify } = await supabase
    .from('player_contracts')
    .select('id', { count: 'exact' });

  console.log(`\n📊 Total contracts now: ${verify?.length}`);
}

fixMissingContracts().catch(console.error);