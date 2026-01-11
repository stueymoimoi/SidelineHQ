import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Config
const SEASON = 0;
const HOME_ADVANTAGE = 3;
const BASE_TRIES = 4;

function rollChance(pct: number) {
  return Math.random() * 100 < pct;
}

export async function GET() {
  const logs: string[] = [];
  
  try {
    // Find next round to simulate
    const { data: fixtures } = await supabase
      .from('fixtures')
      .select('*')
      .eq('season', SEASON)
      .eq('played', false)
      .order('round', { ascending: true });
    
    if (!fixtures || fixtures.length === 0) {
      return NextResponse.json({ success: true, message: 'Season complete!' });
    }
    
    const currentRound = fixtures[0].round;
    const roundFixtures = fixtures.filter((f: { round: number }) => f.round === currentRound);
    
    logs.push(`Simulating Round ${currentRound}`);
    
    // Get teams
    const { data: teams } = await supabase.from('teams').select('*').eq('division', 1);
    const teamsMap: Record<string, any> = {};
    teams?.forEach((t: any) => { teamsMap[t.id] = t; });
    
    // Simulate each match
    for (const fixture of roundFixtures) {
      const homeTeam = teamsMap[fixture.home_team_id];
      const awayTeam = teamsMap[fixture.away_team_id];
      
      // Get team strengths (average of top 13 players)
      const { data: homePlayers } = await supabase
        .from('players')
        .select('overall, fatigue')
        .eq('team_id', fixture.home_team_id)
        .order('overall', { ascending: false })
        .limit(13);
      
      const { data: awayPlayers } = await supabase
        .from('players')
        .select('overall, fatigue')
        .eq('team_id', fixture.away_team_id)
        .order('overall', { ascending: false })
        .limit(13);
      
      const homeStrength = (homePlayers?.reduce((sum: number, p: any) => sum + p.overall, 0) || 0) / 13 + HOME_ADVANTAGE;
      const awayStrength = (awayPlayers?.reduce((sum: number, p: any) => sum + p.overall, 0) || 0) / 13;
      
      // Get goal kickers
      const { data: homeTactics } = await supabase
        .from('team_tactics')
        .select('goal_kicker')
        .eq('team_id', fixture.home_team_id)
        .single();
      
      const { data: awayTactics } = await supabase
        .from('team_tactics')
        .select('goal_kicker')
        .eq('team_id', fixture.away_team_id)
        .single();
      
      let homeKicking = 60;
      let awayKicking = 60;
      
      if (homeTactics?.goal_kicker) {
        const { data: kicker } = await supabase.from('players').select('kicking').eq('id', homeTactics.goal_kicker).single();
        if (kicker) homeKicking = kicker.kicking;
      }
      
      if (awayTactics?.goal_kicker) {
        const { data: kicker } = await supabase.from('players').select('kicking').eq('id', awayTactics.goal_kicker).single();
        if (kicker) awayKicking = kicker.kicking;
      }
      
      // Calculate tries
      const strengthDiff = homeStrength - awayStrength;
      const homeTries = Math.max(0, Math.round(BASE_TRIES + (strengthDiff / 20) + (Math.random() - 0.5) * 4));
      const awayTries = Math.max(0, Math.round(BASE_TRIES - (strengthDiff / 20) + (Math.random() - 0.5) * 4));
      
      // Conversions
      let homeConv = 0, awayConv = 0;
      for (let i = 0; i < homeTries; i++) if (rollChance(homeKicking)) homeConv++;
      for (let i = 0; i < awayTries; i++) if (rollChance(awayKicking)) awayConv++;
      
      // Penalties
      const homePen = rollChance(30) ? (rollChance(30) ? 2 : 1) : 0;
      const awayPen = rollChance(30) ? (rollChance(30) ? 2 : 1) : 0;
      
      // Final scores
      const homeScore = (homeTries * 4) + (homeConv * 2) + (homePen * 2);
      const awayScore = (awayTries * 4) + (awayConv * 2) + (awayPen * 2);
      
      // Save result
      await supabase.from('match_results').insert({
        fixture_id: fixture.id,
        home_team_id: fixture.home_team_id,
        away_team_id: fixture.away_team_id,
        home_score: homeScore,
        away_score: awayScore
      });
      
      // Mark played
      await supabase.from('fixtures').update({ played: true }).eq('id', fixture.id);
      
      // Update standings
      const homeWin = homeScore > awayScore;
      const awayWin = awayScore > homeScore;
      const draw = homeScore === awayScore;
      
      await supabase.from('teams').update({
        wins: homeTeam.wins + (homeWin ? 1 : 0),
        draws: homeTeam.draws + (draw ? 1 : 0),
        losses: homeTeam.losses + (awayWin ? 1 : 0),
        points_for: homeTeam.points_for + homeScore,
        points_against: homeTeam.points_against + awayScore
      }).eq('id', homeTeam.id);
      
      await supabase.from('teams').update({
        wins: awayTeam.wins + (awayWin ? 1 : 0),
        draws: awayTeam.draws + (draw ? 1 : 0),
        losses: awayTeam.losses + (homeWin ? 1 : 0),
        points_for: awayTeam.points_for + awayScore,
        points_against: awayTeam.points_against + homeScore
      }).eq('id', awayTeam.id);
      
      // Add fatigue to players who played (+15%)
      const { data: homeLineup } = await supabase.from('team_tactics').select('*').eq('team_id', fixture.home_team_id).single();
      const { data: awayLineup } = await supabase.from('team_tactics').select('*').eq('team_id', fixture.away_team_id).single();
      
      const posFields = ['pos_fullback', 'pos_winger_l', 'pos_winger_r', 'pos_centre_l', 'pos_centre_r',
        'pos_five_eighth', 'pos_halfback', 'pos_prop_l', 'pos_prop_r', 'pos_hooker',
        'pos_second_row_l', 'pos_second_row_r', 'pos_lock', 'bench_1', 'bench_2', 'bench_3', 'bench_4'];
      
      for (const field of posFields) {
        if (homeLineup?.[field]) {
          const { data: p } = await supabase.from('players').select('fatigue').eq('id', homeLineup[field]).single();
          if (p) await supabase.from('players').update({ fatigue: Math.min(100, p.fatigue + 15) }).eq('id', homeLineup[field]);
        }
        if (awayLineup?.[field]) {
          const { data: p } = await supabase.from('players').select('fatigue').eq('id', awayLineup[field]).single();
          if (p) await supabase.from('players').update({ fatigue: Math.min(100, p.fatigue + 15) }).eq('id', awayLineup[field]);
        }
      }
      
      logs.push(`${homeTeam.city} ${homeScore} - ${awayScore} ${awayTeam.city}`);
    }
    
    // Process training
    const { data: trainingPlayers } = await supabase
      .from('players')
      .select('*')
      .not('current_training', 'is', null);
    
    let improvements = 0;
    const PROGRESS_STAGES = ['NONE', 'POOR', 'FAIR', 'GOOD', 'VERY GOOD', 'EXCELLENT'];
    const STAT_CHANCES: Record<string, number> = { 'NONE': 0, 'POOR': 15, 'FAIR': 35, 'GOOD': 55, 'VERY GOOD': 75, 'EXCELLENT': 90 };
    const STAT_TRAINING = ['Speed', 'Strength', 'Skill', 'Stamina', 'Defense'];
    
    for (const player of trainingPlayers || []) {
      const updates: Record<string, any> = {};
      const training = player.current_training;
      const progress = player.training_progress || 'NONE';
      const potential = player.potential || 70;
      const potentialBonus = (potential - 60) / 2;
      
      if (training === 'Rest') {
        updates.fatigue = Math.max(0, player.fatigue - 25);
      } else {
        updates.fatigue = Math.min(100, player.fatigue + 5);
        
        // Progress advancement
        if (progress !== 'EXCELLENT' && rollChance(60 + potentialBonus)) {
          const idx = PROGRESS_STAGES.indexOf(progress);
          if (idx < PROGRESS_STAGES.length - 1) {
            updates.training_progress = PROGRESS_STAGES[idx + 1];
          }
        }
        
        // Stat improvement
        const effectiveProgress = updates.training_progress || progress;
        const chance = (STAT_CHANCES[effectiveProgress] || 0) + potentialBonus;
        
        if (chance > 0 && rollChance(chance) && STAT_TRAINING.includes(training)) {
          const statKey = training.toLowerCase();
          const current = player[statKey];
          if (current < 99) {
            const roll = Math.random() * 100;
            const gain = roll < 50 ? 1 : roll < 85 ? 2 : 3;
            updates[statKey] = Math.min(99, current + gain);
            updates.overall = Math.round((
              (updates.speed ?? player.speed) +
              (updates.strength ?? player.strength) +
              (updates.skill ?? player.skill) +
              (updates.stamina ?? player.stamina) +
              (updates.defense ?? player.defense)
            ) / 5);
            improvements++;
          }
        }
      }
      
      if (Object.keys(updates).length > 0) {
        await supabase.from('players').update(updates).eq('id', player.id);
      }
    }
    
    logs.push(`Training: ${improvements} players improved`);
    
    return NextResponse.json({
      success: true,
      round: currentRound,
      matches: logs,
      improvements
    });
    
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
