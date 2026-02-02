'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const supabase = createBrowserClient();

const ADMIN_USER_ID = 'b0c4c970-ac17-4be8-9b35-68d321a166ad';

interface Team {
  id: string;
  name: string;
  city: string;
  mascot: string;
  primary_color: string;
  secondary_color: string;
  division: number;
  overall?: number;
}

export default function ChooseTeamPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [takenTeamIds, setTakenTeamIds] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .eq('division', 1)
        .order('name');

      const { data: coaches } = await supabase
        .from('coaches')
        .select('team_id')
        .not('team_id', 'is', null);

      const taken = coaches?.map(c => c.team_id) || [];
      
      // Calculate avg OVR for each team
      const teamsWithOvr = await Promise.all(
        (teamsData || []).map(async (team) => {
          const { data: players } = await supabase
            .from('players')
            .select('overall')
            .eq('team_id', team.id)
            .order('overall', { ascending: false })
            .limit(13);
          
          const avgOvr = players && players.length > 0
            ? Math.round(players.reduce((sum, p) => sum + p.overall, 0) / players.length)
            : 0;
          
          return { ...team, overall: avgOvr };
        })
      );

      setTeams(teamsWithOvr);
      setTakenTeamIds(taken);
    } catch (err) {
      console.error('Error loading teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTeam = (team: Team) => {
    if (takenTeamIds.includes(team.id)) return;
    setSelectedTeam(team);
    setShowNameInput(true);
  };

  const handleNameSubmit = () => {
    if (!firstName.trim()) {
      setError('Please enter your first name');
      return;
    }
    if (!lastName.trim()) {
      setError('Please enter your last name');
      return;
    }
    setError('');
    setShowNameInput(false);
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (!selectedTeam || !firstName.trim() || !lastName.trim()) return;
    setConfirming(true);
    setError('');

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      // Check if coach record already exists
      const { data: existingCoach } = await supabase
        .from('coaches')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingCoach) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('coaches')
          .update({ 
            team_id: selectedTeam.id,
            coach_name: fullName,
            approved: false
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        // Create new coach record
        const { error: insertError } = await supabase
          .from('coaches')
          .insert({
            user_id: user.id,
            team_id: selectedTeam.id,
            coach_name: fullName,
            approved: false,
            xp: 0,
            level: 1,
            last_academy_pull_round: 0
          });

        if (insertError) throw insertError;
      }

      // Link team to this user for RLS policies
      const { error: teamUpdateError } = await supabase
        .from('teams')
        .update({ current_manager_id: user.id })
        .eq('id', selectedTeam.id);

      if (teamUpdateError) {
        console.error('Failed to link team:', teamUpdateError);
      }

      // Create notification for admin
      const { data: adminCoach } = await supabase
        .from('coaches')
        .select('team_id')
        .eq('user_id', ADMIN_USER_ID)
        .single();

      if (adminCoach?.team_id) {
        await supabase.from('notifications').insert({
          team_id: adminCoach.team_id,
          type: 'new_signup',
          title: '🆕 New Signup',
          message: `${fullName} wants to join ${selectedTeam.name}`,
          read: false
        });
      }

      router.push('/pending');
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Something went wrong');
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading teams...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold text-green-500">🏉 Choose Your Team</h1>
        <p className="text-gray-400 mt-2">Select a Division 1 team to manage</p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => {
          const isTaken = takenTeamIds.includes(team.id);
          
          return (
            <div
              key={team.id}
              onClick={() => handleSelectTeam(team)}
              className={`rounded-lg p-6 border-2 transition cursor-pointer ${
                isTaken
                  ? 'bg-gray-800/50 border-gray-700 opacity-50 cursor-not-allowed'
                  : 'bg-gray-800 border-gray-700 hover:border-green-500'
              }`}
            >
              <div 
                className="h-2 rounded-full mb-4"
                style={{ 
                  background: `linear-gradient(to right, ${team.primary_color}, ${team.secondary_color})`
                }}
              />
              
              <h2 className="text-xl font-bold text-white">{team.name}</h2>
              <p className="text-gray-400">{team.city}</p>
              
              <div className="mt-4 flex items-center justify-between">
                <span className="text-gray-500">Avg OVR</span>
                <span className="bg-green-600 text-white px-3 py-1 rounded-full font-bold">
                  {team.overall}
                </span>
              </div>
              
              {isTaken && (
                <div className="mt-4 text-center text-red-400 font-semibold">
                  ❌ Already Managed
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Coach Name Input Modal */}
      {showNameInput && selectedTeam && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
            <div 
              className="h-3 rounded-full mb-6"
              style={{ 
                background: `linear-gradient(to right, ${selectedTeam.primary_color}, ${selectedTeam.secondary_color})`
              }}
            />
            
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              {selectedTeam.name}
            </h2>
            
            <p className="text-gray-400 text-center mb-6">
              {selectedTeam.city} • Division 1
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-400 text-sm mb-2">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowNameInput(false);
                  setSelectedTeam(null);
                  setFirstName('');
                  setLastName('');
                  setError('');
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleNameSubmit}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && selectedTeam && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
            <div 
              className="h-3 rounded-full mb-6"
              style={{ 
                background: `linear-gradient(to right, ${selectedTeam.primary_color}, ${selectedTeam.secondary_color})`
              }}
            />
            
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              Manage {selectedTeam.name}?
            </h2>
            
            <p className="text-gray-400 text-center mb-2">
              {selectedTeam.city} • Division 1 • OVR {selectedTeam.overall}
            </p>
            
            <p className="text-green-400 text-center mb-6">
              Coach: {firstName} {lastName}
            </p>

            <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-400 px-4 py-3 rounded mb-6">
              ⚠️ <strong>Note:</strong> An admin will need to approve your request before you can start managing.
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setShowNameInput(true);
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
              >
                {confirming ? 'Confirming...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
