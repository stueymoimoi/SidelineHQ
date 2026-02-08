// ============================================
// SidelineHQ Financial System v3.0
// Weekly Processing Logic — OPTIMISED (Feb 8)
// ~800 DB calls → ~15 batched calls
// ============================================

import {
  DIVISION_GRANTS,
  BONUSES,
  EXPENSES,
  ATTENDANCE,
  TV_REVENUE,
} from './constants';
import { TransactionType, TeamFinances } from './types';

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
  recent_form: number;
}

// ============================================
// ATTENDANCE CALCULATION (pure functions — no DB)
// ============================================

function calculatePriceModifier(ticketPrice: number): number {
  const basePrice = ATTENDANCE.PRICE_BASE;

  if (ticketPrice <= basePrice) {
    const discount = basePrice - ticketPrice;
    const modifier = 1.0 + discount * ATTENDANCE.PRICE_MODIFIER_BELOW;
    return Math.min(modifier, ATTENDANCE.PRICE_MODIFIER_MAX);
  } else {
    const premium = ticketPrice - basePrice;
    const modifier = 1.0 - premium * ATTENDANCE.PRICE_MODIFIER_ABOVE;
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
  let fillRate = ATTENDANCE.BASE_FILL_RATE;
  fillRate += ATTENDANCE.DIVISION_BONUS[division] || 0;
  fillRate += ATTENDANCE.FORM_BONUS[recentForm] ?? 0;

  if (opponentLadderPosition <= 4) {
    fillRate += ATTENDANCE.OPPONENT_BONUS.TOP_4;
  } else if (opponentLadderPosition > totalTeamsInDiv - 4) {
    fillRate += ATTENDANCE.OPPONENT_BONUS.BOTTOM_4;
  }

  const priceModifier = calculatePriceModifier(ticketPrice);
  const attendance = Math.floor(stadiumCapacity * fillRate * priceModifier);
  const finalAttendance = Math.max(0, Math.min(attendance, stadiumCapacity));

  const ticketRevenue = finalAttendance * ticketPrice * 100;
  const merchRevenue = Math.floor(ticketRevenue * ATTENDANCE.MERCHANDISE_RATE);

  return { attendance: finalAttendance, ticketRevenue, merchRevenue };
}

function calculateTVRevenue(ladderPosition: number): number {
  if (ladderPosition <= 4) return TV_REVENUE.TOP_4;
  if (ladderPosition <= 8) return TV_REVENUE.TOP_8;
  if (ladderPosition <= 12) return TV_REVENUE.TOP_12;
  return TV_REVENUE.BOTTOM_4;
}

// ============================================
// IDEMPOTENCY KEY
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
// CALCULATE TEAM TRANSACTIONS (pure — no DB)
// ============================================

function calculateTeamTransactions(
  context: TeamContext,
  season: number,
  round: number,
  isSunday: boolean,
  existingKeys: Set<string>
): {
  transactions: {
    team_id: string;
    season: number;
    round: number;
    type: TransactionType;
    amount: number;
    balance_after: number;
    description: string;
    idempotency_key: string;
  }[];
  newBalance: number;
  totalWages: number;
  weeksInDebt: number;
} {
  const transactions: {
    team_id: string;
    season: number;
    round: number;
    type: TransactionType;
    amount: number;
    balance_after: number;
    description: string;
    idempotency_key: string;
  }[] = [];

  let currentBalance = context.finances.balance;
  const totalWages = context.contracts.reduce((sum, c) => sum + c.weekly_wage, 0);

  function addTransaction(type: TransactionType, amount: number, description: string) {
    const key = generateIdempotencyKey(context.team_id, season, round, type);
    if (existingKeys.has(key)) return; // Already processed — skip
    currentBalance += amount;
    transactions.push({
      team_id: context.team_id,
      season,
      round,
      type,
      amount,
      balance_after: currentBalance,
      description,
      idempotency_key: key,
    });
  }

  // 1. WAGES (Sunday only)
  if (isSunday && totalWages > 0) {
    addTransaction('PLAYER_WAGES', -totalWages, `Weekly wages for ${context.contracts.length} players`);
  }

  // 2. FACILITY UPKEEP (Sunday only)
  if (isSunday) {
    addTransaction('FACILITY_UPKEEP', -EXPENSES.FACILITY_UPKEEP, 'Weekly facility upkeep');
  }

  // 3. DIVISION GRANT (Sunday only)
  if (isSunday) {
    const grant = DIVISION_GRANTS[context.division] || DIVISION_GRANTS[10];
    addTransaction('DIVISION_GRANT', grant, `Division ${context.division} weekly grant`);
  }

  // 4. MATCH REVENUE (home games only)
  if (context.match && context.match.is_home) {
    const opponentPosition = 5; // TODO: look up actual
    const { attendance, ticketRevenue, merchRevenue } = calculateAttendance(
      context.finances.stadium_capacity,
      context.finances.ticket_price,
      context.division,
      context.recent_form,
      opponentPosition
    );

    if (ticketRevenue > 0) {
      addTransaction('TICKET_REVENUE', ticketRevenue,
        `Ticket sales: ${attendance.toLocaleString()} fans @ $${context.finances.ticket_price}`);
    }

    let finalMerch = merchRevenue;
    const won = context.match.home_score > context.match.away_score;
    if (won) {
      finalMerch = Math.floor(merchRevenue * (1 + ATTENDANCE.MERCHANDISE_WIN_BONUS));
    }
    if (finalMerch > 0) {
      addTransaction('MERCHANDISE', finalMerch, `Merchandise sales${won ? ' (win bonus)' : ''}`);
    }

    const tvRevenue = calculateTVRevenue(context.ladder_position);
    addTransaction('TV_REVENUE', tvRevenue, 'TV broadcast revenue');
  }

  // 5. WIN/DRAW BONUS
  if (context.match) {
    const isHome = context.match.is_home;
    const teamScore = isHome ? context.match.home_score : context.match.away_score;
    const opponentScore = isHome ? context.match.away_score : context.match.home_score;

    if (teamScore > opponentScore) {
      addTransaction('WIN_BONUS', BONUSES.WIN, 'Match win bonus');
    } else if (teamScore === opponentScore) {
      addTransaction('DRAW_BONUS', BONUSES.DRAW, 'Match draw bonus');
    }
  }

  const weeksInDebt = currentBalance < 0
    ? context.finances.weeks_in_debt + 1
    : 0;

  return { transactions, newBalance: currentBalance, totalWages, weeksInDebt };
}

// ============================================
// PROCESS ALL TEAMS — BATCHED
// ============================================

export async function processAllTeamFinances(
  supabase: any,
  season: number,
  round: number,
  isSunday: boolean = true
): Promise<ProcessingResult[]> {
  console.log(`\n💰 Processing finances for Season ${season}, Round ${round}...`);

  // ── STEP 1: Bulk fetch all data upfront ──

  const [teamsRes, fixturesRes, contractsRes, standingsRes, existingTxRes] = await Promise.all([
    supabase
      .from('teams')
      .select('id, name, division, team_finances!inner(*)')
      .eq('team_finances.season', season),
    supabase
      .from('match_results')
      .select('id, fixture_id, home_team_id, away_team_id, home_score, away_score')
      .eq('round', round)
      .eq('season', season),
    supabase
      .from('player_contracts')
      .select('player_id, team_id, weekly_wage'),
    supabase
      .from('teams')
      .select('id, wins, division')
      .order('wins', { ascending: false }),
    // Fetch existing idempotency keys for this round to skip duplicates
    supabase
      .from('financial_transactions')
      .select('idempotency_key')
      .eq('season', season)
      .eq('round', round),
  ]);

  const teams = teamsRes.data;
  if (teamsRes.error || !teams) {
    console.error('❌ Error fetching teams:', teamsRes.error);
    return [];
  }

  const fixtures = fixturesRes.data || [];
  const allContracts = contractsRes.data || [];
  const standings = standingsRes.data || [];
  const existingKeys = new Set<string>(
    (existingTxRes.data || []).map((t: any) => t.idempotency_key)
  );

  // ── STEP 2: Build lookup maps in memory ──

  // Ladder positions per division
  const ladderPositions: Record<string, number> = {};
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

  // Recent form estimate
  const recentFormMap: Record<string, number> = {};
  for (const team of standings) {
    const totalGames = round - 1;
    if (totalGames > 0) {
      const winRate = team.wins / totalGames;
      recentFormMap[team.id] = Math.round(winRate * 5);
    } else {
      recentFormMap[team.id] = 2;
    }
  }

  // Contracts grouped by team
  const contractsByTeam: Record<string, { player_id: string; weekly_wage: number }[]> = {};
  for (const c of allContracts) {
    if (!contractsByTeam[c.team_id]) contractsByTeam[c.team_id] = [];
    contractsByTeam[c.team_id].push(c);
  }

  // Fixtures indexed by team
  const fixturesByTeam: Record<string, any> = {};
  for (const f of fixtures) {
    fixturesByTeam[f.home_team_id] = f;
    fixturesByTeam[f.away_team_id] = f;
  }

  // ── STEP 3: Calculate all transactions in memory (zero DB calls) ──

  const allTransactions: {
    team_id: string;
    season: number;
    round: number;
    type: TransactionType;
    amount: number;
    balance_after: number;
    description: string;
    idempotency_key: string;
  }[] = [];

  const balanceUpdates: {
    team_id: string;
    newBalance: number;
    totalWages: number;
    weeksInDebt: number;
  }[] = [];

  const results: ProcessingResult[] = [];

  for (const team of teams) {
    const match = fixturesByTeam[team.id];
    const context: TeamContext = {
      team_id: team.id,
      team_name: team.name,
      division: team.division,
      finances: team.team_finances[0],
      contracts: contractsByTeam[team.id] || [],
      ladder_position: ladderPositions[team.id] || 5,
      recent_form: recentFormMap[team.id] || 2,
      match: match
        ? {
            fixture_id: match.id,
            home_team_id: match.home_team_id,
            away_team_id: match.away_team_id,
            home_score: match.home_score || 0,
            away_score: match.away_score || 0,
            is_home: match.home_team_id === team.id,
          }
        : undefined,
    };

    const { transactions, newBalance, totalWages, weeksInDebt } =
      calculateTeamTransactions(context, season, round, isSunday, existingKeys);

    allTransactions.push(...transactions);
    balanceUpdates.push({ team_id: team.id, newBalance, totalWages, weeksInDebt });

    const netChange = transactions.reduce((sum, t) => sum + t.amount, 0);
    results.push({
      team_id: team.id,
      team_name: team.name,
      success: true,
      transactions: transactions.map((t) => ({
        type: t.type,
        amount: t.amount,
        description: t.description,
      })),
      new_balance: newBalance,
    });

    console.log(
      `   ✅ ${team.name}: ${netChange >= 0 ? '+' : ''}$${(netChange / 100).toLocaleString()}`
    );
  }

  // ── STEP 4: Bulk INSERT all transactions ──

  if (allTransactions.length > 0) {
    // Supabase has a row limit per insert — chunk at 500
    const chunkSize = 500;
    for (let i = 0; i < allTransactions.length; i += chunkSize) {
      const chunk = allTransactions.slice(i, i + chunkSize);
      const { error } = await supabase.from('financial_transactions').insert(chunk);
      if (error) {
        // Ignore duplicate key errors (idempotency)
        if (error.code !== '23505') {
          console.error('❌ Error inserting transactions:', error.message);
        }
      }
    }
    console.log(`   📝 Inserted ${allTransactions.length} transactions`);
  }

  // ── STEP 5: Bulk UPDATE all team_finances (parallel chunks) ──

  const updateChunkSize = 20;
  for (let i = 0; i < balanceUpdates.length; i += updateChunkSize) {
    const chunk = balanceUpdates.slice(i, i + updateChunkSize);
    await Promise.all(
      chunk.map((u) =>
        supabase
          .from('team_finances')
          .update({
            balance: u.newBalance,
            total_wages: u.totalWages,
            weeks_in_debt: u.weeksInDebt,
            last_processed_round: round,
            updated_at: new Date().toISOString(),
          })
          .eq('team_id', u.team_id)
          .eq('season', season)
      )
    );
  }
  console.log(`   💰 Updated ${balanceUpdates.length} team balances`);

  console.log(`\n💰 Processed ${results.length} teams\n`);
  return results;
}

// ============================================
// AI CONTRACT RENEWALS — BATCHED
// ============================================

export async function processAIContractRenewals(
  supabase: any,
  round: number
): Promise<{ renewed: number; released: number }> {
  console.log('\n🤖 Processing AI contract renewals...');

  // 1. Get coached team IDs + expiring contracts in parallel
  const [coachesRes, expiringRes] = await Promise.all([
    supabase.from('coaches').select('team_id'),
    supabase
      .from('player_contracts')
      .select(`
        id,
        player_id,
        team_id,
        weekly_wage,
        weeks_remaining,
        players!inner (
          id,
          first_name,
          last_name,
          age,
          overall
        )
      `)
      .lte('weeks_remaining', 2)
      .gt('weeks_remaining', 0),
  ]);

  const humanTeamIds = new Set((coachesRes.data || []).map((c: any) => c.team_id));
  const expiringContracts = expiringRes.data || [];

  // Filter to AI teams only
  const aiContracts = expiringContracts.filter(
    (c: any) => !humanTeamIds.has(c.team_id)
  );

  if (aiContracts.length === 0) {
    console.log('   ⏭️ No AI team contracts expiring');
    return { renewed: 0, released: 0 };
  }

  // 2. Get all relevant team names in one query
  const aiTeamIds = [...new Set<string>(aiContracts.map((c: any) => c.team_id))];
  const { data: teamData } = await supabase
    .from('teams')
    .select('id, name, division')
    .in('id', aiTeamIds);

  const teamMap: Record<string, { name: string; division: number }> = {};
  for (const t of teamData || []) {
    teamMap[t.id] = { name: t.name, division: t.division };
  }

  // 3. Calculate all decisions in memory
  const contractUpdates: { id: string; weeks_remaining: number; weekly_wage: number }[] = [];
  const leagueEvents: any[] = [];
  let renewed = 0;
  let released = 0;

  for (const contract of aiContracts) {
    const player = contract.players;
    const age = player.age;
    const ovr = player.overall;
    const team = teamMap[contract.team_id] || { name: 'their club', division: 1 };

    let shouldRenew = false;
    let newLength = 10;

    if (age <= 29 && ovr >= 25) {
      shouldRenew = true;
      newLength = age <= 26 ? 20 : 10;
    } else if (age >= 30 && age <= 32 && ovr >= 30) {
      shouldRenew = true;
      newLength = 10;
    } else if (age >= 33 || ovr < 20) {
      shouldRenew = false;
    } else if (ovr >= 20 && ovr < 25 && age >= 30 && age <= 32) {
      shouldRenew = Math.random() < 0.5;
      newLength = 10;
    }

    if (shouldRenew) {
      const newWage = ovr * 50000;
      contractUpdates.push({
        id: contract.id,
        weeks_remaining: newLength,
        weekly_wage: newWage,
      });
      leagueEvents.push({
        event_type: 'contract_signed',
        headline: `${player.first_name} ${player.last_name} re-signed with ${team.name} for ${newLength <= 10 ? '1 season' : '2 seasons'}`,
        player_id: player.id,
        team_id: contract.team_id,
        round,
        division: team.division,
        metadata: { wage: newWage, length: newLength, ai_renewal: true },
      });
      renewed++;
      console.log(`   ✅ Renewed: ${player.first_name} ${player.last_name} (${age}yo, OVR ${ovr})`);
    } else {
      leagueEvents.push({
        event_type: 'contract_expired',
        headline: `${player.first_name} ${player.last_name} will leave ${team.name} when contract expires`,
        player_id: player.id,
        team_id: contract.team_id,
        round,
        division: team.division,
        metadata: { age, overall: ovr },
      });
      released++;
      console.log(`   📤 Releasing: ${player.first_name} ${player.last_name} (${age}yo, OVR ${ovr})`);
    }
  }

  // 4. Bulk write — contract updates in parallel chunks
  if (contractUpdates.length > 0) {
    const chunkSize = 20;
    for (let i = 0; i < contractUpdates.length; i += chunkSize) {
      const chunk = contractUpdates.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map((u) =>
          supabase
            .from('player_contracts')
            .update({
              weeks_remaining: u.weeks_remaining,
              weekly_wage: u.weekly_wage,
              updated_at: new Date().toISOString(),
            })
            .eq('id', u.id)
        )
      );
    }
  }

  // 5. Bulk insert league events
  if (leagueEvents.length > 0) {
    const { error } = await supabase.from('league_events').insert(leagueEvents);
    if (error) console.error('❌ Error inserting league events:', error.message);
  }

  console.log(`   🤖 AI Renewals: ${renewed} renewed, ${released} releasing\n`);
  return { renewed, released };
}

// ============================================
// CONTRACT COUNTDOWN — kept for legacy export
// (cron route uses optimised version in route.ts)
// ============================================

export async function processContractCountdown(
  supabase: any
): Promise<{ updated: number; expired: number }> {
  console.log('\n📝 Processing contract countdown...');

  // Try RPC first (single SQL call)
  const { data: rpcResult, error: rpcError } = await supabase.rpc('decrement_all_contracts');

  let updated = 0;
  if (!rpcError && rpcResult !== null) {
    updated = rpcResult;
  } else {
    // Fallback: batch update in parallel chunks
    const { data: contracts } = await supabase
      .from('player_contracts')
      .select('id, weeks_remaining')
      .gt('weeks_remaining', 0);

    if (contracts && contracts.length > 0) {
      const chunkSize = 100;
      for (let i = 0; i < contracts.length; i += chunkSize) {
        const chunk = contracts.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map((contract: any) =>
            supabase
              .from('player_contracts')
              .update({
                weeks_remaining: contract.weeks_remaining - 1,
                updated_at: new Date().toISOString(),
              })
              .eq('id', contract.id)
          )
        );
      }
      updated = contracts.length;
    }
  }

  // Handle expired contracts (batch)
  const { data: expiredContracts } = await supabase
    .from('player_contracts')
    .select('id, player_id, team_id')
    .lte('weeks_remaining', 0);

  let expired = 0;
  if (expiredContracts && expiredContracts.length > 0) {
    const playerIds = expiredContracts.map((c: any) => c.player_id);
    const contractIds = expiredContracts.map((c: any) => c.id);

    const { data: roundData } = await supabase
      .from('fixtures')
      .select('round')
      .eq('played', true)
      .order('round', { ascending: false })
      .limit(1);
    const currentRound = roundData?.[0]?.round || 1;

    const freeAgentInserts = expiredContracts.map((contract: any) => ({
      player_id: contract.player_id,
      released_by_team_id: contract.team_id,
      available_round: currentRound + 1,
      claimed: false,
    }));

    await Promise.all([
      supabase.from('free_agents').insert(freeAgentInserts),
      supabase.from('player_contracts').delete().in('id', contractIds),
      supabase.from('players').update({ team_id: null }).in('id', playerIds),
    ]);

    expired = expiredContracts.length;
  }

  console.log(`   ✅ Updated ${updated} contracts, ${expired} expired\n`);
  return { updated, expired };
}

// ============================================
// SINGLE TEAM PROCESSING — kept for export
// (no longer called by processAllTeamFinances)
// ============================================

export async function processTeamWeeklyFinances(
  supabase: any,
  context: TeamContext,
  season: number,
  round: number,
  isSunday: boolean = true
): Promise<ProcessingResult> {
  // This function is kept for backward compatibility
  // but processAllTeamFinances no longer calls it.
  // If called directly, it falls back to individual writes.

  const existingKeys = new Set<string>();
  const { transactions, newBalance, totalWages, weeksInDebt } =
    calculateTeamTransactions(context, season, round, isSunday, existingKeys);

  // Write transactions individually (legacy path)
  for (const tx of transactions) {
    await supabase.from('financial_transactions').insert(tx);
  }

  await supabase
    .from('team_finances')
    .update({
      balance: newBalance,
      total_wages: totalWages,
      weeks_in_debt: weeksInDebt,
      last_processed_round: round,
      updated_at: new Date().toISOString(),
    })
    .eq('team_id', context.team_id)
    .eq('season', season);

  return {
    team_id: context.team_id,
    team_name: context.team_name,
    success: true,
    transactions: transactions.map((t) => ({
      type: t.type,
      amount: t.amount,
      description: t.description,
    })),
    new_balance: newBalance,
  };
}
