/**
 * MaintenanceBanner - Blocks UI during cron processing
 * 
 * Shows a full-screen overlay when game_state.maintenance = true
 */

'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';

export default function MaintenanceBanner() {
  const [maintenance, setMaintenance] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();

    // Initial check
    const checkMaintenance = async () => {
      const { data } = await supabase
        .from('game_state')
        .select('maintenance, current_phase')
        .eq('id', 1)
        .single();

      if (data) {
        setMaintenance(data.maintenance || false);
        setPhase(data.current_phase);
      }
    };

    checkMaintenance();

    // Poll every 10 seconds during maintenance window
    const interval = setInterval(checkMaintenance, 10000);

    return () => clearInterval(interval);
  }, []);

  if (!maintenance) return null;

  const phaseMessages: Record<string, string> = {
    matches: 'Simulating matches...',
    training: 'Processing training...',
    finances: 'Updating finances...',
    freeagents: 'Processing free agents...',
    cleanup: 'Finishing up...',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="text-center p-8 max-w-md">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold text-white mb-2">
          🏉 Match Day Processing
        </h2>
        <p className="text-gray-300 mb-4">
          {phase ? phaseMessages[phase] || 'Processing...' : 'Processing...'}
        </p>
        <p className="text-gray-500 text-sm">
          This usually takes 1-2 minutes. Hang tight!
        </p>
      </div>
    </div>
  );
}