const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials - UPDATE THE KEY!
const supabaseUrl = 'https://souktfzlcdpzwebwfeqd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdWt0ZnpsY2RwendlYndmZXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwODM0MTUsImV4cCI6MjA4MzY1OTQxNX0.-gXuE4CGRG_TsAw4oMlqGV55-B6-jar5vaBFIAj193A';

const supabase = createClient(supabaseUrl, supabaseKey);

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function calculateTeamStrength(players) {
  if (!players || players.length === 0) return 70;
  
  const starters = players
    .filter(p => !p.is_u21)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 13);
  
  if (starters.length === 0) return 70;
  
  const avgOvr = starters.reduce((sum, p) => sum + p.overall, 0) / starters.length;
  
  let gemBonus = 0;
  for (const player of starters) {
    const potential = player.potential || player.overall;
    if (potential >= 91) gemBonus += 3;
    else if (potential >= 86) gemBonus += 1.5;
    else if (potential >= 81) gemBonus += 0.5;
  }
  
  return avgOvr + gemBonus;
}

function getWinProbability(strengthDiff) {
  if (strengthDiff >= 15) return 0.95;
  if (strengthDiff >= 10) return 0.88;
  if (strengthDiff >= 7) return 0.80;
  if (strengthDiff >= 5) return 0.72;
  if (strengthDiff >= 3) return 0.62;
  if (strengthDiff >= 1) return 0.55;
  if (strengthDiff >= -1) return 0.50;
  if (strengthDiff >= -3) return 0.45;
  if (strengthDiff >= -5) return 0.38;
  if (strengthDiff >= -7) return 0.28;
  if (strengthDiff >= -10) return 0.20;
  if (strengthDiff >= -15) return 0.12;
  return 0.05;
}

function selectTryScorer(starters) {
  // Weight by position - backs score more tries
  const weights = {
    'Winger': 25,
    'Centre': 20,
    'Fullback': 15,
    'Five-Eighth': 10,
    'Halfback': 8,
    'Second Row': 10,
    'Lock': 5,
    'Prop': 4,
    'Hooker': 3
  };
  
  const weighted = [];
  for (const player of starters) {
    const weight = weights[player.position] || 5;
    for (let i = 0; i < weight; i++) {
      weighted.push(player);
    }
  }
  
  return weighted[randomBetween(0, weighted.length - 1)];
}

function selectKicker(starters) {
  // Find best kicker (usually fullback or halfback)
  const kickers = starters
    .filter(p => ['Fullback', 'Halfback', 'Five-Eighth'].includes(p.position))
    .sort((a, b) => b.kicking - a.kicking);
  
  return kickers[0] || starters[0];
}

function attemptConversion(kicker) {
  const kickingRating = kicker.kicking || 50;
  
  // Conversion success rate based on kicking stat
  let successRate;
  if (kickingRating >= 90) successRate = 0.90;
  else if (kickingRating >= 85) successRate = 0.85;
  else if (kickingRating >= 80) successRate = 0.80;
  else if (kickingRating >= 75) successRate = 0.75;
  else if (kickingRating >= 70) successRate = 0.70;
  else if (kickingRating >= 65) successRate = 0.65;
  else if (kickingRating >= 60) successRate = 0.60;
  else if (kickingRating >= 55) successRate = 0.55;
  else successRate = 0.50;
  
  return Math.random() < successRate;
}

function attemptPenaltyGoal(kicker) {
  // Slightly harder than conversion
  const kickingRating = kicker.kicking || 50;
  
  let successRate;
  if (kickingRating >= 90) successRate = 0.85;
  else if (kickingRating >= 85) successRate = 0.80;
  else if (kickingRating >= 80) successRate = 0.75;
  else if (kickingRating >= 75) successRate = 0.70;
  else if (kickingRating >= 70) successRate = 0.65;
  else if (kickingRating >= 65) successRate = 0.60;
  else successRate = 0.50;
  
  return Math.random() < successRate;
}

function simulateMatchEvents(starters, teamStrength, opponentStrength, isWinner) {
  const strengthDiff = teamStrength - opponentStrength;
  
  // Determine number of tries
  let baseTries = 3;
  if (strengthDiff > 10) baseTries = 5;
  else if (strengthDiff > 5) baseTries = 4;
  else if (strengthDiff < -10) baseTries = 2;
  else if (strengthDiff < -5) baseTries = 2;
  
  let tries = baseTries + randomBetween(-1, 2);
  tries = Math.max(1, Math.min(8, tries));
  
  // Get kicker
  const kicker = selectKicker(starters);
  
  // Generate try events
  const events = [];
  let conversions = 0;
  let conversionAttempts = 0;
  
  for (let i = 0; i < tries; i++) {
    const minute = randomBetween(1 + (i * 10), 10 + (i * 10));
    const scorer = selectTryScorer(starters);
    const converted = attemptConversion(kicker);
    
    conversionAttempts++;
    if (converted) conversions++;
    
    events.push({
      type: 'try',
      minute: Math.min(80, minute),
      player: scorer,
      converted: converted,
      kicker: kicker
    });
  }
  
  // Penalty goals (0-2)
  const penaltyAttempts = randomBetween(0, 2);
  let penaltyGoals = 0;
  
  for (let i = 0; i < penaltyAttempts; i++) {
    const minute = randomBetween(1, 80);
    const success = attemptPenaltyGoal(kicker);
    
    if (success) {
      penaltyGoals++;
      events.push({
        type: 'penalty',
        minute: minute,
        player: kicker,
        success: true
      });
    }
  }
  
  // Field goal (rare, 10% for winner, 5% for loser)
  let fieldGoal = 0;
  const fgChance = isWinner ? 0.10 : 0.05;
  if (Math.random() < fgChance) {
    fieldGoal = 1;
    events.push({
      type: 'fieldgoal',
      minute: randomBetween(70, 80),
      player: kicker
    });
  }
  
  // Sort by minute
  events.sort((a, b) => a.minute - b.minute);
  
  // Calculate score
  const score = (tries * 4) + (conversions * 2) + (penaltyGoals * 2) + fieldGoal;
  
  return {
    events,
    tries,
    conversions,
    conversionAttempts,
    penaltyGoals,
    penaltyAttempts,
    fieldGoal,
    score,
    kicker
  };
}

function printMatchReport(homeTeam, awayTeam, homeResult, awayResult, homeWon, awayWon) {
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📋 MATCH REPORT');
  console.log('═'.repeat(60));
  console.log(`\n${homeTeam.name} ${homeResult.score} - ${awayResult.score} ${awayTeam.name}\n`);
  
  if (homeWon) console.log(`🏆 ${homeTeam.name} WIN!\n`);
  else if (awayWon) console.log(`🏆 ${awayTeam.name} WIN!\n`);
  else console.log(`🤝 DRAW!\n`);
  
  // Home team events
  console.log(`\n🏠 ${homeTeam.name}:`);
  console.log('─'.repeat(40));
  
  console.log('\n🏈 TRIES:');
  const homeTries = homeResult.events.filter(e => e.type === 'try');
  homeTries.forEach(e => {
    const conv = e.converted ? '✅' : '❌';
    console.log(`  ${e.minute}' - ${e.player.first_name} ${e.player.last_name} (${e.player.position}) ${conv}`);
  });
  
  console.log(`\n🎯 GOALS: ${homeResult.kicker.first_name} ${homeResult.kicker.last_name} (${homeResult.kicker.kicking} kicking)`);
  console.log(`   Conversions: ${homeResult.conversions}/${homeResult.conversionAttempts}`);
  console.log(`   Penalties: ${homeResult.penaltyGoals}/${homeResult.penaltyAttempts}`);
  if (homeResult.fieldGoal) console.log(`   Field Goal: 1`);
  
  // Away team events
  console.log(`\n\n✈️  ${awayTeam.name}:`);
  console.log('─'.repeat(40));
  
  console.log('\n🏈 TRIES:');
  const awayTries = awayResult.events.filter(e => e.type === 'try');
  awayTries.forEach(e => {
    const conv = e.converted ? '✅' : '❌';
    console.log(`  ${e.minute}' - ${e.player.first_name} ${e.player.last_name} (${e.player.position}) ${conv}`);
  });
  
  console.log(`\n🎯 GOALS: ${awayResult.kicker.first_name} ${awayResult.kicker.last_name} (${awayResult.kicker.kicking} kicking)`);
  console.log(`   Conversions: ${awayResult.conversions}/${awayResult.conversionAttempts}`);
  console.log(`   Penalties: ${awayResult.penaltyGoals}/${awayResult.penaltyAttempts}`);
  if (awayResult.fieldGoal) console.log(`   Field Goal: 1`);
  
  // Score breakdown
  console.log('\n\n📊 SCORE BREAKDOWN:');
  console.log('─'.repeat(40));
  console.log(`${homeTeam.name.padEnd(25)} ${awayTeam.name}`);
  console.log(`Tries: ${homeTries.length.toString().padEnd(21)} Tries: ${awayTries.length}`);
  console.log(`Conversions: ${homeResult.conversions.toString().padEnd(15)} Conversions: ${awayResult.conversions}`);
  console.log(`Penalties: ${homeResult.penaltyGoals.toString().padEnd(17)} Penalties: ${awayResult.penaltyGoals}`);
  console.log(`Field Goals: ${homeResult.fieldGoal.toString().padEnd(15)} Field Goals: ${awayResult.fieldGoal}`);
  console.log('─'.repeat(40));
  console.log(`TOTAL: ${homeResult.score.toString().padEnd(21)} TOTAL: ${awayResult.score}`);
  console.log('═'.repeat(60));
}

async function simulateMatch(team1Name, team2Name) {
  console.log('🏉 SidelineHQ Match Simulator v2');
  console.log('================================\n');
  
  // Get teams
  const { data: homeTeam } = await supabase
    .from('teams')
    .select('*')
    .eq('name', team1Name)
    .single();
  
  const { data: awayTeam } = await supabase
    .from('teams')
    .select('*')
    .eq('name', team2Name)
    .single();
  
  if (!homeTeam || !awayTeam) {
    console.error('Team not found!');
    console.log('Available Div 1 teams:');
    const { data: teams } = await supabase
      .from('teams')
      .select('name')
      .eq('division', 1)
      .order('name');
    teams.forEach(t => console.log(`  - ${t.name}`));
    return;
  }
  
  // Get players
  const { data: homePlayers } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', homeTeam.id);
  
  const { data: awayPlayers } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', awayTeam.id);
  
  // Get starters
  const homeStarters = homePlayers
    .filter(p => !p.is_u21)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 13);
  
  const awayStarters = awayPlayers
    .filter(p => !p.is_u21)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 13);
  
  // Calculate strengths
  const homeStrength = calculateTeamStrength(homePlayers) + 2; // Home advantage
  const awayStrength = calculateTeamStrength(awayPlayers);
  
  console.log(`🏠 ${homeTeam.name} (STR: ${homeStrength.toFixed(1)})`);
  console.log(`✈️  ${awayTeam.name} (STR: ${awayStrength.toFixed(1)})\n`);
  
  // Determine winner
  const strengthDiff = homeStrength - awayStrength;
  const homeWinProb = getWinProbability(strengthDiff);
  
  let homeWon, awayWon, draw;
  
  if (Math.random() < 0.05) {
    draw = true;
    homeWon = false;
    awayWon = false;
  } else if (Math.random() < homeWinProb) {
    homeWon = true;
    awayWon = false;
    draw = false;
  } else {
    homeWon = false;
    awayWon = true;
    draw = false;
  }
  
  // Simulate match events
  let homeResult = simulateMatchEvents(homeStarters, homeStrength, awayStrength, homeWon);
  let awayResult = simulateMatchEvents(awayStarters, awayStrength, homeStrength, awayWon);
  
  // Ensure winner has higher score (or equal for draw)
  if (draw) {
    // Force same score for draw
    const avgScore = Math.round((homeResult.score + awayResult.score) / 2);
    homeResult.score = avgScore;
    awayResult.score = avgScore;
  } else if (homeWon && homeResult.score <= awayResult.score) {
    // Add extra try/conversion to home
    const extraTry = selectTryScorer(homeStarters);
    homeResult.events.push({
      type: 'try',
      minute: randomBetween(75, 80),
      player: extraTry,
      converted: attemptConversion(homeResult.kicker),
      kicker: homeResult.kicker
    });
    homeResult.tries++;
    homeResult.score = awayResult.score + randomBetween(2, 8);
  } else if (awayWon && awayResult.score <= homeResult.score) {
    const extraTry = selectTryScorer(awayStarters);
    awayResult.events.push({
      type: 'try',
      minute: randomBetween(75, 80),
      player: extraTry,
      converted: attemptConversion(awayResult.kicker),
      kicker: awayResult.kicker
    });
    awayResult.tries++;
    awayResult.score = homeResult.score + randomBetween(2, 8);
  }
  
  // Print match report
  printMatchReport(homeTeam, awayTeam, homeResult, awayResult, homeWon, awayWon);
}

// Get teams from command line
const team1 = process.argv[2] || 'Canberra Frost';
const team2 = process.argv[3] || 'Brisbane Raptors';

simulateMatch(team1, team2);
