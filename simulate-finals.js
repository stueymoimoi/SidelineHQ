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

function simulateScore(teamStrength, opponentStrength, isWinner) {
  const strengthDiff = teamStrength - opponentStrength;
  
  let baseTries = 3;
  if (strengthDiff > 10) baseTries = 5;
  else if (strengthDiff > 5) baseTries = 4;
  else if (strengthDiff < -10) baseTries = 2;
  else if (strengthDiff < -5) baseTries = 2;
  
  let tries = baseTries + randomBetween(-1, 2);
  tries = Math.max(1, Math.min(8, tries));
  
  const conversionRate = 0.65 + Math.random() * 0.15;
  const conversions = Math.round(tries * conversionRate);
  const penalties = randomBetween(0, 2);
  
  let fieldGoals = 0;
  if (isWinner && Math.random() < 0.10) fieldGoals = 1;
  else if (!isWinner && Math.random() < 0.02) fieldGoals = 1;
  
  const score = (tries * 4) + (conversions * 2) + (penalties * 2) + fieldGoals;
  return score;
}

async function simulateFinalMatch(team1, team2, players1, players2, matchName) {
  console.log(`\n🏟️  ${matchName}`);
  console.log('═'.repeat(50));
  console.log(`${team1.name} vs ${team2.name}\n`);
  
  const strength1 = calculateTeamStrength(players1);
  const strength2 = calculateTeamStrength(players2);
  
  console.log(`Strength: ${strength1.toFixed(1)} vs ${strength2.toFixed(1)}`);
  
  const strengthDiff = strength1 - strength2;
  const team1WinProb = getWinProbability(strengthDiff);
  
  // No draws in finals!
  const team1Won = Math.random() < team1WinProb;
  const team2Won = !team1Won;
  
  let score1 = simulateScore(strength1, strength2, team1Won);
  let score2 = simulateScore(strength2, strength1, team2Won);
  
  // Ensure winner has higher score
  if (team1Won && score1 <= score2) {
    score1 = score2 + randomBetween(1, 8);
  } else if (team2Won && score2 <= score1) {
    score2 = score1 + randomBetween(1, 8);
  }
  
  console.log(`\n📊 FINAL SCORE:`);
  console.log(`${team1.name} ${score1} - ${score2} ${team2.name}`);
  
  const winner = team1Won ? team1 : team2;
  const loser = team1Won ? team2 : team1;
  
  console.log(`\n🏆 ${winner.name} WIN!`);
  console.log(`❌ ${loser.name} eliminated`);
  
  return { winner, loser, score1, score2 };
}

async function main() {
  console.log('🏆 SidelineHQ FINALS');
  console.log('====================\n');
  
  // Get top 4 teams by wins, then point diff
  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .eq('division', 1)
    .order('wins', { ascending: false })
    .limit(10);
  
  // Sort properly
  teams.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return (b.points_for - b.points_against) - (a.points_for - a.points_against);
  });
  
  const top4 = teams.slice(0, 4);
  
  console.log('📊 FINALS QUALIFIERS:');
  console.log('─'.repeat(40));
  top4.forEach((t, i) => {
    const pd = t.points_for - t.points_against;
    console.log(`${i + 1}. ${t.name} (${t.wins}W-${t.draws}D-${t.losses}L, PD: ${pd >= 0 ? '+' : ''}${pd})`);
  });
  
  // Get players for each team
  const playersData = {};
  for (const team of top4) {
    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', team.id);
    playersData[team.id] = players;
  }
  
  // Semi Final 1: 1st vs 4th
  console.log('\n\n' + '🏈'.repeat(25));
  console.log('         SEMI FINALS');
  console.log('🏈'.repeat(25));
  
  const semi1 = await simulateFinalMatch(
    top4[0], top4[3],
    playersData[top4[0].id], playersData[top4[3].id],
    'SEMI FINAL 1: 1st vs 4th'
  );
  
  // Semi Final 2: 2nd vs 3rd
  const semi2 = await simulateFinalMatch(
    top4[1], top4[2],
    playersData[top4[1].id], playersData[top4[2].id],
    'SEMI FINAL 2: 2nd vs 3rd'
  );
  
  // Grand Final
  console.log('\n\n' + '🏆'.repeat(25));
  console.log('         GRAND FINAL');
  console.log('🏆'.repeat(25));
  
  const gf = await simulateFinalMatch(
    semi1.winner, semi2.winner,
    playersData[semi1.winner.id], playersData[semi2.winner.id],
    '🏆 GRAND FINAL 🏆'
  );
  
  // Champion announcement
  console.log('\n\n');
  console.log('═'.repeat(50));
  console.log('🏆🏆🏆 SEASON 0 CHAMPIONS 🏆🏆🏆');
  console.log('═'.repeat(50));
  console.log(`\n   ${gf.winner.name.toUpperCase()}!`);
  console.log('\n═'.repeat(50));
  
  console.log('\n\n📊 FINALS SUMMARY:');
  console.log('─'.repeat(40));
  console.log(`Semi 1: ${semi1.winner.name} def ${semi1.loser.name} (${semi1.score1}-${semi1.score2})`);
  console.log(`Semi 2: ${semi2.winner.name} def ${semi2.loser.name} (${semi2.score1}-${semi2.score2})`);
  console.log(`Grand Final: ${gf.winner.name} def ${gf.loser.name} (${gf.score1}-${gf.score2})`);
  
  console.log('\n✅ Season 0 complete!');
  console.log('🏖️  Run process-offseason.js to start next season!');
}

main();
