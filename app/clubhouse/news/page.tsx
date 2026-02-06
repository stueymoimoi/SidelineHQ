// /app/clubhouse/news/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import Link from 'next/link';

const supabase = createBrowserClient();

interface LeagueEvent {
  id: string;
  event_type: string;
  headline: string;
  description: string | null;
  player_id: string | null;
  team_id: string | null;
  round: number;
  created_at: string;
  metadata: Record<string, any>;
  players: { first_name: string; last_name: string; position: string; overall: number; age: number } | null;
  teams: { name: string; division: number } | null;
}

const EVENT_ICONS: Record<string, string> = {
  contract_signed: '✍️',
  contract_expired: '📤',
  player_retired: '👋',
  player_promoted: '⬆️',
  player_signed: '🆕',
  player_transfer: '🔄',
  injury: '🏥',
};

const EVENT_COLORS: Record<string, string> = {
  contract_signed: 'border-green-500',
  contract_expired: 'border-red-500',
  player_retired: 'border-gray-500',
  player_promoted: 'border-blue-500',
  player_signed: 'border-green-500',
  player_transfer: 'border-yellow-500',
  injury: 'border-red-500',
};

export default function NewsPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<LeagueEvent[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [selectedPlayer, setSelectedPlayer] = useState<LeagueEvent['players'] | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [filter]);

  async function fetchEvents() {
    setLoading(true);
    
    let query = supabase
      .from('league_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (filter !== 'all') {
      query = query.eq('event_type', filter);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching events:', error);
      setLoading(false);
      return;
    }
    
    // Fetch player and team data separately
    const eventsWithDetails = await Promise.all(
      (data || []).map(async (event) => {
        let players = null;
        let teams = null;
        
        if (event.player_id) {
          const { data: playerData } = await supabase
            .from('players')
            .select('first_name, last_name, position, overall, age')
            .eq('id', event.player_id)
            .single();
          players = playerData;
        }
        
        if (event.team_id) {
          const { data: teamData } = await supabase
            .from('teams')
            .select('name, division')
            .eq('id', event.team_id)
            .single();
          teams = teamData;
        }
        
        return { ...event, players, teams };
      })
    );
    
    setEvents(eventsWithDetails);
    setLoading(false);
  }

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/clubhouse" className="text-blue-400 hover:text-blue-300 text-sm mb-2 inline-block">
            ← Back to Clubhouse
          </Link>
          <h1 className="text-3xl font-bold">📰 League News</h1>
          <p className="text-gray-400 mt-1">Latest happenings around the league</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { value: 'all', label: 'All News' },
            { value: 'contract_signed', label: '✍️ Signings' },
            { value: 'contract_expired', label: '📤 Departures' },
            { value: 'player_retired', label: '👋 Retirements' },
            { value: 'player_promoted', label: '⬆️ Promotions' },
            { value: 'injury', label: '🏥 Injuries' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                filter === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Events List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading news...</div>
        ) : events.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-400">No news yet. Check back after the next round!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className={`bg-gray-800 rounded-lg p-4 border-l-4 ${EVENT_COLORS[event.event_type] || 'border-gray-500'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{EVENT_ICONS[event.event_type] || '📋'}</div>
                    <div>
                      <p className="font-medium">
                        {event.player_id && event.players ? (
                          <>
                            <button
                              onClick={() => setSelectedPlayer(event.players)}
                              className="text-blue-400 hover:text-blue-300 hover:underline"
                            >
                              {event.players.first_name} {event.players.last_name}
                            </button>
                            {event.headline.replace(`${event.players.first_name} ${event.players.last_name}`, '')}
                          </>
                        ) : (
                          event.headline
                        )}
                      </p>
                      {event.description && (
                        <p className="text-sm text-gray-400 mt-1">{event.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>Round {event.round}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(event.created_at)}</span>
                        {event.teams && (
                          <>
                            <span>•</span>
                            <span>Div {event.teams.division}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Player Popup Modal */}
        {selectedPlayer && (
          <div 
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            onClick={() => setSelectedPlayer(null)}
          >
            <div 
              className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center text-2xl font-bold">
                  {selectedPlayer.overall}
                </div>
                <div>
                  <h3 className="text-xl font-bold">
                    {selectedPlayer.first_name} {selectedPlayer.last_name}
                  </h3>
                  <p className="text-gray-400">{selectedPlayer.position} • Age {selectedPlayer.age}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition"
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
