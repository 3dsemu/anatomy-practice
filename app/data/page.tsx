'use client';

import { useState } from 'react';
import { exportData, importData } from '@/lib/storage';
import { ExportData } from '@/types';

type ImportMode = 'merge' | 'replace';
type StatusType = 'success' | 'error';

interface Status {
  type: StatusType;
  message: string;
}

export default function DataPage() {
  const [exportJson, setExportJson] = useState('');
  const [importJson, setImportJson] = useState('');
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  const handleGenerate = async () => {
    const data = await exportData();
    setExportJson(JSON.stringify(data, null, 2));
  };

  const handleCopy = async () => {
    if (!exportJson) return;
    try {
      await navigator.clipboard.writeText(exportJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: select the textarea
      const ta = document.getElementById('export-textarea') as HTMLTextAreaElement | null;
      ta?.select();
    }
  };

  const handleImport = async () => {
    setStatus(null);
    const raw = importJson.trim();
    if (!raw) return;

    let parsed: ExportData;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setStatus({ type: 'error', message: 'Invalid JSON — please check the text and try again.' });
      return;
    }

    if (!Array.isArray(parsed.sets)) {
      setStatus({ type: 'error', message: 'Invalid format: expected a "sets" array.' });
      return;
    }

    if (!Array.isArray(parsed.groups)) {
      parsed.groups = [];
    }

    try {
      await importData(parsed, importMode);
      const setsCount = parsed.sets.length;
      const groupsCount = parsed.groups.length;
      setStatus({
        type: 'success',
        message: `Successfully imported ${setsCount} set${setsCount !== 1 ? 's' : ''} and ${groupsCount} group${groupsCount !== 1 ? 's' : ''}.`,
      });
      setImportJson('');
    } catch {
      setStatus({ type: 'error', message: 'Import failed. The data may be corrupted.' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Data</h1>
        <p className="text-slate-500 mt-1">
          Export your sets and groups as JSON to transfer them to another device, or import data you received.
        </p>
      </div>

      {/* Export */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Export Data</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Generate a JSON snapshot of all your sets and groups. Copy it and paste it on another device to import.
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          className="inline-flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Generate JSON
        </button>

        {exportJson && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Your data is ready — copy it below</span>
              <button
                onClick={handleCopy}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                  copied
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy to Clipboard
                  </>
                )}
              </button>
            </div>
            <textarea
              id="export-textarea"
              readOnly
              value={exportJson}
              rows={10}
              className="w-full font-mono text-xs border border-slate-200 rounded-lg p-3 bg-slate-50 focus:outline-none resize-none select-all"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
            <p className="text-xs text-slate-400">
              Note: images are embedded as base64 in the export, so the JSON may be large. This is normal.
            </p>
          </div>
        )}
      </div>

      {/* Import */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Import Data</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Paste your exported JSON to bring your sets and groups to this device.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Import mode */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Import Mode</label>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  {
                    value: 'merge' as ImportMode,
                    label: 'Merge',
                    desc: 'Add new items, update existing ones by ID. Safe for syncing.',
                    color: 'blue',
                  },
                  {
                    value: 'replace' as ImportMode,
                    label: 'Replace All',
                    desc: 'Wipe current data and replace with imported data.',
                    color: 'red',
                  },
                ]
              ).map(({ value, label, desc, color }) => (
                <label
                  key={value}
                  className={`flex items-start gap-2.5 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    importMode === value
                      ? color === 'blue'
                        ? 'border-pink-400 bg-pink-50'
                        : 'border-red-400 bg-red-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value={value}
                    checked={importMode === value}
                    onChange={() => setImportMode(value)}
                    className={`mt-0.5 ${color === 'red' ? 'text-red-500' : 'text-pink-500'}`}
                  />
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        importMode === value
                          ? color === 'blue'
                            ? 'text-pink-700'
                            : 'text-red-700'
                          : 'text-slate-800'
                      }`}
                    >
                      {label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Paste area */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Paste JSON here</label>
            <textarea
              value={importJson}
              onChange={(e) => {
                setImportJson(e.target.value);
                setStatus(null);
              }}
              rows={10}
              placeholder={'{\n  "version": 1,\n  "sets": [...],\n  "groups": [...]\n}'}
              className="w-full font-mono text-xs border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent resize-none placeholder:text-slate-300"
            />
          </div>

          {/* Status message */}
          {status && (
            <div
              className={`rounded-xl p-4 flex items-start gap-3 text-sm ${
                status.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {status.type === 'success' ? (
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span>{status.message}</span>
            </div>
          )}

          {/* Confirm replace warning */}
          {importMode === 'replace' && importJson.trim() && !status && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-sm text-amber-800">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>
                <strong>Warning:</strong> Replace All will permanently delete all your current sets and groups on this device.
              </span>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={!importJson.trim()}
            className={`w-full font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              importMode === 'replace'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-pink-500 hover:bg-pink-600 text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {importMode === 'replace' ? 'Replace All & Import' : 'Import Data'}
          </button>
        </div>
      </div>
    </div>
  );
}
