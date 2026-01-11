'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Coach {
  id: string;
  coach_name: string;
  user_id: string;
  team_id: string | null;
  approved: boolean;
  created_at: string;
}

interface Team {
  id: string;
  name: string;
  city: string;
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const router = useRouter();

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }

    // Check if current user is admin (Stuart's user_id)
    const ADMIN_USER_ID = 'b0c4c970-ac17-4be8-9b35-68d321a166ad';
    
    if (user.id !== ADMIN_USER_ID) {
      router.push('/clubhouse');
      return;
    }

    setIsAdmin(true);
    loadData();
  };

  const loadData = async () => {
    // Get all coaches
    const { data: coachesData } = await supabase
      .from('coaches')
      .select('*')
      .order('created_at', { ascending: false });

    setCoaches(coachesData || []);

    // Get all teams
    const { data: teamsData } = await supabase
      .from('teams')
      .select('*');

    const teamsMap: Record<string, Team> = {};
    teamsData?.forEach(t => { teamsMap[t.id] = t; });
    setTeams(teamsMap);

    setLoading(false);
  };

  const approveCoach = async (coachId: string) => {
    await supabase
      .from('coaches')
      .update({ approved: true })
      .eq('id', coachId);

    loadData();
  };

  const rejectCoach = async (coachId: string) => {
    // Delete the coach record
    await supabase
      .from('coaches')
      .delete()
      .eq('id', coachId);

    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const pendingCoaches = coaches.filter(c => !c.approved);
  const approvedCoaches = coaches.filter(c => c.approved);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">🔐 Admin Panel</h1>
          <button
            onClick={() => router.push('/clubhouse')}
            className="text-gray-400 hover:text-white"
          >
            ← Back to Clubhouse
          </button>
        </div>

        {/* Pending Approvals */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">
            ⏳ Pending Approvals ({pendingCoaches.length})
          </h2>
          
          {pendingCoaches.length === 0 ? (
            <p className="text-gray-500">No pending approvals</p>
          ) : (
            <div className="space-y-3">
              {pendingCoaches.map(coach => (
                <div key={coach.id} className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold">{coach.coach_name}</p>
                    <p className="text-gray-400 text-sm">
                      {coach.team_id ? `Wants: ${teams[coach.team_id]?.name || 'Unknown'}` : 'No team selected'}
                    </p>
                    <p className="text-gray-500 text-xs">
                      Signed up: {new Date(coach.created_at).toLocaleDateString('en-AU')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveCoach(coach.id)}
                      className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-bold transition"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => rejectCoach(coach.id)}
                      className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded font-bold transition"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approved Coaches */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            ✅ Approved Coaches ({approvedCoaches.length})
          </h2>
          
          {approvedCoaches.length === 0 ? (
            <p className="text-gray-500">No approved coaches yet</p>
          ) : (
            <div className="space-y-2">
              {approvedCoaches.map(coach => (
                <div key={coach.id} className="bg-gray-700 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{coach.coach_name}</p>
                    <p className="text-gray-400 text-sm">
                      {coach.team_id ? teams[coach.team_id]?.name || 'Unknown' : 'No team'}
                    </p>
                  </div>
                  <span className="text-green-400 text-sm">✓ Approved</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-bold text-white mb-4">⚡ Quick Actions</h2>
          <div className="flex gap-4">
            <button
              onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition"
            >
              Open Supabase
            </button>
            <button
              onClick={() => window.open('https://vercel.com/dashboard', '_blank')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition"
            >
              Open Vercel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
