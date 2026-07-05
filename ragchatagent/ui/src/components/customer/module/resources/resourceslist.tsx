import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, Plus, RefreshCw, Search, Trash2, Upload, Wand2 } from 'lucide-react';
import {
  createTextResource,
  createUrlResource,
  deindexResource,
  deleteResource,
  getResources,
  indexResource,
  resourceUrl,
  ResourceItem,
  updateResource,
  uploadResourceFile,
} from './api/resourceapi';
import { useToast } from '@/components/shared/toast/ToastProvider';

const buttonClass =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-extrabold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';

const darkButtonClass =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-950 bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60';

type CreateMode = 'text' | 'file' | 'url';

const PAGE_SIZE = 10;

const emptyForm = {
  title: '',
  resource_type: 'text',
  content: '',
  url: '',
  is_active: true,
};

function formatSize(size?: number | null) {
  if (!size) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResourcesList() {
  const toast = useToast();

  const [items, setItems] = useState<ResourceItem[]>([]);
  const [selected, setSelected] = useState<ResourceItem | null>(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>('text');
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);

  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [updating, setUpdating] = useState(false);

  const [indexingId, setIndexingId] = useState<number | null>(null);
  const [deindexingId, setDeindexingId] = useState<number | null>(null);

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !search ||
        [item.title, item.resource_type, item.content || '', item.original_name || '']
          .join(' ')
          .toLowerCase()
          .includes(search);

      const matchesType = !typeFilter || item.resource_type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [items, query, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredItems, currentPage]);

  const paginationStart = filteredItems.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const paginationEnd = Math.min(currentPage * PAGE_SIZE, filteredItems.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, typeFilter]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const totals = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => item.is_active).length,
      indexed: items.filter((item) => item.is_indexed).length,
    }),
    [items],
  );

  async function loadResources(showSuccess = false) {
    try {
      setLoading(true);

      const data = await getResources();

      setItems(data);
      setSelected((current) => (current ? data.find((item) => item.id === current.id) || null : null));

      if (showSuccess) {
        toast.success('Resources refreshed successfully.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadResources();
  }, []);

  function resetCreateForm() {
    setForm(emptyForm);
    setFile(null);
    setCreateMode('text');
  }

  function openEditModal(resource: ResourceItem) {
    setEditingResource(resource);
    setEditForm({
      title: resource.title,
      resource_type: resource.resource_type,
      content: resource.content || '',
      is_active: resource.is_active,
    });
  }

  async function refreshAfterResourceChange(resourceId?: number) {
    const data = await getResources();
    setItems(data);

    setSelected((current) => {
      const selectedId = resourceId || current?.id;
      if (!selectedId) return current;
      return data.find((item) => item.id === selectedId) || null;
    });

    return data;
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();

    if (createMode === 'file' && !file) {
      toast.error('Please choose a resource file.');
      return;
    }

    if (createMode === 'url' && !form.url.trim()) {
      toast.error('Please enter a website URL.');
      return;
    }

    try {
      setSaving(true);

      const created =
        createMode === 'text'
          ? await createTextResource({
              title: form.title,
              resource_type: form.resource_type || 'text',
              content: form.content,
              is_active: form.is_active,
            })
          : createMode === 'url'
            ? await createUrlResource({
                title: form.title,
                url: form.url,
                resource_type: form.resource_type || 'website',
                is_active: form.is_active,
              })
            : await uploadResourceFile(form.title, form.resource_type || 'document', file as File);
      setItems((current) => [created, ...current]);
      setSelected(created);
      setShowCreateModal(false);
      resetCreateForm();
      toast.success('Resource created successfully.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create resource');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateResource(event: FormEvent) {
    event.preventDefault();

    if (!editingResource) return;

    try {
      setUpdating(true);

      const updated = await updateResource(editingResource.id, {
        title: editForm.title,
        resource_type: editForm.resource_type,
        content: editForm.content,
        is_active: editForm.is_active,
      });

      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSelected((current) => (current?.id === updated.id ? updated : current));
      setEditingResource(null);
      toast.success('Resource updated successfully.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update resource');
    } finally {
      setUpdating(false);
    }
  }

  async function handleIndexResource(resource: ResourceItem) {
    try {
      setIndexingId(resource.id);

      const result = await indexResource(resource.id);
      await refreshAfterResourceChange(resource.id);

      toast.success(`Resource indexed with ${result.chunks} chunks.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to index resource');
    } finally {
      setIndexingId(null);
    }
  }

  async function handleDeindexResource(resource: ResourceItem) {
    if (!confirm(`Deactivate index for ${resource.title}?`)) return;

    try {
      setDeindexingId(resource.id);

      await deindexResource(resource.id);
      await refreshAfterResourceChange(resource.id);

      toast.success('Resource index deactivated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to deactivate index');
    } finally {
      setDeindexingId(null);
    }
  }

  async function handleToggleActive(resource: ResourceItem) {
    try {
      const updated = await updateResource(resource.id, {
        is_active: !resource.is_active,
      });

      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSelected((current) => (current?.id === updated.id ? updated : current));
      toast.success(`Resource marked as ${updated.is_active ? 'active' : 'inactive'}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update resource');
    }
  }

  async function handleDelete(resource: ResourceItem) {
    if (!confirm(`Delete ${resource.title}?`)) return;

    try {
      await deleteResource(resource.id);

      setItems((current) => current.filter((item) => item.id !== resource.id));
      setSelected((current) => (current?.id === resource.id ? null : current));
      toast.success('Resource deleted successfully.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete resource');
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] || null);
  }

  return (
    <div className="dashboard-page">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">Resources</h2>
            <p className="mt-1 text-sm text-slate-500">
              Total: {totals.total} · Active: {totals.active} · Indexed: {totals.indexed}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button className={darkButtonClass} onClick={() => setShowCreateModal(true)}>
              <Plus size={16} />
              Add Resource
            </button>
            <button className={buttonClass} onClick={() => loadResources(true)} disabled={loading}>
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-300 px-3">
            <Search size={17} className="text-slate-400" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search resources"
            />
          </div>

          <select
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold outline-none"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="">All types</option>
            <option value="text">Text</option>
            <option value="document">Document</option>
            <option value="pdf">PDF</option>
          </select>
        </div>
        {loading ? (
          <div className="py-10 text-center text-slate-500">Loading resources...</div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    <th className="p-4">Title</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Active</th>
                    <th className="p-4">Indexed</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedItems.map((resource) => (
                    <tr key={resource.id} className="border-b border-slate-200 hover:bg-slate-50/80">
                      <td className="p-4 align-middle">
                        <button
                          className="text-left font-bold text-slate-950 hover:text-blue-700"
                          onClick={() => setSelected(resource)}
                        >
                          {resource.title}
                        </button>
                        <small className="mt-1 block text-slate-500">ID: {resource.id}</small>
                      </td>

                      <td className="p-4 align-middle text-slate-700">{resource.resource_type}</td>

                      <td className="p-4 align-middle">
                        <button
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                            resource.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}
                          onClick={() => handleToggleActive(resource)}
                        >
                          {resource.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      <td className="p-4 align-middle">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                            resource.is_indexed ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {resource.is_indexed ? 'Indexed' : 'Not indexed'}
                        </span>
                      </td>

                      <td className="p-4 align-middle">
                        <div className="flex justify-end gap-2">
                          <button className={buttonClass} onClick={() => setSelected(resource)}>
                            View
                          </button>

                          <button className={buttonClass} onClick={() => openEditModal(resource)}>
                            Edit
                          </button>

                          <button
                            className={buttonClass}
                            onClick={() => handleIndexResource(resource)}
                            disabled={indexingId === resource.id}
                          >
                            <Wand2 size={16} />
                            {indexingId === resource.id ? 'Indexing...' : resource.is_indexed ? 'Reindex' : 'Index'}
                          </button>

                          {resource.is_indexed && (
                            <button
                              className={buttonClass}
                              onClick={() => handleDeindexResource(resource)}
                              disabled={deindexingId === resource.id}
                            >
                              {deindexingId === resource.id ? 'Deactivating...' : 'Deactivate Index'}
                            </button>
                          )}

                          <button
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-extrabold text-red-700 transition hover:bg-red-100"
                            onClick={() => handleDelete(resource)}
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {paginatedItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        No resources found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredItems.length > 0 && (
              <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-slate-500">
                  Showing {paginationStart}-{paginationEnd} of {filteredItems.length}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    className={buttonClass}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>

                  <span className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    className={buttonClass}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {selected && (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-950">{selected.title}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {selected.resource_type} · {formatSize(selected.size)} ·{' '}
                {new Date(selected.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className={buttonClass}
                onClick={() => handleIndexResource(selected)}
                disabled={indexingId === selected.id}
              >
                <Wand2 size={16} />
                {indexingId === selected.id ? 'Indexing...' : selected.is_indexed ? 'Reindex' : 'Index'}
              </button>

              {selected.is_indexed && (
                <button
                  className={buttonClass}
                  onClick={() => handleDeindexResource(selected)}
                  disabled={deindexingId === selected.id}
                >
                  {deindexingId === selected.id ? 'Deactivating...' : 'Deactivate Index'}
                </button>
              )}

              {selected.url && (
                <a className={buttonClass} href={resourceUrl(selected.url)} target="_blank" rel="noreferrer">
                  <FileText size={16} />
                  Open File
                </a>
              )}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            {selected.content || selected.original_name || 'No content available.'}
          </div>
        </section>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-5">
          <form
            className="w-[min(720px,calc(100vw-40px))] rounded-3xl bg-white p-6 shadow-2xl"
            onSubmit={handleCreate}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-950">Add Resource</h3>
                <p className="mt-1 text-sm text-slate-500">Create text knowledge or upload a document.</p>
              </div>
              <button
                type="button"
                className={buttonClass}
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
              >
                Close
              </button>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-3">
              <button
                type="button"
                className={createMode === 'text' ? darkButtonClass : buttonClass}
                onClick={() => {
                  setCreateMode('text');
                  setForm((current) => ({ ...current, resource_type: 'text' }));
                }}
              >
                Text
              </button>
              <button
                type="button"
                className={createMode === 'file' ? darkButtonClass : buttonClass}
                onClick={() => {
                  setCreateMode('file');
                  setForm((current) => ({ ...current, resource_type: 'document' }));
                }}
              >
                File
              </button>
              <button
                type="button"
                className={createMode === 'url' ? darkButtonClass : buttonClass}
                onClick={() => {
                  setCreateMode('url');
                  setForm((current) => ({ ...current, resource_type: 'website' }));
                }}
              >
                Website
              </button>
            </div>

            <div className="grid gap-4">
              <input
                className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-blue-600"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Resource title"
                required
              />

              <select
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-600"
                value={form.resource_type}
                onChange={(event) => setForm((current) => ({ ...current, resource_type: event.target.value }))}
              >
                <option value="text">Text</option>
                <option value="document">Document</option>
                <option value="pdf">PDF</option>
                <option value="website">Website</option>
              </select>

              {createMode === 'text' && (
                <textarea
                  className="min-h-[180px] resize-none rounded-xl border border-slate-300 p-4 text-sm outline-none focus:border-blue-600"
                  value={form.content}
                  onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                  placeholder="Paste chatbot knowledge content here..."
                  required
                />
              )}

              {createMode === 'url' && (
                <input
                  className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-blue-600"
                  type="url"
                  value={form.url}
                  onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
                  placeholder="https://example.com/page"
                  required
                />
              )}

              {createMode === 'file' && (
                <label className="grid min-h-[160px] cursor-pointer place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-blue-500">
                  <div>
                    <Upload size={34} className="mx-auto mb-3 text-slate-400" />
                    <p className="font-bold text-slate-900">{file ? file.name : 'Choose TXT, PDF, or DOCX'}</p>
                    <p className="mt-1 text-xs text-slate-500">Maximum file size depends on API settings.</p>
                  </div>
                  <input
                    className="hidden"
                    type="file"
                    accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileChange}
                    required
                  />
                </label>
              )}

              <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                />
                Active
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className={buttonClass}
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
              >
                Cancel
              </button>
              <button className={darkButtonClass} disabled={saving}>
                {saving ? 'Saving...' : 'Save Resource'}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingResource && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-5">
          <form
            className="w-[min(720px,calc(100vw-40px))] rounded-3xl bg-white p-6 shadow-2xl"
            onSubmit={handleUpdateResource}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-950">Edit Resource</h3>
                <p className="mt-1 text-sm text-slate-500">Update title, type, content, and active status.</p>
              </div>
              <button type="button" className={buttonClass} onClick={() => setEditingResource(null)}>
                Close
              </button>
            </div>

            <div className="grid gap-4">
              <input
                className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-blue-600"
                value={editForm.title}
                onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Resource title"
                required
              />

              <select
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-600"
                value={editForm.resource_type}
                onChange={(event) => setEditForm((current) => ({ ...current, resource_type: event.target.value }))}
              >
                <option value="text">Text</option>
                <option value="document">Document</option>
                <option value="pdf">PDF</option>
              </select>

              <textarea
                className="min-h-[220px] resize-none rounded-xl border border-slate-300 p-4 text-sm outline-none focus:border-blue-600"
                value={editForm.content}
                onChange={(event) => setEditForm((current) => ({ ...current, content: event.target.value }))}
                placeholder="Resource content"
              />

              <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={(event) => setEditForm((current) => ({ ...current, is_active: event.target.checked }))}
                />
                Active
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className={buttonClass} onClick={() => setEditingResource(null)}>
                Cancel
              </button>
              <button className={darkButtonClass} disabled={updating}>
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}