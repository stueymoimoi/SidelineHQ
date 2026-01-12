'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Team {
  id: string;
  name: string;
  city: string;
  primary_color: string;
  secondary_color: string;
  wins: number;
  draws: number;
  losses: number;
  points_for: number;
  points_against: number;
  division: number;
}

interface Fixture {
  id: string;
  home_team_id: string;
  away_team_id: string;
  round: number;
  season: number;
  played: boolean;
  division: number;
}

interface MatchResult {
  id: string;
  fixture_id: string;
  home_score: number;
  away_score: number;
  home_team_id: string;
  away_team_id: string;
}

interface FixtureWithTeams extends Fixture {
  home_team: Team;
  away_team: Team;
  result?: MatchResult;
}

// Season 0 schedule: Tues, Thurs, Sun at 6pm AEST
const SEASON_0_START = new Date('2026-01-13T07:00:00Z'); // Tuesday 13th Jan 6pm AEST = 7am UTC

// Pre-calculate all 18 round dates
function getRoundDates(): Date[] {
  const dates: Date[] = [];
  const start = new Date(SEASON_0_START);
  let current = new Date(start);
  
  for (let round = 1; round <= 18; round++) {
    dates.push(new Date(current));
    
    // Move to next update day: Tue -> Thu (+2), Thu -> Sun (+3), Sun -> Tue (+2)
    const day = current.getDay();
    if (day === 2) current.setDate(current.getDate() + 2);      // Tue -> Thu
    else if (day === 4) current.setDate(current.getDate() + 3); // Thu -> Sun
    else current.setDate(current.getDate() + 2);                // Sun -> Tue
  }
  
  return dates;
}

const ROUND_DATES = getRoundDates();

function getCurrentRoundFromSchedule(): number {
  const now = new Date();
  
  // Find which round we're up to based on dates
  for (let i = ROUND_DATES.length - 1; i >= 0; i--) {
    if (now >= ROUND_DATES[i]) {
      return i + 1; // Round numbers are 1-indexed
    }
  }
  
  return 0; // Season hasn't started yet
}

function getNextUpdateTime(): { date: Date; round: number } {
  const now = new Date();
  
  // Find next round that hasn't happened yet
  for (let i = 0; i < ROUND_DATES.length; i++) {
    if (now < ROUND_DATES[i]) {
      return { date: ROUND_DATES[i], round: i + 1 };
    }
  }
  
  // All rounds done
  return { date: ROUND_DATES[ROUND_DATES.length - 1], round: 18 };
}

function formatCountdown(targetDate: Date): string {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();
  
  if (diff <= 0) return 'Update pending...';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getDayName(date: Date): string {
  return date.toLocaleDateString('en-AU', { weekday: 'long', timeZone: 'Australia/Sydney' });
}

export default function FixturesPage() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [allTeams, setAllTeams] = useState<Record<string, Team>>({});
  const [fixtures, setFixtures] = useState<FixtureWithTeams[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [countdown, setCountdown] = useState('');
  const [nextUpdate, setNextUpdate] = useState<{ date: Date; round: number } | null>(null);
  const [seasonStarted, setSeasonStarted] = useState(false);
  const [userDivision, setUserDivision] = useState(1);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  // Countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const scheduleRound = getCurrentRoundFromSchedule();
      setSeasonStarted(scheduleRound > 0);
      
      const next = getNextUpdateTime();
      setNextUpdate(next);
      setCountdown(formatCountdown(next.date));
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // Check auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      // Get coach
      const { data: coach } = await supabase
        .from('coaches')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!coach?.team_id) {
        router.push('/choose-team');
        return;
      }

      // Get user's team FIRST to know their division
      const { data: myTeam } = await supabase
        .from('teams')
        .select('*')
        .eq('id', coach.team_id)
        .single();

      if (!myTeam) return;

      setTeam(myTeam);
      setUserDivision(myTeam.division);

      // Get all teams in user's division
      const { data: teams } = await supabase
        .from('teams')
        .select('*')
        .eq('division', myTeam.division);

      if (!teams) return;

      const teamsMap: Record<string, Team> = {};
      teams.forEach(t => { teamsMap[t.id] = t; });
      setAllTeams(teamsMap);

      // Get fixtures for user's division only
      const { data: fixturesData } = await supabase
        .from('fixtures')
        .select('*')
        .eq('season', 0)
        .eq('division', myTeam.division)
        .order('round', { ascending: true });

      // Get all match results for this division's fixtures
      const fixtureIds = (fixturesData || []).map(f => f.id);
      let resultsMap: Record<string, MatchResult> = {};
      
      if (fixtureIds.length > 0) {
        const { data: results } = await supabase
          .from('match_results')
          .select('*')
          .in('fixture_id', fixtureIds);

        results?.forEach(r => { resultsMap[r.fixture_id] = r; });
      }

      // Combine fixtures with teams and results
      const fixturesWithTeams: FixtureWithTeams[] = (fixturesData || [])
        .filter(f => teamsMap[f.home_team_id] && teamsMap[f.away_team_id]) // Only include fixtures where both teams exist
        .map(f => ({
          ...f,
          home_team: teamsMap[f.home_team_id],
          away_team: teamsMap[f.away_team_id],
          result: resultsMap[f.id],
        }));

      setFixtures(fixturesWithTeams);

      // Set current round based on schedule, not played status
      const scheduleRound = getCurrentRoundFromSchedule();
      const displayRound = scheduleRound > 0 ? scheduleRound : 1;
      setCurrentRound(displayRound);
      setSelectedRound(displayRound);
      setSeasonStarted(scheduleRound > 0);

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get user's next match
  const getMyNextMatch = (): FixtureWithTeams | null => {
    if (!team) return null;
    return fixtures.find(f => 
      !f.played && 
      (f.home_team_id === team.id || f.away_team_id === team.id)
    ) || null;
  };

  // Get fixtures for a specific round
  const getFixturesForRound = (round: number): FixtureWithTeams[] => {
    return fixtures.filter(f => f.round === round);
  };

  // Get user's results
  const getMyResults = (): FixtureWithTeams[] => {
    if (!team) return [];
    return fixtures.filter(f => 
      f.played && 
      (f.home_team_id === team.id || f.away_team_id === team.id)
    );
  };

  const myNextMatch = getMyNextMatch();
  const roundFixtures = selectedRound ? getFixturesForRound(selectedRound) : [];
  const myResults = getMyResults();

  // Calculate ladder standings
  const getLadder = () => {
    const teamsArray = Object.values(allTeams);
    return teamsArray.sort((a, b) => {
      // Sort by: points (W*2 + D), then point diff, then points for
      const aPoints = (a.wins * 2) + a.draws;
      const bPoints = (b.wins * 2) + b.draws;
      if (bPoints !== aPoints) return bPoints - aPoints;
      
      const aDiff = a.points_for - a.points_against;
      const bDiff = b.points_for - b.points_against;
      if (bDiff !== aDiff) return bDiff - aDiff;
      
      return b.points_for - a.points_for;
    });
  };

  const ladder = getLadder();
  
  // Get ordinal suffix (1st, 2nd, 3rd, etc.)
  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  
  // Get ladder position for a team
  const getLadderPosition = (teamId: string): string => {
    const pos = ladder.findIndex(t => t.id === teamId) + 1;
    return getOrdinal(pos);
  };

  // Determine result for user's team
  const getResultBadge = (fixture: FixtureWithTeams): { text: string; color: string } => {
    if (!fixture.result || !team) return { text: '', color: '' };
    
    const isHome = fixture.home_team_id === team.id;
    const myScore = isHome ? fixture.result.home_score : fixture.result.away_score;
    const theirScore = isHome ? fixture.result.away_score : fixture.result.home_score;
    
    if (myScore > theirScore) return { text: 'W', color: 'bg-green-500' };
    if (myScore < theirScore) return { text: 'L', color: 'bg-red-500' };
    return { text: 'D', color: 'bg-yellow-500' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header with team colors */}
      <div 
        className="p-6"
        style={{
          background: `linear-gradient(135deg, ${team?.primary_color || '#1f2937'} 0%, ${team?.secondary_color || '#111827'} 100%)`
        }}
      >
        <div className="max-w-6xl mx-auto">
          <Link href="/clubhouse" className="text-white/70 hover:text-white mb-2 inline-block">
            ← Back to Clubhouse
          </Link>
          <h1 className="text-3xl font-bold text-white">📅 Fixtures</h1>
          <p className="text-white/80 mt-1">
            Season 0 • Division {userDivision} • {seasonStarted ? `Round ${currentRound} of 18` : 'Pre-Season'}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        
        {/* Next Update Countdown */}
        <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">
                {seasonStarted ? `Round ${nextUpdate?.round} Simulates` : 'Season Kicks Off'}
              </p>
              <p className="text-white font-bold text-lg">
                {nextUpdate && getDayName(nextUpdate.date)} 6:00 PM AEST
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Countdown</p>
              <p className="text-green-400 font-bold text-2xl">{countdown}</p>
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-2">
            Season 0 Schedule: Tuesday, Thursday & Sunday at 6pm
          </p>
        </div>

        {/* My Next Match */}
        {myNextMatch && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-gray-400 text-sm mb-3">YOUR NEXT MATCH • Round {myNextMatch.round}</h2>
            <div className="flex items-center justify-between">
              {/* Home Team */}
              <div className="flex-1 text-center">
                <div 
                  className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-2xl font-bold"
                  style={{ 
                    backgroundColor: myNextMatch.home_team.primary_color,
                    color: myNextMatch.home_team.secondary_color 
                  }}
                >
                  {myNextMatch.home_team.city.substring(0, 3).toUpperCase()}
                </div>
                <p className="text-white font-bold">{myNextMatch.home_team.city} <span className="text-gray-400 font-normal">({getLadderPosition(myNextMatch.home_team_id)})</span></p>
                <p className="text-gray-400 text-sm">{myNextMatch.home_team.name}</p>
                {myNextMatch.home_team_id === team?.id && (
                  <span className="inline-block bg-green-600 text-white text-xs px-2 py-1 rounded mt-1">
                    YOUR TEAM
                  </span>
                )}
              </div>

              {/* VS */}
              <div className="px-6">
                <div className="text-gray-500 text-2xl font-bold">VS</div>
                <div className="text-gray-600 text-sm mt-1">
                  {myNextMatch.home_team_id === team?.id ? 'HOME' : 'AWAY'}
                </div>
              </div>

              {/* Away Team */}
              <div className="flex-1 text-center">
                <div 
                  className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-2xl font-bold"
                  style={{ 
                    backgroundColor: myNextMatch.away_team.primary_color,
                    color: myNextMatch.away_team.secondary_color 
                  }}
                >
                  {myNextMatch.away_team.city.substring(0, 3).toUpperCase()}
                </div>
                <p className="text-white font-bold">{myNextMatch.away_team.city} <span className="text-gray-400 font-normal">({getLadderPosition(myNextMatch.away_team_id)})</span></p>
                <p className="text-gray-400 text-sm">{myNextMatch.away_team.name}</p>
                {myNextMatch.away_team_id === team?.id && (
                  <span className="inline-block bg-green-600 text-white text-xs px-2 py-1 rounded mt-1">
                    YOUR TEAM
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Round Selector */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-white font-bold mb-3">Browse Rounds</h2>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 18 }, (_, i) => i + 1).map(round => {
              const roundGames = getFixturesForRound(round);
              const allPlayed = roundGames.length > 0 && roundGames.every(f => f.played);
              const isCurrentRound = round === currentRound;
              
              return (
                <button
                  key={round}
                  onClick={() => setSelectedRound(round)}
                  className={`w-10 h-10 rounded-lg font-bold transition ${
                    selectedRound === round
                      ? 'bg-green-600 text-white'
                      : allPlayed
                        ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        : isCurrentRound
                          ? 'bg-gray-700 text-green-400 border border-green-500 hover:bg-gray-600'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {round}
                </button>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-gray-600 rounded"></span> Completed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-gray-700 border border-green-500 rounded"></span> Current
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-gray-700 rounded"></span> Upcoming
            </span>
          </div>
        </div>

        {/* Round Fixtures */}
        {selectedRound && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-white font-bold mb-4">
              Round {selectedRound} {selectedRound === currentRound && <span className="text-green-400 text-sm font-normal">(Current)</span>}
            </h2>
            <div className="space-y-3">
              {roundFixtures.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No fixtures found for this round</p>
              ) : (
                roundFixtures.map(fixture => {
                  const isMyGame = fixture.home_team_id === team?.id || fixture.away_team_id === team?.id;
                  
                  return (
                    <div 
                      key={fixture.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        isMyGame ? 'bg-gray-700 border border-green-500/50' : 'bg-gray-700/50'
                      }`}
                    >
                      {/* Home Team */}
                      <div className="flex-1 flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ 
                            backgroundColor: fixture.home_team.primary_color,
                            color: fixture.home_team.secondary_color 
                          }}
                        >
                          {fixture.home_team.city.substring(0, 3).toUpperCase()}
                        </div>
                        <span className={`${isMyGame && fixture.home_team_id === team?.id ? 'text-green-400' : 'text-white'}`}>
                          {fixture.home_team.city} <span className="text-gray-500">({getLadderPosition(fixture.home_team_id)})</span>
                        </span>
                      </div>

                      {/* Score or VS */}
                      <div className="px-4 text-center min-w-[80px]">
                        {fixture.played && fixture.result ? (
                          <span className="text-white font-bold">
                            {fixture.result.home_score} - {fixture.result.away_score}
                          </span>
                        ) : (
                          <span className="text-gray-500">vs</span>
                        )}
                      </div>

                      {/* Away Team */}
                      <div className="flex-1 flex items-center gap-2 justify-end">
                        <span className={`${isMyGame && fixture.away_team_id === team?.id ? 'text-green-400' : 'text-white'}`}>
                          {fixture.away_team.city} <span className="text-gray-500">({getLadderPosition(fixture.away_team_id)})</span>
                        </span>
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ 
                            backgroundColor: fixture.away_team.primary_color,
                            color: fixture.away_team.secondary_color 
                          }}
                        >
                          {fixture.away_team.city.substring(0, 3).toUpperCase()}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* My Results History */}
        {myResults.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-white font-bold mb-4">Your Results</h2>
            <div className="space-y-2">
              {myResults.map(fixture => {
                const isHome = fixture.home_team_id === team?.id;
                const opponent = isHome ? fixture.away_team : fixture.home_team;
                const result = getResultBadge(fixture);
                
                return (
                  <div 
                    key={fixture.id}
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm ${result.color}`}>
                        {result.text}
                      </span>
                      <div>
                        <p className="text-white">
                          {isHome ? 'vs' : '@'} {opponent.city} {opponent.name} <span className="text-gray-500">({getLadderPosition(opponent.id)})</span>
                        </p>
                        <p className="text-gray-500 text-sm">Round {fixture.round}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">
                        {fixture.result && (
                          isHome 
                            ? `${fixture.result.home_score} - ${fixture.result.away_score}`
                            : `${fixture.result.away_score} - ${fixture.result.home_score}`
                        )}
                      </p>
                      <p className="text-gray-500 text-sm">{isHome ? 'Home' : 'Away'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Season Progress */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-white font-bold mb-3">Season Progress</h2>
          {(() => {
            // Count rounds where ALL fixtures are played
            const completedRounds = new Set<number>();
            const roundCounts: Record<number, { total: number; played: number }> = {};
            
            fixtures.forEach(f => {
              if (!roundCounts[f.round]) roundCounts[f.round] = { total: 0, played: 0 };
              roundCounts[f.round].total++;
              if (f.played) roundCounts[f.round].played++;
            });
            
            Object.entries(roundCounts).forEach(([round, counts]) => {
              if (counts.played === counts.total && counts.total > 0) {
                completedRounds.add(Number(round));
              }
            });
            
            const completed = completedRounds.size;
            
            return (
              <>
                <div className="w-full bg-gray-700 rounded-full h-4">
                  <div 
                    className="bg-green-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${(completed / 18) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>Round 1</span>
                  <span>{completed} of 18 rounds completed</span>
                  <span>Finals</span>
                </div>
              </>
            );
          })()}
        </div>

      </div>
    </div>
  );
}