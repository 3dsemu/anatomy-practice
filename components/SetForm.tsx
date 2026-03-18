'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PracticeSet, Label } from '@/types';
import { saveSet, saveImage, getImage, generateId } from '@/lib/storage';

interface SetFormProps {
  initialSet?: PracticeSet;
}

function nextLetter(labels: Label[]): string {
  if (labels.length === 0) return 'A';
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return letters[labels.length] ?? String(labels.length + 1);
}

export default function SetForm({ initialSet }: SetFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [name, setName] = useState(initialSet?.name ?? '');
  const [description, setDescription] = useState(initialSet?.description ?? '');
  const [image, setImage] = useState(initialSet?.image ?? '');
  const [labels, setLabels] = useState<Label[]>(
    initialSet?.labels ?? [{ letter: 'A', answer: '' }]
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // imageFile holds the raw File when the user picks a new image (for saving to IndexedDB).
  const [imageFile, setImageFile] = useState<File | null>(null);
  // imageFromDB tracks whether the current preview was loaded from IndexedDB (vs. legacy localStorage).
  const [imageFromDB, setImageFromDB] = useState(false);
  const [saveError, setSaveError] = useState('');

  // When editing an existing set, load the image from IndexedDB (or fall back to legacy localStorage image).
  useEffect(() => {
    if (!initialSet?.id) return;
    getImage(initialSet.id).then((url) => {
      if (url) {
        setImage(url);
        setImageFromDB(true);
      }
      // If not found in IndexedDB, keep whatever initialSet.image contains (legacy base64 or empty).
    });
  }, [initialSet?.id]);

  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleImageFile(file);
    },
    [handleImageFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const addLabel = () => {
    setLabels((prev) => [...prev, { letter: nextLetter(prev), answer: '' }]);
  };

  const removeLabel = (index: number) => {
    setLabels((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLabel = (index: number, field: keyof Label, value: string) => {
    setLabels((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l))
    );
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Set name is required.';
    if (!image) errs.image = 'Please upload an image.';
    if (labels.length === 0) errs.labels = 'Add at least one label.';
    labels.forEach((l, i) => {
      if (!l.letter.trim()) errs[`letter_${i}`] = 'Letter is required.';
      if (!l.answer.trim()) errs[`answer_${i}`] = 'Answer is required.';
    });
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    setSaveError('');
    const now = Date.now();
    const set: PracticeSet = {
      id: initialSet?.id ?? generateId(),
      name: name.trim(),
      description: description.trim() || undefined,
      image, // kept for in-memory use; saveSet will strip it from localStorage
      labels: labels.map((l) => ({ letter: l.letter.trim(), answer: l.answer.trim() })),
      createdAt: initialSet?.createdAt ?? now,
      updatedAt: now,
    };
    try {
      saveSet(set); // saves to localStorage without image field
      if (imageFile) {
        // User picked a new image — save it to IndexedDB.
        await saveImage(set.id, imageFile);
      } else if (image && !imageFromDB) {
        // Legacy set: image was in localStorage — migrate it to IndexedDB now.
        const blob = await fetch(image).then((r) => r.blob());
        await saveImage(set.id, blob);
      }
      // If imageFromDB && !imageFile, existing IndexedDB image is left untouched.
      router.push('/');
    } catch (err) {
      console.error('Failed to save set:', err);
      setSaveError('Failed to save. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => router.push('/')}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {initialSet ? 'Edit Set' : 'Create New Set'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Upload a labeled diagram and define what each letter represents.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Name, Description, Image */}
        <div className="space-y-5">
          {/* Name */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-4">Set Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Set Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="e.g. Brain Anatomy, Heart Diagram"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? 'border-red-400 bg-red-50' : 'border-slate-200'
                  }`}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Lateral view of the human brain — Chapter 4"
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>

          {/* Image upload */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-4">Diagram Image</h2>
            {image ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt="Uploaded diagram"
                  className="w-full rounded-lg border border-slate-200 max-h-80 object-contain bg-slate-50"
                />
                <button
                  onClick={() => setImage('')}
                  className="absolute top-2 right-2 bg-white border border-slate-200 shadow rounded-full p-1.5 hover:bg-red-50 hover:border-red-300 hover:text-red-600 text-slate-500 transition-colors"
                  title="Remove image"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 w-full text-sm text-blue-600 hover:text-blue-800 font-medium py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Replace image
                </button>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-400 bg-blue-50'
                    : errors.image
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <div>
                    <p className="font-medium text-slate-600">
                      {isDragging ? 'Drop image here' : 'Drag & drop or click to upload'}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">PNG, JPG, GIF, WebP supported</p>
                  </div>
                </div>
              </div>
            )}
            {errors.image && !image && (
              <p className="text-red-500 text-xs mt-1.5">{errors.image}</p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImageFile(file);
                  setErrors((prev) => ({ ...prev, image: '' }));
                }
              }}
            />
          </div>
        </div>

        {/* Right: Labels */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">
              Labels
              <span className="ml-2 text-sm font-normal text-slate-400">
                ({labels.length})
              </span>
            </h2>
            <button
              onClick={addLabel}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Label
            </button>
          </div>

          {errors.labels && (
            <p className="text-red-500 text-xs mb-3">{errors.labels}</p>
          )}

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {labels.map((label, index) => (
              <div
                key={index}
                className="flex items-start gap-2 group bg-slate-50 rounded-lg p-3 border border-slate-100"
              >
                {/* Letter badge */}
                <div className="flex-shrink-0">
                  <input
                    type="text"
                    value={label.letter}
                    onChange={(e) => updateLabel(index, 'letter', e.target.value)}
                    maxLength={4}
                    placeholder="A"
                    className={`w-14 text-center font-bold text-sm border rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                      errors[`letter_${index}`]
                        ? 'border-red-400'
                        : 'border-slate-200'
                    }`}
                  />
                </div>
                <div className="text-slate-300 mt-2.5 flex-shrink-0">=</div>
                {/* Answer */}
                <div className="flex-1">
                  <input
                    type="text"
                    value={label.answer}
                    onChange={(e) => {
                      updateLabel(index, 'answer', e.target.value);
                      setErrors((prev) => ({ ...prev, [`answer_${index}`]: '' }));
                    }}
                    placeholder="Structure name (e.g. Cerebrum)"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                      errors[`answer_${index}`]
                        ? 'border-red-400 bg-red-50'
                        : 'border-slate-200'
                    }`}
                  />
                  {errors[`answer_${index}`] && (
                    <p className="text-red-500 text-xs mt-0.5">
                      {errors[`answer_${index}`]}
                    </p>
                  )}
                </div>
                {/* Delete */}
                <button
                  onClick={() => removeLabel(index)}
                  disabled={labels.length === 1}
                  className="flex-shrink-0 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed mt-0.5"
                  title="Remove label"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Add more hint */}
          <button
            onClick={addLabel}
            className="mt-3 w-full py-2.5 border border-dashed border-slate-200 rounded-lg text-sm text-slate-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add another label
          </button>
        </div>
      </div>

      {/* Save error */}
      {saveError && (
        <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      {/* Save button */}
      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          onClick={() => router.push('/')}
          className="px-5 py-2.5 text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-100 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Saving…
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {initialSet ? 'Save Changes' : 'Create Set'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
