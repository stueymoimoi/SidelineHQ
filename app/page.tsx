'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Team {
  id: string;
  name: string;
  city: string;
  mascot: string;
  state: string;
  division: number;
  overall_rating: number;
  colors: { primary: string; secondary: string };
}

export default function Home() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedDivision === null) {
      setFilteredTeams(teams);
    } else {
      setFilteredTeams(teams.filter(team => team.division === selectedDivision));
    }
  }, [selectedDivision, teams]);

  async function fetchTeams() {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('division', { ascending: true })
      .order('overall_rating', { ascending: false });

    if (error) {
      console.error('Error fetching teams:', error);
    } else {
      setTeams(data || []);
      setFilteredTeams(data || []);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading teams...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold text-center">
            <span className="text-green-500">Sideline</span>HQ
          </h1>
          <p className="text-gray-400 text-center mt-2">Choose your team. Build your legacy.</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          <button
            onClick={() => setSelectedDivision(null)}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              selectedDivision === null
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All Divisions
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(div => (
            <button
              key={div}
              onClick={() => setSelectedDivision(div)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                selectedDivision === div
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Div {div}
            </button>
          ))}
        </div>

        <p className="text-center text-gray-400 mb-6">
          Showing {filteredTeams.length} team{filteredTeams.length !== 1 ? 's' : ''}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTeams.map(team => (
            <div
              key={team.id}
              className="bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-green-500 transition cursor-pointer"
            >
              <div
                className="h-2"
                style={{ backgroundColor: team.colors?.primary || '#22c55e' }}
              />
              
              <div className="p-4">
                <h3 className="text-xl font-bold">{team.name}</h3>
                <p className="text-gray-400 text-sm">{team.city}, {team.state}</p>
                
                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-700 px-2 py-1 rounded text-white">
                      DIV {team.division}
                    </span>
                    <span
                      className="text-xs px-2 py-1 rounded font-bold text-white"
                      style={{
                        backgroundColor: team.colors?.primary || '#22c55e'
                      }}
                    >
                      {team.overall_rating} OVR
                    </span>
                  </div>
                  
                  <Link 
                    href={`/team/${team.id}`}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded transition"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}