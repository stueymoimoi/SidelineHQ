'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import Link from 'next/link';
import { TRANSFER_LIMITS } from '@/lib/transfers/constants';
import PlayerSnapshotPopup from '@/components/PlayerSnapshotPopup';

interface Listing {
  id: string;
  player_id: string;
  team_id: string;
  asking_price: number | null;
  listed_at: string;
  status: string;
  player: {
    id: string;
    first_name: string;
    last_name: string;
    position: string;
    overall: number;
    age: number;
  };
  team: {
    id: string;
    name: string;
    division: number;
  };
}
export default function TransferMarketPage() {
  const supabase = createBrowserClient();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [myBalance, setMyBalance] = useState<number>(0);
  const [mySquadSize, setMySquadSize] = useState<number>(0);
  const [weeklyTransfersUsed, setWeeklyTransfersUsed] = useState<number>(0);
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [filterMaxPrice, setFilterMaxPrice] = useState<string>('');
  const [buying, setBuying] = useState<string | null>(null);
  const [offerAmount, setOfferAmount] = useState<string>('');
  const [showOfferModal, setShowOfferModal] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [myPendingOffers, setMyPendingOffers] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    // Get current user's team
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: coach } = await supabase
      .from('coaches')
      .select('team_id')
      .eq('user_id', user.id)
      .single();

    if (coach) {
      setMyTeamId(coach.team_id);

      // Get team balance and transfers used
      const { data: team } = await supabase
        .from('teams')
        .select('weekly_transfers_used')
        .eq('id', coach.team_id)
        .single();

      const { data: finances } = await supabase
        .from('team_finances')
        .select('balance')
        .eq('team_id', coach.team_id)
        .single();

      // Get squad size
      const { count } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', coach.team_id);

      setWeeklyTransfersUsed(team?.weekly_transfers_used || 0);
      setMyBalance(finances?.balance || 0);
      setMySquadSize(count || 0);
      // Get my pending offers
const { data: myOffers } = await supabase
  .from('transfer_offers')
  .select('listing_id')
  .eq('from_team_id', coach.team_id)
  .eq('status', 'pending');

setMyPendingOffers(myOffers?.map(o => o.listing_id) || []);
    }

    // Get active listings (excluding my team)
    const { data: listingsData } = await supabase
  .from('transfer_listings')
  .select(`
    id,
    player_id,
    team_id,
    asking_price,
    listed_at,
    status,
    player:players(id, first_name, last_name, position, overall, age),
    team:teams!transfer_listings_team_id_fkey(id, name, division)
  `)
  .eq('status', 'active')
  .order('listed_at', { ascending: false });

    if (listingsData) {
      // Transform data to flatten player and team objects
      const transformed = listingsData.map((l: any) => ({
        ...l,
        player: Array.isArray(l.player) ? l.player[0] : l.player,
        team: Array.isArray(l.team) ? l.team[0] : l.team,
      }));
      setListings(transformed);
    }

    setLoading(false);
  }

  async function handleBuyNow(listing: Listing) {
    if (!myTeamId || !listing.asking_price) return;

    // Validations
    if (weeklyTransfersUsed >= TRANSFER_LIMITS.MAX_TRANSACTIONS_PER_WEEK) {
      setMessage({ type: 'error', text: 'You\'ve reached your weekly transfer limit (3)' });
      return;
    }

    if (mySquadSize >= TRANSFER_LIMITS.MAX_SQUAD_SIZE) {
      setMessage({ type: 'error', text: 'Your squad is full (max 30 players)' });
      return;
    }

    if (myBalance < listing.asking_price) {
      setMessage({ type: 'error', text: 'Insufficient funds' });
      return;
    }

    setBuying(listing.id);

    try {
      // 1. Update listing to sold
      const { error: listingError } = await supabase
        .from('transfer_listings')
        .update({
          status: 'sold',
          sold_to_team_id: myTeamId,
          sold_price: listing.asking_price,
          sold_at: new Date().toISOString(),
        })
        .eq('id', listing.id);

      if (listingError) throw listingError;

      // 2. Transfer player to new team
      const { error: playerError } = await supabase
        .from('players')
        .update({ team_id: myTeamId })
        .eq('id', listing.player_id);

      if (playerError) throw playerError;

      // 3. Update player contract to new team
      const { error: contractError } = await supabase
        .from('player_contracts')
        .update({ team_id: myTeamId })
        .eq('player_id', listing.player_id);

      if (contractError) throw contractError;

      // 4. Deduct from buyer's balance
      const { error: buyerFinanceError } = await supabase
        .from('team_finances')
        .update({ balance: myBalance - listing.asking_price })
        .eq('team_id', myTeamId);

      if (buyerFinanceError) throw buyerFinanceError;

      // 5. Add to seller's balance
      const { data: sellerFinance } = await supabase
        .from('team_finances')
        .select('balance')
        .eq('team_id', listing.team_id)
        .single();

      if (sellerFinance) {
        await supabase
          .from('team_finances')
          .update({ balance: sellerFinance.balance + listing.asking_price })
          .eq('team_id', listing.team_id);
      }

      // 6. Increment transfers used for buyer
      await supabase
        .from('teams')
        .update({ weekly_transfers_used: weeklyTransfersUsed + 1 })
        .eq('id', myTeamId);

      // 7. Increment transfers used for seller
      const { data: sellerTeam } = await supabase
        .from('teams')
        .select('weekly_transfers_used')
        .eq('id', listing.team_id)
        .single();

      if (sellerTeam) {
        await supabase
          .from('teams')
          .update({ weekly_transfers_used: (sellerTeam.weekly_transfers_used || 0) + 1 })
          .eq('id', listing.team_id);
      }

      // 8. Log to league_events
      await supabase.from('league_events').insert({
        event_type: 'player_transfer',
        headline: `${listing.player.first_name} ${listing.player.last_name} transferred`,
        description: `${listing.player.first_name} ${listing.player.last_name} has joined a new club for $${(listing.asking_price / 100).toLocaleString()}.`,
        player_id: listing.player_id,
        team_id: myTeamId,
        from_team_id: listing.team_id,
        metadata: { fee: listing.asking_price },
      });

      setMessage({ type: 'success', text: `Successfully signed ${listing.player.first_name} ${listing.player.last_name}!` });
      loadData(); // Refresh

    } catch (error) {
      console.error('Transfer error:', error);
      setMessage({ type: 'error', text: 'Transfer failed. Please try again.' });
    }

    setBuying(null);
  }

  async function handleMakeOffer(listing: Listing) {
    if (!myTeamId) return;

    const amount = parseInt(offerAmount) * 100; // Convert to cents

    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid offer amount' });
      return;
    }

    if (myBalance < amount) {
      setMessage({ type: 'error', text: 'Insufficient funds for this offer' });
      return;
    }

    try {
      const { error } = await supabase.from('transfer_offers').insert({
        listing_id: listing.id,
        from_team_id: myTeamId,
        offer_amount: amount,
        status: 'pending',
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Offer submitted!' });
      setShowOfferModal(null);
      setOfferAmount('');

    } catch (error) {
      console.error('Offer error:', error);
      setMessage({ type: 'error', text: 'Failed to submit offer' });
    }
  }

  // Filter listings
  const filteredListings = listings.filter(l => {
    if (l.team_id === myTeamId) return false; // Hide own listings
    if (filterPosition !== 'all' && l.player?.position !== filterPosition) return false;
    if (filterMaxPrice && l.asking_price && l.asking_price > parseInt(filterMaxPrice) * 100) return false;
    return true;
  });

  const positions = ['Fullback', 'Winger', 'Centre', 'Five-Eighth', 'Halfback', 'Prop', 'Hooker', 'Second Row', 'Lock'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading transfer market...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6">
        <div className="max-w-6xl mx-auto">
          <Link href="/clubhouse" className="text-white/70 hover:text-white mb-2 inline-block">
            ← Back to Clubhouse
          </Link>
          <h1 className="text-3xl font-bold text-white">🔄 Transfer Market</h1>
          <p className="text-white/80">Browse players available for transfer</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/20 border border-green-500 text-green-400' : 'bg-red-500/20 border border-red-500 text-red-400'}`}>
            {message.text}
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Your Balance</p>
            <p className="text-2xl font-bold text-green-400">${(myBalance / 100).toLocaleString()}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Squad Size</p>
            <p className="text-2xl font-bold text-white">{mySquadSize} / {TRANSFER_LIMITS.MAX_SQUAD_SIZE}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Transfers This Week</p>
            <p className="text-2xl font-bold text-white">{weeklyTransfersUsed} / {TRANSFER_LIMITS.MAX_TRANSACTIONS_PER_WEEK}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Players Listed</p>
            <p className="text-2xl font-bold text-blue-400">{listings.length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 flex flex-wrap gap-4">
          <div>
            <label className="text-gray-400 text-sm block mb-1">Position</label>
            <select
              value={filterPosition}
              onChange={(e) => setFilterPosition(e.target.value)}
              className="bg-gray-700 text-white px-3 py-2 rounded"
            >
              <option value="all">All Positions</option>
              {positions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1">Max Price ($)</label>
            <input
              type="number"
              value={filterMaxPrice}
              onChange={(e) => setFilterMaxPrice(e.target.value)}
              placeholder="Any"
              className="bg-gray-700 text-white px-3 py-2 rounded w-32"
            />
          </div>
          <div className="flex items-end">
            <Link
              href="/clubhouse/transfers/my-listings"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              My Listings & Offers
            </Link>
          </div>
        </div>

        {/* Listings */}
        {filteredListings.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400 text-lg">No players currently listed for transfer</p>
            <p className="text-gray-500 mt-2">Check back later or list one of your own players!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredListings.map(listing => (
              <div key={listing.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-gray-700 rounded-lg px-3 py-1 text-center min-w-[60px]">
                    <p className="text-2xl font-bold text-white">{listing.player?.overall}</p>
                    <p className="text-xs text-gray-400">OVR</p>
                  </div>
                  <div>
                    <p 
  className="text-white font-bold text-lg cursor-pointer hover:text-cyan-400"
  onClick={() => setSelectedPlayer(listing.player)}
>
  {listing.player?.first_name} {listing.player?.last_name}
</p>
                    <p className="text-gray-400 text-sm">
                      {listing.player?.position} • Age {listing.player?.age} • {listing.team?.name} (Div {listing.team?.division})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {listing.asking_price ? (
                    <>
                      <div className="text-right">
                        <p className="text-green-400 font-bold text-xl">${(listing.asking_price / 100).toLocaleString()}</p>
                        <p className="text-gray-500 text-xs">BUY NOW</p>
                      </div>
                      <button
                        onClick={() => handleBuyNow(listing)}
                        disabled={buying === listing.id || weeklyTransfersUsed >= 3 || mySquadSize >= 30 || myBalance < listing.asking_price}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-bold"
                      >
                        {buying === listing.id ? 'Processing...' : 'Buy'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-right">
                        <p className="text-yellow-400 font-bold">Taking Offers</p>
                      </div>
                      {myPendingOffers.includes(listing.id) ? (
  <button
    disabled
    className="bg-gray-600 cursor-not-allowed text-white px-4 py-2 rounded font-bold"
  >
    Offer Pending
  </button>
) : (
  <button
    onClick={() => setShowOfferModal(listing.id)}
    disabled={weeklyTransfersUsed >= 3 || mySquadSize >= 30}
    className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-bold"
  >
    Make Offer
  </button>
)}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Make an Offer</h3>
            <div className="mb-4">
              <label className="text-gray-400 text-sm block mb-1">Offer Amount ($)</label>
              <input
                type="number"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder="Enter amount"
                className="bg-gray-700 text-white px-3 py-2 rounded w-full"
              />
              <p className="text-gray-500 text-xs mt-1">Your balance: ${(myBalance / 100).toLocaleString()}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const listing = listings.find(l => l.id === showOfferModal);
                  if (listing) handleMakeOffer(listing);
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-bold"
              >
                Submit Offer
              </button>
              <button
                onClick={() => {
                  setShowOfferModal(null);
                  setOfferAmount('');
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
{/* Player Snapshot Modal */}
      {selectedPlayer && (
        <PlayerSnapshotPopup
          isOpen={true}
          playerId={selectedPlayer.id}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}