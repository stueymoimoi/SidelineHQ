'use client';

import { useState } from 'react';
import Link from 'next/link';

type Section = 'overview' | 'stats' | 'tactics' | 'training' | 'youth' | 'freeagents' | 'rep' | 'schedule' | 'filmroom' | 'matchstats' | 'tips';

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState<Section>('overview');

  const sections: { id: Section; title: string; icon: string }[] = [
    { id: 'overview', title: 'Getting Started', icon: '🏉' },
    { id: 'schedule', title: 'Season Schedule', icon: '📅' },
    { id: 'stats', title: 'Player Stats', icon: '📊' },
    { id: 'matchstats', title: 'Match Stats', icon: '🏟️' },
    { id: 'tactics', title: 'Tactics & Lineup', icon: '📋' },
    { id: 'filmroom', title: 'Film Room', icon: '🎬' },
    { id: 'training', title: 'Training', icon: '💪' },
    { id: 'youth', title: 'Youth Development', icon: '🎓' },
    { id: 'freeagents', title: 'Free Agents', icon: '🏪' },
    { id: 'rep', title: 'Rep Honours', icon: '🏅' },
    { id: 'tips', title: 'Pro Tips', icon: '💡' },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 p-6">
        <div className="max-w-6xl mx-auto">
          <Link href="/clubhouse" className="text-white/70 hover:text-white mb-2 inline-block">
            ← Back to Clubhouse
          </Link>
          <h1 className="text-3xl font-bold text-white">📖 Coach Guide</h1>
          <p className="text-white/80">Everything you need to know about managing your team</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="flex flex-col md:flex-row gap-6">
          
          {/* Sidebar Navigation */}
          <div className="md:w-64 flex-shrink-0">
            <div className="bg-gray-800 rounded-lg p-4 sticky top-6">
              <h3 className="text-gray-400 text-sm font-bold mb-3">SECTIONS</h3>
              <div className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition ${
                      activeSection === section.id
                        ? 'bg-green-600 text-white'
                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <span className="mr-2">{section.icon}</span>
                    {section.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-gray-800 rounded-lg p-6">
              
              {/* Getting Started */}
              {activeSection === 'overview' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    🏉 Getting Started
                  </h2>
                  
                  <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 my-4">
                    <p className="text-green-400 m-0">
                      <strong>Welcome to SidelineHQ!</strong> You're now the head coach of a professional rugby league team. Your job is to manage your squad, set tactics, develop players, and lead your team to glory.
                    </p>
                  </div>

                  <h3 className="text-xl text-white mt-6">How the Season Works</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li><strong>18 Rounds</strong> of regular season matches</li>
                    <li><strong>3 State of Origin</strong> weekends (rest weeks for clubs)</li>
                    <li><strong>Matches simulate</strong> on Tuesdays, Thursdays, and Sundays at 6pm AEST</li>
                    <li><strong>Top 4 teams</strong> make the finals at the end of the season</li>
                  </ul>

                  <h3 className="text-xl text-white mt-6">Your Weekly Routine</h3>
                  <ol className="text-gray-300 space-y-2">
                    <li><strong>Check Fixtures</strong> — See who you're playing next</li>
                    <li><strong>Scout Opponent</strong> — Use the Film Room to study them</li>
                    <li><strong>Set Tactics</strong> — Pick your starting 13, bench, captain, and game plan</li>
                    <li><strong>Assign Training</strong> — Develop your players between matches</li>
                    <li><strong>Watch Results</strong> — See how your team performs</li>
                  </ol>

                  <h3 className="text-xl text-white mt-6">Key Pages</h3>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">👥 Squad</p>
                      <p className="text-gray-400 text-sm m-0">View all your players</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">📋 Tactics</p>
                      <p className="text-gray-400 text-sm m-0">Set lineup, captain & game plan</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🎬 Film Room</p>
                      <p className="text-gray-400 text-sm m-0">Scout your opponent</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">💪 Training</p>
                      <p className="text-gray-400 text-sm m-0">Develop player stats</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">📊 Leaderboards</p>
                      <p className="text-gray-400 text-sm m-0">Top performers in your division</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">📅 Fixtures</p>
                      <p className="text-gray-400 text-sm m-0">Match schedule & results</p>
                    </div>
                  </div>

                  <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 my-4">
                    <p className="text-blue-400 m-0">
                      <strong>💾 Auto-Save:</strong> All your changes to Tactics and Training are saved automatically — no need to click a save button!
                    </p>
                  </div>
                </div>
              )}

              {/* Season Schedule */}
              {activeSection === 'schedule' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    📅 Season Schedule
                  </h2>

                  <p className="text-gray-300">
                    Each season consists of 18 regular season rounds, 3 State of Origin weekends, and finals for the top 4 teams.
                  </p>

                  <h3 className="text-xl text-white mt-6">Match Days</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-700 rounded p-3 text-center">
                      <p className="text-white font-bold m-0">Tuesday</p>
                      <p className="text-gray-400 text-sm m-0">6pm AEST</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3 text-center">
                      <p className="text-white font-bold m-0">Thursday</p>
                      <p className="text-gray-400 text-sm m-0">6pm AEST</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3 text-center">
                      <p className="text-white font-bold m-0">Sunday</p>
                      <p className="text-gray-400 text-sm m-0">6pm AEST</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Season 0 Structure</h3>
                  <div className="bg-gray-700 rounded p-4 space-y-2">
                    <div className="flex justify-between text-gray-300">
                      <span>Rounds 1-5</span>
                      <span className="text-white">Jan 13 - Jan 22</span>
                    </div>
                    <div className="flex justify-between text-yellow-400 font-bold">
                      <span>🏆 STATE OF ORIGIN 1</span>
                      <span>Sun Jan 25</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Rounds 6-10</span>
                      <span className="text-white">Jan 27 - Feb 5</span>
                    </div>
                    <div className="flex justify-between text-yellow-400 font-bold">
                      <span>🏆 STATE OF ORIGIN 2</span>
                      <span>Sun Feb 8</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Rounds 11-15</span>
                      <span className="text-white">Feb 10 - Feb 19</span>
                    </div>
                    <div className="flex justify-between text-yellow-400 font-bold">
                      <span>🏆 STATE OF ORIGIN 3 (Decider)</span>
                      <span>Sun Feb 22</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Rounds 16-18</span>
                      <span className="text-white">Feb 24 - Mar 1</span>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Finals</h3>
                  <div className="bg-gray-700 rounded p-4 space-y-2">
                    <div className="flex justify-between text-gray-300">
                      <span>Semi Finals (1st v 4th, 2nd v 3rd)</span>
                      <span className="text-white">Tue Mar 3</span>
                    </div>
                    <div className="flex justify-between text-green-400 font-bold">
                      <span>🏆 GRAND FINAL</span>
                      <span>Thu Mar 5</span>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">State of Origin Weekends</h3>
                  <p className="text-gray-300">
                    On Origin weekends, there are no club matches. Instead:
                  </p>
                  <ul className="text-gray-300 space-y-2">
                    <li><strong>Players NOT in Origin</strong> — Get a fitness boost (rest week benefit)</li>
                    <li><strong>Players IN Origin</strong> — Return more fatigued (but earn rep honours!)</li>
                  </ul>
                </div>
              )}

              {/* Player Stats */}
              {activeSection === 'stats' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    📊 Player Stats
                  </h2>

                  <p className="text-gray-300">
                    Every player has 7 core stats that determine their ability on the field. Stats are displayed as tier labels from NONE (lowest) to LEGEND (highest).
                  </p>

                  <h3 className="text-xl text-white mt-6">The Seven Stats</h3>
                  <div className="space-y-3">
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">⚡ Speed</p>
                      <p className="text-gray-400 text-sm m-0">How fast the player moves. Essential for wingers, fullbacks, and outside backs. Affects metres gained and line breaks.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">💪 Strength</p>
                      <p className="text-gray-400 text-sm m-0">Physical power for tackles and carries. Crucial for forwards. Helps with tackle breaks.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">💥 Power</p>
                      <p className="text-gray-400 text-sm m-0">Ability to break tackles and bust the line. Key for try-scoring, making metres, and tackle breaks. Props and Centres need this!</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🎯 Passing</p>
                      <p className="text-gray-400 text-sm m-0">Ball handling, passing accuracy, and technique. Low Passing = more errors! Important for halves and hookers. Affects try assists.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🫁 Stamina</p>
                      <p className="text-gray-400 text-sm m-0">Endurance and fitness. Affects performance over 80 minutes and tackle count.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🛡️ Tackling</p>
                      <p className="text-gray-400 text-sm m-0">Defensive ability and technique. Low Tackling = more missed tackles! Key for middles and edges.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🦶 Kicking</p>
                      <p className="text-gray-400 text-sm m-0">Kicking accuracy and distance. Vital for halves, fullbacks, and your goal kicker.</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Stat Tier Labels</h3>
                  <p className="text-gray-300">
                    Stats are shown as descriptive labels, not numbers:
                  </p>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    <div className="bg-red-500/30 rounded p-2 text-center">
                      <p className="text-red-400 font-bold m-0">NONE</p>
                    </div>
                    <div className="bg-orange-600/30 rounded p-2 text-center">
                      <p className="text-orange-400 font-bold m-0">POOR</p>
                    </div>
                    <div className="bg-orange-500/30 rounded p-2 text-center">
                      <p className="text-orange-300 font-bold m-0">OK</p>
                    </div>
                    <div className="bg-yellow-500/30 rounded p-2 text-center">
                      <p className="text-yellow-400 font-bold m-0">GOOD</p>
                    </div>
                    <div className="bg-lime-500/30 rounded p-2 text-center">
                      <p className="text-lime-400 font-bold m-0">GREAT</p>
                    </div>
                    <div className="bg-green-500/30 rounded p-2 text-center">
                      <p className="text-green-400 font-bold m-0">EXCELLENT</p>
                    </div>
                    <div className="bg-cyan-500/30 rounded p-2 text-center">
                      <p className="text-cyan-400 font-bold m-0">ELITE</p>
                    </div>
                    <div className="bg-yellow-500/30 border border-yellow-500/50 rounded p-2 text-center">
                      <p className="text-yellow-400 font-bold m-0">LEGEND</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Overall Rating (OVR)</h3>
                  <p className="text-gray-300">
                    A player's OVR is the sum of all 7 stat tiers (range: 7-56). Higher OVR = better player overall.
                  </p>
                </div>
              )}

              {/* Match Stats */}
              {activeSection === 'matchstats' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    🏟️ Match Stats
                  </h2>

                  <p className="text-gray-300">
                    After each match, detailed statistics are recorded for every player. Click on any completed fixture to view the Match Centre.
                  </p>

                  <h3 className="text-xl text-white mt-6">Key Match Statistics</h3>
                  <div className="space-y-3">
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🏉 Tries (T)</p>
                      <p className="text-gray-400 text-sm m-0">Tries scored. 4 points each.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-blue-400 font-bold m-0">🤝 Try Assists (TA)</p>
                      <p className="text-gray-400 text-sm m-0">Passes that led directly to tries.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-purple-400 font-bold m-0">💥 Line Breaks (LB)</p>
                      <p className="text-gray-400 text-sm m-0">Breaking through the defensive line. Based on Speed + Power.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-orange-400 font-bold m-0">💪 Tackle Breaks (TB)</p>
                      <p className="text-gray-400 text-sm m-0">Busting out of tackles. Based on Power + Strength.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🏃 Metres (Mtrs)</p>
                      <p className="text-gray-400 text-sm m-0">Total metres gained. Backs aim for 150+, forwards 180+.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🛡️ Tackles (Tkls)</p>
                      <p className="text-gray-400 text-sm m-0">Successful tackles made.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tactics */}
              {activeSection === 'tactics' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    📋 Tactics & Lineup
                  </h2>

                  <p className="text-gray-300">
                    Your tactics page is where you set your starting 13, bench, captain, goal kicker, and game plan.
                  </p>

                  <h3 className="text-xl text-white mt-6">Captain</h3>
                  <div className="bg-gray-700 rounded p-3">
                    <p className="text-white font-bold m-0">👑 Team Captain</p>
                    <p className="text-gray-400 text-sm m-0">Captains get a small boost to their match rating and a slight edge in MOTM voting.</p>
                  </div>

                  <h3 className="text-xl text-white mt-6">Attack Styles</h3>
                  <div className="space-y-2">
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">📋 Structured</p>
                      <p className="text-gray-400 text-sm m-0">Balanced, safe approach.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">⬅️ Raid Left / ➡️ Raid Right</p>
                      <p className="text-gray-400 text-sm m-0">Target the edge with your outside backs.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">💪 Up the Guts</p>
                      <p className="text-gray-400 text-sm m-0">Punch through the middle with your forwards.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🎲 Off the Cuff</p>
                      <p className="text-gray-400 text-sm m-0">High risk, high reward!</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Film Room */}
              {activeSection === 'filmroom' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    🎬 Film Room
                  </h2>

                  <p className="text-gray-300">
                    The Film Room lets you scout your next opponent. You can see their recent form, attack tendency, key threats, and squad.
                  </p>

                  <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 my-4">
                    <p className="text-green-400 m-0">
                      <strong>💡 Pro Move:</strong> Check their attack tendency and set your defense to counter it!
                    </p>
                  </div>
                </div>
              )}

              {/* Training */}
              {activeSection === 'training' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    💪 Training
                  </h2>

                  <p className="text-gray-300">
                    Training develops your players over time. Assign each player to train a specific stat or Rest to reduce fatigue.
                  </p>

                  <h3 className="text-xl text-white mt-6">Training Programs</h3>
                  <div className="space-y-2">
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">😴 Rest</span>
                      <span className="text-gray-400 text-sm">Reduces fatigue significantly</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">⚡ Speed / 💪 Strength / 💥 Power</span>
                      <span className="text-gray-400 text-sm">Physical attributes</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">🎯 Passing / 🫁 Stamina / 🛡️ Tackling / 🦶 Kicking</span>
                      <span className="text-gray-400 text-sm">Technical skills</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Youth Development */}
              {activeSection === 'youth' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    🎓 Youth Development
                  </h2>

                  <p className="text-gray-300">
                    Your Development Academy produces young talent. Promote youth players to your senior squad once every 6 matchdays.
                  </p>

                  <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 my-4">
                    <p className="text-green-400 m-0">
                      <strong>🍀 Patience Bonus:</strong> The longer you wait between promotions, the better your chances of finding a high-quality player!
                    </p>
                  </div>

                  <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 my-4">
                    <p className="text-yellow-400 m-0">
                      <strong>⚠️ Squad Limit:</strong> You cannot promote from the Academy if your squad is at 25 players. Release a player first!
                    </p>
                  </div>
                </div>
              )}

              {/* FREE AGENTS - UPDATED SECTION */}
              {activeSection === 'freeagents' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    🏪 Free Agents
                  </h2>

                  <p className="text-gray-300">
                    The Free Agent market lets you release players from your squad and sign players released by other teams. All 100 teams across 10 divisions share the same free agent pool!
                  </p>

                  <h3 className="text-xl text-white mt-6">Releasing Players</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>Go to <strong>Squad</strong> → Click on a player → <strong>"Release Player"</strong></li>
                    <li>You cannot release if your squad would drop below <strong>17 players</strong></li>
                    <li>Released players become available to ALL teams the following round</li>
                    <li>You'll receive a notification when your former player signs elsewhere</li>
                  </ul>

                  <h3 className="text-xl text-white mt-6">Claiming Free Agents</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>Browse available players on the <strong>Free Agents</strong> page</li>
                    <li>You can have up to <strong>3 pending claims</strong> at a time</li>
                    <li>You cannot claim if your squad is at <strong>25 players</strong> (unless you nominate someone to release)</li>
                    <li>Claims are processed during game updates (Tue/Thu/Sun 6pm AEST)</li>
                  </ul>

                  <h3 className="text-xl text-white mt-6">How Players Choose Teams</h3>
                  <p className="text-gray-300">
                    When multiple teams claim the same player, the player "chooses" based on their personality:
                  </p>
                  
                  <div className="space-y-3 mt-3">
                    <div className="bg-purple-500/20 border border-purple-500 rounded p-3">
                      <p className="text-purple-400 font-bold m-0">⭐ Ambitious Stars (43+ OVR)</p>
                      <p className="text-gray-400 text-sm m-0">Prefer higher divisions and winning teams. May still join lower divisions for long-term potential.</p>
                    </div>
                    <div className="bg-green-500/20 border border-green-500 rounded p-3">
                      <p className="text-green-400 font-bold m-0">👶 Young Prospects (Age ≤21)</p>
                      <p className="text-gray-400 text-sm m-0">Want game time and development. Care less about division prestige — prefer smaller squads and teams that need their position.</p>
                    </div>
                    <div className="bg-orange-500/20 border border-orange-500 rounded p-3">
                      <p className="text-orange-400 font-bold m-0">🧳 Journeymen (Age 22-29)</p>
                      <p className="text-gray-400 text-sm m-0">Happy for any opportunity. Balanced consideration of all factors.</p>
                    </div>
                    <div className="bg-gray-500/20 border border-gray-500 rounded p-3">
                      <p className="text-gray-400 font-bold m-0">👴 Veterans (Age 30+)</p>
                      <p className="text-gray-400 text-sm m-0">Grateful for any interest. Care much less about prestige — just want to keep playing.</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">What Affects Your Chances</h3>
                  <div className="bg-gray-700 rounded p-4 space-y-2">
                    <div className="flex justify-between text-gray-300">
                      <span>Higher Division</span>
                      <span className="text-green-400">More attractive</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Better Ladder Position</span>
                      <span className="text-green-400">More attractive</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Smaller Squad Size</span>
                      <span className="text-green-400">More game time</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Need Their Position</span>
                      <span className="text-green-400">Higher priority</span>
                    </div>
                  </div>

                  <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 my-4">
                    <p className="text-blue-400 m-0">
                      <strong>💡 Tip:</strong> Lower division teams can still attract young prospects who want game time! A Division 8 team with a small squad might beat a Division 2 team for a 20-year-old talent.
                    </p>
                  </div>

                  <h3 className="text-xl text-white mt-6">Notifications</h3>
                  <p className="text-gray-300">
                    After claims are processed, you'll receive notifications:
                  </p>
                  <ul className="text-gray-300 space-y-2">
                    <li>🎉 <strong>"Free Agent Signed!"</strong> — You won the claim</li>
                    <li>😢 <strong>"Claim Unsuccessful"</strong> — Someone else got them (with reason)</li>
                    <li>📋 <strong>"Former Player Update"</strong> — Your released player signed elsewhere</li>
                  </ul>
                </div>
              )}

              {/* Rep Honours */}
              {activeSection === 'rep' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    🏅 Rep Honours
                  </h2>

                  <p className="text-gray-300">
                    The Rep Honours page shows which players have been selected for representative teams like State of Origin.
                  </p>

                  <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 my-4">
                    <p className="text-yellow-400 m-0">
                      <strong>Origin Trade-off:</strong> Players selected for Origin earn prestige, but return to their clubs more fatigued.
                    </p>
                  </div>
                </div>
              )}

              {/* Pro Tips */}
              {activeSection === 'tips' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    💡 Pro Tips
                  </h2>

                  <div className="space-y-4 mt-6">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">📊 Read Your Match Stats</h4>
                      <p className="text-gray-400 m-0">
                        High missed tackles? Train Tackling. Lots of errors? Train Passing.
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">🏪 Work the Free Agent Market</h4>
                      <p className="text-gray-400 m-0">
                        Lower division teams can attract young players who want game time. Don't compete with Div 1 teams for stars — target prospects!
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">📋 Manage Your Squad Size</h4>
                      <p className="text-gray-400 m-0">
                        Keep your squad between 20-23 players. Too small = no depth. Too big = can't sign free agents or promote youth.
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">🎬 Scout Before Every Match</h4>
                      <p className="text-gray-400 m-0">
                        Use the Film Room to learn your opponent's attack tendency and counter it.
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">👶 Invest in Youth</h4>
                      <p className="text-gray-400 m-0">
                        Young players (18-23) have more room to grow. A 25 OVR 18-year-old might become a 40 OVR star by age 26.
                      </p>
                    </div>
                  </div>

                  <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mt-6">
                    <p className="text-green-400 m-0">
                      <strong>Most importantly:</strong> Have fun! Experiment with different strategies and build your legacy. Good luck, Coach! 🏆
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
