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
  
  // GEM BONUS
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

async function simulateMatch(fixture, teamsData, playersData) {
  const homeTeam = teamsData[fixture.home_team_id];
  const awayTeam = teamsData[fixture.away_team_id];
  const homePlayers = playersData[fixture.home_team_id] || [];
  const awayPlayers = playersData[fixture.away_team_id] || [];
  
  const homeStrength = calculateTeamStrength(homePlayers) + 2; // Home advantage
  const awayStrength = calculateTeamStrength(awayPlayers);
  
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
  
  let homeScore, awayScore;
  
  if (draw) {
    const drawScore = (randomBetween(2, 4) * 4) + (randomBetween(1, 3) * 2) + (randomBetween(0, 2) * 2);
    homeScore = drawScore;
    awayScore = drawScore;
  } else {
    homeScore = simulateScore(homeStrength, awayStrength, homeWon);
    awayScore = simulateScore(awayStrength, homeStrength, awayWon);
    
    if (homeWon && homeScore <= awayScore) {
      homeScore = awayScore + randomBetween(1, 12);
    } else if (awayWon && awayScore <= homeScore) {
      awayScore = homeScore + randomBetween(1, 12);
    }
  }
  
  return { homeScore, awayScore, homeWon, awayWon, draw, homeTeam, awayTeam };
}

async function main() {
  console.log('🏃 SidelineHQ Season Speedrun');
  console.log('=============================\n');
  
  // Load all teams
  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .eq('division', 1);
  
  const teamsData = {};
  teams.forEach(t => teamsData[t.id] = t);
  
  // Load all players
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .in('team_id', teams.map(t => t.id));
  
  const playersData = {};
  teams.forEach(t => playersData[t.id] = []);
  players.forEach(p => {
    if (playersData[p.team_id]) {
      playersData[p.team_id].push(p);
    }
  });
  
  // Get all fixtures
  const { data: fixtures } = await supabase
    .from('match_results')
    .select('*')
    .eq('season', 0)
    .eq('status', 'scheduled')
    .order('round', { ascending: true });
  
  console.log(`📅 ${fixtures.length} matches to simulate\n`);
  
  // Group by round
  const rounds = {};
  fixtures.forEach(f => {
    if (!rounds[f.round]) rounds[f.round] = [];
    rounds[f.round].push(f);
  });
  
  // Track standings
  const standings = {};
  teams.forEach(t => {
    standings[t.id] = { 
      name: t.name, 
      wins: t.wins || 0, 
      losses: t.losses || 0, 
      draws: t.draws || 0,
      pf: t.points_for || 0,
      pa: t.points_against || 0
    };
  });
  
  // Simulate each round
  for (const roundNum of Object.keys(rounds).sort((a, b) => a - b)) {
    console.log(`\n📅 ROUND ${roundNum}:`);
    console.log('─'.repeat(50));
    
    for (const fixture of rounds[roundNum]) {
      const result = await simulateMatch(fixture, teamsData, playersData);
      
      // Update fixture
      await supabase
        .from('match_results')
        .update({
          home_score: result.homeScore,
          away_score: result.awayScore,
          status: 'completed',
          played_at: new Date().toISOString()
        })
        .eq('id', fixture.id);
      
      // Update standings
      const homeId = fixture.home_team_id;
      const awayId = fixture.away_team_id;
      
      standings[homeId].pf += result.homeScore;
      standings[homeId].pa += result.awayScore;
      standings[awayId].pf += result.awayScore;
      standings[awayId].pa += result.homeScore;
      
      if (result.homeWon) {
        standings[homeId].wins++;
        standings[awayId].losses++;
      } else if (result.awayWon) {
        standings[awayId].wins++;
        standings[homeId].losses++;
      } else {
        standings[homeId].draws++;
        standings[awayId].draws++;
      }
      
      const resultText = result.draw ? 'DRAW' : (result.homeWon ? result.homeTeam.name : result.awayTeam.name);
      console.log(`${result.homeTeam.name} ${result.homeScore} - ${result.awayScore} ${result.awayTeam.name} (${resultText})`);
    }
  }
  
  // Update team records in database
  for (const teamId of Object.keys(standings)) {
    const s = standings[teamId];
    await supabase
      .from('teams')
      .update({
        wins: s.wins,
        losses: s.losses,
        draws: s.draws,
        points_for: s.pf,
        points_against: s.pa
      })
      .eq('id', teamId);
  }
  
  // Show final ladder
  console.log('\n\n🏆 FINAL LADDER');
  console.log('═'.repeat(60));
  
  const ladder = Object.values(standings).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return (b.pf - b.pa) - (a.pf - a.pa);
  });
  
  console.log('Pos  Team                    W   D   L   PF   PA   PD');
  console.log('─'.repeat(60));
  
  ladder.forEach((team, i) => {
    const pd = team.pf - team.pa;
    const pdStr = pd >= 0 ? `+${pd}` : `${pd}`;
    const pos = i + 1;
    const finals = pos <= 4 ? ' ★' : '';
    console.log(
      `${pos.toString().padEnd(4)} ${team.name.padEnd(23)} ${team.wins.toString().padEnd(3)} ${team.draws.toString().padEnd(3)} ${team.losses.toString().padEnd(3)} ${team.pf.toString().padEnd(4)} ${team.pa.toString().padEnd(4)} ${pdStr}${finals}`
    );
  });
  
  // Finals preview
  console.log('\n\n🏆 FINALS PREVIEW');
  console.log('═'.repeat(40));
  console.log(`\nSemi Final 1: ${ladder[0].name} vs ${ladder[3].name}`);
  console.log(`Semi Final 2: ${ladder[1].name} vs ${ladder[2].name}`);
  console.log(`\nWinners play in the GRAND FINAL! 🏆`);
  
  console.log('\n✅ Season complete! Run finals simulation next.');
}

main();
