import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Copy, Eye, Pencil, Plus, RefreshCw, RotateCw, Save, Trash2 } from 'lucide-react';
import {
  ApiKeyItem,
  ApiKeyPayload,
  createApiKey,
  deleteApiKey,
  getApiKeys,
  rotateApiKey,
  updateApiKey,
} from '@/components/customer/module/apikeys/api/apikeyapi';
import { useToast } from '@/components/shared/toast/ToastProvider';

type FormMode = 'create' | 'edit';

type ApiKeyForm = {
  name: string;
  display_name: string;
  welcome_message: string;
  temperature: string;
  avatar_url: string;
  system_prompt: string;
  is_active: boolean;
};

const buttonClass =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-extrabold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';

const primaryButtonClass =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-4 text-sm font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';

const darkButtonClass =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-700 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800';

const dangerButtonClass =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-extrabold text-red-700 transition hover:bg-red-100';

const inputClass =
  'min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-600';

const textareaClass =
  'rounded-xl border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-950 outline-none focus:border-blue-600';

const emptyForm: ApiKeyForm = {
  name: '',
  display_name: '',
  welcome_message: '',
  temperature: '0.7',
  avatar_url: '',
  system_prompt: '',
  is_active: true,
};

function toForm(item: ApiKeyItem): ApiKeyForm {
  return {
    name: item.name,
    display_name: item.display_name,
    welcome_message: item.welcome_message || '',
    temperature: String(item.temperature),
    avatar_url: item.avatar_url || '',
    system_prompt: item.system_prompt || '',
    is_active: item.is_active,
  };
}

function toPayload(form: ApiKeyForm): ApiKeyPayload {
  const temperature = Number(form.temperature);

  return {
    name: form.name,
    display_name: form.display_name,
    welcome_message: form.welcome_message || null,
    temperature: Number.isFinite(temperature) ? temperature : 0.7,
    avatar_url: form.avatar_url || null,
    system_prompt: form.system_prompt || null,
    is_active: form.is_active,
  };
}

export default function ApiKeysModule() {
  const toast = useToast();

  const [items, setItems] = useState<ApiKeyItem[]>([]);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewing, setViewing] = useState<ApiKeyItem | null>(null);
  const [form, setForm] = useState<ApiKeyForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const total = useMemo(() => items.length, [items]);

  async function loadApiKeys(showSuccess = false) {
    try {
      setLoading(true);

      const data = await getApiKeys();

      setItems(data);
      setViewing((current) => (current ? data.find((item) => item.id === current.id) || null : null));

      if (showSuccess) {
        toast.success('API keys refreshed successfully.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApiKeys();
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setViewing(null);
    setFormMode('create');
  }

  function openEdit(item: ApiKeyItem) {
    setForm(toForm(item));
    setEditingId(item.id);
    setViewing(null);
    setFormMode('edit');
  }

  function closeForm() {
    setForm(emptyForm);
    setEditingId(null);
    setFormMode(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);

      if (formMode === 'edit' && editingId) {
        const updated = await updateApiKey(editingId, toPayload(form));

        setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setViewing(updated);
        toast.success('API key updated successfully.');
        closeForm();
        return;
      }

      const created = await createApiKey(toPayload(form));

      setItems((current) => [created, ...current]);
      setViewing(created);
      toast.success('API key created successfully. Copy the full key now.');
      closeForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(item: ApiKeyItem) {
    if (!confirm(`Delete API key "${item.name}"?`)) return;

    try {
      await deleteApiKey(item.id);

      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setViewing((current) => (current?.id === item.id ? null : current));
      toast.success('API key deleted successfully.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete API key');
    }
  }

  async function rotateKey(item: ApiKeyItem) {
    try {
      const rotated = await rotateApiKey(item.id);

      setItems((current) => current.map((entry) => (entry.id === rotated.id ? rotated : entry)));
      setViewing(rotated);
      toast.success('API key rotated. Copy the new full key now.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rotate API key');
    }
  }

  async function copyKey(item: ApiKeyItem) {
    await navigator.clipboard.writeText(item.key_value || item.key_preview);
    toast.success(item.key_value ? 'Full API key copied.' : 'Key preview copied.');
  }

  if (formMode) {
    return (
      <div className="dashboard-page">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">API Keys</h2>
            <p className="mt-1 text-sm text-slate-600">
              Each API key can have its own chatbot character while sharing the selected agent&apos;s resources.
            </p>
          </div>

          <div className="flex gap-3">
            <button className={buttonClass} type="button" onClick={() => loadApiKeys(true)} disabled={loading}>
              <RefreshCw size={16} />
              Refresh
            </button>
            <button className={darkButtonClass} type="button" onClick={closeForm}>
              Cancel
            </button>
          </div>
        </div>

        <form className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
          <h3 className="mb-6 text-lg font-black text-slate-950">
            {formMode === 'create' ? 'Create API Key' : 'Edit API Key'}
          </h3>

          <div className="grid gap-5 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Internal Name
              <input
                className={inputClass}
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. Website Chat Widget"
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Display Name
              <input
                className={inputClass}
                value={form.display_name}
                onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))}
                placeholder="e.g. Oz"
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Avatar URL
              <input
                className={inputClass}
                value={form.avatar_url}
                onChange={(event) => setForm((current) => ({ ...current, avatar_url: event.target.value }))}
                placeholder="https://example.com/avatar.png"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Temperature
              <input
                className={inputClass}
                value={form.temperature}
                onChange={(event) => setForm((current) => ({ ...current, temperature: event.target.value }))}
                placeholder="0.7"
              />
            </label>
          </div>

          <label className="mt-5 grid gap-2 text-sm font-semibold text-slate-700">
            Welcome Message
            <textarea
              className={`${textareaClass} min-h-[90px]`}
              value={form.welcome_message}
              onChange={(event) => setForm((current) => ({ ...current, welcome_message: event.target.value }))}
              placeholder="Hi! How can I help you today?"
            />
          </label>

          <label className="mt-5 grid gap-2 text-sm font-semibold text-slate-700">
            System Prompt
            <textarea
              className={`${textareaClass} min-h-[220px]`}
              value={form.system_prompt}
              onChange={(event) => setForm((current) => ({ ...current, system_prompt: event.target.value }))}
              placeholder="You are a calm, helpful assistant..."
            />
          </label>

          <div className="mt-5 flex items-center justify-between gap-4">
            <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
              />
              Active
            </label>

            <button className={primaryButtonClass} type="submit" disabled={saving}>
              <Save size={16} />
              {saving ? 'Saving...' : formMode === 'create' ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-950">API Keys</h2>
          <p className="mt-1 text-sm text-slate-600">
            Each API key can have its own chatbot character while sharing the selected agent&apos;s resources.
          </p>
        </div>

        <div className="flex gap-3">
          <button className={buttonClass} type="button" onClick={() => loadApiKeys(true)} disabled={loading}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className={primaryButtonClass} type="button" onClick={openCreate}>
            <Plus size={16} />
            Add New
          </button>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-950">Keys</h3>
          <p className="text-sm font-semibold text-slate-600">Total: {total}</p>
        </div>

        {loading ? (
          <div className="py-10 text-center text-slate-500">Loading API keys...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <th className="p-4">Name</th>
                  <th className="p-4">Key</th>
                  <th className="p-4">Active</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50/80">
                    <td className="p-4 align-middle">
                      <div className="font-black text-slate-950">{item.name}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">{item.display_name}</div>
                    </td>

                    <td className="p-4 align-middle">
                      <span className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-bold text-slate-950">
                        {item.key_preview}
                      </span>
                    </td>

                    <td className="p-4 align-middle">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-black ${
                          item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="p-4 align-middle">
                      <div className="flex justify-end gap-2">
                        <button className={buttonClass} type="button" onClick={() => setViewing(item)}>
                          <Eye size={16} />
                          View
                        </button>
                        <button className={buttonClass} type="button" onClick={() => openEdit(item)}>
                          <Pencil size={16} />
                          Edit
                        </button>
                        <button className={dangerButtonClass} type="button" onClick={() => deleteItem(item)}>
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      No API keys found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {viewing && (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-950">{viewing.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{viewing.display_name}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button className={buttonClass} type="button" onClick={() => copyKey(viewing)}>
                <Copy size={16} />
                Copy
              </button>
              <button className={buttonClass} type="button" onClick={() => rotateKey(viewing)}>
                <RotateCw size={16} />
                Rotate
              </button>
              <button className={primaryButtonClass} type="button" onClick={() => openEdit(viewing)}>
                <Pencil size={16} />
                Edit
              </button>
            </div>
          </div>

          {viewing.key_value && (
            <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-900">
              New key: {viewing.key_value}
            </div>
          )}

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h4 className="font-black text-slate-950">Welcome Message</h4>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {viewing.welcome_message || '-'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h4 className="font-black text-slate-950">System Prompt</h4>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {viewing.system_prompt || '-'}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}