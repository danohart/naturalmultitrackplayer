// src/app/setlist/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSetlists, saveSetlist, deleteSetlist } from '@/lib/storage/db';
import { decodeSetlistFromSharing } from '@/lib/setlist/sharing';
import { SetlistData } from '@/lib/types';
import SetlistCard from '@/components/setlist/SetlistCard';
import CreateSetlistModal from '@/components/setlist/CreateSetlistModal';
import ImportSetlistModal from '@/components/setlist/ImportSetlistModal';

function SetlistPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [setlists, setSetlists] = useState<SetlistData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [importData, setImportData] = useState<{
    name: string;
    slugs: string[];
  } | null>(null);

  useEffect(() => {
    // Check for import parameter
    const importParam = searchParams.get('import');
    if (importParam) {
      const decoded = decodeSetlistFromSharing(importParam);
      if (decoded) {
        setImportData(decoded);
      }
    }
    loadSetlists();
  }, [searchParams]);

  const loadSetlists = async () => {
    try {
      setLoading(true);
      const data = await getSetlists();
      // Sort by updated_at descending
      data.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setSetlists(data);
    } catch (error) {
      console.error('Failed to load setlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (name: string) => {
    const newSetlist: SetlistData = {
      id: crypto.randomUUID(),
      name,
      songSlugs: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await saveSetlist(newSetlist);
    setShowCreateModal(false);
    // Navigate to editor
    router.push(`/setlist/${newSetlist.id}`);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this setlist?')) {
      await deleteSetlist(id);
      await loadSetlists();
    }
  };

  const handleImport = async (name: string, slugs: string[]) => {
    const newSetlist: SetlistData = {
      id: crypto.randomUUID(),
      name,
      songSlugs: slugs,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await saveSetlist(newSetlist);
    setImportData(null);
    // Clear import param from URL
    router.replace('/setlist');
    await loadSetlists();
  };

  const handlePlay = (setlist: SetlistData) => {
    if (setlist.songSlugs.length === 0) {
      alert('This setlist has no songs. Add some songs first!');
      return;
    }
    router.push(
      `/mixer?song=${setlist.songSlugs[0]}&setlist=${setlist.id}&index=0`
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading setlists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary text-white">
      {/* Header */}
      <div className="bg-primary-alt border-b border-gray-dark">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">My Setlists</h1>
              <p className="text-gray-light mt-1">
                {setlists.length} setlist{setlists.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-secondary hover:bg-secondary-bold text-primary px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              + New Setlist
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {setlists.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-light text-lg mb-4">
              You don&apos;t have any setlists yet.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-secondary hover:bg-secondary-bold text-primary px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Create Your First Setlist
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {setlists.map((setlist) => (
              <SetlistCard
                key={setlist.id}
                setlist={setlist}
                onEdit={() => router.push(`/setlist/${setlist.id}`)}
                onDelete={() => handleDelete(setlist.id)}
                onPlay={() => handlePlay(setlist)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateSetlistModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
      />

      {/* Import Modal */}
      {importData && (
        <ImportSetlistModal
          name={importData.name}
          slugs={importData.slugs}
          isOpen={true}
          onClose={() => {
            setImportData(null);
            router.replace('/setlist');
          }}
          onImport={handleImport}
        />
      )}
    </div>
  );
}

export default function SetlistPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-primary flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading setlists...</p>
          </div>
        </div>
      }
    >
      <SetlistPageContent />
    </Suspense>
  );
}
