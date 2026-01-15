const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials - UPDATE THE KEY!
const supabaseUrl = 'https://souktfzlcdpzwebwfeqd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdWt0ZnpsY2RwendlYndmZXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwODM0MTUsImV4cCI6MjA4MzY1OTQxNX0.-gXuE4CGRG_TsAw4oMlqGV55-B6-jar5vaBFIAj193A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateTacticsForTeam(team) {
  // Get all senior players for this team
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', team.id)
    .eq('is_u21', false)
    .order('overall', { ascending: false });
  
  if (!players || players.length < 17) {
    console.log(`⚠️  ${team.name} - Not enough senior players (${players?.length || 0})`);
    return null;
  }
  
  // Group players by position
  const byPosition = {
    'Fullback': [],
    'Winger': [],
    'Centre': [],
    'Five-Eighth': [],
    'Halfback': [],
    'Prop': [],
    'Hooker': [],
    'Second Row': [],
    'Lock': []
  };
  
  players.forEach(p => {
    if (byPosition[p.position]) {
      byPosition[p.position].push(p);
    }
  });
  
  // Select best player for each position
  const getBest = (position, exclude = []) => {
    const available = byPosition[position].filter(p => !exclude.includes(p.id));
    return available[0] || null;
  };
  
  // Also allow secondary positions
  const getBestIncludingSecondary = (position, exclude = []) => {
    // First try primary position
    let best = getBest(position, exclude);
    if (best) return best;
    
    // Try secondary position
    const withSecondary = players.filter(p => 
      p.secondary_position === position && !exclude.includes(p.id)
    );
    if (withSecondary.length > 0) return withSecondary[0];
    
    return null;
  };
  
  const selected = [];
  
  // Starting 13
  const fullback = getBestIncludingSecondary('Fullback', selected);
  if (fullback) selected.push(fullback.id);
  
  const wingerL = getBestIncludingSecondary('Winger', selected);
  if (wingerL) selected.push(wingerL.id);
  
  const wingerR = getBestIncludingSecondary('Winger', selected);
  if (wingerR) selected.push(wingerR.id);
  
  const centreL = getBestIncludingSecondary('Centre', selected);
  if (centreL) selected.push(centreL.id);
  
  const centreR = getBestIncludingSecondary('Centre', selected);
  if (centreR) selected.push(centreR.id);
  
  const fiveEighth = getBestIncludingSecondary('Five-Eighth', selected);
  if (fiveEighth) selected.push(fiveEighth.id);
  
  const halfback = getBestIncludingSecondary('Halfback', selected);
  if (halfback) selected.push(halfback.id);
  
  const propL = getBestIncludingSecondary('Prop', selected);
  if (propL) selected.push(propL.id);
  
  const propR = getBestIncludingSecondary('Prop', selected);
  if (propR) selected.push(propR.id);
  
  const hooker = getBestIncludingSecondary('Hooker', selected);
  if (hooker) selected.push(hooker.id);
  
  const secondRowL = getBestIncludingSecondary('Second Row', selected);
  if (secondRowL) selected.push(secondRowL.id);
  
  const secondRowR = getBestIncludingSecondary('Second Row', selected);
  if (secondRowR) selected.push(secondRowR.id);
  
  const lock = getBestIncludingSecondary('Lock', selected);
  if (lock) selected.push(lock.id);
  
  // Bench 4 - best remaining players
  const remaining = players.filter(p => !selected.includes(p.id));
  const bench1 = remaining[0] || null;
  const bench2 = remaining[1] || null;
  const bench3 = remaining[2] || null;
  const bench4 = remaining[3] || null;
  
  // Find best kicker from starting 13
  const starters = [fullback, wingerL, wingerR, centreL, centreR, fiveEighth, halfback, 
                    propL, propR, hooker, secondRowL, secondRowR, lock].filter(p => p);
  const bestKicker = starters.reduce((best, p) => 
    (p.kicking > (best?.kicking || 0)) ? p : best, null);
  
  // Captain - highest OVR
  const captain = starters.reduce((best, p) => 
    (p.overall > (best?.overall || 0)) ? p : best, null);
  
  // Default minutes allocation
  const minutesAllocation = {
    // Backs play full 80
    [fullback?.id]: 80,
    [wingerL?.id]: 80,
    [wingerR?.id]: 80,
    [centreL?.id]: 80,
    [centreR?.id]: 80,
    [fiveEighth?.id]: 80,
    [halfback?.id]: 80,
    // Forwards rotate
    [propL?.id]: 50,
    [propR?.id]: 50,
    [hooker?.id]: 60,
    [secondRowL?.id]: 60,
    [secondRowR?.id]: 60,
    [lock?.id]: 65,
    // Bench
    [bench1?.id]: 30,
    [bench2?.id]: 30,
    [bench3?.id]: 20,
    [bench4?.id]: 15
  };
  
  // Clean up null keys
  delete minutesAllocation['null'];
  delete minutesAllocation['undefined'];
  
  const tactics = {
    team_id: team.id,
    pos_fullback: fullback?.id,
    pos_winger_l: wingerL?.id,
    pos_winger_r: wingerR?.id,
    pos_centre_l: centreL?.id,
    pos_centre_r: centreR?.id,
    pos_five_eighth: fiveEighth?.id,
    pos_halfback: halfback?.id,
    pos_prop_l: propL?.id,
    pos_prop_r: propR?.id,
    pos_hooker: hooker?.id,
    pos_second_row_l: secondRowL?.id,
    pos_second_row_r: secondRowR?.id,
    pos_lock: lock?.id,
    bench_1: bench1?.id,
    bench_2: bench2?.id,
    bench_3: bench3?.id,
    bench_4: bench4?.id,
    minutes_allocation: minutesAllocation,
    goal_kicker: bestKicker?.id,
    captain: captain?.id
  };
  
  return { tactics, starters, bench: [bench1, bench2, bench3, bench4], bestKicker, captain };
}

async function main() {
  console.log('🎯 SidelineHQ Tactics Generator');
  console.log('================================\n');
  
  // Get all Div 1 teams
  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .eq('division', 1)
    .order('name');
  
  console.log(`Found ${teams.length} teams\n`);
  
  for (const team of teams) {
    console.log(`\n📋 ${team.name}`);
    console.log('─'.repeat(40));
    
    const result = await generateTacticsForTeam(team);
    
    if (!result) continue;
    
    const { tactics, starters, bench, bestKicker, captain } = result;
    
    // Delete existing tactics for this team
    await supabase.from('team_tactics').delete().eq('team_id', team.id);
    
    // Insert new tactics
    const { error } = await supabase.from('team_tactics').insert(tactics);
    
    if (error) {
      console.log(`❌ Error: ${error.message}`);
      continue;
    }
    
    // Display lineup
    console.log('\nStarting XIII:');
    console.log(`  1. FB:  ${starters[0]?.first_name} ${starters[0]?.last_name} (${starters[0]?.overall})`);
    console.log(`  2. WG:  ${starters[1]?.first_name} ${starters[1]?.last_name} (${starters[1]?.overall})`);
    console.log(`  3. CE:  ${starters[3]?.first_name} ${starters[3]?.last_name} (${starters[3]?.overall})`);
    console.log(`  4. CE:  ${starters[4]?.first_name} ${starters[4]?.last_name} (${starters[4]?.overall})`);
    console.log(`  5. WG:  ${starters[2]?.first_name} ${starters[2]?.last_name} (${starters[2]?.overall})`);
    console.log(`  6. FE:  ${starters[5]?.first_name} ${starters[5]?.last_name} (${starters[5]?.overall})`);
    console.log(`  7. HB:  ${starters[6]?.first_name} ${starters[6]?.last_name} (${starters[6]?.overall})`);
    console.log(`  8. PR:  ${starters[7]?.first_name} ${starters[7]?.last_name} (${starters[7]?.overall})`);
    console.log(`  9. HK:  ${starters[9]?.first_name} ${starters[9]?.last_name} (${starters[9]?.overall})`);
    console.log(` 10. PR:  ${starters[8]?.first_name} ${starters[8]?.last_name} (${starters[8]?.overall})`);
    console.log(` 11. SR:  ${starters[10]?.first_name} ${starters[10]?.last_name} (${starters[10]?.overall})`);
    console.log(` 12. SR:  ${starters[11]?.first_name} ${starters[11]?.last_name} (${starters[11]?.overall})`);
    console.log(` 13. LK:  ${starters[12]?.first_name} ${starters[12]?.last_name} (${starters[12]?.overall})`);
    
    console.log('\nBench:');
    console.log(` 14. ${bench[0]?.first_name} ${bench[0]?.last_name} (${bench[0]?.position}, ${bench[0]?.overall})`);
    console.log(` 15. ${bench[1]?.first_name} ${bench[1]?.last_name} (${bench[1]?.position}, ${bench[1]?.overall})`);
    console.log(` 16. ${bench[2]?.first_name} ${bench[2]?.last_name} (${bench[2]?.position}, ${bench[2]?.overall})`);
    console.log(` 17. ${bench[3]?.first_name} ${bench[3]?.last_name} (${bench[3]?.position}, ${bench[3]?.overall})`);
    
    console.log(`\n🎯 Kicker: ${bestKicker?.first_name} ${bestKicker?.last_name} (${bestKicker?.kicking} kicking)`);
    console.log(`👑 Captain: ${captain?.first_name} ${captain?.last_name}`);
    
    console.log('\n✅ Tactics saved!');
  }
  
  console.log('\n\n================================');
  console.log('🎉 All team tactics generated!');
}

main();
