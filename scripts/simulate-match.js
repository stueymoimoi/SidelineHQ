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
  
  // Get top 13 players (starting lineup)
  const starters = players
    .filter(p => !p.is_u21)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 13);
  
  if (starters.length === 0) return 70;
  
  const avgOvr = starters.reduce((sum, p) => sum + p.overall, 0) / starters.length;
  return avgOvr;
}

function simulateScore(teamStrength, opponentStrength) {
  // Base tries (2-6 per team)
  const strengthDiff = teamStrength - opponentStrength;
  
  // Advantage based on strength difference
  const advantage = strengthDiff / 10; // +1 try per 10 OVR difference
  
  // Random tries with advantage factored in
  let tries = Math.round(randomBetween(2, 5) + advantage + (Math.random() - 0.5) * 2);
  tries = Math.max(0, Math.min(8, tries)); // Cap between 0-8 tries
  
  // Conversions (60-80% success rate)
  const conversionRate = 0.6 + Math.random() * 0.2;
  const conversions = Math.round(tries * conversionRate);
  
  // Penalty goals (0-2)
  const penalties = randomBetween(0, 2);
  
  // Field goals (rare, 10% chance of 1)
  const fieldGoals = Math.random() < 0.1 ? 1 : 0;
  
  // Calculate score
  const score = (tries * 4) + (conversions * 2) + (penalties * 2) + fieldGoals;
  
  return { score, tries, conversions, penalties, fieldGoals };
}

function generatePlayerRating(playerOvr, playerPotential, teamWon, scoreDiff) {
  // Base rating from OVR (scaled to 5.0-7.0)
  let baseRating = 5.0 + (playerOvr - 60) / 20;
  
  // Potential bonus (hidden gems perform better)
  const potentialGap = playerPotential - playerOvr;
  const potentialBonus = potentialGap > 15 ? 0.5 : potentialGap > 10 ? 0.3 : potentialGap > 5 ? 0.1 : 0;
  
  // Random variance
  const variance = (Math.random() - 0.5) * 2; // -1.0 to +1.0
  
  // Win/loss bonus
  const resultBonus = teamWon ? 0.3 : -0.2;
  
  // Blowout factor
  const blowoutBonus = Math.abs(scoreDiff) > 20 ? (teamWon ? 0.5 : -0.5) : 0;
  
  let rating = baseRating + potentialBonus + variance + resultBonus + blowoutBonus;
  
  // Clamp between 1.0 and 10.0
  rating = Math.max(1.0, Math.min(10.0, rating));
  
  return Math.round(rating * 10) / 10; // Round to 1 decimal
}

async function simulateMatch(homeTeamId, awayTeamId, season, round) {
  console.log('\n⏳ Simulating match...\n');
  
  // Get teams
  const { data: homeTeam } = await supabase
    .from('teams')
    .select('*')
    .eq('id', homeTeamId)
    .single();
    
  const { data: awayTeam } = await supabase
    .from('teams')
    .select('*')
    .eq('id', awayTeamId)
    .single();
  
  // Get players
  const { data: homePlayers } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', homeTeamId);
    
  const { data: awayPlayers } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', awayTeamId);
  
  // Calculate strengths
  const homeStrength = calculateTeamStrength(homePlayers);
  const awayStrength = calculateTeamStrength(awayPlayers);
  
  console.log(`🏠 ${homeTeam.name} (${homeStrength.toFixed(1)} STR)`);
  console.log(`✈️  ${awayTeam.name} (${awayStrength.toFixed(1)} STR)\n`);
  
  // Home advantage (+2)
  const homeResult = simulateScore(homeStrength + 2, awayStrength);
  const awayResult = simulateScore(awayStrength, homeStrength + 2);
  
  console.log(`📊 FINAL SCORE:`);
  console.log(`${homeTeam.name} ${homeResult.score} - ${awayResult.score} ${awayTeam.name}\n`);
  
  // Determine winner
  const homeWon = homeResult.score > awayResult.score;
  const awayWon = awayResult.score > homeResult.score;
  const draw = homeResult.score === awayResult.score;
  
  if (draw) {
    console.log(`🤝 DRAW!\n`);
  } else if (homeWon) {
    console.log(`🏆 ${homeTeam.name} WIN!\n`);
  } else {
    console.log(`🏆 ${awayTeam.name} WIN!\n`);
  }
  
  // Save match result
  const { data: match, error: matchError } = await supabase
    .from('match_results')
    .insert({
      season: season,
      round: round,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      home_score: homeResult.score,
      away_score: awayResult.score,
      status: 'completed',
      played_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (matchError) {
    console.error('Error saving match:', matchError);
    return;
  }
  
  // Update team records
  if (homeWon) {
    await supabase.from('teams').update({ 
      wins: homeTeam.wins + 1,
      points_for: homeTeam.points_for + homeResult.score,
      points_against: homeTeam.points_against + awayResult.score
    }).eq('id', homeTeamId);
    
    await supabase.from('teams').update({ 
      losses: awayTeam.losses + 1,
      points_for: awayTeam.points_for + awayResult.score,
      points_against: awayTeam.points_against + homeResult.score
    }).eq('id', awayTeamId);
  } else if (awayWon) {
    await supabase.from('teams').update({ 
      losses: homeTeam.losses + 1,
      points_for: homeTeam.points_for + homeResult.score,
      points_against: homeTeam.points_against + awayResult.score
    }).eq('id', homeTeamId);
    
    await supabase.from('teams').update({ 
      wins: awayTeam.wins + 1,
      points_for: awayTeam.points_for + awayResult.score,
      points_against: awayTeam.points_against + homeResult.score
    }).eq('id', awayTeamId);
  } else {
    await supabase.from('teams').update({ 
      draws: homeTeam.draws + 1,
      points_for: homeTeam.points_for + homeResult.score,
      points_against: homeTeam.points_against + awayResult.score
    }).eq('id', homeTeamId);
    
    await supabase.from('teams').update({ 
      draws: awayTeam.draws + 1,
      points_for: awayTeam.points_for + awayResult.score,
      points_against: awayTeam.points_against + homeResult.score
    }).eq('id', awayTeamId);
  }
  
  // Generate player ratings for starters
  const scoreDiff = homeResult.score - awayResult.score;
  
  const homeStarters = homePlayers
    .filter(p => !p.is_u21)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 13);
    
  const awayStarters = awayPlayers
    .filter(p => !p.is_u21)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 13);
  
  console.log(`📝 Player Ratings:\n`);
  console.log(`${homeTeam.name}:`);
  
  for (const player of homeStarters) {
    const rating = generatePlayerRating(player.overall, player.potential, homeWon, scoreDiff);
    
    await supabase.from('player_match_ratings').insert({
      player_id: player.id,
      match_id: match.id,
      rating: rating
    });
    
    console.log(`  ${player.first_name} ${player.last_name}: ${rating}`);
  }
  
  console.log(`\n${awayTeam.name}:`);
  
  for (const player of awayStarters) {
    const rating = generatePlayerRating(player.overall, player.potential, awayWon, -scoreDiff);
    
    await supabase.from('player_match_ratings').insert({
      player_id: player.id,
      match_id: match.id,
      rating: rating
    });
    
    console.log(`  ${player.first_name} ${player.last_name}: ${rating}`);
  }
  
  console.log(`\n✅ Match saved!`);
  return match;
}

async function main() {
  console.log('🏉 SidelineHQ Match Simulator');
  console.log('============================\n');
  
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
  
  // Simulate a test match between first two teams
  console.log('\n🎮 TEST MATCH: ' + teams[0].name + ' vs ' + teams[1].name);
  
  await simulateMatch(teams[0].id, teams[1].id, 0, 1);
}

main();
