const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function generateFixtures() {
  console.log('🏉 SidelineHQ Season 0 Fixture Generator');
  console.log('=========================================');
  console.log('📅 18 Rounds - Home & Away\n');
  
  // Get Division 1 teams
  const { data: teams, error } = await supabase
    .from('teams')
    .select('id, name')
    .eq('division', 1)
    .order('name');
  
  if (error) {
    console.error('Error fetching teams:', error);
    return;
  }
  
  console.log('Division 1 Teams:');
  teams.forEach((t, i) => console.log(`${i + 1}. ${t.name}`));
  console.log('\n');
  
  const teamIds = teams.map(t => t.id);
  const teamNames = {};
  teams.forEach(t => teamNames[t.id] = t.name);
  
  const n = teamIds.length;
  const roundsPerHalf = n - 1; // 9 rounds
  const totalRounds = roundsPerHalf * 2; // 18 rounds
  
  const fixtures = [];
  
  // Create a copy for rotation
  const rotation = [...teamIds];
  
  // First half - everyone plays everyone (rounds 1-9)
  for (let round = 1; round <= roundsPerHalf; round++) {
    console.log(`📅 ROUND ${round}:`);
    
    const roundFixtures = [];
    
    for (let match = 0; match < n / 2; match++) {
      const home = rotation[match];
      const away = rotation[n - 1 - match];
      
      // Alternate home/away for fairness
      const fixture = round % 2 === 1 
        ? { home, away }
        : { home: away, away: home };
      
      roundFixtures.push(fixture);
      console.log(`  ${teamNames[fixture.home]} vs ${teamNames[fixture.away]}`);
    }
    
    fixtures.push({ round, matches: roundFixtures });
    
    // Rotate teams (keep first team fixed)
    const first = rotation[0];
    const last = rotation.pop();
    rotation.splice(1, 0, last);
    rotation[0] = first;
    
    console.log('');
  }
  
  // Second half - reverse home/away (rounds 10-18)
  console.log('\n--- SECOND HALF (Reverse Home/Away) ---\n');
  
  // Reset rotation
  const rotation2 = [...teamIds];
  
  for (let round = roundsPerHalf + 1; round <= totalRounds; round++) {
    console.log(`📅 ROUND ${round}:`);
    
    const roundFixtures = [];
    const firstHalfRound = round - roundsPerHalf;
    
    for (let match = 0; match < n / 2; match++) {
      const team1 = rotation2[match];
      const team2 = rotation2[n - 1 - match];
      
      // REVERSE from first half - swap home/away
      const fixture = firstHalfRound % 2 === 1 
        ? { home: team2, away: team1 }
        : { home: team1, away: team2 };
      
      roundFixtures.push(fixture);
      console.log(`  ${teamNames[fixture.home]} vs ${teamNames[fixture.away]}`);
    }
    
    fixtures.push({ round, matches: roundFixtures });
    
    // Rotate teams (same as first half)
    const first = rotation2[0];
    const last = rotation2.pop();
    rotation2.splice(1, 0, last);
    rotation2[0] = first;
    
    console.log('');
  }
  
  // Clear existing fixtures for season 0
  console.log('🗑️  Clearing any existing Season 0 fixtures...');
  await supabase
    .from('fixtures')
    .delete()
    .eq('season', 0);
  
  // Save fixtures to database
  console.log('💾 Saving fixtures to database...\n');
  
  let savedCount = 0;
  
  for (const round of fixtures) {
    for (const match of round.matches) {
      const { error: insertError } = await supabase
        .from('fixtures')
        .insert({
          season: 0,
          round: round.round,
          home_team_id: match.home,
          away_team_id: match.away,
          played: false
        });
      
      if (insertError) {
        console.error(`Error saving fixture:`, insertError);
      } else {
        savedCount++;
      }
    }
    console.log(`✅ Round ${round.round} fixtures saved`);
  }
  
  console.log('\n=========================================');
  console.log('🎉 Season 0 fixtures generated!');
  console.log(`📊 ${totalRounds} rounds, ${savedCount} total matches`);
  console.log('\n📅 SEASON 0 SCHEDULE:');
  console.log('  Tue/Thu/Sun at 6pm AEST (3 rounds/week)');
  console.log('  ~6 weeks for regular season');
  console.log('  Then Finals + Grand Final 🏆');
}

generateFixtures();
