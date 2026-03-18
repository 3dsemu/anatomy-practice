'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getGroups, getSets, saveGroup, deleteGroup, generateId } from '@/lib/storage';
import { Group, PracticeSet } from '@/types';

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [sets, setSets] = useState<PracticeSet[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSetIds, setFormSetIds] = useState<string[]>([]);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    setGroups(getGroups());
    setSets(getSets());
    setLoaded(true);
  }, []);

  const refresh = () => {
    setGroups(getGroups());
    setSets(getSets());
  };

  const openCreate = () => {
    setFormName('');
    setFormDesc('');
    setFormSetIds([]);
    setNameError('');
    setEditingGroup(null);
    setShowModal(true);
  };

  const openEdit = (group: Group) => {
    setFormName(group.name);
    setFormDesc(group.description ?? '');
    setFormSetIds([...group.setIds]);
    setNameError('');
    setEditingGroup(group);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      setNameError('Group name is required.');
      return;
    }
    const now = Date.now();
    const group: Group = {
      id: editingGroup?.id ?? generateId(),
      name: formName.trim(),
      description: formDesc.trim() || undefined,
      setIds: formSetIds,
      createdAt: editingGroup?.createdAt ?? now,
      updatedAt: now,
    };
    saveGroup(group);
    refresh();
    setShowModal(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete group "${name}"? Your sets will not be deleted.`)) {
      deleteGroup(id);
      refresh();
    }
  };

  const toggleSet = (id: string) => {
    setFormSetIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Groups</h1>
          <p className="text-slate-500 mt-1">
            {groups.length === 0
              ? 'No groups yet — create your first one!'
              : `${groups.length} group${groups.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="hidden sm:inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Group
        </button>
      </div>

      {/* Empty state */}
      {groups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-slate-800 mb-2">No groups yet</h2>
          <p className="text-slate-500 max-w-md mb-8">
            Groups let you practice multiple sets back-to-back in a single session. Create a group, add your practice sets, and run through them in order or shuffled.
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-md"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Your First Group
          </button>
        </div>
      )}

      {/* Groups grid */}
      {groups.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((group) => {
            const groupSets = sets.filter((s) => group.setIds.includes(s.id));
            const totalLabels = groupSets.reduce((sum, s) => sum + s.labels.length, 0);
            return (
              <div
                key={group.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
              >
                <div className="h-1.5 bg-gradient-to-r from-purple-500 to-blue-500" />
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-semibold text-slate-900 text-lg leading-tight">{group.name}</h3>
                  {group.description && (
                    <p className="text-slate-500 text-sm mt-1 line-clamp-2">{group.description}</p>
                  )}

                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs font-medium px-2 py-1 rounded-full">
                      {groupSets.length} set{groupSets.length !== 1 ? 's' : ''}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
                      {totalLabels} label{totalLabels !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Set thumbnails */}
                  {groupSets.length > 0 && (
                    <div className="mt-3 flex -space-x-2">
                      {groupSets.slice(0, 5).map((s) => (
                        <div
                          key={s.id}
                          className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-slate-200 flex-shrink-0"
                        >
                          {s.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.image} alt={s.name} className="w-full h-full object-cover" />
                          )}
                        </div>
                      ))}
                      {groupSets.length > 5 && (
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs text-slate-600 font-medium flex-shrink-0">
                          +{groupSets.length - 5}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex gap-2 pt-4 border-t border-slate-100 mt-auto">
                    <Link
                      href={`/groups/${group.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Practice
                    </Link>
                    <button
                      onClick={() => openEdit(group)}
                      className="flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(group.id, group.name)}
                      className="flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add new group card */}
          <button
            onClick={openCreate}
            className="bg-white rounded-xl border-2 border-dashed border-slate-200 hover:border-purple-400 hover:bg-purple-50 transition-all flex flex-col items-center justify-center py-12 gap-3 text-slate-400 hover:text-purple-500 min-h-[200px]"
          >
            <div className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-sm font-medium">New Group</span>
          </button>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex-shrink-0">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingGroup ? 'Edit Group' : 'Create New Group'}
              </h2>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Group Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => { setFormName(e.target.value); setNameError(''); }}
                  placeholder="e.g. Brain Anatomy Unit"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    nameError ? 'border-red-400' : 'border-slate-200'
                  }`}
                />
                {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Optional description..."
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Set picker */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Sets in this group ({formSetIds.length} selected)
                </label>
                {sets.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No sets yet. Create some sets first.</p>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    {sets.map((set) => (
                      <label
                        key={set.id}
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={formSetIds.includes(set.id)}
                          onChange={() => toggleSet(set.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          {set.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={set.image} alt={set.name} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{set.name}</p>
                          <p className="text-xs text-slate-400">{set.labels.length} label{set.labels.length !== 1 ? 's' : ''}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3 justify-end flex-shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                {editingGroup ? 'Save Changes' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
