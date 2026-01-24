'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PlayerProfile {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  age: number;
  overall: number;
  speed: number;
  strength: number;
  power: number;
  passing: number;
  stamina: number;
  tackling: number;
  kicking: number;
  fatigue: number;
  visible_trait: string | null;
  morale: number;
  dominant_side: string | null;
  team_id: string | null;
  team?: {
    name: string;
    primary_color: string;
  };
}

interface SeasonStats {
  games: number;
  tries: number;
  tryAssists: number;
  goals: number;
  tackles: number;
  metres: number;
  avgRating: number;
}

interface PlayerSnapshotPopupProps {
  playerId: string;
  isOpen: boolean;
  onClose: () => void;
}

function getMoraleDisplay(morale: number): { text: string; color: string } {
  if (morale <= 20) return { text: 'Angry', color: 'text-red-500' };
  if (morale <= 40) return { text: 'Unhappy', color: 'text-orange-400' };
  if (morale <= 60) return { text: 'Content', color: 'text-yellow-400' };
  if (morale <= 80) return { text: 'Happy', color: 'text-green-400' };
  return { text: 'Ecstatic', color: 'text-green-300' };
}

const getAttributeColor = (value: number): string => {
  if (value >= 7) return 'text-green-400';
  if (value >= 5) return 'text-yellow-400';
  if (value >= 3) return 'text-orange-400';
  return 'text-red-400';
};

const getPositionColor = (position: string): string => {
  const colors: Record<string, string> = {
    'Fullback': 'bg-purple-600',
    'Winger': 'bg-blue-600',
    'Centre': 'bg-green-600',
    'Five-Eighth': 'bg-yellow-600',
    'Halfback': 'bg-yellow-500',
    'Prop': 'bg-red-600',
    'Hooker': 'bg-orange-600',
    'Second Row': 'bg-pink-600',
    'Lock': 'bg-red-700',
  };
  return colors[position] || 'bg-gray-600';
};

/**
 * PlayerSnapshotPopup - Modal showing player quick stats
 *
 * Usage:
 *   <PlayerSnapshotPopup playerId="abc-123" isOpen={true} onClose={() => setOpen(false)} />
 */
export default function PlayerSnapshotPopup({ playerId, isOpen, onClose }: PlayerSnapshotPopupProps) {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [seasonStats, setSeasonStats] = useState<SeasonStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && playerId) {
      loadPlayerData();
    }
  }, [isOpen, playerId]);

  const loadPlayerData = async () => {
    setLoading(true);

    // Get player with team info
    const { data: playerData } = await supabase
      .from('players')
      .select(`
        id, first_name, last_name, position, age, overall,
        speed, strength, power, passing, stamina, tackling, kicking,
        fatigue, visible_trait, morale, dominant_side, team_id,
        teams:team_id (name, primary_color)
      `)
      .eq('id', playerId)
      .single();

    if (playerData) {
      // Handle the teams join result
      const teamData = Array.isArray(playerData.teams) ? playerData.teams[0] : playerData.teams;
      setPlayer({
        ...playerData,
        team: teamData || undefined
      });

      // Get season stats
      const { data: stats } = await supabase
        .from('player_match_stats')
        .select('rating, tries, try_assists, goals_made, tackles, metres')
        .eq('player_id', playerId);

      if (stats && stats.length > 0) {
        let totalRating = 0;
        const totals: SeasonStats = {
          games: stats.length,
          tries: 0,
          tryAssists: 0,
          goals: 0,
          tackles: 0,
          metres: 0,
          avgRating: 0,
        };

        for (const stat of stats) {
          totals.tries += stat.tries || 0;
          totals.tryAssists += stat.try_assists || 0;
          totals.goals += stat.goals_made || 0;
          totals.tackles += stat.tackles || 0;
          totals.metres += stat.metres || 0;
          totalRating += stat.rating || 6;
        }
        totals.avgRating = Math.round((totalRating / stats.length) * 10) / 10;

        setSeasonStats(totals);
      }
    }

    setLoading(false);
  };

  if (!isOpen) return null;

  const morale = getMoraleDisplay(player?.morale ?? 50);
  const fitness = player ? 100 - (player.fatigue || 0) : 100;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : !player ? (
          <div className="p-8 text-center text-red-400">Player not found</div>
        ) : (
          <>
            {/* Header */}
            <div
              className="p-4 rounded-t-xl"
              style={{ backgroundColor: player.team?.primary_color ? player.team.primary_color + '33' : '#374151' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{player.first_name}</p>
                  <h2 className="text-2xl font-bold text-white">{player.last_name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${getPositionColor(player.position)}`}>
                      {player.position}
                    </span>
                    {player.dominant_side && player.dominant_side !== 'none' && (
                      <span className="text-gray-400 text-xs">
                        {player.dominant_side === 'left' ? '◀ Left' : player.dominant_side === 'right' ? 'Right ▶' : 'L/R'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-green-400">{player.overall}</div>
                  <div className="text-gray-400 text-xs">OVR</div>
                </div>
              </div>
            </div>

            {/* Quick Info */}
            <div className="p-4 space-y-4">
              {/* Team & Age */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                  <div className="text-gray-400 text-xs">Age</div>
                  <div className="text-white font-bold">{player.age}</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                  <div className="text-gray-400 text-xs">Fitness</div>
                  <div className={`font-bold ${fitness >= 80 ? 'text-green-400' : fitness >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {fitness}%
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                  <div className="text-gray-400 text-xs">Morale</div>
                  <div className={`font-bold ${morale.color}`}>{morale.text}</div>
                </div>
              </div>

              {/* Team */}
              {player.team && (
                <div className="bg-gray-700/50 rounded-lg p-2">
                  <div className="text-gray-400 text-xs">Team</div>
                  <div className="text-white font-semibold">{player.team.name}</div>
                </div>
              )}

              {/* Trait */}
              {player.visible_trait && (
                <div className="bg-gray-700/50 rounded-lg p-2">
                  <div className="text-gray-400 text-xs">Trait</div>
                  <div className="text-yellow-400 font-semibold">✦ {player.visible_trait}</div>
                </div>
              )}

              {/* Attributes */}
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="text-gray-400 text-xs uppercase mb-2">Attributes</div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'SPD', value: player.speed },
                    { label: 'STR', value: player.strength },
                    { label: 'POW', value: player.power },
                    { label: 'PAS', value: player.passing },
                    { label: 'STA', value: player.stamina },
                    { label: 'TAK', value: player.tackling },
                    { label: 'KIK', value: player.kicking },
                  ].map((attr) => (
                    <div key={attr.label}>
                      <div className="text-gray-500 text-xs">{attr.label}</div>
                      <div className={`font-bold ${getAttributeColor(attr.value)}`}>{attr.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Season Stats */}
              {seasonStats && seasonStats.games > 0 && (
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-gray-400 text-xs uppercase mb-2">Season Stats ({seasonStats.games} games)</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-white font-bold">{seasonStats.tries}</div>
                      <div className="text-gray-500 text-xs">Tries</div>
                    </div>
                    <div>
                      <div className="text-white font-bold">{seasonStats.tryAssists}</div>
                      <div className="text-gray-500 text-xs">Assists</div>
                    </div>
                    <div>
                      <div className="text-white font-bold">{seasonStats.goals}</div>
                      <div className="text-gray-500 text-xs">Goals</div>
                    </div>
                    <div>
                      <div className="text-white font-bold">{seasonStats.tackles}</div>
                      <div className="text-gray-500 text-xs">Tackles</div>
                    </div>
                    <div>
                      <div className="text-white font-bold">{seasonStats.metres}</div>
                      <div className="text-gray-500 text-xs">Metres</div>
                    </div>
                    <div>
                      <div className="text-white font-bold">{seasonStats.avgRating}</div>
                      <div className="text-gray-500 text-xs">Avg Rating</div>
                    </div>
                  </div>
                </div>
              )}

              {/* View Full Profile Link */}
              <Link
                href={`/player/${player.id}`}
                className="block w-full bg-blue-600 hover:bg-blue-500 text-white text-center py-3 rounded-lg font-semibold transition-colors"
              >
                View Full Profile →
              </Link>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </>
        )}
      </div>
    </div>
  );
}