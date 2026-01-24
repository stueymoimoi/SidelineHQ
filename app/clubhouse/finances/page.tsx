'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Types
interface TeamFinances {
  balance: number;
  stadium_capacity: number;
  ticket_price: number;
  weeks_in_debt: number;
}

interface PlayerContract {
  player_id: string;
  weekly_wage: number;
  weeks_remaining: number;
  players: {
    first_name: string;
    last_name: string;
    position: string;
    overall: number;
  } | null;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  round: number;
  created_at: string;
}

interface Team {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  division: number;
}

// Constants
const DIVISION_GRANTS: Record<number, number> = {
  1: 50000000, 2: 45000000, 3: 40000000, 4: 36000000, 5: 32000000,
  6: 28000000, 7: 24000000, 8: 20000000, 9: 16000000, 10: 12000000,
};

const TRANSACTION_LABELS: Record<string, { label: string; icon: string }> = {
  DIVISION_GRANT: { label: 'Division Grant', icon: '🏛️' },
  WIN_BONUS: { label: 'Win Bonus', icon: '🏆' },
  DRAW_BONUS: { label: 'Draw Bonus', icon: '🤝' },
  TICKET_REVENUE: { label: 'Ticket Sales', icon: '🎟️' },
  MERCHANDISE: { label: 'Merchandise', icon: '👕' },
  TV_REVENUE: { label: 'TV Revenue', icon: '📺' },
  PLAYER_WAGES: { label: 'Player Wages', icon: '💸' },
  FACILITY_UPKEEP: { label: 'Facility Upkeep', icon: '🔧' },
  TRANSFER_IN: { label: 'Transfer Fee Received', icon: '📥' },
  TRANSFER_OUT: { label: 'Transfer Fee Paid', icon: '📤' },
  PRIZE_MONEY: { label: 'Prize Money', icon: '💰' },
  MANUAL_ADJUSTMENT: { label: 'Adjustment', icon: '📝' },
};

export default function FinancesPage() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [finances, setFinances] = useState<TeamFinances | null>(null);
  const [contracts, setContracts] = useState<PlayerContract[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ticketPrice, setTicketPrice] = useState(20);
  const [saving, setSaving] = useState(false);
  const [showAllWages, setShowAllWages] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      const { data: coachData } = await supabase
        .from('coaches')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!coachData?.team_id) {
        router.push('/choose-team');
        return;
      }

      // Get team info
      const { data: teamData } = await supabase
        .from('teams')
        .select('id, name, primary_color, secondary_color, division')
        .eq('id', coachData.team_id)
        .single();

      setTeam(teamData);

      // Get finances
      const { data: financeData } = await supabase
        .from('team_finances')
        .select('balance, stadium_capacity, ticket_price, weeks_in_debt')
        .eq('team_id', coachData.team_id)
        .single();

      if (financeData) {
  console.log('financeData:', financeData);
  setFinances(financeData);
  setTicketPrice(financeData.ticket_price);
}

      // Get contracts with player info
      const { data: contractData } = await supabase
        .from('player_contracts')
        .select(`
          player_id,
          weekly_wage,
          weeks_remaining,
          players (
            first_name,
            last_name,
            position,
            overall
          )
        `)
        .eq('team_id', coachData.team_id)
        .order('weekly_wage', { ascending: false });

      // Transform the joined data - Supabase returns players as array, we need first item
      const transformedContracts = (contractData || []).map((c: any) => ({
        ...c,
        players: Array.isArray(c.players) ? c.players[0] : c.players
      }));
      // Get contract negotiations to filter out accepted renewals
      const { data: negData } = await supabase
        .from('contract_negotiations')
        .select('player_id, status')
        .eq('team_id', coachData.team_id)
        .eq('status', 'accepted');

      const acceptedPlayerIds = new Set((negData || []).map((n: any) => n.player_id));
      
      // Filter out players with accepted negotiations
      const filteredContracts = transformedContracts.filter(
        (c: any) => !acceptedPlayerIds.has(c.player_id)
      );
      
      setContracts(filteredContracts);

      // Get recent transactions
      const { data: txData } = await supabase
        .from('financial_transactions')
        .select('id, type, amount, description, round, created_at')
        .eq('team_id', coachData.team_id)
        .order('created_at', { ascending: false })
        .limit(50);

      setTransactions(txData || []);

    } catch (err) {
      console.error('Error loading finances:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveTicketPrice = async () => {
    if (!team) return;
    setSaving(true);
    console.log('Saving ticket price:', ticketPrice, 'for team:', team.id);

    try {
      const { error } = await supabase
        .from('team_finances')
        .update({ ticket_price: ticketPrice })
        .eq('team_id', team.id);

      console.log('Save result - error:', error);

      if (error) throw error;

      setFinances(prev => prev ? { ...prev, ticket_price: ticketPrice } : null);
    } catch (err) {
      console.error('Error saving ticket price:', err);
    } finally {
      setSaving(false);
    }
  };

  // Calculations
  const totalWages = contracts.reduce((sum, c) => sum + c.weekly_wage, 0);
  const weeklyGrant = team ? DIVISION_GRANTS[team.division] || 0 : 0;
  const weeklyNet = weeklyGrant - totalWages - 2500000; // Grant - Wages - Upkeep
  const expiringContracts = contracts
    .filter(c => c.weeks_remaining <= 6)
    .sort((a, b) => a.weeks_remaining - b.weeks_remaining);

  // Attendance estimate
  const estimateAttendance = (price: number) => {
    if (!finances) return { attendance: 0, revenue: 0 };
    
    const baseRate = 0.60;
    let priceModifier = 1.0;
    
    if (price < 20) {
      priceModifier = 1.0 + ((20 - price) * 0.02);
      priceModifier = Math.min(priceModifier, 1.30);
    } else if (price > 20) {
      priceModifier = 1.0 - ((price - 20) * 0.015);
      priceModifier = Math.max(priceModifier, 0.30);
    }
    
    const attendance = Math.round(finances.stadium_capacity * baseRate * priceModifier);
    const revenue = attendance * price * 100; // in cents
    
    return { attendance, revenue };
  };

  const { attendance: estAttendance, revenue: estRevenue } = estimateAttendance(ticketPrice);

  // Format helpers
  const formatMoney = (cents: number) => {
    const dollars = cents / 100;
    if (Math.abs(dollars) >= 1000000) {
      return `$${(dollars / 1000000).toFixed(2)}M`;
    }
    return `$${dollars.toLocaleString('en-AU', { maximumFractionDigits: 0 })}`;
  };

  const formatMoneyShort = (cents: number) => {
    const dollars = cents / 100;
    if (Math.abs(dollars) >= 1000000) {
      return `$${(dollars / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(dollars) >= 1000) {
      return `$${(dollars / 1000).toFixed(0)}K`;
    }
    return `$${dollars.toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading finances...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div 
        className="p-6"
        style={{
          background: `linear-gradient(135deg, ${team?.primary_color} 0%, ${team?.secondary_color} 100%)`
        }}
      >
        <div className="max-w-6xl mx-auto">
          <Link href="/clubhouse" className="text-white/70 hover:text-white text-sm mb-2 inline-block">
            ← Back to Clubhouse
          </Link>
          <h1 className="text-3xl font-bold text-white">💰 Finances</h1>
          <p className="text-white/80">{team?.name} • Division {team?.division}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-xs mb-1">Current Balance</p>
            <p className={`text-2xl font-bold ${
              !finances ? 'text-gray-500' :
              finances.balance > 500000000 ? 'text-green-400' :
              finances.balance > 200000000 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {finances ? formatMoney(finances.balance) : '—'}
            </p>
            {finances && finances.weeks_in_debt > 0 && (
              <p className="text-red-400 text-xs mt-1">⚠️ {finances.weeks_in_debt} weeks in debt</p>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-xs mb-1">Weekly Wages</p>
            <p className="text-red-400 text-2xl font-bold">{formatMoneyShort(totalWages)}</p>
            <p className="text-gray-500 text-xs mt-1">{contracts.length} players</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-xs mb-1">Weekly Grant</p>
            <p className="text-green-400 text-2xl font-bold">{formatMoneyShort(weeklyGrant)}</p>
            <p className="text-gray-500 text-xs mt-1">Division {team?.division}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-xs mb-1">Weekly Net</p>
            <p className={`text-2xl font-bold ${weeklyNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {weeklyNet >= 0 ? '+' : ''}{formatMoneyShort(weeklyNet)}
            </p>
            <p className="text-gray-500 text-xs mt-1">Before match revenue</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Left Column */}
          <div className="space-y-6">
            
            {/* Ticket Price Setter */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-white font-bold mb-4">🎟️ Ticket Pricing</h2>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">$5</span>
                  <span className="text-white font-bold">${ticketPrice}</span>
                  <span className="text-gray-400">$100</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-700 rounded p-3">
                  <p className="text-gray-400 text-xs">Est. Attendance</p>
                  <p className="text-white font-bold">{estAttendance.toLocaleString()}</p>
                  <p className="text-gray-500 text-xs">of {finances?.stadium_capacity.toLocaleString()}</p>
                </div>
                <div className="bg-gray-700 rounded p-3">
                  <p className="text-gray-400 text-xs">Est. Revenue</p>
                  <p className="text-green-400 font-bold">{formatMoneyShort(estRevenue)}</p>
                  <p className="text-gray-500 text-xs">per home game</p>
                </div>
              </div>

              {ticketPrice !== finances?.ticket_price && (
                <button
                  onClick={saveTicketPrice}
                  disabled={saving}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition"
                >
                  {saving ? 'Saving...' : `Save Ticket Price ($${ticketPrice})`}
                </button>
              )}
              
              {ticketPrice === finances?.ticket_price && (
                <p className="text-center text-gray-500 text-sm">Current price: ${finances?.ticket_price}</p>
              )}
            </div>

            {/* Expiring Contracts */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-white font-bold mb-4">
                ⚠️ Expiring Contracts
                {expiringContracts.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {expiringContracts.length}
                  </span>
                )}
              </h2>

              {expiringContracts.length === 0 ? (
                <p className="text-gray-500 text-sm">No contracts expiring soon</p>
              ) : (
                <div className="space-y-2">
                  {expiringContracts.slice(0, 5).map((contract) => (
                    <Link 
                      key={contract.player_id} 
                      href="/clubhouse/contracts"
                      className="flex items-center justify-between bg-gray-700 rounded p-3 hover:bg-gray-600 transition cursor-pointer"
                    >
                      <div>
                        <p className="text-white font-medium">
                          {contract.players?.first_name} {contract.players?.last_name}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {contract.players?.position} • {contract.players?.overall} OVR
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-400 font-bold">{contract.weeks_remaining}w</p>
                        <p className="text-gray-500 text-xs">{formatMoneyShort(contract.weekly_wage)}/wk</p>
                      </div>
                    </Link>
                  ))}
                  {expiringContracts.length > 5 && (
                    <p className="text-gray-500 text-sm text-center">
                      +{expiringContracts.length - 5} more expiring
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            
            {/* Recent Transactions */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-white font-bold mb-4">📜 Recent Transactions</h2>

              {transactions.length === 0 ? (
                <p className="text-gray-500 text-sm">No transactions yet</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {transactions.slice(0, 15).map((tx) => {
                    const info = TRANSACTION_LABELS[tx.type] || { label: tx.type, icon: '💵' };
                    const isIncome = tx.amount > 0;
                    return (
                      <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                        <div className="flex items-center gap-2">
                          <span>{info.icon}</span>
                          <div>
                            <p className="text-white text-sm">{info.label}</p>
                            <p className="text-gray-500 text-xs">Round {tx.round}</p>
                          </div>
                        </div>
                        <p className={`font-bold ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
                          {isIncome ? '+' : ''}{formatMoneyShort(tx.amount)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Wage Breakdown */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold">💸 Wage Breakdown</h2>
                <button
                  onClick={() => setShowAllWages(!showAllWages)}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  {showAllWages ? 'Show Less' : 'Show All'}
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(showAllWages ? contracts : contracts.slice(0, 8)).map((contract) => (
                  <div key={contract.player_id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                    <div>
                      <p className="text-white text-sm">
                        {contract.players?.first_name} {contract.players?.last_name}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {contract.players?.position} • {contract.players?.overall} OVR • {contract.weeks_remaining}w left
                      </p>
                    </div>
                    <p className="text-red-400 font-bold">{formatMoneyShort(contract.weekly_wage)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between">
                <p className="text-gray-400">Total Weekly</p>
                <p className="text-red-400 font-bold">{formatMoney(totalWages)}</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
