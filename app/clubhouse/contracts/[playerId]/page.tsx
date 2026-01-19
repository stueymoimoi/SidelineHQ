// /app/clubhouse/contracts/[playerId]/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { calculatePlayerDemands, evaluateOffer, PlayerDemands } from '@/lib/contracts/negotiations';
import { CONTRACT_LENGTHS, NEGOTIATION } from '@/lib/contracts/constants';
import { formatWageForHeadline, formatLengthForHeadline } from '@/lib/events';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  age: number;
  overall: number;
  position: string;
  morale: number;
}

interface Contract {
  id: string;
  weekly_wage: number;
  weeks_remaining: number;
}

interface Negotiation {
  id: string;
  status: string;
  demanded_wage: number;
  demanded_length: number;
  offered_wage: number | null;
  offered_length: number | null;
  counter_wage: number | null;
  counter_length: number | null;
  rounds_used: number;
}

export default function NegotiationPage() {
  const router = useRouter();
  const params = useParams();
  const playerId = params.playerId as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [negotiation, setNegotiation] = useState<Negotiation | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [demands, setDemands] = useState<PlayerDemands | null>(null);
  
  // Offer sliders
  const [offeredWage, setOfferedWage] = useState(0);
  const [offeredLength, setOfferedLength] = useState<number>(CONTRACT_LENGTHS.ONE_SEASON);
  
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, [playerId]);

  async function fetchData() {
    try {
      // Get current user's team
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      const { data: coach } = await supabase
        .from('coaches')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!coach) {
        router.push('/choose-team');
        return;
      }
      setTeamId(coach.team_id);

      // Get player details
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('id, first_name, last_name, age, overall, position, morale')
        .eq('id', playerId)
        .eq('team_id', coach.team_id)
        .single();

      if (playerError || !playerData) {
        setMessage({ type: 'error', text: 'Player not found or not on your team.' });
        setLoading(false);
        return;
      }
      setPlayer(playerData);

      // Get current contract
      const { data: contractData } = await supabase
        .from('player_contracts')
        .select('id, weekly_wage, weeks_remaining, ovr_at_signing')
        .eq('player_id', playerId)
        .single();

      // Check for existing negotiation
      const { data: negData } = await supabase
        .from('contract_negotiations')
        .select('*')
        .eq('player_id', playerId)
        .eq('team_id', coach.team_id)
        .single();

      if (negData) {
        setNegotiation(negData);
        setDemands({ wage: negData.demanded_wage, length: negData.demanded_length });
        // If countered, set sliders to counter values
        if (negData.status === 'countered' && negData.counter_wage) {
          setOfferedWage(negData.counter_wage);
          setOfferedLength(negData.counter_length || CONTRACT_LENGTHS.ONE_SEASON);
        } else {
          setOfferedWage(negData.demanded_wage);
          setOfferedLength(negData.demanded_length);
        }
      } else {
        // Calculate fresh demands
        const calculatedDemands = calculatePlayerDemands({
          id: playerData.id,
          age: playerData.age,
          overall: playerData.overall,
          morale: playerData.morale ?? 50,
          current_wage: contractData?.weekly_wage || 1000000,
        }, contractData?.ovr_at_signing);
        setDemands(calculatedDemands);
        setOfferedWage(calculatedDemands.wage);
        setOfferedLength(calculatedDemands.length);
      }

    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitOffer() {
    if (!player || !teamId || !demands) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const roundsUsed = negotiation?.rounds_used || 0;
      const result = evaluateOffer(offeredWage, offeredLength, demands, roundsUsed);

      if (!negotiation) {
        // Create new negotiation record
        const { data: newNeg, error: insertError } = await supabase
          .from('contract_negotiations')
          .insert({
            player_id: player.id,
            team_id: teamId,
            demanded_wage: demands.wage,
            demanded_length: demands.length,
            offered_wage: offeredWage,
            offered_length: offeredLength,
            status: result.status,
            rounds_used: 1,
            counter_wage: result.counter_wage || null,
            counter_length: result.counter_length || null,
            rejected_at: result.status === 'rejected' ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setNegotiation(newNeg);
      } else {
        // Update existing negotiation
        const { data: updatedNeg, error: updateError } = await supabase
          .from('contract_negotiations')
          .update({
            offered_wage: offeredWage,
            offered_length: offeredLength,
            status: result.status,
            rounds_used: roundsUsed + 1,
            counter_wage: result.counter_wage || null,
            counter_length: result.counter_length || null,
            rejected_at: result.status === 'rejected' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', negotiation.id)
          .select()
          .single();

        if (updateError) throw updateError;
        setNegotiation(updatedNeg);
      }

      // Handle accepted - create new contract
      if (result.status === 'accepted') {
        // Update existing contract with new terms
        const { error: contractError } = await supabase
          .from('player_contracts')
          .update({
            weekly_wage: offeredWage,
            weeks_remaining: offeredLength,
            ovr_at_signing: player.overall,
          })
          .eq('player_id', player.id);

        if (contractError) throw contractError;

        // Get current round for event
        const { data: roundData } = await supabase
          .from('fixtures')
          .select('round')
          .eq('played', true)
          .order('round', { ascending: false })
          .limit(1)
          .single();
        
        // Get team name for headline
        const { data: teamData } = await supabase
          .from('teams')
          .select('name')
          .eq('id', teamId)
          .single();
        
        // Log the event
        await supabase.from('league_events').insert({
          event_type: 'contract_signed',
          headline: `${player.first_name} ${player.last_name} re-signed with ${teamData?.name || 'their club'} for ${formatLengthForHeadline(offeredLength)}`,
          player_id: player.id,
          team_id: teamId,
          round: roundData?.round || 1,
          metadata: { wage: offeredWage, length: offeredLength },
        });

        setMessage({ type: 'success', text: result.message });
        
        // Redirect after short delay
        setTimeout(() => router.push('/clubhouse/contracts'), 2000);
        return;
      }

      // Set appropriate message
      setMessage({ 
        type: result.status === 'rejected' ? 'error' : 'info', 
        text: result.message 
      });

      // Update demands to counter if countered
      if (result.status === 'countered' && result.counter_wage) {
        setDemands({ wage: result.counter_wage, length: result.counter_length || demands.length });
      }

    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  function formatWage(cents: number): string {
    return '$' + (cents / 100).toLocaleString();
  }

  function formatLength(weeks: number): string {
    if (weeks <= 10) return '1 Season';
    return '2 Seasons';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-2xl mx-auto">
          <Link href="/clubhouse/contracts" className="text-blue-400 hover:text-blue-300">
            ← Back to Contracts
          </Link>
          <div className="mt-4 bg-red-500/20 border border-red-500 rounded-lg p-4">
            Player not found or not on your team.
          </div>
        </div>
      </div>
    );
  }

  const isFinished = negotiation?.status === 'accepted' || negotiation?.status === 'rejected';
  const canOffer = !isFinished && (negotiation?.rounds_used || 0) < NEGOTIATION.MAX_ROUNDS;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Link href="/clubhouse/contracts" className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block">
          ← Back to Contracts
        </Link>
        
        <h1 className="text-3xl font-bold mb-6">
          Negotiate with {player.first_name} {player.last_name}
        </h1>

        {/* Player Info Card */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center text-2xl font-bold">
              {player.overall}
            </div>
            <div>
              <div className="text-xl font-semibold">{player.first_name} {player.last_name}</div>
              <div className="text-gray-400">{player.position} • Age {player.age}</div>
              <div className="text-gray-400">Morale: {player.morale ?? 50}</div>
            </div>
          </div>
          {contract && (
            <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Current Wage:</span>
                <span className="ml-2 font-semibold">{formatWage(contract.weekly_wage)}/wk</span>
              </div>
              <div>
                <span className="text-gray-400">Contract Ends:</span>
                <span className="ml-2 font-semibold text-yellow-400">{contract.weeks_remaining} weeks</span>
              </div>
            </div>
          )}
        </div>

        {/* Message */}
        {message && (
          <div className={`rounded-lg p-4 mb-6 ${
            message.type === 'success' ? 'bg-green-500/20 border border-green-500' :
            message.type === 'error' ? 'bg-red-500/20 border border-red-500' :
            'bg-blue-500/20 border border-blue-500'
          }`}>
            {message.text}
          </div>
        )}

        {/* Player Demands */}
        {demands && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">
              {negotiation?.status === 'countered' ? '📝 Player Counter Offer' : '💭 Player Demands'}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700 rounded-lg p-4 text-center">
                <div className="text-gray-400 text-sm">Wage</div>
                <div className="text-xl font-bold">{formatWage(demands.wage)}/wk</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4 text-center">
                <div className="text-gray-400 text-sm">Length</div>
                <div className="text-xl font-bold">{formatLength(demands.length)}</div>
              </div>
            </div>
          </div>
        )}
{/* Accept/Reject Counter - when player countered on final round */}
        {negotiation?.status === 'countered' && (negotiation?.rounds_used || 0) >= NEGOTIATION.MAX_ROUNDS && demands && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">⚖️ Final Decision</h2>
            <p className="text-gray-400 mb-4">
              The player has made their final counter offer. You must accept or walk away.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={async () => {
                  setSubmitting(true);
                  try {
                    // Accept the counter offer
                    await supabase
                      .from('contract_negotiations')
                      .update({ status: 'accepted', updated_at: new Date().toISOString() })
                      .eq('id', negotiation.id);
                    
                    // Update contract with counter offer terms
                    await supabase
                      .from('player_contracts')
                      .update({
                        weekly_wage: demands.wage,
                        weeks_remaining: demands.length,
                        ovr_at_signing: player!.overall,
                      })
                      .eq('player_id', player!.id);
                    
                    // Get current round for event
                    const { data: roundData } = await supabase
                      .from('fixtures')
                      .select('round')
                      .eq('played', true)
                      .order('round', { ascending: false })
                      .limit(1)
                      .single();
                    
                    // Get team name for headline
                    const { data: teamData } = await supabase
                      .from('teams')
                      .select('name')
                      .eq('id', teamId)
                      .single();
                    
                    // Log the event
                    await supabase.from('league_events').insert({
                      event_type: 'contract_signed',
                      headline: `${player!.first_name} ${player!.last_name} re-signed with ${teamData?.name || 'their club'} for ${formatLengthForHeadline(demands.length)}`,
                      player_id: player!.id,
                      team_id: teamId,
                      round: roundData?.round || 1,
                      metadata: { wage: demands.wage, length: demands.length },
                    });
                    
                    setMessage({ type: 'success', text: 'Contract signed!' });
                    setTimeout(() => router.push('/clubhouse/contracts'), 2000);
                  } catch (err: any) {
                    setMessage({ type: 'error', text: err.message });
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={submitting}
                className="py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 rounded-lg font-semibold transition"
              >
                ✅ Accept Counter
              </button>
              <button
                onClick={async () => {
                  setSubmitting(true);
                  try {
                    await supabase
                      .from('contract_negotiations')
                      .update({ 
                        status: 'rejected', 
                        rejected_at: new Date().toISOString(),
                        updated_at: new Date().toISOString() 
                      })
                      .eq('id', negotiation.id);
                    
                    setMessage({ type: 'error', text: 'Negotiations have broken down.' });
                    setTimeout(() => router.push('/clubhouse/contracts'), 2000);
                  } catch (err: any) {
                    setMessage({ type: 'error', text: err.message });
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={submitting}
                className="py-3 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 rounded-lg font-semibold transition"
              >
                ❌ Walk Away
              </button>
            </div>
          </div>
        )}

        
        {canOffer && demands && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">✍️ Your Offer</h2>
            
            {/* Wage Slider */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <label className="text-gray-400">Weekly Wage</label>
                <span className="font-semibold">{formatWage(offeredWage)}/wk</span>
              </div>
              <input
                type="range"
                min={Math.round(demands.wage * 0.5)}
                max={Math.round(demands.wage * 1.5)}
                step={100000}
                value={offeredWage}
                onChange={(e) => setOfferedWage(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{formatWage(Math.round(demands.wage * 0.5))}</span>
                <span className="text-yellow-400">Demand: {formatWage(demands.wage)}</span>
                <span>{formatWage(Math.round(demands.wage * 1.5))}</span>
              </div>
            </div>

            {/* Length Selector */}
            <div className="mb-6">
              <label className="text-gray-400 block mb-2">Contract Length</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setOfferedLength(CONTRACT_LENGTHS.ONE_SEASON)}
                  className={`p-3 rounded-lg font-medium transition ${
                    offeredLength === CONTRACT_LENGTHS.ONE_SEASON
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  1 Season (10 wks)
                </button>
                <button
                  onClick={() => setOfferedLength(CONTRACT_LENGTHS.TWO_SEASONS)}
                  className={`p-3 rounded-lg font-medium transition ${
                    offeredLength === CONTRACT_LENGTHS.TWO_SEASONS
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  2 Seasons (20 wks)
                </button>
              </div>
              {demands.length !== offeredLength && (
                <p className="text-xs text-yellow-400 mt-2">
                  Player wants {formatLength(demands.length)}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitOffer}
              disabled={submitting}
              className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 rounded-lg font-semibold transition"
            >
              {submitting ? 'Submitting...' : 'Submit Offer'}
            </button>

            <p className="text-xs text-gray-500 text-center mt-3">
              Round {(negotiation?.rounds_used || 0) + 1} of {NEGOTIATION.MAX_ROUNDS}
            </p>
          </div>
        )}

        {/* Finished State */}
        {isFinished && (
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            {negotiation?.status === 'accepted' ? (
              <>
                <div className="text-4xl mb-3">🎉</div>
                <div className="text-xl font-semibold text-green-400">Contract Signed!</div>
                <p className="text-gray-400 mt-2">
                  {player.first_name} has agreed to {formatWage(negotiation.offered_wage || 0)}/wk 
                  for {formatLength(negotiation.offered_length || 10)}.
                </p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-3">😔</div>
                <div className="text-xl font-semibold text-red-400">Negotiations Failed</div>
                <p className="text-gray-400 mt-2">
                  {player.first_name} has rejected your offer. You can try again next week.
                </p>
              </>
            )}
            <Link
              href="/clubhouse/contracts"
              className="inline-block mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium"
            >
              Back to Contracts
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
