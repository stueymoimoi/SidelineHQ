/**
 * SidelineHQ Cron: FREE AGENTS
 * 
 * Phase 4 of 5 - Runs at 6:15pm AEST (8:15 UTC)
 * - Free agent claim processing
 * - International arrivals (Sunday only)
 * 
 * Schedule: 15 8 * * 0,2,4
 */

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { SEASON } from '@/lib/game-engine/constants';
import type { Team, Notification } from '@/lib/game-engine/types';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  const startTime = Date.now();
  const supabase = getSupabase();
  const logs: string[] = [];
  
  // Auth check
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron');
  
  const CRON_SECRET = process.env.CRON_SECRET;
  if (!isVercelCron && secret !== CRON_SECRET) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await supabase.from('game_state').update({ current_phase: 'freeagents' }).eq('id', 1);
    logs.push('🏪 Free Agents phase started');
    
    const today = new Date();
    const isSunday = today.getUTCDay() === 0;
    
    // Get current round
    const { data: fixtures } = await supabase
      .from('fixtures')
      .select('round')
      .eq('season', SEASON)
      .eq('played', true)
      .order('round', { ascending: false })
      .limit(1);
    
    const currentRound = fixtures?.[0]?.round || 1;
    logs.push(`Current round: ${currentRound}`);
    
    // ===========================================
    // INTERNATIONAL ARRIVALS (Sunday only)
    // ===========================================
    
    if (isSunday) {
      try {
        const { data: teams } = await supabase.from('teams').select('id');
        
        const numNewPlayers = Math.random() < 0.5 ? 1 : 2;
        const internationalNotifications: Notification[] = [];
        
        const NATIONALITIES = ['ENG', 'NZL', 'FIJ', 'TON', 'SAM', 'PNG'];
        const POSITIONS = ['Prop', 'Hooker', 'Second Row', 'Lock', 'Halfback', 'Five-Eighth', 'Centre', 'Winger', 'Fullback'];
        const NAMES: Record<string, { first: string[], last: string[] }> = {
          ENG: { first: ['Jack', 'Tom', 'Harry', 'George', 'Charlie', 'Sam', 'Joe', 'Ben'], last: ['Smith', 'Jones', 'Williams', 'Taylor', 'Brown', 'Davies', 'Wilson', 'Evans'] },
          NZL: { first: ['Tane', 'Nikau', 'Manu', 'Josh', 'Shaun', 'Joseph', 'Dylan', 'Brandon'], last: ['Manu', 'Williams', 'Harris', 'Hughes', 'Smith', 'Johnson', 'Hurrell', 'Hiku'] },
          TON: { first: ['Jason', 'Tevita', 'Sione', 'Manu', 'Daniel', 'David', 'Junior', 'Ata'], last: ['Taumalolo', 'Fifita', 'Kaufusi', 'Pangai', 'Fonua', 'Tupou', 'Haas', 'Vea'] },
          SAM: { first: ['Jarome', 'Brian', 'Junior', 'Anthony', 'Josh', 'Spencer', 'Joseph', 'Manu'], last: ['Luai', "To'o", 'Papalii', 'Aloiai', 'Leilua', 'Tago', 'Paulo', 'Leota'] },
          FIJ: { first: ['Maika', 'Suliasi', 'Viliame', 'Semi', 'Kevin', 'Mikaele', 'Henry', 'Pio'], last: ['Sivo', 'Vunivalu', 'Naiqama', 'Koroibete', 'Radradra', 'Koroisau', 'Tuisova', 'Yato'] },
          PNG: { first: ['David', 'James', 'Michael', 'John', 'Justin', 'Alex', 'Marcus', 'Xavier'], last: ['Lam', 'Segeyaro', 'Mead', 'Boas', 'Ottio', 'Kila', 'Olam', 'Albert'] }
        };
        
        const POSITION_STATS: Record<string, { primary: string[], secondary: string[] }> = {
          'Prop': { primary: ['strength', 'tackling'], secondary: ['stamina', 'passing'] },
          'Hooker': { primary: ['passing', 'stamina'], secondary: ['tackling', 'speed'] },
          'Second Row': { primary: ['strength', 'tackling'], secondary: ['stamina', 'passing'] },
          'Lock': { primary: ['tackling', 'stamina'], secondary: ['strength', 'passing'] },
          'Halfback': { primary: ['passing', 'kicking'], secondary: ['speed', 'stamina'] },
          'Five-Eighth': { primary: ['passing', 'kicking'], secondary: ['speed', 'tackling'] },
          'Centre': { primary: ['tackling', 'passing'], secondary: ['speed', 'strength'] },
          'Winger': { primary: ['speed', 'passing'], secondary: ['stamina', 'tackling'] },
          'Fullback': { primary: ['speed', 'passing'], secondary: ['kicking', 'tackling'] }
        };
        
        for (let i = 0; i < numNewPlayers; i++) {
          const nationality = NATIONALITIES[Math.floor(Math.random() * NATIONALITIES.length)];
          const position = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
          const firstName = NAMES[nationality].first[Math.floor(Math.random() * NAMES[nationality].first.length)];
          const lastName = NAMES[nationality].last[Math.floor(Math.random() * NAMES[nationality].last.length)];
          const age = 19 + Math.floor(Math.random() * 5);
          
          const baseStats = () => 1 + Math.floor(Math.random() * 4);
          const stats = {
            speed: baseStats(),
            strength: baseStats(),
            power: baseStats(),
            passing: baseStats(),
            stamina: baseStats(),
            tackling: baseStats(),
            kicking: baseStats(),
          };
          const overall = Object.values(stats).reduce((a, b) => a + b, 0);
          
          const isHiddenGem = Math.random() < 0.05;
          const trainingAffinity: Record<string, string> = {};
          ['speed', 'strength', 'power', 'passing', 'stamina', 'tackling', 'kicking'].forEach(stat => {
            if (isHiddenGem) {
              const roll = Math.random();
              trainingAffinity[stat] = roll < 0.4 ? 'high' : roll < 0.8 ? 'medium' : 'low';
            } else {
              const roll = Math.random();
              trainingAffinity[stat] = roll < 0.05 ? 'high' : roll < 0.2 ? 'medium' : roll < 0.5 ? 'low' : 'none';
            }
          });
          
          const posStats = POSITION_STATS[position];
          let matchPower = 0;
          Object.entries(stats).forEach(([stat, value]) => {
            if (posStats.primary.includes(stat)) matchPower += value * 4;
            else if (posStats.secondary.includes(stat)) matchPower += value * 2;
            else matchPower += value;
          });
          
          let dominantSide = null;
          if (['Winger', 'Centre', 'Second Row'].includes(position)) {
            const sideRoll = Math.random();
            dominantSide = sideRoll < 0.4 ? 'left' : sideRoll < 0.8 ? 'right' : 'both';
          }
          
          const { data: newPlayer, error: playerError } = await supabase
            .from('players')
            .insert({
              team_id: null,
              first_name: firstName,
              last_name: lastName,
              position,
              age,
              nationality,
              state: null,
              ...stats,
              overall,
              match_power: matchPower,
              goal_kicking: 10 + Math.floor(Math.random() * 40),
              fatigue: 0,
              training_progress: 'NONE',
              training_affinity: trainingAffinity,
              dominant_side: dominantSide,
              retiring_end_of_season: false,
            })
            .select('id, first_name, last_name, position, overall, nationality')
            .single();
          
          if (playerError || !newPlayer) {
            logs.push(`🌏 Error creating international: ${playerError?.message}`);
            continue;
          }
          
          await supabase.from('free_agents').insert({
            player_id: newPlayer.id,
            released_by_team_id: null,
            available_round: currentRound,
            claimed: false
          });
          
          const countryNames: Record<string, string> = {
            ENG: 'England', NZL: 'New Zealand', FIJ: 'Fiji', TON: 'Tonga', SAM: 'Samoa', PNG: 'Papua New Guinea'
          };
          
          for (const team of (teams || [])) {
            internationalNotifications.push({
              team_id: team.id,
              type: 'international_arrival' as any,
              title: '🌏 International Arrival',
              message: `${newPlayer.first_name} ${newPlayer.last_name} (${newPlayer.position}, ${newPlayer.overall} OVR) from ${countryNames[newPlayer.nationality]} has entered the free agent pool!`,
              player_id: newPlayer.id
            });
          }
          
          logs.push(`🌏 International: ${newPlayer.first_name} ${newPlayer.last_name} (${nationality}, ${overall} OVR)`);
        }
        
        if (internationalNotifications.length > 0) {
          await supabase.from('notifications').insert(internationalNotifications);
        }
      } catch (intlError) {
        logs.push(`🌏 International error: ${intlError}`);
      }
    }
    
    // ===========================================
    // FREE AGENT PROCESSING
    // ===========================================
    
    const { data: teams } = await supabase.from('teams').select('*');
    const { data: coachesData } = await supabase.from('coaches').select('team_id');
    const coachedTeams = new Set((coachesData || []).map((c: any) => c.team_id));
    
    const teamsMap: Record<string, Team> = {};
    (teams || []).forEach((t: Team) => { teamsMap[t.id] = t; });
    
    // Get player counts per team (optimized - only get counts, not full player data)
    const { data: playerCounts } = await supabase
      .from('players')
      .select('team_id')
      .not('team_id', 'is', null);
    
    const teamRosterCounts: Record<string, number> = {};
    (playerCounts || []).forEach((p: any) => {
      if (p.team_id) {
        teamRosterCounts[p.team_id] = (teamRosterCounts[p.team_id] || 0) + 1;
      }
    });
    
    const { data: freeAgentsWithClaims } = await supabase
      .from('free_agents')
      .select('*, players(*)')
      .eq('claimed', false)
      .lte('available_round', currentRound);
    
    if (freeAgentsWithClaims && freeAgentsWithClaims.length > 0) {
      const freeAgentIds = freeAgentsWithClaims.map(fa => fa.id);
      const { data: allClaims } = await supabase
        .from('free_agent_claims')
        .select('*')
        .in('free_agent_id', freeAgentIds);
      
      const claimsByFreeAgent: Record<string, any[]> = {};
      (allClaims || []).forEach(claim => {
        if (!claimsByFreeAgent[claim.free_agent_id]) claimsByFreeAgent[claim.free_agent_id] = [];
        claimsByFreeAgent[claim.free_agent_id].push(claim);
      });
      
      let freeAgentSignings = 0;
      const freeAgentNotifications: Notification[] = [];
      
      for (const freeAgent of freeAgentsWithClaims) {
        const claims = claimsByFreeAgent[freeAgent.id] || [];
        if (claims.length === 0) continue;
        
        const player = freeAgent.players;
        if (!player) continue;
        
        const teamScores: { teamId: string; score: number; releasePlayerId: string | null }[] = [];
        
        for (const claim of claims) {
          const claimingTeam = teamsMap[claim.team_id];
          if (!claimingTeam) continue;
          
          const squadSize = teamRosterCounts[claim.team_id] || 0;
          if (squadSize >= 25) continue;
          
          let score = (10 - claimingTeam.division) * 5;
          score += (claimingTeam.wins * 2) + claimingTeam.draws;
          score += (25 - squadSize) * 2;
          score += Math.random() * 10;
          
          const isAITeam = !coachedTeams.has(claim.team_id);
          if (isAITeam) {
            if (squadSize <= 20) score += 100;
            else if (squadSize <= 22) score += 50;
          }
          
          teamScores.push({ teamId: claim.team_id, score, releasePlayerId: claim.release_player_id });
        }
        
        if (teamScores.length === 0) continue;
        
        teamScores.sort((a, b) => b.score - a.score);
        const winner = teamScores[0];
        const winningTeam = teamsMap[winner.teamId];
        
        await supabase.from('players').update({ team_id: winner.teamId }).eq('id', player.id);
        await supabase.from('free_agents').update({ claimed: true }).eq('id', freeAgent.id);
        await supabase.from('free_agent_claims').delete().eq('free_agent_id', freeAgent.id);
        
        // Update roster count
        teamRosterCounts[winner.teamId] = (teamRosterCounts[winner.teamId] || 0) + 1;
        
        if (winner.releasePlayerId) {
          await supabase.from('players').update({ team_id: null }).eq('id', winner.releasePlayerId);
          await supabase.from('free_agents').insert({
            player_id: winner.releasePlayerId,
            released_by_team_id: winner.teamId,
            available_round: currentRound + 1,
            claimed: false
          });
          teamRosterCounts[winner.teamId] = (teamRosterCounts[winner.teamId] || 1) - 1;
        }
        
        freeAgentNotifications.push({
          team_id: winner.teamId,
          type: 'free_agent_signed' as any,
          title: '🎉 Free Agent Signed!',
          message: `${player.first_name} ${player.last_name} (${player.position}, ${player.overall} OVR) has joined!`,
          player_id: player.id
        });
        
        freeAgentSignings++;
        logs.push(`Free Agent: ${player.first_name} ${player.last_name} → ${winningTeam?.name}`);
      }
      
      if (freeAgentNotifications.length > 0) {
        await supabase.from('notifications').insert(freeAgentNotifications);
      }
      
      logs.push(`Free Agents: ${freeAgentSignings} signed`);
    } else {
      logs.push('Free Agents: No claims to process');
    }
    
    const totalTime = Date.now() - startTime;
    logs.push(`✅ Free Agents complete in ${totalTime}ms`);
    
    return NextResponse.json({
      success: true,
      phase: 'freeagents',
      isSunday,
      currentRound,
      executionTime: totalTime,
      logs
    });
    
  } catch (error) {
    console.error('Free Agents cron error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
