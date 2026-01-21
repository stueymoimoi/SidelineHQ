'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TOTWPlayer {
  jersey_number: number;
  position_played: string;
  player_id: string;
  player_name: string;
  natural_position: string;
  age: number;
  overall: number;
  team_id: string;
  team_name: string;
  team_division: number;
  rating: number;
  stats: {
    tries: number;
    try_assists: number;
    metres: number;
    tackles: number;
    missed_tackles: number;
    line_breaks: number;
    tackle_breaks: number;
    errors: number;
    goals_made: number;
    goals_attempted: number;
    points: number;
    minutes_played: number;
  };
}

interface TOTWResponse {
  round: number;
  division: string;
  team: TOTWPlayer[];
  availableRounds: number[];
  message?: string;
}

export default function TeamOfTheWeekPage() {
  const router = useRouter();
  const [data, setData] = useState<TOTWResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedPlayer, setSelectedPlayer] = useState<TOTWPlayer | null>(null);

  useEffect(() => {
    fetchTOTW();
  }, [selectedRound, selectedDivision]);

  async function fetchTOTW() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedRound) params.set('round', selectedRound.toString());
      if (selectedDivision !== 'all') params.set('division', selectedDivision);
      
      const res = await fetch(`/api/team-of-the-week?${params}`);
      const json = await res.json();
      setData(json);
      
      if (!selectedRound && json.round) {
        setSelectedRound(json.round);
      }
    } catch (error) {
      console.error('Failed to fetch TOTW:', error);
    } finally {
      setLoading(false);
    }
  }

  // Get player by jersey number
  const getPlayer = (jersey: number): TOTWPlayer | undefined => {
    return data?.team.find(p => p.jersey_number === jersey);
  };

  // Player card component
  const PlayerCard = ({ jersey, label }: { jersey: number; label: string }) => {
    const player = getPlayer(jersey);
    
    return (
      <div
        onClick={() => player && setSelectedPlayer(player)}
        className={`
          bg-gray-800 rounded-lg p-3 text-center cursor-pointer
          hover:bg-gray-700 transition-colors min-w-[100px]
          ${!player && 'border border-gray-700 opacity-50'}
          ${player && player.team_id === 'e9de5aa1-2a63-4c2a-a2e2-1dcb855273bf' && 'border-2 border-emerald-500 shadow-lg shadow-emerald-500/30'}
          ${player && player.team_id !== 'e9de5aa1-2a63-4c2a-a2e2-1dcb855273bf' && 'border border-yellow-500/50'}
        `}
      >
        <div className="text-xs text-gray-400 mb-1">{label}</div>
        <div className="text-2xl font-bold text-yellow-500 mb-1">
          {player?.rating?.toFixed(1) || '-'}
        </div>
        <div className="text-sm font-medium text-white truncate">
          {player?.player_name || 'N/A'}
        </div>
        <div className="text-xs text-gray-400 truncate">
          {player?.team_name || '-'}
        </div>
        {player && player.team_division && (
          <div className="text-xs text-emerald-400 mt-1">
            Div {player.team_division}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
        >
          ← Back
        </button>
        
        <h1 className="text-3xl font-bold mb-2">🏆 Team of the Week</h1>
        <p className="text-gray-400 mb-6">Best performers by position</p>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Round</label>
            <select
              value={selectedRound || ''}
              onChange={(e) => setSelectedRound(parseInt(e.target.value))}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            >
              {data?.availableRounds?.map((r) => (
                <option key={r} value={r}>Round {r}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Division</label>
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            >
              <option value="all">🌐 League-Wide</option>
              {[1,2,3,4,5,6,7,8,9,10].map((d) => (
                <option key={d} value={d}>Division {d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        )}

        {/* No Data State */}
        {!loading && data?.message && (
          <div className="text-center py-20 text-gray-400">{data.message}</div>
        )}

        {/* Team Sheet Layout - Flipped with Bench on Side */}
        {!loading && data?.team && data.team.length > 0 && (
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <div className="flex gap-6">
              {/* Main Formation */}
              <div className="flex-1">
                {/* Front Row - TOP */}
                <div className="flex justify-center gap-4 mb-6">
                  <PlayerCard jersey={8} label="Prop" />
                  <PlayerCard jersey={9} label="Hooker" />
                  <PlayerCard jersey={10} label="Prop" />
                </div>

                {/* Back Row */}
                <div className="flex justify-center gap-4 mb-6">
                  <PlayerCard jersey={11} label="2nd Row" />
                  <PlayerCard jersey={13} label="Lock" />
                  <PlayerCard jersey={12} label="2nd Row" />
                </div>

                {/* Halves */}
                <div className="flex justify-center gap-4 mb-6">
                  <PlayerCard jersey={6} label="Five-Eighth" />
                  <PlayerCard jersey={7} label="Halfback" />
                </div>

                {/* Wingers & Centres */}
                <div className="flex justify-center gap-4 mb-6">
                  <PlayerCard jersey={2} label="Wing" />
                  <PlayerCard jersey={3} label="Centre" />
                  <PlayerCard jersey={4} label="Centre" />
                  <PlayerCard jersey={5} label="Wing" />
                </div>

                {/* Fullback - BOTTOM */}
                <div className="flex justify-center">
                  <PlayerCard jersey={1} label="Fullback" />
                </div>
              </div>

              {/* Bench - Right Side */}
              <div className="border-l border-gray-700 pl-6">
                <div className="text-center text-gray-400 text-sm mb-4">BENCH</div>
                <div className="flex flex-col gap-3">
                  <PlayerCard jersey={14} label="14" />
                  <PlayerCard jersey={15} label="15" />
                  <PlayerCard jersey={16} label="16" />
                  <PlayerCard jersey={17} label="17" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Player Modal */}
        {selectedPlayer && (
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedPlayer(null)}
          >
            <div
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold">{selectedPlayer.player_name}</h2>
                  <p className="text-gray-400">
                    {selectedPlayer.team_name} • Division {selectedPlayer.team_division}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-yellow-500">
                    {selectedPlayer.rating.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-400">Match Rating</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="bg-gray-700/50 rounded p-2">
                  <span className="text-gray-400">Position Played:</span>
                  <span className="float-right font-medium">{selectedPlayer.position_played}</span>
                </div>
                <div className="bg-gray-700/50 rounded p-2">
                  <span className="text-gray-400">Natural Position:</span>
                  <span className="float-right font-medium">{selectedPlayer.natural_position}</span>
                </div>
                <div className="bg-gray-700/50 rounded p-2">
                  <span className="text-gray-400">Age:</span>
                  <span className="float-right font-medium">{selectedPlayer.age}</span>
                </div>
                <div className="bg-gray-700/50 rounded p-2">
                  <span className="text-gray-400">Overall:</span>
                  <span className="float-right font-medium">{selectedPlayer.overall}</span>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <h3 className="font-semibold mb-3">Match Stats</h3>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-gray-700/50 rounded p-2 text-center">
                    <div className="text-lg font-bold text-emerald-400">{selectedPlayer.stats.tries}</div>
                    <div className="text-xs text-gray-400">Tries</div>
                  </div>
                  <div className="bg-gray-700/50 rounded p-2 text-center">
                    <div className="text-lg font-bold text-emerald-400">{selectedPlayer.stats.try_assists}</div>
                    <div className="text-xs text-gray-400">Assists</div>
                  </div>
                  <div className="bg-gray-700/50 rounded p-2 text-center">
                    <div className="text-lg font-bold text-emerald-400">{selectedPlayer.stats.metres}</div>
                    <div className="text-xs text-gray-400">Metres</div>
                  </div>
                  <div className="bg-gray-700/50 rounded p-2 text-center">
                    <div className="text-lg font-bold text-blue-400">{selectedPlayer.stats.tackles}</div>
                    <div className="text-xs text-gray-400">Tackles</div>
                  </div>
                  <div className="bg-gray-700/50 rounded p-2 text-center">
                    <div className="text-lg font-bold text-red-400">{selectedPlayer.stats.missed_tackles}</div>
                    <div className="text-xs text-gray-400">Missed</div>
                  </div>
                  <div className="bg-gray-700/50 rounded p-2 text-center">
                    <div className="text-lg font-bold text-blue-400">{selectedPlayer.stats.line_breaks}</div>
                    <div className="text-xs text-gray-400">Linebreaks</div>
                  </div>
                  <div className="bg-gray-700/50 rounded p-2 text-center">
                    <div className="text-lg font-bold text-emerald-400">{selectedPlayer.stats.tackle_breaks}</div>
                    <div className="text-xs text-gray-400">Tackle Breaks</div>
                  </div>
                  <div className="bg-gray-700/50 rounded p-2 text-center">
                    <div className="text-lg font-bold text-red-400">{selectedPlayer.stats.errors}</div>
                    <div className="text-xs text-gray-400">Errors</div>
                  </div>
                  <div className="bg-gray-700/50 rounded p-2 text-center">
                    <div className="text-lg font-bold text-emerald-400">{selectedPlayer.stats.points}</div>
                    <div className="text-xs text-gray-400">Points</div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedPlayer(null)}
                className="w-full mt-6 bg-gray-700 hover:bg-gray-600 py-2 rounded font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}