// src/components/setlist/CreateSetlistModal.tsx
'use client';

import { useState, useEffect, useRef } from 'react';

interface CreateSetlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export default function CreateSetlistModal({
  isOpen,
  onClose,
  onCreate,
}: CreateSetlistModalProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      // Focus input after modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName) {
      onCreate(trimmedName);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-primary-alt border-2 border-gray-dark rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-dark">
          <h2 className="text-xl font-bold text-white">Create New Setlist</h2>
          <button
            onClick={onClose}
            className="text-gray-light hover:text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4">
          <label className="block mb-4">
            <span className="text-sm text-gray-light mb-2 block">
              Setlist Name
            </span>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Saturday Morning Practice"
              className="w-full bg-primary border-2 border-gray-dark focus:border-secondary rounded-lg px-4 py-3 text-white placeholder-gray-light outline-none transition-colors"
              maxLength={100}
            />
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-dark hover:bg-gray-700 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 bg-secondary hover:bg-secondary-bold disabled:bg-gray-dark disabled:cursor-not-allowed text-primary disabled:text-gray-light py-3 rounded-lg font-semibold transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
