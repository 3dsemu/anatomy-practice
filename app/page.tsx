'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SetCard from '@/components/SetCard';
import { getSets, deleteSet } from '@/lib/storage';
import { PracticeSet } from '@/types';

export default function HomePage() {
  const [sets, setSets] = useState<PracticeSet[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSets(getSets());
    setLoaded(true);
  }, []);

  const handleDelete = (id: string) => {
    deleteSet(id);
    setSets(getSets());
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Practice Sets</h1>
          <p className="text-slate-500 mt-1">
            {sets.length === 0
              ? 'No sets yet — create your first one!'
              : `${sets.length} set${sets.length !== 1 ? 's' : ''} ready to practice`}
          </p>
        </div>
        <Link
          href="/create"
          className="hidden sm:inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Set
        </Link>
      </div>

      {/* Empty state */}
      {sets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-slate-800 mb-2">No practice sets yet</h2>
          <p className="text-slate-500 max-w-md mb-8">
            Upload a labeled anatomy diagram, map each letter to its structure, and start practicing right away.
          </p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-md"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Your First Set
          </Link>

          {/* How it works */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl text-left">
            {[
              {
                step: '1',
                title: 'Upload a Diagram',
                desc: 'Add any labeled anatomy image — brain, heart, cell, etc.',
              },
              {
                step: '2',
                title: 'Map the Labels',
                desc: 'Tell the app what each letter (A, B, C…) represents.',
              },
              {
                step: '3',
                title: 'Practice & Test',
                desc: 'Use dropdowns to identify each label — get instant feedback.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {step}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{title}</h3>
                  <p className="text-slate-500 text-sm mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sets grid */}
      {sets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {sets.map((set) => (
            <SetCard key={set.id} set={set} onDelete={handleDelete} />
          ))}
          {/* Add new card */}
          <Link
            href="/create"
            className="bg-white rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center justify-center py-12 gap-3 text-slate-400 hover:text-blue-500 min-h-[260px]"
          >
            <div className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-sm font-medium">New Set</span>
          </Link>
        </div>
      )}
    </div>
  );
}
