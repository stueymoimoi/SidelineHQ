const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials - UPDATE THE KEY!
const supabaseUrl = 'https://souktfzlcdpzwebwfeqd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdWt0ZnpsY2RwendlYndmZXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwODM0MTUsImV4cCI6MjA4MzY1OTQxNX0.-gXuE4CGRG_TsAw4oMlqGV55-B6-jar5vaBFIAj193A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateFixtures() {
  console.log('🏉 SidelineHQ Season 0 Fixture Generator');
  console.log('========================================\n');
  
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
  
  // Round robin: everyone plays everyone once
  // 10 teams = 9 rounds, 5 matches per round
  
  const fixtures = [];
  const teamIds = teams.map(t => t.id);
  const teamNames = {};
  teams.forEach(t => teamNames[t.id] = t.name);
  
  // Create round robin schedule
  const n = teamIds.length;
  const rounds = n - 1;
  const matchesPerRound = n / 2;
  
  // Create a copy for rotation
  const rotation = [...teamIds];
  
  for (let round = 1; round <= rounds; round++) {
    console.log(`📅 ROUND ${round}:`);
    
    const roundFixtures = [];
    
    for (let match = 0; match < matchesPerRound; match++) {
      const home = rotation[match];
      const away = rotation[n - 1 - match];
      
      // Alternate home/away each round for fairness
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
  
  console.log('\n========================================');
  console.log('🎉 Season 0 fixtures generated!');
  console.log(`📊 ${rounds} rounds, ${rounds * matchesPerRound} total matches`);
}

generateFixtures();
