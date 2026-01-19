// ============================================
// Recalculate All Wages with Hidden Gem Modifier
// Run: npx ts-node scripts/recalculate-wages-hidden-gem.ts
// ============================================

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Constants (matching /lib/finances/constants.ts)
const WAGE_PER_OVR = 50000; // $500 in cents
const HIDDEN_GEM_MODIFIERS = {
  HIGH_AFFINITY: 0.08,
  MEDIUM_AFFINITY: 0.02,
};

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  overall: number;
  training_affinity: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'> | null;
}

interface Contract {
  id: string;
  player_id: string;
  weekly_wage: number;
}

function calculateWage(player: Player): number {
  const baseWage = player.overall * WAGE_PER_OVR;
  
  let hiddenGemMod = 1.0;
  
  if (player.training_affinity) {
    const affinities = Object.values(player.training_affinity);
    const highCount = affinities.filter(a => a.toUpperCase() === 'HIGH').length;
    const mediumCount = affinities.filter(a => a.toUpperCase() === 'MEDIUM').length;
    
    hiddenGemMod += highCount * HIDDEN_GEM_MODIFIERS.HIGH_AFFINITY;
    hiddenGemMod += mediumCount * HIDDEN_GEM_MODIFIERS.MEDIUM_AFFINITY;
  }
  
  // Round to nearest $1,000 (100000 cents)
  const rawWage = baseWage * hiddenGemMod;
  return Math.round(rawWage / 5000) * 5000;  // Round to nearest $50
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString()}`;
}

async function main() {
  console.log('==========================================');
  console.log('RECALCULATE WAGES WITH HIDDEN GEM MODIFIER');
  console.log('==========================================\n');

  // Fetch all players
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, first_name, last_name, overall, training_affinity')
    .order('overall', { ascending: false });

  if (playersError) {
    console.error('Error fetching players:', playersError);
    return;
  }

  // Fetch all contracts
  const { data: contracts, error: contractsError } = await supabase
    .from('player_contracts')
    .select('id, player_id, weekly_wage');

  if (contractsError) {
    console.error('Error fetching contracts:', contractsError);
    return;
  }

  // Create lookup map
  const contractMap = new Map<string, Contract>();
  contracts?.forEach(c => contractMap.set(c.player_id, c));

  // Calculate changes
  const updates: { id: string; name: string; ovr: number; high: number; med: number; oldWage: number; newWage: number; diff: number }[] = [];
  
  let totalOldWages = 0;
  let totalNewWages = 0;
  let playersWithAffinities = 0;
  let playersAffected = 0;

  for (const player of players || []) {
    const contract = contractMap.get(player.id);
    if (!contract) continue;

    const oldWage = contract.weekly_wage;
    const newWage = calculateWage(player);
    const diff = newWage - oldWage;

    totalOldWages += oldWage;
    totalNewWages += newWage;

    // Count affinities
    let highCount = 0;
    let medCount = 0;
    if (player.training_affinity) {
      const affinities = Object.values(player.training_affinity);
      highCount = affinities.filter(a => a === 'HIGH').length;
      medCount = affinities.filter(a => a === 'MEDIUM').length;
      if (highCount > 0 || medCount > 0) playersWithAffinities++;
    }

    if (diff !== 0) {
      playersAffected++;
      updates.push({
        id: contract.id,
        name: `${player.first_name} ${player.last_name}`,
        ovr: player.overall,
        high: highCount,
        med: medCount,
        oldWage,
        newWage,
        diff,
      });
    }
  }

  // Sort by biggest increase
  updates.sort((a, b) => b.diff - a.diff);

  // Display summary
  console.log('SUMMARY');
  console.log('-------');
  console.log(`Total Players: ${players?.length || 0}`);
  console.log(`Players with Affinities: ${playersWithAffinities}`);
  console.log(`Players Affected by Change: ${playersAffected}`);
  console.log(`Total Old Wages: ${formatMoney(totalOldWages)}/week`);
  console.log(`Total New Wages: ${formatMoney(totalNewWages)}/week`);
  console.log(`Difference: ${formatMoney(totalNewWages - totalOldWages)}/week\n`);

  // Show top 10 increases
  console.log('TOP 10 BIGGEST WAGE INCREASES');
  console.log('-----------------------------');
  updates.slice(0, 10).forEach((u, i) => {
    console.log(`${i + 1}. ${u.name} (OVR ${u.ovr}, ${u.high}H/${u.med}M)`);
    console.log(`   ${formatMoney(u.oldWage)} → ${formatMoney(u.newWage)} (+${formatMoney(u.diff)})`);
  });

  // Show bottom 5 (no change or smallest)
  console.log('\nPLAYERS WITH NO AFFINITIES (unchanged)');
  console.log('--------------------------------------');
  const unchanged = (players || []).filter(p => {
    if (!p.training_affinity) return true;
    const affs = Object.values(p.training_affinity);
    return affs.filter(a => a === 'HIGH' || a === 'MEDIUM').length === 0;
  }).slice(0, 5);
  unchanged.forEach(p => {
    const contract = contractMap.get(p.id);
    console.log(`- ${p.first_name} ${p.last_name} (OVR ${p.overall}): ${formatMoney(contract?.weekly_wage || 0)}`);
  });

  // Confirm before applying
  console.log('\n==========================================');
  console.log('Ready to apply changes to database.');
  console.log('Run with --apply flag to execute updates.');
  console.log('==========================================\n');

  if (process.argv.includes('--apply')) {
    console.log('APPLYING CHANGES...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const update of updates) {
      const { error } = await supabase
        .from('player_contracts')
        .update({ weekly_wage: update.newWage })
        .eq('id', update.id);

      if (error) {
        console.error(`Error updating ${update.name}:`, error.message);
        errorCount++;
      } else {
        successCount++;
      }
    }

    console.log(`\n✅ Successfully updated: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('\nDone!');
  } else {
    console.log('DRY RUN - No changes made.');
    console.log('To apply changes, run: npx ts-node scripts/recalculate-wages-hidden-gem.ts --apply');
  }
}

main().catch(console.error);
