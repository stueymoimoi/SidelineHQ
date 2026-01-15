'use client';

import Link from 'next/link';

interface PlayerLinkProps {
  playerId: string;
  playerName: string;
  className?: string;
}

/**
 * PlayerLink - Clickable player name that routes to player profile
 * 
 * Usage:
 *   <PlayerLink playerId="abc-123" playerName="M. Taumalolo" />
 */
export default function PlayerLink({ playerId, playerName, className = '' }: PlayerLinkProps) {
  return (
    <Link
      href={`/player/${playerId}`}
      className={`text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors ${className}`}
      onClick={(e) => e.stopPropagation()} // Prevent triggering parent click handlers
    >
      {playerName}
    </Link>
  );
}