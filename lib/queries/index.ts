/**
 * Query Index
 * 
 * Export all query functions for easy importing.
 * 
 * Usage:
 *   import { getTeamProfile, getMatchEvents } from '@/lib/queries';
 */

export {
  getTeamProfile,
  getTeamResults,
  getCoachHistory,
  getSeasonSummary,
  type TeamProfile,
  type TeamResult,
  type CoachHistoryEntry,
  type SeasonSummary
} from './team-profile';

export {
  getMatchEvents,
  hasMatchEvents,
  getEventIcon,
  formatEventDisplay,
  type MatchEvent
} from './match-events';