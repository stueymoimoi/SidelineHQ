'use client';

interface TeamBadgeProps {
  teamName: string;
  primaryColor: string;
  size?: 'sm' | 'md' | 'lg';
  showAbbr?: boolean;
}

/**
 * TeamBadge - Team color badge with optional abbreviation
 * 
 * Usage:
 *   <TeamBadge teamName="Canberra Frost" primaryColor="#87CEEB" />
 *   <TeamBadge teamName="Canberra Frost" primaryColor="#87CEEB" size="lg" showAbbr />
 */
export default function TeamBadge({ 
  teamName, 
  primaryColor, 
  size = 'md',
  showAbbr = false 
}: TeamBadgeProps) {
  const abbr = getTeamAbbr(teamName);
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm'
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ backgroundColor: primaryColor }}
      title={teamName}
    >
      {showAbbr && abbr}
    </div>
  );
}

// Helper: Get team abbreviation from name
function getTeamAbbr(name: string): string {
  const abbrs: Record<string, string> = {
    'Canberra Frost': 'CAN',
    'Sydney Serpents': 'SYD',
    'Brisbane Raptors': 'BRI',
    'Melbourne Wolves': 'MEL',
    'Newcastle Steelers': 'NEW',
    'Gold Coast Pelicans': 'GOL',
    'Perth Quokkas': 'PER',
    'Adelaide Coopers': 'ADE',
    'Townsville Cassowaries': 'TOW',
    'Wollongong Ironmen': 'WOL',
  };

  if (abbrs[name]) {
    return abbrs[name];
  }

  // Fallback: First 3 letters of first word
  return name.split(' ')[0].substring(0, 3).toUpperCase();
}