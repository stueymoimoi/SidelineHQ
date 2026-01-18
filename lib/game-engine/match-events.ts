/**
 * Match Events Generator
 * 
 * Generates timeline events from player match stats.
 */

interface PlayerMatchStat {
  fixture_id: string;
  player_id: string;
  player_name: string;
  team_id: string;
  tries: number;
  goals_made: number;
}

interface MatchResult {
  fixture_id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
}

interface MatchEvent {
  fixture_id: string;
  minute: number;
  event_type: 'TRY' | 'KICK' | 'HALF_TIME' | 'FULL_TIME';
  team_id: string | null;
  player_id: string | null;
  display_text: string | null;
}

export function generateMatchEventsFromStats(
  matchResult: MatchResult,
  playerStats: PlayerMatchStat[]
): MatchEvent[] {
  const events: MatchEvent[] = [];
  const usedMinutes = new Set<number>();
  
  usedMinutes.add(40);
  usedMinutes.add(80);

  const getUniqueMinute = (preferredHalf: 1 | 2): number => {
    const min = preferredHalf === 1 ? 1 : 41;
    const max = preferredHalf === 1 ? 38 : 78;
    
    let attempts = 0;
    while (attempts < 50) {
      const minute = Math.floor(Math.random() * (max - min + 1)) + min;
      if (!usedMinutes.has(minute) && !usedMinutes.has(minute + 1)) {
        usedMinutes.add(minute);
        return minute;
      }
      attempts++;
    }
    for (let m = min; m <= max; m++) {
      if (!usedMinutes.has(m) && !usedMinutes.has(m + 1)) {
        usedMinutes.add(m);
        return m;
      }
    }
    return preferredHalf === 1 ? 20 : 60;
  };

  interface TryEvent {
    team_id: string;
    player_id: string;
    player_name: string;
  }
  
  interface GoalEvent {
    team_id: string;
    player_id: string;
    player_name: string;
  }

  const homeTries: TryEvent[] = [];
  const awayTries: TryEvent[] = [];
  const homeGoals: GoalEvent[] = [];
  const awayGoals: GoalEvent[] = [];

  for (const stat of playerStats) {
    const isHome = stat.team_id === matchResult.home_team_id;
    
    for (let i = 0; i < (stat.tries || 0); i++) {
      const tryEvent = { team_id: stat.team_id, player_id: stat.player_id, player_name: stat.player_name };
      if (isHome) homeTries.push(tryEvent);
      else awayTries.push(tryEvent);
    }
    
    for (let i = 0; i < (stat.goals_made || 0); i++) {
      const goalEvent = { team_id: stat.team_id, player_id: stat.player_id, player_name: stat.player_name };
      if (isHome) homeGoals.push(goalEvent);
      else awayGoals.push(goalEvent);
    }
  }

  const generateTryWithGoal = (tries: TryEvent[], goals: GoalEvent[], half: 1 | 2) => {
    for (const tryEvent of tries) {
      const minute = getUniqueMinute(half);
      
      events.push({
        fixture_id: matchResult.fixture_id,
        minute: minute,
        event_type: 'TRY',
        team_id: tryEvent.team_id,
        player_id: tryEvent.player_id,
        display_text: `TRY - ${tryEvent.player_name}`
      });

      if (goals.length > 0) {
        const goal = goals.shift()!;
        usedMinutes.add(minute + 1);
        events.push({
          fixture_id: matchResult.fixture_id,
          minute: minute + 1,
          event_type: 'KICK',
          team_id: goal.team_id,
          player_id: goal.player_id,
          display_text: `GOAL - ${goal.player_name}`
        });
      }
    }
  };

  const homeFirstHalf = homeTries.splice(0, Math.ceil(homeTries.length / 2));
  const homeSecondHalf = homeTries;
  const awayFirstHalf = awayTries.splice(0, Math.ceil(awayTries.length / 2));
  const awaySecondHalf = awayTries;

  generateTryWithGoal(homeFirstHalf, homeGoals, 1);
  generateTryWithGoal(awayFirstHalf, awayGoals, 1);
  generateTryWithGoal(homeSecondHalf, homeGoals, 2);
  generateTryWithGoal(awaySecondHalf, awayGoals, 2);

  for (const goal of [...homeGoals, ...awayGoals]) {
    const half = Math.random() < 0.5 ? 1 : 2;
    const minute = getUniqueMinute(half);
    events.push({
      fixture_id: matchResult.fixture_id,
      minute: minute,
      event_type: 'KICK',
      team_id: goal.team_id,
      player_id: goal.player_id,
      display_text: `PENALTY GOAL - ${goal.player_name}`
    });
  }

  events.push({
    fixture_id: matchResult.fixture_id,
    minute: 40,
    event_type: 'HALF_TIME',
    team_id: null,
    player_id: null,
    display_text: 'HALF-TIME'
  });

  events.push({
    fixture_id: matchResult.fixture_id,
    minute: 80,
    event_type: 'FULL_TIME',
    team_id: null,
    player_id: null,
    display_text: `FULL-TIME: ${matchResult.home_score} - ${matchResult.away_score}`
  });

  events.sort((a, b) => a.minute - b.minute);

  return events;
}