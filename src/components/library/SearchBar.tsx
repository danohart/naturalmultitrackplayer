// src/components/library/SearchBar.tsx
'use client';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterKey: string;
  onKeyChange: (key: string) => void;
  filterBpm: string;
  onBpmChange: (bpm: string) => void;
  uniqueKeys: string[];
}

export default function SearchBar({
  searchTerm,
  onSearchChange,
  filterKey,
  onKeyChange,
  filterBpm,
  onBpmChange,
  uniqueKeys,
}: SearchBarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3">
      {/* Search */}
      <div className="flex-1">
        <input
          type="text"
          placeholder="Search songs..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-4 py-2 bg-primary border border-gray-dark rounded-lg text-white placeholder-gray-light focus:outline-none focus:border-secondary"
        />
      </div>

      {/* Key Filter */}
      <select
        value={filterKey}
        onChange={(e) => onKeyChange(e.target.value)}
        className="px-4 py-2 bg-primary border border-gray-dark rounded-lg text-white focus:outline-none focus:border-secondary cursor-pointer"
      >
        <option value="all">All Keys</option>
        {uniqueKeys.map((key) => (
          <option key={key} value={key}>
            Key: {key}
          </option>
        ))}
      </select>

      {/* BPM Filter */}
      <select
        value={filterBpm}
        onChange={(e) => onBpmChange(e.target.value)}
        className="px-4 py-2 bg-primary border border-gray-dark rounded-lg text-white focus:outline-none focus:border-secondary cursor-pointer"
      >
        <option value="all">All Tempos</option>
        <option value="slow">Slow (&lt; 100 BPM)</option>
        <option value="medium">Medium (100-140 BPM)</option>
        <option value="fast">Fast (&gt; 140 BPM)</option>
      </select>
    </div>
  );
}

