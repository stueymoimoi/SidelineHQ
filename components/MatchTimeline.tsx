'use client';

import { useState, useEffect } from 'react';
import { getMatchEvents, getEventIcon, MatchEvent } from '@/lib/queries/match-events';
import { createBrowserClient } from '@/lib/supabase';
import PlayerLink from './PlayerLink';

const supabase = createBrowserClient();

interface MatchTimelineProps {
  fixtureId: string;
  defaultExpanded?: boolean;
}

/**
 * MatchTimeline - Collapsible match event timeline
 * 
 * Usage:
 *   <MatchTimeline fixtureId="abc-123" />
 *   <MatchTimeline fixtureId="abc-123" defaultExpanded={true} />
 */
export default function MatchTimeline({ fixtureId, defaultExpanded = false }: MatchTimelineProps) {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    loadEvents();
  }, [fixtureId]);

  const loadEvents = async () => {
    setLoading(true);
    const data = await getMatchEvents(supabase, fixtureId);
    setEvents(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="text-gray-400 text-sm">Loading timeline...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="text-gray-500 text-sm italic">No timeline available for this match</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* Header - Click to expand/collapse */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold">Match Timeline</span>
          <span className="text-gray-400 text-sm">({events.length} events)</span>
        </div>
        <span className="text-gray-400 text-xl">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Events List */}
{expanded && (
  <div className="border-t border-gray-700 max-h-72 overflow-y-auto flex flex-col items-center">
    {events.map((event) => (
      <div
        key={event.id}
        className={`flex items-center gap-2 px-3 py-1 border-b border-gray-700/50 text-sm ${
          event.event_type === 'HALF_TIME' || event.event_type === 'FULL_TIME'
            ? 'bg-gray-700/30'
            : ''
        }`}
      >
        {/* Minute */}
        <div className="w-7 text-right text-gray-400 text-xs font-mono shrink-0">
          {event.minute}'
        </div>

        {/* Icon */}
        <div className="text-base shrink-0">
          {getEventIcon(event.event_type)}
        </div>

        {/* Team Badge - moved closer to action */}
        {event.team_abbr && (
          <div
            className="px-1.5 py-0.5 rounded text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: event.team_color || '#666' }}
          >
            {event.team_abbr}
          </div>
        )}

        {/* Event Details */}
        <div className="truncate">
          {event.event_type === 'HALF_TIME' ? (
            <span className="text-gray-300 font-semibold">HALF-TIME</span>
          ) : event.event_type === 'FULL_TIME' ? (
            <span className="text-gray-300 font-semibold">FULL-TIME</span>
          ) : (
            <span className="text-gray-200">
              <span className="font-semibold">{event.event_type === 'KICK' ? 'GOAL' : event.event_type}</span>
              {event.player_id && event.player_name && (
                <>
                  <span className="text-gray-400"> - </span>
                  <PlayerLink 
                    playerId={event.player_id} 
                    playerName={event.player_name} 
                  />
                </>
              )}
            </span>
          )}
        </div>
      </div>
    ))}
  </div>
)}
    </div>
  );
}