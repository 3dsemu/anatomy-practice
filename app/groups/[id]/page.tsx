'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getGroup, getSets, getImage, shuffleArray } from '@/lib/storage';
import { Group, Label, PracticeSet, TestAnswer, TestResult } from '@/types';

type Stage = 'start' | 'testing' | 'summary';
type TestMode = 'study' | 'test';
type SetOrder = 'inOrder' | 'shuffled';

interface SetResult {
  setId: string;
  setName: string;
  score: number;
  total: number;
}

export default function GroupPracticePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [sets, setSets] = useState<PracticeSet[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Image URL for the currently active set in the testing stage.
  const [currentImageUrl, setCurrentImageUrl] = useState('');

  // Session state
  const [stage, setStage] = useState<Stage>('start');
  const [order, setOrder] = useState<SetOrder>('inOrder');
  const [sessionSets, setSessionSets] = useState<PracticeSet[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [setResults, setSetResults] = useState<Record<string, SetResult>>({});

  // Per-set test state
  const [mode, setMode] = useState<TestMode>('test');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TestResult | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [displayLabels, setDisplayLabels] = useState<Label[]>([]);

  useEffect(() => {
    const foundGroup = getGroup(id);
    if (!foundGroup) {
      router.push('/groups');
      return;
    }
    setGroup(foundGroup);
    const allSets = getSets();
    const groupSets = foundGroup.setIds
      .map((sid) => allSets.find((s) => s.id === sid))
      .filter((s): s is PracticeSet => s !== undefined);
    setSets(groupSets);
    setLoaded(true);
    // Asynchronously load images for each set from IndexedDB.
    groupSets.forEach((set) => {
      if (set.image) return; // already has a legacy image in localStorage
      getImage(set.id).then((url) => {
        if (url) {
          setSets((prev) =>
            prev.map((s) => (s.id === set.id ? { ...s, image: url } : s))
          );
        }
      });
    });
  }, [id, router]);

  // Load image for the current set in the testing stage.
  useEffect(() => {
    const set = sessionSets[currentIndex];
    if (!set) {
      setCurrentImageUrl('');
      return;
    }
    // Use the image from the set if already available (legacy or loaded into sets state).
    if (set.image) {
      setCurrentImageUrl(set.image);
      return;
    }
    // Otherwise load from IndexedDB.
    getImage(set.id).then((url) => {
      setCurrentImageUrl(url ?? '');
    });
  }, [currentIndex, sessionSets]);

  const initSet = (set: PracticeSet, sqOverride?: boolean) => {
    const sq = sqOverride !== undefined ? sqOverride : shuffleQuestions;
    // Deduplicate options before shuffling
    setShuffledOptions(shuffleArray([...new Set(set.labels.map((l) => l.answer))]));
    setDisplayLabels(sq ? shuffleArray([...set.labels]) : [...set.labels]);
    const init: Record<string, string> = {};
    set.labels.forEach((l) => (init[l.letter] = ''));
    setAnswers(init);
    setResult(null);
    setMode('test');
  };

  const startSession = () => {
    if (sets.length === 0) return;
    const ordered = order === 'shuffled' ? shuffleArray(sets) : [...sets];
    setSessionSets(ordered);
    setCurrentIndex(0);
    setSetResults({});
    initSet(ordered[0]);
    setStage('testing');
  };

  const currentSet = sessionSets[currentIndex] ?? null;

  const allAnswered = useMemo(
    () => currentSet !== null && Object.values(answers).every((a) => a !== ''),
    [answers, currentSet]
  );

  const handleSubmit = () => {
    if (!currentSet) return;
    const testAnswers: TestAnswer[] = currentSet.labels.map((l) => ({
      letter: l.letter,
      selectedAnswer: answers[l.letter] ?? '',
      correctAnswer: l.answer,
      isCorrect: answers[l.letter]?.trim().toLowerCase() === l.answer.trim().toLowerCase(),
    }));
    const score = testAnswers.filter((a) => a.isCorrect).length;
    setResult({ answers: testAnswers, score, total: currentSet.labels.length, completedAt: Date.now() });
    // Upsert result (handles retry)
    setSetResults((prev) => ({
      ...prev,
      [currentSet.id]: { setId: currentSet.id, setName: currentSet.name, score, total: currentSet.labels.length },
    }));
  };

  const handleNextSet = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= sessionSets.length) {
      setStage('summary');
    } else {
      setCurrentIndex(nextIndex);
      initSet(sessionSets[nextIndex]);
    }
  };

  const handleReset = () => {
    if (!currentSet) return;
    initSet(currentSet);
  };

  const switchMode = (m: TestMode) => {
    setMode(m);
    if (m !== mode) {
      setResult(null);
      if (currentSet) initSet(currentSet);
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  if (!group) return null;

  // ─── START STAGE ──────────────────────────────────────────────────────────
  if (stage === 'start') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/groups')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{group.name}</h1>
            {group.description && <p className="text-slate-500 text-sm mt-0.5">{group.description}</p>}
          </div>
        </div>

        {/* Sets list */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">
            Sets in this group ({sets.length})
          </h2>
          {sets.length === 0 ? (
            <p className="text-slate-400 italic text-sm">
              No sets in this group. Edit the group to add some sets.
            </p>
          ) : (
            <div className="space-y-2">
              {sets.map((set, i) => (
                <div
                  key={set.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100"
                >
                  <span className="w-6 h-6 bg-violet-100 text-violet-700 text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                    {set.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={set.image} alt={set.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{set.name}</p>
                    <p className="text-xs text-slate-400">{set.labels.length} labels</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Options */}
        {sets.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Practice Options</h2>
            <div className="space-y-3 mb-6">
              {(
                [
                  { value: 'inOrder', label: 'In Order', desc: 'Practice sets in the order listed above' },
                  { value: 'shuffled', label: 'Shuffled', desc: 'Practice sets in a random order' },
                ] as { value: SetOrder; label: string; desc: string }[]
              ).map(({ value, label, desc }) => (
                <label
                  key={value}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    order === value
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="order"
                    value={value}
                    checked={order === value}
                    onChange={() => setOrder(value)}
                    className="text-violet-600"
                  />
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{label}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
            {/* Shuffle questions toggle */}
            <button
              type="button"
              onClick={() => setShuffleQuestions((prev) => !prev)}
              className={`flex items-center gap-3 p-3.5 rounded-xl border-2 w-full transition-all ${
                shuffleQuestions
                  ? 'border-violet-500 bg-violet-50'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className={`relative inline-flex h-5 w-9 items-center rounded-full flex-shrink-0 transition-colors ${
                shuffleQuestions ? 'bg-violet-500' : 'bg-slate-300'
              }`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  shuffleQuestions ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </span>
              <div className="text-left">
                <p className="font-medium text-slate-800 text-sm">Shuffle Questions</p>
                <p className="text-slate-500 text-xs mt-0.5">Ask labels in random order within each set</p>
              </div>
            </button>

            <button
              onClick={startSession}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start Practice
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── SUMMARY STAGE ────────────────────────────────────────────────────────
  if (stage === 'summary') {
    const completedResults = sessionSets
      .map((s) => setResults[s.id])
      .filter(Boolean) as SetResult[];
    const totalScore = completedResults.reduce((sum, r) => sum + r.score, 0);
    const totalQuestions = completedResults.reduce((sum, r) => sum + r.total, 0);
    const overallPct = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/groups')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Session Complete!</h1>
        </div>

        {/* Overall score */}
        <div
          className={`rounded-2xl p-6 text-center mb-6 ${
            overallPct === 100
              ? 'bg-green-50 border border-green-200'
              : overallPct >= 70
              ? 'bg-violet-50 border border-violet-200'
              : 'bg-orange-50 border border-orange-200'
          }`}
        >
          <div
            className={`text-5xl font-bold ${
              overallPct === 100 ? 'text-green-600' : overallPct >= 70 ? 'text-violet-600' : 'text-orange-600'
            }`}
          >
            {totalScore}/{totalQuestions}
          </div>
          <div
            className={`text-base font-medium mt-1 ${
              overallPct === 100 ? 'text-green-700' : overallPct >= 70 ? 'text-violet-700' : 'text-orange-700'
            }`}
          >
            Overall Score &mdash;{' '}
            {overallPct === 100 ? 'Perfect!' : overallPct >= 70 ? 'Great job!' : 'Keep practicing!'} ({overallPct}%)
          </div>
        </div>

        {/* Per-set results */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Results by Set</h2>
          <div className="space-y-3">
            {sessionSets.map((set, i) => {
              const r = setResults[set.id];
              if (!r) return null;
              const pct = Math.round((r.score / r.total) * 100);
              return (
                <div key={set.id} className="flex items-center gap-3">
                  <span className="w-5 h-5 text-xs text-slate-400 font-medium flex-shrink-0 text-center">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{r.setName}</p>
                    <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct === 100 ? 'bg-green-500' : pct >= 70 ? 'bg-violet-500' : 'bg-orange-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold flex-shrink-0 ${
                      pct === 100 ? 'text-green-600' : pct >= 70 ? 'text-violet-600' : 'text-orange-600'
                    }`}
                  >
                    {r.score}/{r.total}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setStage('start'); setSetResults({}); }}
            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Practice Again
          </button>
          <button
            onClick={() => router.push('/groups')}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition-colors"
          >
            Back to Groups
          </button>
        </div>
      </div>
    );
  }

  // ─── TESTING STAGE ────────────────────────────────────────────────────────
  if (!currentSet) return null;

  const scorePercent = result ? Math.round((result.score / result.total) * 100) : 0;
  const isLastSet = currentIndex === sessionSets.length - 1;
  const progressPct = result
    ? ((currentIndex + 1) / sessionSets.length) * 100
    : (currentIndex / sessionSets.length) * 100;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Progress header */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => {
            if (confirm('Exit this session? Your progress will be lost.')) setStage('start');
          }}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-bold text-slate-900 truncate">{currentSet.name}</h1>
            <span className="text-sm text-slate-500 flex-shrink-0 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {currentIndex + 1} / {sessionSets.length}
            </span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex bg-slate-100 rounded-xl p-1 w-fit mb-6">
        {(['study', 'test'] as TestMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
              mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Image panel */}
        <div className="lg:flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-slate-600">Labeled Diagram</span>
          </div>
          <div className="image-container overflow-auto max-h-[70vh] flex items-start justify-center p-4 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentImageUrl} alt={currentSet.name} className="max-w-full rounded-lg" style={{ display: 'block' }} />
          </div>
        </div>

        {/* Answer panel */}
        <div className="lg:w-96 flex flex-col">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">
                {mode === 'study' ? 'Answer Key' : 'Your Answers'}
              </span>
              <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                {currentSet.labels.length} labels
              </span>
            </div>

            {/* Labels */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {displayLabels.map((label) => {
                const res = result?.answers.find((a) => a.letter === label.letter);
                return (
                  <div
                    key={label.letter}
                    className={`rounded-lg border transition-all ${
                      res
                        ? res.isCorrect
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3 p-3">
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                          res
                            ? res.isCorrect
                              ? 'bg-green-500 text-white'
                              : 'bg-red-500 text-white'
                            : 'bg-violet-600 text-white'
                        }`}
                      >
                        {label.letter}
                      </div>
                      <div className="flex-1 min-w-0">
                        {mode === 'study' ? (
                          <p className="text-sm font-medium text-slate-800">{label.answer}</p>
                        ) : result ? (
                          <div>
                            <p className={`text-sm font-medium ${res?.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                              {res?.selectedAnswer || <span className="italic text-slate-400">No answer</span>}
                            </p>
                            {!res?.isCorrect && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                Correct: <span className="font-semibold text-slate-700">{label.answer}</span>
                              </p>
                            )}
                          </div>
                        ) : (
                          <select
                            value={answers[label.letter] ?? ''}
                            onChange={(e) => setAnswers((prev) => ({ ...prev, [label.letter]: e.target.value }))}
                            className="w-full text-sm border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                          >
                            <option value="">Select answer…</option>
                            {shuffledOptions.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      {result && (
                        <div className="flex-shrink-0">
                          {res?.isCorrect ? (
                            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            {mode === 'test' && (
              <div className="p-4 border-t border-slate-100">
                {!result ? (
                  <button
                    onClick={handleSubmit}
                    disabled={!allAnswered}
                    className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors shadow-sm"
                  >
                    {allAnswered
                      ? 'Submit Answers'
                      : `${Object.values(answers).filter((a) => a !== '').length} / ${currentSet.labels.length} answered`}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div
                      className={`rounded-xl p-4 text-center ${
                        scorePercent === 100
                          ? 'bg-green-50 border border-green-200'
                          : scorePercent >= 70
                          ? 'bg-violet-50 border border-violet-200'
                          : 'bg-orange-50 border border-orange-200'
                      }`}
                    >
                      <div
                        className={`text-3xl font-bold ${
                          scorePercent === 100 ? 'text-green-600' : scorePercent >= 70 ? 'text-violet-600' : 'text-orange-600'
                        }`}
                      >
                        {result.score}/{result.total}
                      </div>
                      <div
                        className={`text-sm font-medium mt-0.5 ${
                          scorePercent === 100 ? 'text-green-700' : scorePercent >= 70 ? 'text-violet-700' : 'text-orange-700'
                        }`}
                      >
                        {scorePercent}%
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleReset}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors text-sm"
                      >
                        Retry
                      </button>
                      <button
                        onClick={handleNextSet}
                        className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                      >
                        {isLastSet ? 'Finish' : 'Next Set →'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
