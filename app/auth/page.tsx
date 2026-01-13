'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (inviteCode.toUpperCase() !== 'SIDELINEHQ26') {
      setError('Invalid invite code');
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        router.push('/choose-team');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      const { data: coach } = await supabase
        .from('coaches')
        .select('team_id, approved')
        .eq('user_id', data.user.id)
        .single();

      if (!coach) {
        router.push('/choose-team');
      } else if (!coach.team_id) {
        router.push('/choose-team');
      } else if (!coach.approved) {
        router.push('/pending');
      } else {
        router.push('/clubhouse');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-500">🏆 SidelineHQ</h1>
          <p className="text-gray-400 mt-2">Build Your Legacy</p>
        </div>

        <div className="flex mb-6 bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-2 rounded-md transition ${
              isSignUp ? 'bg-green-600 text-white' : 'text-gray-400'
            }`}
          >
            Sign Up
          </button>
          <button
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-2 rounded-md transition ${
              !isSignUp ? 'bg-green-600 text-white' : 'text-gray-400'
            }`}
          >
            Sign In
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={isSignUp ? handleSignUp : handleSignIn}>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
              placeholder="********"
              required
              minLength={6}
            />
          </div>

          {isSignUp && (
            <div className="mb-6">
              <label className="block text-gray-300 mb-2">Invite Code</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
                placeholder="Enter invite code"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p className="text-gray-500 text-center text-sm mt-6">
          Season 0 • Invite Only
        </p>
      </div>
    </div>
  );
}