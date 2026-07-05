import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Copy, FileText, Image, RefreshCw, Search, Trash2, Upload } from 'lucide-react';
import { deleteMedia, getMedia, mediaUrl, MediaItem, uploadMedia } from '@/components/shared/media/api/mediaapi';
import { useToast } from '@/components/shared/toast/ToastProvider';

const buttonClass =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-extrabold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';

const darkButtonClass =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-950 bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60';

function formatSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(item: MediaItem) {
  return item.mime_type.startsWith('image/');
}

export default function MediaLibrary() {
  const toast = useToast();

  const [items, setItems] = useState<MediaItem[]>([]);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const filteredItems = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return items;

    return items.filter((item) =>
      [item.original_name, item.filename, item.mime_type].some((field) =>
        field.toLowerCase().includes(value),
      ),
    );
  }, [items, query]);

  async function loadMedia(showSuccess = false) {
    try {
      setLoading(true);

      const data = await getMedia();

      setItems(data);
      setSelected((current) => {
        if (!current) return null;
        return data.find((item) => item.id === current.id) || null;
      });

      if (showSuccess) {
        toast.success('Media refreshed successfully.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMedia();
  }, []);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    try {
      setUploading(true);

      const uploaded = await uploadMedia(file);

      setItems((current) => [uploaded, ...current]);
      setSelected(uploaded);
      toast.success('File uploaded successfully.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(item: MediaItem) {
    if (!confirm(`Delete ${item.original_name}?`)) return;

    try {
      await deleteMedia(item.id);

      setItems((current) => current.filter((media) => media.id !== item.id));
      setSelected((current) => (current?.id === item.id ? null : current));
      toast.success('Media deleted successfully.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete media');
    }
  }

  async function copyUrl(item: MediaItem) {
    try {
      await navigator.clipboard.writeText(mediaUrl(item.url));
      toast.success('Media URL copied.');
    } catch {
      toast.error('Failed to copy media URL.');
    }
  }

  return (
    <div className="dashboard-page">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">Media Library</h2>
            <p className="mt-1 text-sm text-slate-500">{items.length} uploaded files</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className={darkButtonClass}>
              <Upload size={16} />
              {uploading ? 'Uploading...' : 'Upload File'}
              <input
                className="hidden"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>

            <button className={buttonClass} onClick={() => loadMedia(true)} disabled={loading}>
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        <div className="mb-5 flex min-h-11 items-center gap-3 rounded-xl border border-slate-300 px-3">
          <Search size={17} className="text-slate-400" />
          <input
            className="w-full bg-transparent text-sm outline-none"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search media"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            {loading ? (
              <div className="py-10 text-center text-slate-500">Loading media...</div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-5">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`overflow-hidden rounded-2xl border text-left transition hover:border-blue-400 ${
                      selected?.id === item.id ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-200'
                    }`}
                    onClick={() => setSelected(item)}
                  >
                    <div className="grid aspect-square place-items-center bg-slate-100">
                      {isImage(item) ? (
                        <img
                          className="h-full w-full object-cover"
                          src={mediaUrl(item.url)}
                          alt={item.original_name}
                        />
                      ) : (
                        <FileText size={42} className="text-slate-400" />
                      )}
                    </div>
                    <div className="p-3">
                      <div className="truncate text-sm font-bold text-slate-900">{item.original_name}</div>
                      <div className="mt-1 text-xs text-slate-500">{formatSize(item.size)}</div>
                    </div>
                  </button>
                ))}

                {filteredItems.length === 0 && (
                  <div className="col-span-full py-10 text-center text-slate-500">No media found.</div>
                )}
              </div>
            )}
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            {selected ? (
              <div className="grid gap-4">
                <div className="grid aspect-video place-items-center overflow-hidden rounded-xl bg-white">
                  {isImage(selected) ? (
                    <img
                      className="h-full w-full object-contain"
                      src={mediaUrl(selected.url)}
                      alt={selected.original_name}
                    />
                  ) : (
                    <FileText size={48} className="text-slate-400" />
                  )}
                </div>

                <div>
                  <h3 className="break-words text-base font-black text-slate-950">{selected.original_name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{selected.mime_type}</p>
                </div>

                <div className="grid gap-2 text-sm text-slate-700">
                  <div className="flex justify-between gap-4">
                    <span className="font-bold">Size</span>
                    <span>{formatSize(selected.size)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="font-bold">Uploaded</span>
                    <span>{new Date(selected.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <input
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                  value={mediaUrl(selected.url)}
                  readOnly
                />

                <div className="grid grid-cols-2 gap-3">
                  <button className={buttonClass} onClick={() => copyUrl(selected)}>
                    <Copy size={16} />
                    Copy URL
                  </button>
                  <button
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-extrabold text-red-700 transition hover:bg-red-100"
                    onClick={() => handleDelete(selected)}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center text-center text-slate-500">
                <div>
                  <Image size={40} className="mx-auto mb-3 text-slate-400" />
                  <p className="text-sm">Select a file to view details.</p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
