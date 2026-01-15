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
  
  // Base strength from OVR
  const avgOvr = starters.reduce((sum, p) => sum + p.overall, 0) / starters.length;
  
  // GEM BONUS - This is where hidden potential matters!
  let gemBonus = 0;
  
  for (const player of starters) {
    const potential = player.potential || player.overall;
    
    if (potential >= 91) {
      // Generational talent - HUGE impact
      gemBonus += 3;
    } else if (potential >= 86) {
      // Gun - solid impact
      gemBonus += 1.5;
    } else if (potential >= 81) {
      // Good - small impact
      gemBonus += 0.5;
    }
  }
  
  return avgOvr + gemBonus;
}

function getWinProbability(strengthDiff) {
  // Steeper curve - gems matter more!
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

function simulateScore(teamStrength, opponentStrength, isWinner) {
  const strengthDiff = teamStrength - opponentStrength;
  
  // Base tries influenced by strength
  let baseTries = 3;
  if (strengthDiff > 10) baseTries = 5;
  else if (strengthDiff > 5) baseTries = 4;
  else if (strengthDiff < -10) baseTries = 2;
  else if (strengthDiff < -5) baseTries = 2;
  
  // Random variance
  let tries = baseTries + randomBetween(-1, 2);
  tries = Math.max(1, Math.min(8, tries));
  
  // Conversions (65-80% success rate)
  const conversionRate = 0.65 + Math.random() * 0.15;
  const conversions = Math.round(tries * conversionRate);
  
  // Penalty goals (0-2)
  const penalties = randomBetween(0, 2);
  
  // Field goals - FIXED LOGIC
  // Winners: 10% chance (clutch finish)
  // Losers: 2% chance (rare)
  let fieldGoals = 0;
  if (isWinner && Math.random() < 0.10) {
    fieldGoals = 1;
  } else if (!isWinner && Math.random() < 0.02) {
    fieldGoals = 1;
  }
  
  // Calculate score
  const score = (tries * 4) + (conversions * 2) + (penalties * 2) + fieldGoals;
  
  return { score, tries, conversions, penalties, fieldGoals };
}

function generatePlayerRating(playerOvr, playerPotential, teamWon, scoreDiff) {
  let baseRating = 5.0 + (playerOvr - 60) / 20;
  
  // Potential bonus - GEMS SHINE IN MATCHES
  const potentialGap = playerPotential - playerOvr;
  let potentialBonus = 0;
  if (potentialGap > 20) potentialBonus = 0.8;
  else if (potentialGap > 15) potentialBonus = 0.6;
  else if (potentialGap > 10) potentialBonus = 0.4;
  else if (potentialGap > 5) potentialBonus = 0.2;
  
  const variance = (Math.random() - 0.5) * 1.5;
  const resultBonus = teamWon ? 0.4 : -0.3;
  const blowoutBonus = Math.abs(scoreDiff) > 20 ? (teamWon ? 0.6 : -0.6) : 0;
  
  let rating = baseRating + potentialBonus + variance + resultBonus + blowoutBonus;
  rating = Math.max(1.0, Math.min(10.0, rating));
  
  return Math.round(rating * 10) / 10;
}

async function simulateMatch(fixture, homeTeam, awayTeam, homePlayers, awayPlayers) {
  const homeStrength = calculateTeamStrength(homePlayers);
  const awayStrength = calculateTeamStrength(awayPlayers);
  
  // Home advantage (+2)
  const homeEffectiveStrength = homeStrength + 2;
  const strengthDiff = homeEffectiveStrength - awayStrength;
  
  // Determine winner based on probability
  const homeWinProb = getWinProbability(strengthDiff);
  const roll = Math.random();
  
  let homeWon, awayWon, draw;
  
  // Small chance of draw (5%)
  if (Math.random() < 0.05) {
    draw = true;
    homeWon = false;
    awayWon = false;
  } else if (roll < homeWinProb) {
    homeWon = true;
    awayWon = false;
    draw = false;
  } else {
    homeWon = false;
    awayWon = true;
    draw = false;
  }
  
  // Generate scores based on who won
  let homeResult, awayResult;
  
  if (draw) {
    // Draw - same score, no field goals
    const baseScore = simulateScore(homeStrength, awayStrength, false);
    homeResult = { ...baseScore, fieldGoals: 0 };
    awayResult = { ...baseScore, fieldGoals: 0 };
    // Recalculate to ensure same score
    const drawScore = (randomBetween(2, 4) * 4) + (randomBetween(1, 3) * 2) + (randomBetween(0, 2) * 2);
    homeResult.score = drawScore;
    awayResult.score = drawScore;
  } else {
    homeResult = simulateScore(homeEffectiveStrength, awayStrength, homeWon);
    awayResult = simulateScore(awayStrength, homeEffectiveStrength, awayWon);
    
    // Ensure winner has higher score
    if (homeWon && homeResult.score <= awayResult.score) {
      homeResult.score = awayResult.score + randomBetween(1, 12);
    } else if (awayWon && awayResult.score <= homeResult.score) {
      awayResult.score = homeResult.score + randomBetween(1, 12);
    }
  }
  
  // Update match result
  await supabase
    .from('match_results')
    .update({
      home_score: homeResult.score,
      away_score: awayResult.score,
      status: 'completed',
      played_at: new Date().toISOString()
    })
    .eq('id', fixture.id);
  
  // Update team records
  if (homeWon) {
    await supabase.from('teams').update({ 
      wins: homeTeam.wins + 1,
      points_for: homeTeam.points_for + homeResult.score,
      points_against: homeTeam.points_against + awayResult.score
    }).eq('id', homeTeam.id);
    
    await supabase.from('teams').update({ 
      losses: awayTeam.losses + 1,
      points_for: awayTeam.points_for + awayResult.score,
      points_against: awayTeam.points_against + homeResult.score
    }).eq('id', awayTeam.id);
  } else if (awayWon) {
    await supabase.from('teams').update({ 
      losses: homeTeam.losses + 1,
      points_for: homeTeam.points_for + homeResult.score,
      points_against: homeTeam.points_against + awayResult.score
    }).eq('id', homeTeam.id);
    
    await supabase.from('teams').update({ 
      wins: awayTeam.wins + 1,
      points_for: awayTeam.points_for + awayResult.score,
      points_against: awayTeam.points_against + homeResult.score
    }).eq('id', awayTeam.id);
  } else {
    await supabase.from('teams').update({ 
      draws: homeTeam.draws + 1,
      points_for: homeTeam.points_for + homeResult.score,
      points_against: homeTeam.points_against + awayResult.score
    }).eq('id', homeTeam.id);
    
    await supabase.from('teams').update({ 
      draws: awayTeam.draws + 1,
      points_for: awayTeam.points_for + awayResult.score,
      points_against: awayTeam.points_against + homeResult.score
    }).eq('id', awayTeam.id);
  }
  
  // Generate player ratings
  const scoreDiff = homeResult.score - awayResult.score;
  
  const homeStarters = homePlayers
    .filter(p => !p.is_u21)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 13);
    
  const awayStarters = awayPlayers
    .filter(p => !p.is_u21)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 13);
  
  for (const player of homeStarters) {
    const rating = generatePlayerRating(player.overall, player.potential, homeWon, scoreDiff);
    await supabase.from('player_match_ratings').insert({
      player_id: player.id,
      match_id: fixture.id,
      rating: rating
    });
  }
  
  for (const player of awayStarters) {
    const rating = generatePlayerRating(player.overall, player.potential, awayWon, -scoreDiff);
    await supabase.from('player_match_ratings').insert({
      player_id: player.id,
      match_id: fixture.id,
      rating: rating
    });
  }
  
  const result = draw ? 'DRAW' : (homeWon ? homeTeam.name + ' WIN' : awayTeam.name + ' WIN');
  
  return {
    home: homeTeam.name,
    away: awayTeam.name,
    homeScore: homeResult.score,
    awayScore: awayResult.score,
    result: result,
    homeStrength: homeEffectiveStrength.toFixed(1),
    awayStrength: awayStrength.toFixed(1)
  };
}

async function main() {
  const roundNum = parseInt(process.argv[2]) || 1;
  
  console.log('🏉 SidelineHQ Round Simulator v2');
  console.log('================================\n');
  console.log(`📅 Simulating ROUND ${roundNum}...\n`);
  
  // Get fixtures for this round
  const { data: fixtures, error } = await supabase
    .from('match_results')
    .select('*')
    .eq('season', 0)
    .eq('round', roundNum)
    .eq('status', 'scheduled');
  
  if (error) {
    console.error('Error fetching fixtures:', error);
    return;
  }
  
  if (fixtures.length === 0) {
    console.log('❌ No scheduled matches for this round.');
    console.log('   (Already simulated or invalid round number)');
    return;
  }
  
  console.log(`Found ${fixtures.length} matches to simulate\n`);
  console.log('========================================\n');
  
  for (const fixture of fixtures) {
    const { data: homeTeam } = await supabase
      .from('teams')
      .select('*')
      .eq('id', fixture.home_team_id)
      .single();
      
    const { data: awayTeam } = await supabase
      .from('teams')
      .select('*')
      .eq('id', fixture.away_team_id)
      .single();
    
    const { data: homePlayers } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', fixture.home_team_id);
      
    const { data: awayPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', fixture.away_team_id);
    
    const result = await simulateMatch(fixture, homeTeam, awayTeam, homePlayers, awayPlayers);
    
    console.log(`🏟️  ${result.home} ${result.homeScore} - ${result.awayScore} ${result.away}`);
    console.log(`   STR: ${result.homeStrength} vs ${result.awayStrength} | ${result.result}\n`);
  }
  
  console.log('========================================');
  console.log(`✅ Round ${roundNum} complete!\n`);
  
  // Show ladder
  console.log('📊 LADDER:\n');
  
  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .eq('division', 1)
    .order('wins', { ascending: false });
  
  // Sort by wins, then point diff
  teams.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const aPD = a.points_for - a.points_against;
    const bPD = b.points_for - b.points_against;
    return bPD - aPD;
  });
  
  console.log('Pos  Team                    W   D   L   PF   PA   PD');
  console.log('---  ----                    -   -   -   --   --   --');
  
  teams.forEach((team, i) => {
    const pd = team.points_for - team.points_against;
    const pdStr = pd >= 0 ? `+${pd}` : `${pd}`;
    console.log(
      `${(i + 1).toString().padEnd(4)} ${team.name.padEnd(23)} ${team.wins.toString().padEnd(3)} ${team.draws.toString().padEnd(3)} ${team.losses.toString().padEnd(3)} ${team.points_for.toString().padEnd(4)} ${team.points_against.toString().padEnd(4)} ${pdStr}`
    );
  });
}

main();
