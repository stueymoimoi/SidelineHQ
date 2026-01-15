'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { getTeamProfile, TeamProfile } from '@/lib/queries/team-profile';
import TeamBadge from './TeamBadge';
import PlayerLink from './PlayerLink';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface TeamSnapshotPopupProps {
  teamId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * TeamSnapshotPopup - Modal showing team quick stats
 * 
 * Usage:
 *   <TeamSnapshotPopup teamId="abc-123" isOpen={true} onClose={() => setOpen(false)} />
 */
export default function TeamSnapshotPopup({ teamId, isOpen, onClose }: TeamSnapshotPopupProps) {
  const [team, setTeam] = useState<TeamProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && teamId) {
      loadTeamData();
    }
  }, [isOpen, teamId]);

  const loadTeamData = async () => {
    setLoading(true);
    const data = await getTeamProfile(supabase, teamId);
    setTeam(data);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : !team ? (
          <div className="p-8 text-center text-red-400">Team not found</div>
        ) : (
          <>
            {/* Header */}
            <div 
              className="p-4 rounded-t-xl"
              style={{ backgroundColor: team.primary_color + '33' }}
            >
              <div className="flex items-center gap-3">
                <TeamBadge 
                  teamName={team.name} 
                  primaryColor={team.primary_color} 
                  size="lg" 
                  showAbbr 
                />
                <div>
                  <h2 className="text-xl font-bold text-white">{team.name}</h2>
                  <p className="text-gray-300 text-sm">Division {team.division}</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="p-4 space-y-4">
              {/* Position & Record */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-gray-400 text-xs uppercase">Ladder Position</div>
                  <div className="text-2xl font-bold text-white">{team.ladder_position}<span className="text-sm text-gray-400">/{10}</span></div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-gray-400 text-xs uppercase">Record</div>
                  <div className="text-xl font-bold text-white">
                    <span className="text-green-400">{team.wins}W</span>
                    {' - '}
                    <span className="text-gray-400">{team.draws}D</span>
                    {' - '}
                    <span className="text-red-400">{team.losses}L</span>
                  </div>
                </div>
              </div>

              {/* Home/Away */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-gray-400 text-xs uppercase">Home</div>
                  <div className="text-white font-semibold">
                    {team.home_wins}W - {team.home_draws}D - {team.home_losses}L
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-gray-400 text-xs uppercase">Away</div>
                  <div className="text-white font-semibold">
                    {team.away_wins}W - {team.away_draws}D - {team.away_losses}L
                  </div>
                </div>
              </div>

              {/* Form */}
              {team.form.length > 0 && (
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-gray-400 text-xs uppercase mb-2">Recent Form</div>
                  <div className="flex gap-1">
                    {team.form.map((result, i) => (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm ${
                          result === 'W' ? 'bg-green-500 text-white' :
                          result === 'L' ? 'bg-red-500 text-white' :
                          'bg-gray-500 text-white'
                        }`}
                      >
                        {result}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Points */}
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="text-gray-400 text-xs uppercase mb-1">Points</div>
                <div className="flex justify-between text-white">
                  <span>For: <strong>{team.points_for}</strong></span>
                  <span>Against: <strong>{team.points_against}</strong></span>
                  <span className={team.points_diff >= 0 ? 'text-green-400' : 'text-red-400'}>
                    Diff: <strong>{team.points_diff > 0 ? '+' : ''}{team.points_diff}</strong>
                  </span>
                </div>
              </div>

              {/* Coach */}
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="text-gray-400 text-xs uppercase mb-1">Coach</div>
                <div className="text-white font-semibold">
                  {team.coach_name ? (
                    <span className="text-yellow-400">👤 {team.coach_name}</span>
                  ) : (
                    <span className="text-gray-500 italic">Unmanaged</span>
                  )}
                </div>
              </div>

              {/* Squad Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-gray-400 text-xs uppercase">Avg OVR</div>
                  <div className="text-xl font-bold text-white">{team.avg_ovr}</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-gray-400 text-xs uppercase">Avg Age</div>
                  <div className="text-xl font-bold text-white">{team.avg_age}</div>
                </div>
              </div>

              {/* Star Player */}
              {team.star_player && (
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-gray-400 text-xs uppercase mb-1">Star Player</div>
                  <div className="text-white">
                    ⭐{' '}
                    <PlayerLink 
                      playerId={team.star_player.id} 
                      playerName={team.star_player.name} 
                    />
                    <span className="text-gray-400 ml-2">
                      ({team.star_player.position}, {team.star_player.overall} OVR)
                    </span>
                  </div>
                </div>
              )}

              {/* View Full History Link */}
              <Link
                href={`/team/${team.id}`}
                className="block w-full bg-blue-600 hover:bg-blue-500 text-white text-center py-3 rounded-lg font-semibold transition-colors"
              >
                View Full History →
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