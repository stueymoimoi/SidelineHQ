const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials - UPDATE THE KEY!
const supabaseUrl = 'https://souktfzlcdpzwebwfeqd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdWt0ZnpsY2RwendlYndmZXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwODM0MTUsImV4cCI6MjA4MzY1OTQxNX0.-gXuE4CGRG_TsAw4oMlqGV55-B6-jar5vaBFIAj193A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateFixtures() {
  console.log('🏉 SidelineHQ Season 0 Fixture Generator v2');
  console.log('============================================');
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
        ? { home: team2, away: team1 }  // Swapped!
        : { home: team1, away: team2 }; // Swapped!
      
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
  
  // Save fixtures to database
  console.log('💾 Saving fixtures to database...\n');
  
  for (const round of fixtures) {
    for (const match of round.matches) {
      const { error: insertError } = await supabase
        .from('match_results')
        .insert({
          season: 0,
          round: round.round,
          home_team_id: match.home,
          away_team_id: match.away,
          status: 'scheduled'
        });
      
      if (insertError) {
        console.error(`Error saving fixture:`, insertError);
      }
    }
    console.log(`✅ Round ${round.round} fixtures saved`);
  }
  
  console.log('\n============================================');
  console.log('🎉 Season 0 fixtures generated!');
  console.log(`📊 ${totalRounds} rounds, ${totalRounds * (n/2)} total matches`);
  console.log('\n📅 SEASON SCHEDULE:');
  console.log('  Weeks 1-9:  Regular Season (2 rounds/week)');
  console.log('  Week 10:    Semi Finals (1st v 4th, 2nd v 3rd)');
  console.log('  Week 11:    Grand Final 🏆');
  console.log('  Week 12:    Off-Season (Rest & Age Up)');
}

generateFixtures();
