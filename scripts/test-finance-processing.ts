// ============================================
// Test Financial Processing
// Run with: npx tsx scripts/test-finance-processing.ts
// ============================================

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { processAllTeamFinances, processContractCountdown } from '../lib/finances';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testFinanceProcessing() {
  console.log('🧪 Testing Financial Processing');
  console.log('================================\n');

  const season = 0;
  const round = 3; // Current round

  // 1. Process finances for all teams
  const results = await processAllTeamFinances(supabase, season, round);

  // 2. Summary
  console.log('\n📊 SUMMARY');
  console.log('================================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  // 3. Show top earners and biggest losers
  const sorted = successful.sort((a, b) => {
    const aNet = a.transactions.reduce((sum, t) => sum + t.amount, 0);
    const bNet = b.transactions.reduce((sum, t) => sum + t.amount, 0);
    return bNet - aNet;
  });

  console.log('\n💰 Top 5 Earners This Round:');
  sorted.slice(0, 5).forEach((r, i) => {
    const net = r.transactions.reduce((sum, t) => sum + t.amount, 0);
    console.log(`   ${i + 1}. ${r.team_name}: +$${(net / 100).toLocaleString()}`);
  });

  console.log('\n📉 Bottom 5 This Round:');
  sorted.slice(-5).reverse().forEach((r, i) => {
    const net = r.transactions.reduce((sum, t) => sum + t.amount, 0);
    console.log(`   ${i + 1}. ${r.team_name}: $${(net / 100).toLocaleString()}`);
  });

  // 4. Show sample transaction breakdown
  console.log('\n📝 Sample Breakdown (first team with home game):');
  const homeTeam = successful.find(r => 
    r.transactions.some(t => t.type === 'TICKET_REVENUE')
  );
  
  if (homeTeam) {
    console.log(`   ${homeTeam.team_name}:`);
    homeTeam.transactions.forEach(t => {
      const sign = t.amount >= 0 ? '+' : '';
      console.log(`   ${sign}$${(t.amount / 100).toLocaleString()} - ${t.description}`);
    });
    const net = homeTeam.transactions.reduce((sum, t) => sum + t.amount, 0);
    console.log(`   ─────────────────`);
    console.log(`   Net: $${(net / 100).toLocaleString()}`);
  }

  // 5. Check transactions table
  console.log('\n📋 Transactions recorded in database:');
  const { count } = await supabase
    .from('financial_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('round', round);
  
  console.log(`   ${count} transactions for Round ${round}`);

  console.log('\n✅ Test complete!\n');
}

testFinanceProcessing().catch(console.error);