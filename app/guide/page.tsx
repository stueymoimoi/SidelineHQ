'use client';

import { useState } from 'react';
import Link from 'next/link';

type Section = 'overview' | 'stats' | 'tactics' | 'training' | 'youth' | 'freeagents' | 'rep' | 'schedule' | 'filmroom' | 'tips';

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState<Section>('overview');

  const sections: { id: Section; title: string; icon: string }[] = [
    { id: 'overview', title: 'Getting Started', icon: '🏉' },
    { id: 'schedule', title: 'Season Schedule', icon: '📅' },
    { id: 'stats', title: 'Player Stats', icon: '📊' },
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
                    <li><strong>Set Tactics</strong> — Pick your starting 13, bench, and game plan</li>
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
                      <p className="text-gray-400 text-sm m-0">Set lineup & game plan</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🎬 Film Room</p>
                      <p className="text-gray-400 text-sm m-0">Scout your opponent</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">💪 Training</p>
                      <p className="text-gray-400 text-sm m-0">Develop player stats</p>
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
                    Every player has 6 core stats that determine their ability on the field. Stats are rated on a tier system from 1 (lowest) to 8 (highest).
                  </p>

                  <h3 className="text-xl text-white mt-6">The Six Stats</h3>
                  <div className="space-y-3">
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">⚡ Speed</p>
                      <p className="text-gray-400 text-sm m-0">How fast the player moves. Essential for wingers, fullbacks, and outside backs.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">💪 Strength</p>
                      <p className="text-gray-400 text-sm m-0">Physical power for tackles and carries. Crucial for forwards.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🎯 Skill</p>
                      <p className="text-gray-400 text-sm m-0">Ball handling, passing, and general technique. Important for halves and hookers.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🫁 Stamina</p>
                      <p className="text-gray-400 text-sm m-0">Endurance and fitness. Affects performance over 80 minutes.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🛡️ Defense</p>
                      <p className="text-gray-400 text-sm m-0">Tackling ability and defensive positioning. Key for middles and edges.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🦶 Kicking</p>
                      <p className="text-gray-400 text-sm m-0">Kicking accuracy and distance. Vital for halves and fullbacks.</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Stat Tiers</h3>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-red-500/30 rounded p-2 text-center">
                      <p className="text-white font-bold m-0">1-2</p>
                      <p className="text-gray-400 text-xs m-0">Poor</p>
                    </div>
                    <div className="bg-orange-500/30 rounded p-2 text-center">
                      <p className="text-white font-bold m-0">3-4</p>
                      <p className="text-gray-400 text-xs m-0">Fair</p>
                    </div>
                    <div className="bg-yellow-500/30 rounded p-2 text-center">
                      <p className="text-white font-bold m-0">5-6</p>
                      <p className="text-gray-400 text-xs m-0">Good</p>
                    </div>
                    <div className="bg-green-500/30 rounded p-2 text-center">
                      <p className="text-white font-bold m-0">7-8</p>
                      <p className="text-gray-400 text-xs m-0">Elite</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Dominant Side</h3>
                  <p className="text-gray-300">
                    Edge players (Wingers, Centres, Second Rows) have a dominant side preference:
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-gray-700 rounded p-3 flex items-center gap-3">
                      <span className="bg-orange-500 text-white px-2 py-1 rounded font-bold">L</span>
                      <div>
                        <p className="text-white font-bold m-0">Left-Sided</p>
                        <p className="text-gray-400 text-sm m-0">Best on the left edge</p>
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex items-center gap-3">
                      <span className="bg-blue-500 text-white px-2 py-1 rounded font-bold">R</span>
                      <div>
                        <p className="text-white font-bold m-0">Right-Sided</p>
                        <p className="text-gray-400 text-sm m-0">Best on the right edge</p>
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex items-center gap-3">
                      <span className="bg-gray-500 text-white px-2 py-1 rounded font-bold">L/R</span>
                      <div>
                        <p className="text-white font-bold m-0">Versatile</p>
                        <p className="text-gray-400 text-sm m-0">Elite! Plays both sides equally</p>
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex items-center gap-3">
                      <span className="bg-yellow-500 text-white px-2 py-1 rounded font-bold">?</span>
                      <div>
                        <p className="text-white font-bold m-0">Developing</p>
                        <p className="text-gray-400 text-sm m-0">Side not yet determined</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 my-4">
                    <p className="text-yellow-400 m-0">
                      <strong>💡 Tip:</strong> Playing a left-sided player on the right edge (or vice versa) will hurt their performance! Versatile players are rare and valuable.
                    </p>
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

                  <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 my-4">
                    <p className="text-blue-400 m-0">
                      <strong>💾 Auto-Save:</strong> All changes save automatically — no save button needed!
                    </p>
                  </div>

                  <h3 className="text-xl text-white mt-6">Attack Styles</h3>
                  <div className="space-y-2">
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">📋 Structured</p>
                      <p className="text-gray-400 text-sm m-0">Balanced, safe approach. Run set plays.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">⬅️ Raid Left</p>
                      <p className="text-gray-400 text-sm m-0">Target the left edge with your outside backs. Counters Shift Right defense.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">💪 Up the Guts</p>
                      <p className="text-gray-400 text-sm m-0">Punch through the middle with your forwards. Best with strong Props & Lock.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">➡️ Raid Right</p>
                      <p className="text-gray-400 text-sm m-0">Target the right edge with your outside backs. Counters Shift Left defense.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🎲 Off the Cuff</p>
                      <p className="text-gray-400 text-sm m-0">High risk, high reward! Play on instinct. Can win big or backfire badly.</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Defense Styles</h3>
                  <div className="space-y-2">
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🏃 Line Speed</p>
                      <p className="text-gray-400 text-sm m-0">Rush up and pressure the ball carrier.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🛡️ Shift Left</p>
                      <p className="text-gray-400 text-sm m-0">Overload left side coverage. Counters Raid Left attacks.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🧱 Brick Wall</p>
                      <p className="text-gray-400 text-sm m-0">Stack the middle. Stops Up the Guts, but leaves edges exposed.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🛡️ Shift Right</p>
                      <p className="text-gray-400 text-sm m-0">Overload right side coverage. Counters Raid Right attacks.</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Tactical Matchups</h3>
                  <div className="bg-gray-700 rounded p-4">
                    <p className="text-gray-300 mb-2">Counter your opponent's tactics for an advantage:</p>
                    <ul className="text-gray-300 space-y-1 text-sm">
                      <li>• <strong>Raid Left</strong> beats <strong>Shift Right</strong></li>
                      <li>• <strong>Raid Right</strong> beats <strong>Shift Left</strong></li>
                      <li>• <strong>Up the Guts</strong> struggles vs <strong>Brick Wall</strong></li>
                      <li>• <strong>Edge raids</strong> work well vs <strong>Brick Wall</strong></li>
                      <li>• <strong>Line Speed</strong> can force errors from <strong>Off the Cuff</strong></li>
                    </ul>
                  </div>

                  <h3 className="text-xl text-white mt-6">Goal Kicker</h3>
                  <p className="text-gray-300">
                    Choosing the right goal kicker is crucial — conversions can win or lose tight games!
                  </p>
                  
                  <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 my-4">
                    <p className="text-blue-400 m-0">
                      <strong>💡 Tip:</strong> Some players have hidden goal kicking talent! Try different players as kickers throughout the season — you might find a gem you didn't expect.
                    </p>
                  </div>

                  <h3 className="text-xl text-white mt-6">Position Indicators</h3>
                  <div className="flex flex-wrap gap-4 mt-3">
                    <span className="text-green-400">● Natural Position</span>
                    <span className="text-orange-400">● Wrong Side</span>
                    <span className="text-red-400">● Wrong Position</span>
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
                    The Film Room lets you scout your next opponent before the match. Knowledge is power!
                  </p>

                  <h3 className="text-xl text-white mt-6">What You Can See</h3>
                  <div className="space-y-3">
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">📈 Recent Form</p>
                      <p className="text-gray-400 text-sm m-0">Their last 5 match results with scores</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">⚔️ Attack Tendency</p>
                      <p className="text-gray-400 text-sm m-0">A hint at their preferred attacking style (not exact tactic)</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🤝 Head to Head</p>
                      <p className="text-gray-400 text-sm m-0">Previous meetings this season</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">⚠️ Key Threats</p>
                      <p className="text-gray-400 text-sm m-0">Their top 3 players to watch out for</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">👥 Their Squad</p>
                      <p className="text-gray-400 text-sm m-0">Top 17 players with positions, age, overall, and dominant side</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">What Stays Hidden</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>❌ Exact defense tactic selection</li>
                    <li>❌ Player fatigue levels</li>
                    <li>❌ Their training assignments</li>
                  </ul>

                  <h3 className="text-xl text-white mt-6">Scout's Advice</h3>
                  <p className="text-gray-300">
                    The Film Room provides tactical recommendations based on what you learn:
                  </p>
                  <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 my-4">
                    <p className="text-yellow-400 m-0">
                      <strong>Example:</strong> "They like the left edge — consider <strong>Shift Left</strong> defense to shut it down"
                    </p>
                  </div>

                  <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 my-4">
                    <p className="text-green-400 m-0">
                      <strong>💡 Pro Move:</strong> Check the dominant side of their edge players. If their star centre is left-sided, you know where they'll attack!
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
                    Training is how you develop and improve your players over time. Assign players to specific training programs to boost their stats.
                  </p>

                  <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 my-4">
                    <p className="text-blue-400 m-0">
                      <strong>💾 Auto-Save:</strong> Training assignments save automatically when you make changes!
                    </p>
                  </div>

                  <h3 className="text-xl text-white mt-6">How Training Works</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>Each player can be assigned to one training focus at a time</li>
                    <li>Training takes effect between matches</li>
                    <li>Players improve the stat they're training over time</li>
                    <li>Younger players tend to develop faster</li>
                  </ul>

                  <h3 className="text-xl text-white mt-6">Training Programs</h3>
                  <div className="space-y-2">
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">⚡ Speed Training</span>
                      <span className="text-gray-400 text-sm">Improves Speed stat</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">💪 Gym Work</span>
                      <span className="text-gray-400 text-sm">Improves Strength stat</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">🎯 Skills Session</span>
                      <span className="text-gray-400 text-sm">Improves Skill stat</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">🫁 Cardio</span>
                      <span className="text-gray-400 text-sm">Improves Stamina stat</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">🛡️ Defense Drills</span>
                      <span className="text-gray-400 text-sm">Improves Defense stat</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">🦶 Kicking Practice</span>
                      <span className="text-gray-400 text-sm">Improves Kicking stat</span>
                    </div>
                  </div>

                  <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 my-4">
                    <p className="text-yellow-400 m-0">
                      <strong>💡 Strategy:</strong> Focus training on stats that matter most for each player's position. There's no point training a prop's kicking when their strength and defense matter far more!
                    </p>
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
                    Your Development Squad is where future stars emerge. Promote youth players to your senior squad to build for the future.
                  </p>

                  <h3 className="text-xl text-white mt-6">How It Works</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>Youth players are generated from your academy system</li>
                    <li>You can promote one player at a time from each position group</li>
                    <li>Youth players start at age 18</li>
                    <li>There's a cooldown period between promotions</li>
                  </ul>

                  <h3 className="text-xl text-white mt-6">Position Groups</h3>
                  <div className="space-y-2">
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🏋️ Forwards</p>
                      <p className="text-gray-400 text-sm m-0">Props, Second Rows, Locks</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🏃 Backs</p>
                      <p className="text-gray-400 text-sm m-0">Fullbacks, Wingers, Centres</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🧠 Spine</p>
                      <p className="text-gray-400 text-sm m-0">Halfbacks, Five-Eighths, Hookers</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Patience Bonus</h3>
                  <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 my-4">
                    <p className="text-green-400 m-0">
                      <strong>🍀 The longer you wait between promotions, the better your chances of finding a high-quality player!</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Free Agents */}
              {activeSection === 'freeagents' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    🏪 Free Agents
                  </h2>

                  <p className="text-gray-300">
                    Free Agents are players without a team. This is your chance to pick up bargains!
                  </p>

                  <h3 className="text-xl text-white mt-6">Finding Free Agents</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>Browse available players on the Free Agents page</li>
                    <li>Filter by position to find what you need</li>
                    <li>Check their stats, age, and dominant side before signing</li>
                    <li>Experienced veterans can provide immediate impact</li>
                  </ul>

                  <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 my-4">
                    <p className="text-yellow-400 m-0">
                      <strong>💡 Tip:</strong> Free agents can be hidden gems. Just because a player was released doesn't mean they're bad — they might be exactly what another team needs!
                    </p>
                  </div>
                </div>
              )}

              {/* Rep Honours */}
              {activeSection === 'rep' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    🏅 Rep Honours
                  </h2>

                  <p className="text-gray-300">
                    The Rep Honours page shows which players have been selected for representative teams.
                  </p>

                  <h3 className="text-xl text-white mt-6">State of Origin</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-sky-500/30 rounded p-3 text-center">
                      <p className="text-white font-bold m-0">NSW Blues</p>
                      <p className="text-gray-300 text-sm m-0">New South Wales</p>
                    </div>
                    <div className="bg-red-800/50 rounded p-3 text-center">
                      <p className="text-white font-bold m-0">QLD Maroons</p>
                      <p className="text-gray-300 text-sm m-0">Queensland</p>
                    </div>
                  </div>

                  <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 my-4">
                    <p className="text-yellow-400 m-0">
                      <strong>Origin Trade-off:</strong> Players selected for Origin earn prestige, but return to their clubs more fatigued. Players NOT selected get a rest week fitness boost!
                    </p>
                  </div>

                  <h3 className="text-xl text-white mt-6">Man of the Match</h3>
                  <p className="text-gray-300">
                    After each match, one player is awarded Man of the Match based on their performance. This is shown in match notifications and tracked in player history.
                  </p>
                </div>
              )}

              {/* Pro Tips */}
              {activeSection === 'tips' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    💡 Pro Tips
                  </h2>

                  <p className="text-gray-300">
                    Advanced strategies to help you get ahead...
                  </p>

                  <div className="space-y-4 mt-6">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">🎬 Scout Before Every Match</h4>
                      <p className="text-gray-400 m-0">
                        Use the Film Room to learn your opponent's attack tendency, then set your defense to counter it. A well-prepared team wins more often!
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">↔️ Match Dominant Sides</h4>
                      <p className="text-gray-400 m-0">
                        Always play left-sided players on the left edge and right-sided players on the right. Versatile (L/R) players are rare and valuable — they can play anywhere without penalty.
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">🎲 Off the Cuff — Use Sparingly</h4>
                      <p className="text-gray-400 m-0">
                        The Off the Cuff attack style is high risk/high reward. It can blow games open, but it can also backfire badly. Best used when you have nothing to lose!
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">🎯 Position Fit Matters</h4>
                      <p className="text-gray-400 m-0">
                        A 35 OVR player in their natural position can outperform a 40 OVR player playing out of position. Always consider position fit!
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">👶 Invest in Youth</h4>
                      <p className="text-gray-400 m-0">
                        Young players (18-23) have more room to grow. A 25 OVR 18-year-old might become a 40 OVR star by age 26.
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">🎯 Test Your Goal Kickers</h4>
                      <p className="text-gray-400 m-0">
                        You won't know who your best kicker is until you try them! Test different players throughout the season.
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">🏆 Origin Strategy</h4>
                      <p className="text-gray-400 m-0">
                        Having players make Origin is prestigious, but they return tired. Plan your lineup around Origin weekends — your non-Origin players will be extra fresh!
                      </p>
                    </div>
                  </div>

                  <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mt-6">
                    <p className="text-green-400 m-0">
                      <strong>Most importantly:</strong> Have fun! Experiment with different strategies, take risks on unknown players, and build your legacy. Good luck, Coach! 🏆
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