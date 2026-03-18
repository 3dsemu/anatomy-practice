'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getGroups, getSets, shuffleArray } from '@/lib/storage';
import { Group, PracticeSet } from '@/types';

type Stage = 'setup' | 'testing' | 'results';

interface MockLabel {
  setId: string;
  setName: string;
  letter: string;
  answer: string;
  uniqueKey: string; // `${setId}::${letter}`
}

interface MockResult {
  score: number;
  total: number;
  bySet: Record<string, { setName: string; correct: number; total: number }>;
}

export default function MockTestPage() {
  const router = useRouter();

  const [groups, setGroups] = useState<Group[]>([]);
  const [sets, setSets] = useState<PracticeSet[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  // Test state
  const [stage, setStage] = useState<Stage>('setup');
  const [mockLabels, setMockLabels] = useState<MockLabel[]>([]);
  const [allOptions, setAllOptions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [mockResult, setMockResult] = useState<MockResult | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  useEffect(() => {
    const loadedGroups = getGroups();
    const loadedSets = getSets();
    setGroups(loadedGroups);
    setSets(loadedSets);
    setSelectedGroupIds(loadedGroups.map((g) => g.id)); // default: all selected
    setLoaded(true);
  }, []);

  const selectedGroups = useMemo(
    () => groups.filter((g) => selectedGroupIds.includes(g.id)),
    [groups, selectedGroupIds]
  );

  const selectedSets = useMemo(() => {
    const setIds = new Set(selectedGroups.flatMap((g) => g.setIds));
    // Preserve order: deduplicate while keeping first occurrence
    const seen = new Set<string>();
    return sets.filter((s) => {
      if (setIds.has(s.id) && !seen.has(s.id)) {
        seen.add(s.id);
        return true;
      }
      return false;
    });
  }, [selectedGroups, sets]);

  const totalLabels = useMemo(
    () => selectedSets.reduce((sum, s) => sum + s.labels.length, 0),
    [selectedSets]
  );

  const toggleGroup = (id: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedGroupIds(selectedGroupIds.length === groups.length ? [] : groups.map((g) => g.id));
  };

  const startTest = () => {
    if (selectedSets.length === 0) return;

    const labels: MockLabel[] = selectedSets.flatMap((set) =>
      set.labels.map((l) => ({
        setId: set.id,
        setName: set.name,
        letter: l.letter,
        answer: l.answer,
        uniqueKey: `${set.id}::${l.letter}`,
      }))
    );

    // All unique answers as dropdown options, shuffled
    const options = shuffleArray([
      ...new Set(selectedSets.flatMap((s) => s.labels.map((l) => l.answer))),
    ]);

    const init: Record<string, string> = {};
    labels.forEach((l) => (init[l.uniqueKey] = ''));

    setMockLabels(labels);
    setAllOptions(options);
    setAnswers(init);
    setMockResult(null);
    setActiveImageIdx(0);
    setStage('testing');
  };

  const allAnswered = useMemo(
    () => mockLabels.length > 0 && Object.values(answers).every((a) => a !== ''),
    [answers, mockLabels]
  );

  const handleSubmit = () => {
    // Calculate per-set breakdown
    const bySet: MockResult['bySet'] = {};
    let totalCorrect = 0;

    mockLabels.forEach((ml) => {
      if (!bySet[ml.setId]) bySet[ml.setId] = { setName: ml.setName, correct: 0, total: 0 };
      bySet[ml.setId].total++;
      const isCorrect =
        (answers[ml.uniqueKey] ?? '').trim().toLowerCase() === ml.answer.trim().toLowerCase();
      if (isCorrect) {
        bySet[ml.setId].correct++;
        totalCorrect++;
      }
    });

    setMockResult({ score: totalCorrect, total: mockLabels.length, bySet });
    setStage('results');
  };

  const handleRetry = () => {
    const init: Record<string, string> = {};
    mockLabels.forEach((l) => (init[l.uniqueKey] = ''));
    setAnswers(init);
    setMockResult(null);
    setActiveImageIdx(0);
    setStage('testing');
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // ─── SETUP ────────────────────────────────────────────────────────────────
  if (stage === 'setup') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Mock Test</h1>
          <p className="text-slate-500 mt-1">
            Combine sets from multiple groups into one comprehensive test
          </p>
        </div>

        {groups.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-slate-600 font-medium mb-1">No groups yet</p>
            <p className="text-slate-400 text-sm mb-5">
              Create groups and add your practice sets to them, then come back here for a mock test.
            </p>
            <button
              onClick={() => router.push('/groups')}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              Go to Groups
            </button>
          </div>
        ) : (
          <>
            {/* Group selection */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-slate-800">Select Groups</h2>
                <button
                  onClick={toggleAll}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  {selectedGroupIds.length === groups.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="space-y-2">
                {groups.map((group) => {
                  const groupSets = sets.filter((s) => group.setIds.includes(s.id));
                  const labelCount = groupSets.reduce((sum, s) => sum + s.labels.length, 0);
                  const isSelected = selectedGroupIds.includes(group.id);
                  return (
                    <label
                      key={group.id}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleGroup(group.id)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{group.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {groupSets.length} set{groupSets.length !== 1 ? 's' : ''} &middot;{' '}
                          {labelCount} label{labelCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Summary strip */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 grid grid-cols-3 divide-x divide-slate-200 text-center">
              <div className="px-4">
                <div className="text-2xl font-bold text-slate-900">{selectedGroupIds.length}</div>
                <div className="text-xs text-slate-500 mt-0.5">groups</div>
              </div>
              <div className="px-4">
                <div className="text-2xl font-bold text-slate-900">{selectedSets.length}</div>
                <div className="text-xs text-slate-500 mt-0.5">sets</div>
              </div>
              <div className="px-4">
                <div className="text-2xl font-bold text-slate-900">{totalLabels}</div>
                <div className="text-xs text-slate-500 mt-0.5">questions</div>
              </div>
            </div>

            <button
              onClick={startTest}
              disabled={selectedGroupIds.length === 0 || totalLabels === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start Mock Test ({totalLabels} questions)
            </button>
          </>
        )}
      </div>
    );
  }

  // ─── RESULTS ──────────────────────────────────────────────────────────────
  if (stage === 'results' && mockResult) {
    const pct = Math.round((mockResult.score / mockResult.total) * 100);

    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setStage('setup')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Mock Test Results</h1>
        </div>

        {/* Overall score */}
        <div
          className={`rounded-2xl p-6 text-center mb-6 ${
            pct === 100
              ? 'bg-green-50 border border-green-200'
              : pct >= 70
              ? 'bg-blue-50 border border-blue-200'
              : 'bg-orange-50 border border-orange-200'
          }`}
        >
          <div
            className={`text-5xl font-bold ${
              pct === 100 ? 'text-green-600' : pct >= 70 ? 'text-blue-600' : 'text-orange-600'
            }`}
          >
            {mockResult.score}/{mockResult.total}
          </div>
          <div
            className={`text-base font-medium mt-1.5 ${
              pct === 100 ? 'text-green-700' : pct >= 70 ? 'text-blue-700' : 'text-orange-700'
            }`}
          >
            {pct === 100 ? 'Perfect score!' : pct >= 70 ? 'Great job!' : 'Keep practicing!'} ({pct}%)
          </div>
        </div>

        {/* Per-set breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Breakdown by Set</h2>
          <div className="space-y-3">
            {selectedSets.map((set) => {
              const r = mockResult.bySet[set.id];
              if (!r) return null;
              const p = Math.round((r.correct / r.total) * 100);
              return (
                <div key={set.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{r.setName}</p>
                    <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          p === 100 ? 'bg-green-500' : p >= 70 ? 'bg-blue-500' : 'bg-orange-400'
                        }`}
                        style={{ width: `${p}%` }}
                      />
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold flex-shrink-0 ${
                      p === 100 ? 'text-green-600' : p >= 70 ? 'text-blue-600' : 'text-orange-600'
                    }`}
                  >
                    {r.correct}/{r.total}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Again
          </button>
          <button
            onClick={() => setStage('setup')}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition-colors"
          >
            Change Groups
          </button>
        </div>
      </div>
    );
  }

  // ─── TESTING ──────────────────────────────────────────────────────────────
  const answeredCount = Object.values(answers).filter((a) => a !== '').length;

  // Group labels by set for display
  const groupedLabels = selectedSets.map((set) => ({
    set,
    labels: mockLabels.filter((l) => l.setId === set.id),
  }));

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => {
            if (confirm('Exit mock test? Your progress will be lost.')) setStage('setup');
          }}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Mock Test</h1>
          <p className="text-slate-500 text-sm">
            {answeredCount} / {mockLabels.length} answered
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Image viewer */}
        <div className="lg:flex-1 flex flex-col gap-3">
          {/* Thumbnail strip */}
          {selectedSets.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {selectedSets.map((set, i) => (
                <button
                  key={set.id}
                  onClick={() => setActiveImageIdx(i)}
                  title={set.name}
                  className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                    activeImageIdx === i ? 'border-blue-500 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={set.image} alt={set.name} className="w-16 h-12 object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Active image */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1">
            <div className="p-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 truncate">
                {selectedSets[activeImageIdx]?.name}
              </span>
              {selectedSets.length > 1 && (
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <button
                    onClick={() => setActiveImageIdx((i) => Math.max(0, i - 1))}
                    disabled={activeImageIdx === 0}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  >
                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-xs text-slate-400">{activeImageIdx + 1}/{selectedSets.length}</span>
                  <button
                    onClick={() => setActiveImageIdx((i) => Math.min(selectedSets.length - 1, i + 1))}
                    disabled={activeImageIdx === selectedSets.length - 1}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  >
                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="image-container overflow-auto max-h-[65vh] flex items-start justify-center p-4 bg-slate-50">
              {selectedSets[activeImageIdx] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedSets[activeImageIdx].image}
                  alt={selectedSets[activeImageIdx].name}
                  className="max-w-full rounded-lg"
                  style={{ display: 'block' }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right: All questions */}
        <div className="lg:w-[420px] flex flex-col">
          <div
            className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden"
            style={{ maxHeight: '80vh' }}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <span className="text-sm font-medium text-slate-600">All Questions</span>
              <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                {mockLabels.length} labels
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {groupedLabels.map(({ set, labels: setLabels }, setIdx) => (
                <div key={set.id}>
                  {/* Set heading — click to switch image */}
                  <button
                    onClick={() => setActiveImageIdx(setIdx)}
                    className="flex items-center gap-2 mb-2.5 w-full text-left hover:opacity-80 transition-opacity group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={set.image}
                      alt={set.name}
                      className="w-9 h-7 object-cover rounded border border-slate-200 group-hover:border-blue-300 transition-colors"
                    />
                    <span
                      className={`text-xs font-semibold uppercase tracking-wide ${
                        activeImageIdx === setIdx ? 'text-blue-600' : 'text-slate-500'
                      }`}
                    >
                      {set.name}
                    </span>
                  </button>

                  <div className="space-y-2">
                    {setLabels.map((ml) => (
                      <div
                        key={ml.uniqueKey}
                        className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50"
                      >
                        <div className="flex-shrink-0 w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                          {ml.letter}
                        </div>
                        <select
                          value={answers[ml.uniqueKey] ?? ''}
                          onChange={(e) =>
                            setAnswers((prev) => ({ ...prev, [ml.uniqueKey]: e.target.value }))
                          }
                          className="flex-1 text-sm border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-0"
                        >
                          <option value="">Select answer…</option>
                          {allOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 flex-shrink-0">
              <button
                onClick={handleSubmit}
                disabled={!allAnswered}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {allAnswered
                  ? 'Submit Mock Test'
                  : `${answeredCount} / ${mockLabels.length} answered`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
