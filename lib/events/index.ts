// /lib/events/index.ts

export type EventType = 
  | 'contract_signed'
  | 'contract_expired'
  | 'player_retired'
  | 'player_promoted'
  | 'player_signed'
  | 'player_transfer'
  | 'injury';

export interface CreateEventParams {
  event_type: EventType;
  headline: string;
  description?: string;
  player_id?: string;
  team_id?: string;
  from_team_id?: string;
  metadata?: Record<string, any>;
  round: number;
  division?: number;
}

// Helper to format wage for headlines
export function formatWageForHeadline(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000) {
    return '$' + (dollars / 1000).toFixed(0) + 'k';
  }
  return '$' + dollars.toLocaleString();
}

// Helper to format contract length
export function formatLengthForHeadline(weeks: number): string {
  if (weeks <= 10) return '1 season';
  if (weeks <= 20) return '2 seasons';
  return `${Math.round(weeks / 10)} seasons`;
}