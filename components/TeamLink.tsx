'use client';

import { useState } from 'react';
import TeamBadge from './TeamBadge';
import TeamSnapshotPopup from './TeamSnapshotPopup';

interface TeamLinkProps {
  teamId: string;
  teamName: string;
  primaryColor: string;
  showBadge?: boolean;
  className?: string;
}

/**
 * TeamLink - Clickable team name that opens TeamSnapshotPopup
 * 
 * Usage:
 *   <TeamLink teamId="abc-123" teamName="Canberra Frost" primaryColor="#87CEEB" />
 *   <TeamLink teamId="abc-123" teamName="Canberra Frost" primaryColor="#87CEEB" showBadge />
 */
export default function TeamLink({ 
  teamId, 
  teamName, 
  primaryColor, 
  showBadge = false,
  className = '' 
}: TeamLinkProps) {
  const [popupOpen, setPopupOpen] = useState(false);

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setPopupOpen(true);
        }}
        className={`flex items-center gap-2 hover:opacity-80 transition-opacity text-left ${className}`}
      >
        {showBadge && (
          <TeamBadge 
            teamName={teamName} 
            primaryColor={primaryColor} 
            size="sm" 
            showAbbr 
          />
        )}
        <span className="text-white font-semibold hover:text-blue-400 transition-colors">
          {teamName}
        </span>
      </button>

      <TeamSnapshotPopup
        teamId={teamId}
        isOpen={popupOpen}
        onClose={() => setPopupOpen(false)}
      />
    </>
  );
}