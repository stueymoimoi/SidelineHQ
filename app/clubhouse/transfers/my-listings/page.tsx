'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import Link from 'next/link';
import { TRANSFER_LIMITS } from '@/lib/transfers/constants';

const supabase = createBrowserClient();

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
}

interface Offer {
  id: string;
  listing_id: string;
  from_team_id: string;
  offer_amount: number;
  status: string;
  created_at: string;
  from_team: {
    id: string;
    name: string;
    division: number;
  };
}

interface MyOffer {
  id: string;
  listing_id: string;
  offer_amount: number;
  status: string;
  created_at: string;
  listing: {
    id: string;
    asking_price: number | null;
    status: string;
    player: {
      first_name: string;
      last_name: string;
      position: string;
      overall: number;
    };
    team: {
      name: string;
      division: number;
    };
  };
}

export default function MyListingsPage() {
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [offersOnMyListings, setOffersOnMyListings] = useState<Record<string, Offer[]>>({});
  const [myOffers, setMyOffers] = useState<MyOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [myBalance, setMyBalance] = useState<number>(0);
  const [mySquadSize, setMySquadSize] = useState<number>(0);
  const [weeklyTransfersUsed, setWeeklyTransfersUsed] = useState<number>(0);
  const [processing, setProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: coach } = await supabase
      .from('coaches')
      .select('team_id')
      .eq('user_id', user.id)
      .single();

    if (!coach) return;

    setMyTeamId(coach.team_id);

    // Get team info
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

    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', coach.team_id);

    setWeeklyTransfersUsed(team?.weekly_transfers_used || 0);
    setMyBalance(finances?.balance || 0);
    setMySquadSize(count || 0);

    // Get my listings
    const { data: listings } = await supabase
      .from('transfer_listings')
      .select(`
        id, player_id, team_id, asking_price, listed_at, status,
        player:players(id, first_name, last_name, position, overall, age)
      `)
      .eq('team_id', coach.team_id)
      .eq('status', 'active');

    if (listings) {
      const transformed = listings.map((l: any) => ({
        ...l,
        player: Array.isArray(l.player) ? l.player[0] : l.player,
      }));
      setMyListings(transformed);

      // Get offers on my listings
      const listingIds = transformed.map(l => l.id);
      if (listingIds.length > 0) {
        const { data: offers } = await supabase
          .from('transfer_offers')
          .select(`
            id, listing_id, from_team_id, offer_amount, status, created_at,
            from_team:teams!from_team_id(id, name, division)
          `)
          .in('listing_id', listingIds)
          .eq('status', 'pending');

        if (offers) {
          const grouped: Record<string, Offer[]> = {};
          offers.forEach((o: any) => {
            const offer = {
              ...o,
              from_team: Array.isArray(o.from_team) ? o.from_team[0] : o.from_team,
            };
            if (!grouped[o.listing_id]) grouped[o.listing_id] = [];
            grouped[o.listing_id].push(offer);
          });
          setOffersOnMyListings(grouped);
        }
      }
    }

    // Get offers I've made
    const { data: myOffersData } = await supabase
      .from('transfer_offers')
      .select(`
        id, listing_id, offer_amount, status, created_at,
        listing:transfer_listings(
          id, asking_price, status,
          player:players(first_name, last_name, position, overall),
          team:teams(name, division)
        )
      `)
      .eq('from_team_id', coach.team_id)
      .order('created_at', { ascending: false });

    if (myOffersData) {
      const transformed = myOffersData.map((o: any) => ({
        ...o,
        listing: {
          ...o.listing,
          player: Array.isArray(o.listing?.player) ? o.listing.player[0] : o.listing?.player,
          team: Array.isArray(o.listing?.team) ? o.listing.team[0] : o.listing?.team,
        },
      }));
      setMyOffers(transformed);
    }

    setLoading(false);
  }

  async function handleAcceptOffer(offer: Offer, listing: Listing) {
    if (!myTeamId) return;

    if (weeklyTransfersUsed >= TRANSFER_LIMITS.MAX_TRANSACTIONS_PER_WEEK) {
      setMessage({ type: 'error', text: 'You\'ve reached your weekly transfer limit (3)' });
      return;
    }

    // Check buyer's squad size
    const { count: buyerSquadSize } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', offer.from_team_id);

    if ((buyerSquadSize || 0) >= TRANSFER_LIMITS.MAX_SQUAD_SIZE) {
      setMessage({ type: 'error', text: 'Buyer\'s squad is full - cannot accept' });
      return;
    }

    // Check buyer has funds
    const { data: buyerFinance } = await supabase
      .from('team_finances')
      .select('balance')
      .eq('team_id', offer.from_team_id)
      .single();

    if (!buyerFinance || buyerFinance.balance < offer.offer_amount) {
      setMessage({ type: 'error', text: 'Buyer has insufficient funds' });
      return;
    }

    setProcessing(offer.id);

    try {
      // 1. Update listing to sold
      await supabase
        .from('transfer_listings')
        .update({
          status: 'sold',
          sold_to_team_id: offer.from_team_id,
          sold_price: offer.offer_amount,
          sold_at: new Date().toISOString(),
        })
        .eq('id', listing.id);

      // 2. Update offer to accepted
      await supabase
        .from('transfer_offers')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', offer.id);

      // 3. Reject other offers on this listing
      await supabase
        .from('transfer_offers')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('listing_id', listing.id)
        .neq('id', offer.id);

      // 4. Transfer player
      await supabase
        .from('players')
        .update({ team_id: offer.from_team_id })
        .eq('id', listing.player_id);

      // 5. Update contract
      await supabase
        .from('player_contracts')
        .update({ team_id: offer.from_team_id })
        .eq('player_id', listing.player_id);

      // 6. Update finances - deduct from buyer
      await supabase
        .from('team_finances')
        .update({ balance: buyerFinance.balance - offer.offer_amount })
        .eq('team_id', offer.from_team_id);

      // 7. Update finances - add to seller
      await supabase
        .from('team_finances')
        .update({ balance: myBalance + offer.offer_amount })
        .eq('team_id', myTeamId);

      // 8. Increment transfers for both teams
      await supabase
        .from('teams')
        .update({ weekly_transfers_used: weeklyTransfersUsed + 1 })
        .eq('id', myTeamId);

      const { data: buyerTeam } = await supabase
        .from('teams')
        .select('weekly_transfers_used')
        .eq('id', offer.from_team_id)
        .single();

      await supabase
        .from('teams')
        .update({ weekly_transfers_used: (buyerTeam?.weekly_transfers_used || 0) + 1 })
        .eq('id', offer.from_team_id);

      // 9. Log event
      await supabase.from('league_events').insert({
        event_type: 'player_transfer',
        headline: `${listing.player.first_name} ${listing.player.last_name} transferred`,
        description: `${listing.player.first_name} ${listing.player.last_name} has joined ${offer.from_team.name} for $${(offer.offer_amount / 100).toLocaleString()}.`,
        player_id: listing.player_id,
        team_id: offer.from_team_id,
        from_team_id: myTeamId,
        metadata: { fee: offer.offer_amount },
      });

      setMessage({ type: 'success', text: `Sold ${listing.player.first_name} ${listing.player.last_name} to ${offer.from_team.name}!` });
      loadData();

    } catch (error) {
      console.error('Accept offer error:', error);
      setMessage({ type: 'error', text: 'Failed to accept offer' });
    }

    setProcessing(null);
  }

  async function handleRejectOffer(offer: Offer) {
    setProcessing(offer.id);

    try {
      await supabase
        .from('transfer_offers')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('id', offer.id);

      setMessage({ type: 'success', text: 'Offer rejected' });
      loadData();

    } catch (error) {
      console.error('Reject offer error:', error);
      setMessage({ type: 'error', text: 'Failed to reject offer' });
    }

    setProcessing(null);
  }

  async function handleWithdrawListing(listing: Listing) {
    setProcessing(listing.id);

    try {
      // Withdraw listing
      await supabase
        .from('transfer_listings')
        .update({ status: 'withdrawn' })
        .eq('id', listing.id);

      // Reject all pending offers
      await supabase
        .from('transfer_offers')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('listing_id', listing.id)
        .eq('status', 'pending');

      setMessage({ type: 'success', text: `${listing.player.first_name} ${listing.player.last_name} removed from transfer list` });
      loadData();

    } catch (error) {
      console.error('Withdraw error:', error);
      setMessage({ type: 'error', text: 'Failed to withdraw listing' });
    }

    setProcessing(null);
  }

  async function handleWithdrawOffer(offer: MyOffer) {
    setProcessing(offer.id);

    try {
      await supabase
        .from('transfer_offers')
        .update({ status: 'withdrawn' })
        .eq('id', offer.id);

      setMessage({ type: 'success', text: 'Offer withdrawn' });
      loadData();

    } catch (error) {
      console.error('Withdraw offer error:', error);
      setMessage({ type: 'error', text: 'Failed to withdraw offer' });
    }

    setProcessing(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6">
        <div className="max-w-6xl mx-auto">
          <Link href="/clubhouse/transfers" className="text-white/70 hover:text-white mb-2 inline-block">
            ← Back to Transfer Market
          </Link>
          <h1 className="text-3xl font-bold text-white">📋 My Listings & Offers</h1>
          <p className="text-white/80">Manage your transfer activity</p>
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
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Transfers This Week</p>
            <p className="text-2xl font-bold text-white">{weeklyTransfersUsed} / {TRANSFER_LIMITS.MAX_TRANSACTIONS_PER_WEEK}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Squad Size</p>
            <p className="text-2xl font-bold text-white">{mySquadSize} / {TRANSFER_LIMITS.MAX_SQUAD_SIZE}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Balance</p>
            <p className="text-2xl font-bold text-green-400">${(myBalance / 100).toLocaleString()}</p>
          </div>
        </div>

        {/* My Listings */}
        <h2 className="text-xl font-bold text-white mb-4">🏷️ My Listed Players</h2>
        {myListings.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-6 mb-8 text-center">
            <p className="text-gray-400">You haven't listed any players for transfer</p>
            <p className="text-gray-500 text-sm mt-1">Go to your Squad page to list a player</p>
          </div>
        ) : (
          <div className="space-y-4 mb-8">
            {myListings.map(listing => (
              <div key={listing.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-700 rounded-lg px-3 py-1 text-center min-w-[60px]">
                      <p className="text-2xl font-bold text-white">{listing.player?.overall}</p>
                      <p className="text-xs text-gray-400">OVR</p>
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg">
                        {listing.player?.first_name} {listing.player?.last_name}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {listing.player?.position} • Age {listing.player?.age}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {listing.asking_price ? (
                      <p className="text-green-400 font-bold">${(listing.asking_price / 100).toLocaleString()} BUY NOW</p>
                    ) : (
                      <p className="text-yellow-400 font-bold">Taking Offers</p>
                    )}
                    <button
                      onClick={() => handleWithdrawListing(listing)}
                      disabled={processing === listing.id}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                    >
                      {processing === listing.id ? '...' : 'Withdraw'}
                    </button>
                  </div>
                </div>

                {/* Offers on this listing */}
                {offersOnMyListings[listing.id] && offersOnMyListings[listing.id].length > 0 && (
                  <div className="border-t border-gray-700 pt-3 mt-3">
                    <p className="text-gray-400 text-sm mb-2">Pending Offers:</p>
                    <div className="space-y-2">
                      {offersOnMyListings[listing.id].map(offer => (
                        <div key={offer.id} className="bg-gray-700 rounded p-3 flex items-center justify-between">
                          <div>
                            <p className="text-white font-bold">${(offer.offer_amount / 100).toLocaleString()}</p>
                            <p className="text-gray-400 text-sm">from {offer.from_team?.name} (Div {offer.from_team?.division})</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAcceptOffer(offer, listing)}
                              disabled={processing === offer.id}
                              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm font-bold"
                            >
                              {processing === offer.id ? '...' : 'Accept'}
                            </button>
                            <button
                              onClick={() => handleRejectOffer(offer)}
                              disabled={processing === offer.id}
                              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* My Offers */}
        <h2 className="text-xl font-bold text-white mb-4">📤 My Outgoing Offers</h2>
        {myOffers.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <p className="text-gray-400">You haven't made any offers</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myOffers.map(offer => (
              <div key={offer.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold">
                    {offer.listing?.player?.first_name} {offer.listing?.player?.last_name}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {offer.listing?.player?.position} • OVR {offer.listing?.player?.overall} • {offer.listing?.team?.name}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-green-400 font-bold">${(offer.offer_amount / 100).toLocaleString()}</p>
                  <span className={`px-2 py-1 rounded text-sm font-bold ${
                    offer.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    offer.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                    offer.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {offer.status.toUpperCase()}
                  </span>
                  {offer.status === 'pending' && (
                    <button
                      onClick={() => handleWithdrawOffer(offer)}
                      disabled={processing === offer.id}
                      className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                    >
                      {processing === offer.id ? '...' : 'Withdraw'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
