'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSet, getImage, shuffleArray } from '@/lib/storage';
import { Label, PracticeSet, TestResult, TestAnswer } from '@/types';

type Mode = 'study' | 'test';

export default function TestPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [set, setSet] = useState<PracticeSet | null>(null);
  const [mode, setMode] = useState<Mode>('test');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TestResult | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [displayLabels, setDisplayLabels] = useState<PracticeSet['labels']>([]);

  useEffect(() => {
    const found = getSet(id);
    if (!found) {
      router.push('/');
    } else {
      setSet(found);
      setDisplayLabels(found.labels);
      // Deduplicate and shuffle all answer options once on mount
      setShuffledOptions(shuffleArray([...new Set(found.labels.map((l) => l.answer))]));
      // Initialize answers as empty
      const init: Record<string, string> = {};
      found.labels.forEach((l) => (init[l.letter] = ''));
      setAnswers(init);
      // If the set doesn't already have an image (new system), load from IndexedDB.
      if (!found.image) {
        getImage(id).then((url) => {
          if (url) setSet((prev) => (prev ? { ...prev, image: url } : prev));
        });
      }
    }
  }, [id, router]);

  const allAnswered = useMemo(
    () => set !== null && Object.values(answers).every((a) => a !== ''),
    [answers, set]
  );

  const handleSubmit = () => {
    if (!set) return;
    const testAnswers: TestAnswer[] = set.labels.map((l) => ({
      letter: l.letter,
      selectedAnswer: answers[l.letter] ?? '',
      correctAnswer: l.answer,
      isCorrect: answers[l.letter]?.trim().toLowerCase() === l.answer.trim().toLowerCase(),
    }));
    const score = testAnswers.filter((a) => a.isCorrect).length;
    setResult({
      answers: testAnswers,
      score,
      total: set.labels.length,
      completedAt: Date.now(),
    });
  };

  const handleReset = () => {
    if (!set) return;
    const init: Record<string, string> = {};
    set.labels.forEach((l) => (init[l.letter] = ''));
    setAnswers(init);
    setResult(null);
    // Re-shuffle options (deduplicated)
    setShuffledOptions(shuffleArray([...new Set(set.labels.map((l) => l.answer))]));
    // Re-shuffle question order if enabled
    if (shuffleQuestions) {
      setDisplayLabels(shuffleArray([...set.labels]));
    }
  };

  const handleShuffleToggle = () => {
    if (!set) return;
    const next = !shuffleQuestions;
    setShuffleQuestions(next);
    setDisplayLabels(next ? shuffleArray([...set.labels]) : [...set.labels]);
    // Reset answers and result when toggling
    const init: Record<string, string> = {};
    set.labels.forEach((l) => (init[l.letter] = ''));
    setAnswers(init);
    setResult(null);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setResult(null);
    handleReset();
  };

  if (!set) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
      </div>
    );
  }

  const scorePercent = result ? Math.round((result.score / result.total) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/')}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 truncate">{set.name}</h1>
          {set.description && (
            <p className="text-slate-500 text-sm mt-0.5 truncate">{set.description}</p>
          )}
        </div>
        <Link
          href={`/edit/${set.id}`}
          className="hidden sm:inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 font-medium px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </Link>
      </div>

      {/* Mode tabs + Shuffle toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex bg-slate-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => switchMode('study')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === 'study'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Study
          </button>
          <button
            onClick={() => switchMode('test')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === 'test'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Test
          </button>
        </div>
        <button
          type="button"
          onClick={handleShuffleToggle}
          className="flex items-center gap-2 cursor-pointer select-none group"
          title="Shuffle the order questions are shown"
        >
          <span className="text-sm text-slate-600 font-medium group-hover:text-slate-800 transition-colors">Shuffle questions</span>
          <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            shuffleQuestions ? 'bg-pink-400' : 'bg-slate-300'
          }`}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              shuffleQuestions ? 'translate-x-4' : 'translate-x-0.5'
            }`} />
          </span>
        </button>
      </div>

      {/* Main layout: image + answers */}
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
            <img
              src={set.image}
              alt={set.name}
              className="max-w-full rounded-lg"
              style={{ display: 'block' }}
            />
          </div>
        </div>

        {/* Answer panel */}
        <div className="lg:w-96 flex flex-col">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="text-sm font-medium text-slate-600">
                  {mode === 'study' ? 'Answer Key' : 'Your Answers'}
                </span>
              </div>
              <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                {set.labels.length} labels
              </span>
            </div>

            {/* Labels list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {displayLabels.map((label) => {
                const res = result?.answers.find((a) => a.letter === label.letter);
                return (
                  <div key={label.letter} className={`rounded-lg border transition-all ${
                    res
                      ? res.isCorrect
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="flex items-start gap-3 p-3">
                      {/* Letter badge */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        res
                          ? res.isCorrect
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                          : 'bg-pink-500 text-white'
                      }`}>
                        {label.letter}
                      </div>

                      <div className="flex-1 min-w-0">
                        {mode === 'study' ? (
                          /* Study mode: show answer */
                          <p className="text-sm font-medium text-slate-800">{label.answer}</p>
                        ) : result ? (
                          /* Test results */
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
                          /* Test mode: dropdown */
                          <select
                            value={answers[label.letter] ?? ''}
                            onChange={(e) =>
                              setAnswers((prev) => ({ ...prev, [label.letter]: e.target.value }))
                            }
                            className="w-full text-sm border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                          >
                            <option value="">Select answer…</option>
                            {shuffledOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Result icon */}
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

            {/* Footer: submit / results */}
            {mode === 'test' && (
              <div className="p-4 border-t border-slate-100">
                {!result ? (
                  <button
                    onClick={handleSubmit}
                    disabled={!allAnswered}
                    className="w-full bg-pink-500 hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {allAnswered ? 'Submit Answers' : `${Object.values(answers).filter((a) => a !== '').length} / ${set.labels.length} answered`}
                  </button>
                ) : (
                  <div className="space-y-3">
                    {/* Score banner */}
                    <div className={`rounded-xl p-4 text-center ${
                      scorePercent === 100
                        ? 'bg-green-50 border border-green-200'
                        : scorePercent >= 70
                        ? 'bg-pink-50 border border-pink-200'
                        : 'bg-orange-50 border border-orange-200'
                    }`}>
                      <div className={`text-4xl font-bold ${
                        scorePercent === 100 ? 'text-green-600' : scorePercent >= 70 ? 'text-pink-500' : 'text-orange-600'
                      }`}>
                        {result.score}/{result.total}
                      </div>
                      <div className={`text-sm font-medium mt-0.5 ${
                        scorePercent === 100 ? 'text-green-700' : scorePercent >= 70 ? 'text-pink-600' : 'text-orange-700'
                      }`}>
                        {scorePercent === 100
                          ? 'Perfect score!'
                          : scorePercent >= 70
                          ? 'Great job!'
                          : 'Keep practicing!'}
                        {' '}({scorePercent}%)
                      </div>
                    </div>
                    <button
                      onClick={handleReset}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Try Again
                    </button>
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
