// ============================================
// SidelineHQ Financial System v3.0
// Weekly Processing Logic
// ============================================

import { createClient } from '@supabase/supabase-js';
import {
  DIVISION_GRANTS,
  BONUSES,
  EXPENSES,
  ATTENDANCE,
  TV_REVENUE,
  MORALE,
  CONTRACTS,
} from './constants';
import { TransactionType, TeamFinances, FinancialTransaction } from './types';

// ============================================
// TYPES
// ============================================

interface ProcessingResult {
  team_id: string;
  team_name: string;
  success: boolean;
  transactions: {
    type: TransactionType;
    amount: number;
    description: string;
  }[];
  new_balance: number;
  error?: string;
}

interface MatchResult {
  fixture_id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  is_home: boolean;
}

interface TeamContext {
  team_id: string;
  team_name: string;
  division: number;
  finances: TeamFinances;
  contracts: { player_id: string; weekly_wage: number }[];
  match?: MatchResult;
  ladder_position: number;
  recent_form: number; // wins in last 5
}

// ============================================
// IDEMPOTENCY KEY GENERATOR
// ============================================

function generateIdempotencyKey(
  teamId: string,
  season: number,
  round: number,
  type: TransactionType
): string {
  return `${teamId}:${season}:${round}:${type}`;
}

// ============================================
// RECORD TRANSACTION
// ============================================

async function recordTransaction(
  supabase: any,
  teamId: string,
  season: number,
  round: number,
  type: TransactionType,
  amount: number,
  balanceAfter: number,
  description: string
): Promise<boolean> {
  const idempotencyKey = generateIdempotencyKey(teamId, season, round, type);

  const { error } = await supabase
    .from('financial_transactions')
    .insert({
      team_id: teamId,
      season,
      round,
      type,
      amount,
      balance_after: balanceAfter,
      description,
      idempotency_key: idempotencyKey,
    });

  // If duplicate key error, transaction already processed (idempotent)
  if (error?.code === '23505') {
    console.log(`   ⏭️ Skipped (already processed): ${type}`);
    return false;
  }

  if (error) {
    console.error(`   ❌ Error recording ${type}:`, error.message);
    return false;
  }

  return true;
}

// ============================================
// ATTENDANCE CALCULATION
// ============================================

function calculatePriceModifier(ticketPrice: number): number {
  const basePrice = ATTENDANCE.PRICE_BASE;
  
  if (ticketPrice <= basePrice) {
    // Below base: bonus attendance (bargain!)
    const discount = basePrice - ticketPrice;
    const modifier = 1.0 + (discount * ATTENDANCE.PRICE_MODIFIER_BELOW);
    return Math.min(modifier, ATTENDANCE.PRICE_MODIFIER_MAX);
  } else {
    // Above base: reduced attendance
    const premium = ticketPrice - basePrice;
    const modifier = 1.0 - (premium * ATTENDANCE.PRICE_MODIFIER_ABOVE);
    return Math.max(modifier, ATTENDANCE.PRICE_MODIFIER_MIN);
  }
}

function calculateAttendance(
  stadiumCapacity: number,
  ticketPrice: number,
  division: number,
  recentForm: number,
  opponentLadderPosition: number,
  totalTeamsInDiv: number = 10
): {
  attendance: number;
  ticketRevenue: number;
  merchRevenue: number;
} {
  // Base fill rate
  let fillRate = ATTENDANCE.BASE_FILL_RATE;

  // Division bonus
  fillRate += ATTENDANCE.DIVISION_BONUS[division] || 0;

  // Form bonus (wins in last 5)
  fillRate += ATTENDANCE.FORM_BONUS[recentForm] ?? 0;

  // Opponent bonus
  if (opponentLadderPosition <= 4) {
    fillRate += ATTENDANCE.OPPONENT_BONUS.TOP_4;
  } else if (opponentLadderPosition > totalTeamsInDiv - 4) {
    fillRate += ATTENDANCE.OPPONENT_BONUS.BOTTOM_4;
  }

  // Price modifier (smooth scaling)
  const priceModifier = calculatePriceModifier(ticketPrice);

  // Calculate attendance
  const attendance = Math.floor(stadiumCapacity * fillRate * priceModifier);
  const finalAttendance = Math.max(0, Math.min(attendance, stadiumCapacity));

  // Revenue
  const ticketRevenue = finalAttendance * ticketPrice * 100; // Convert to cents
  const merchRevenue = Math.floor(ticketRevenue * ATTENDANCE.MERCHANDISE_RATE);

  return {
    attendance: finalAttendance,
    ticketRevenue,
    merchRevenue,
  };
}

// ============================================
// TV REVENUE CALCULATION
// ============================================

function calculateTVRevenue(ladderPosition: number, totalTeams: number = 10): number {
  if (ladderPosition <= 4) return TV_REVENUE.TOP_4;
  if (ladderPosition <= 8) return TV_REVENUE.TOP_8;
  if (ladderPosition <= 12) return TV_REVENUE.TOP_12;
  return TV_REVENUE.BOTTOM_4;
}

// ============================================
// PROCESS SINGLE TEAM
// ============================================

export async function processTeamWeeklyFinances(
  supabase: any,
  context: TeamContext,
  season: number,
  round: number
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    team_id: context.team_id,
    team_name: context.team_name,
    success: true,
    transactions: [],
    new_balance: context.finances.balance,
  };

  try {
    let currentBalance = context.finances.balance;

    // 1. DEDUCT WAGES
    const totalWages = context.contracts.reduce((sum, c) => sum + c.weekly_wage, 0);
    if (totalWages > 0) {
      const recorded = await recordTransaction(
        supabase,
        context.team_id,
        season,
        round,
        'PLAYER_WAGES',
        -totalWages,
        currentBalance - totalWages,
        `Weekly wages for ${context.contracts.length} players`
      );
      if (recorded) {
        currentBalance -= totalWages;
        result.transactions.push({
          type: 'PLAYER_WAGES',
          amount: -totalWages,
          description: `Weekly wages for ${context.contracts.length} players`,
        });
      }
    }

    // 2. DEDUCT FACILITY UPKEEP
    const recorded2 = await recordTransaction(
      supabase,
      context.team_id,
      season,
      round,
      'FACILITY_UPKEEP',
      -EXPENSES.FACILITY_UPKEEP,
      currentBalance - EXPENSES.FACILITY_UPKEEP,
      'Weekly facility upkeep'
    );
    if (recorded2) {
      currentBalance -= EXPENSES.FACILITY_UPKEEP;
      result.transactions.push({
        type: 'FACILITY_UPKEEP',
        amount: -EXPENSES.FACILITY_UPKEEP,
        description: 'Weekly facility upkeep',
      });
    }

    // 3. ADD DIVISION GRANT
    const grant = DIVISION_GRANTS[context.division] || DIVISION_GRANTS[10];
    const recorded3 = await recordTransaction(
      supabase,
      context.team_id,
      season,
      round,
      'DIVISION_GRANT',
      grant,
      currentBalance + grant,
      `Division ${context.division} weekly grant`
    );
    if (recorded3) {
      currentBalance += grant;
      result.transactions.push({
        type: 'DIVISION_GRANT',
        amount: grant,
        description: `Division ${context.division} weekly grant`,
      });
    }

    // 4. PROCESS MATCH REVENUE (if home game this round)
    if (context.match && context.match.is_home) {
      // Get opponent's ladder position (default to middle if unknown)
      const opponentPosition = 5; // TODO: Look up actual position

      const { attendance, ticketRevenue, merchRevenue } = calculateAttendance(
        context.finances.stadium_capacity,
        context.finances.ticket_price,
        context.division,
        context.recent_form,
        opponentPosition
      );

      // Ticket revenue
      if (ticketRevenue > 0) {
        const recorded4 = await recordTransaction(
          supabase,
          context.team_id,
          season,
          round,
          'TICKET_REVENUE',
          ticketRevenue,
          currentBalance + ticketRevenue,
          `Ticket sales: ${attendance.toLocaleString()} fans @ $${context.finances.ticket_price}`
        );
        if (recorded4) {
          currentBalance += ticketRevenue;
          result.transactions.push({
            type: 'TICKET_REVENUE',
            amount: ticketRevenue,
            description: `Ticket sales: ${attendance.toLocaleString()} fans @ $${context.finances.ticket_price}`,
          });
        }
      }

      // Merchandise revenue (+ bonus if won)
      let finalMerch = merchRevenue;
      const won = context.match.home_score > context.match.away_score;
      if (won) {
        finalMerch = Math.floor(merchRevenue * (1 + ATTENDANCE.MERCHANDISE_WIN_BONUS));
      }

      if (finalMerch > 0) {
        const recorded5 = await recordTransaction(
          supabase,
          context.team_id,
          season,
          round,
          'MERCHANDISE',
          finalMerch,
          currentBalance + finalMerch,
          `Merchandise sales${won ? ' (win bonus)' : ''}`
        );
        if (recorded5) {
          currentBalance += finalMerch;
          result.transactions.push({
            type: 'MERCHANDISE',
            amount: finalMerch,
            description: `Merchandise sales${won ? ' (win bonus)' : ''}`,
          });
        }
      }

      // TV Revenue
      const tvRevenue = calculateTVRevenue(context.ladder_position);
      const recorded6 = await recordTransaction(
        supabase,
        context.team_id,
        season,
        round,
        'TV_REVENUE',
        tvRevenue,
        currentBalance + tvRevenue,
        `TV broadcast revenue`
      );
      if (recorded6) {
        currentBalance += tvRevenue;
        result.transactions.push({
          type: 'TV_REVENUE',
          amount: tvRevenue,
          description: 'TV broadcast revenue',
        });
      }
    }

    // 5. WIN/DRAW BONUS
    if (context.match) {
      const isHome = context.match.is_home;
      const teamScore = isHome ? context.match.home_score : context.match.away_score;
      const opponentScore = isHome ? context.match.away_score : context.match.home_score;

      if (teamScore > opponentScore) {
        // WIN
        const recorded7 = await recordTransaction(
          supabase,
          context.team_id,
          season,
          round,
          'WIN_BONUS',
          BONUSES.WIN,
          currentBalance + BONUSES.WIN,
          'Match win bonus'
        );
        if (recorded7) {
          currentBalance += BONUSES.WIN;
          result.transactions.push({
            type: 'WIN_BONUS',
            amount: BONUSES.WIN,
            description: 'Match win bonus',
          });
        }
      } else if (teamScore === opponentScore) {
        // DRAW
        const recorded8 = await recordTransaction(
          supabase,
          context.team_id,
          season,
          round,
          'DRAW_BONUS',
          BONUSES.DRAW,
          currentBalance + BONUSES.DRAW,
          'Match draw bonus'
        );
        if (recorded8) {
          currentBalance += BONUSES.DRAW;
          result.transactions.push({
            type: 'DRAW_BONUS',
            amount: BONUSES.DRAW,
            description: 'Match draw bonus',
          });
        }
      }
    }

    // 6. UPDATE TEAM FINANCES
    const weeksInDebt = currentBalance < 0 
      ? context.finances.weeks_in_debt + 1 
      : 0;

    await supabase
      .from('team_finances')
      .update({
        balance: currentBalance,
        total_wages: totalWages,
        weeks_in_debt: weeksInDebt,
        last_processed_round: round,
        updated_at: new Date().toISOString(),
      })
      .eq('team_id', context.team_id)
      .eq('season', season);

    result.new_balance = currentBalance;

  } catch (error: any) {
    result.success = false;
    result.error = error.message;
  }

  return result;
}

// ============================================
// PROCESS ALL TEAMS
// ============================================

export async function processAllTeamFinances(
  supabase: any,
  season: number,
  round: number
): Promise<ProcessingResult[]> {
  console.log(`\n💰 Processing finances for Season ${season}, Round ${round}...`);

  const results: ProcessingResult[] = [];

  // 1. Get all teams with their finances
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select(`
      id,
      name,
      division,
      team_finances!inner(*)
    `)
    .eq('team_finances.season', season);

  if (teamsError) {
    console.error('❌ Error fetching teams:', teamsError);
    return results;
  }

  // 2. Get all match results for this round
  const { data: fixtures } = await supabase
    .from('match_results')
    .select('id, fixture_id, home_team_id, away_team_id, home_score, away_score')
    .eq('round', round)
    .eq('season', season);

  // 3. Get all contracts
  const { data: allContracts } = await supabase
    .from('player_contracts')
    .select('player_id, team_id, weekly_wage');

  // 4. Get ladder positions (simplified - by wins)
  const { data: standings } = await supabase
    .from('teams')
    .select('id, wins, division')
    .order('wins', { ascending: false });

  // Build ladder position map per division
  const ladderPositions: Record<string, number> = {};
  if (standings) {
    const byDivision: Record<number, string[]> = {};
    for (const team of standings) {
      if (!byDivision[team.division]) byDivision[team.division] = [];
      byDivision[team.division].push(team.id);
    }
    for (const div in byDivision) {
      byDivision[div].forEach((teamId, index) => {
        ladderPositions[teamId] = index + 1;
      });
    }
  }

  // 5. Get recent form (wins in last 5) - simplified for now
  const recentFormMap: Record<string, number> = {};
  // TODO: Calculate from actual fixture history
  // For now, estimate from win percentage
  if (standings) {
    for (const team of standings) {
      const totalGames = round - 1;
      if (totalGames > 0) {
        const winRate = team.wins / totalGames;
        recentFormMap[team.id] = Math.round(winRate * 5); // Estimate last 5
      } else {
        recentFormMap[team.id] = 2; // Default
      }
    }
  }

  // 6. Process each team
  for (const team of teams) {
    const teamContracts = allContracts?.filter((c: any) => c.team_id === team.id) || [];
    
    // Find this team's match
    const match = fixtures?.find(
      (f: any) => f.home_team_id === team.id || f.away_team_id === team.id
    );

    const context: TeamContext = {
      team_id: team.id,
      team_name: team.name,
      division: team.division,
      finances: team.team_finances[0],
      contracts: teamContracts,
      ladder_position: ladderPositions[team.id] || 5,
      recent_form: recentFormMap[team.id] || 2,
      match: match ? {
        fixture_id: match.id,
        home_team_id: match.home_team_id,
        away_team_id: match.away_team_id,
        home_score: match.home_score || 0,
        away_score: match.away_score || 0,
        is_home: match.home_team_id === team.id,
      } : undefined,
    };

    const result = await processTeamWeeklyFinances(supabase, context, season, round);
    results.push(result);

    if (result.success) {
      const netChange = result.transactions.reduce((sum, t) => sum + t.amount, 0);
      console.log(`   ✅ ${team.name}: ${netChange >= 0 ? '+' : ''}$${(netChange / 100).toLocaleString()}`);
    } else {
      console.log(`   ❌ ${team.name}: ${result.error}`);
    }
  }

  console.log(`\n💰 Processed ${results.length} teams\n`);

  return results;
}

// ============================================
// CONTRACT COUNTDOWN
// ============================================

export async function processContractCountdown(
  supabase: any
): Promise<{ updated: number; expired: number }> {
  console.log('\n📝 Processing contract countdown...');

  // 1. Decrement weeks_remaining for all contracts
  const { error: updateError } = await supabase
    .from('player_contracts')
    .update({ 
      weeks_remaining: supabase.rpc('decrement_weeks'),
      updated_at: new Date().toISOString(),
    })
    .gt('weeks_remaining', 0);

  // Actually, Supabase doesn't support that easily. Let's do it differently:
  const { data: contracts } = await supabase
    .from('player_contracts')
    .select('id, weeks_remaining')
    .gt('weeks_remaining', 0);

  let updated = 0;
  if (contracts) {
    for (const contract of contracts) {
      await supabase
        .from('player_contracts')
        .update({ 
          weeks_remaining: contract.weeks_remaining - 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contract.id);
      updated++;
    }
  }

  // 2. Find expired contracts (weeks_remaining <= 0)
  const { data: expiredContracts } = await supabase
    .from('player_contracts')
    .select('id, player_id, team_id, weekly_wage')
    .lte('weeks_remaining', 0);

  let expired = 0;
  if (expiredContracts && expiredContracts.length > 0) {
    // Move to free agents
    for (const contract of expiredContracts) {
      // Add to free agents
      await supabase
        .from('free_agents')
        .upsert({
          player_id: contract.player_id,
          previous_team_id: contract.team_id,
          expected_wage: contract.weekly_wage,
          min_contract_weeks: 8,
          available_since: new Date().toISOString(),
        }, {
          onConflict: 'player_id',
        });

      // Remove contract
      await supabase
        .from('player_contracts')
        .delete()
        .eq('id', contract.id);

      // Update player's team_id to null
      await supabase
        .from('players')
        .update({ team_id: null })
        .eq('id', contract.player_id);

      expired++;
    }
  }

  console.log(`   ✅ Updated ${updated} contracts, ${expired} expired\n`);

  return { updated, expired };
}