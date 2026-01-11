'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PendingApprovalPage() {
  const [coachName, setCoachName] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkStatus();
    
    // Check every 30 seconds if approved
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }

    const { data: coach } = await supabase
      .from('coaches')
      .select('coach_name, approved')
      .eq('user_id', user.id)
      .single();

    if (!coach) {
      router.push('/auth');
      return;
    }

    setCoachName(coach.coach_name);

    // If approved, redirect to clubhouse
    if (coach.approved) {
      router.push('/clubhouse');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">⏳</div>
        <h1 className="text-2xl font-bold text-white mb-2">Pending Approval</h1>
        <p className="text-gray-400 mb-6">
          Hey {coachName}! Your registration is awaiting approval from the league commissioner.
        </p>
        <p className="text-gray-500 text-sm mb-6">
          This page will automatically update once you're approved. Check back soon!
        </p>
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <p className="text-gray-400 text-sm">
            🏉 <strong className="text-white">Season 0</strong> kicks off Tuesday 13th January at 6pm AEST
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="text-gray-500 hover:text-gray-300 text-sm"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
