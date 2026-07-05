import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Copy, Eye, MessageCircle, Plus, RefreshCw, Save, Send, Trash2 } from 'lucide-react';
import { API_BASE } from '@/api/context/apiClient';
import { ApiKeyItem, getApiKeys, revealApiKey } from '@/components/customer/module/apikeys/api/apikeyapi';
import {
  createWidgetInstall,
  deleteWidgetInstall,
  getWidgetInstalls,
  updateWidgetInstall,
  WidgetInstall,
  WidgetInstallPayload,
} from '@/components/customer/module/widget-install/api/widgetinstallapi';
import { useToast } from '@/components/shared/toast/ToastProvider';

type EmbedType = 'iframe' | 'loader';
type PositionType = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

type WidgetForm = {
  id: number | null;
  name: string;
  apiKeyId: string;
  externalUserId: string;
  embedType: EmbedType;
  position: PositionType;
  width: number;
  height: number;
  buttonTextOpen: string;
  buttonTextClose: string;
  zIndex: number;
  isActive: boolean;
};

type PreviewMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatResponse = {
  answer: string;
  display_name?: string | null;
  avatar_url?: string | null;
  welcome_message?: string | null;
  used_resources?: Array<{
    resource_id: number;
    resource_title: string;
    resource_type: string;
    content: string;
    score: number;
  }>;
};

const DEFAULT_WIDTH = 380;
const DEFAULT_HEIGHT = 620;
const DEFAULT_Z_INDEX = 999999;

const buttonClass =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-extrabold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';

const primaryButtonClass =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-950 bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60';

const dangerButtonClass =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-extrabold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60';

const inputClass =
  'min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-600 disabled:bg-slate-50 disabled:text-slate-500';

const labelClass = 'grid gap-2 text-sm font-bold text-slate-700';

const defaultForm: WidgetForm = {
  id: null,
  name: 'Main Website Widget',
  apiKeyId: '',
  externalUserId: 'demo-user-123',
  embedType: 'iframe',
  position: 'bottom-right',
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  buttonTextOpen: 'Chat',
  buttonTextClose: 'Close',
  zIndex: DEFAULT_Z_INDEX,
  isActive: true,
};

function toForm(widget: WidgetInstall): WidgetForm {
  return {
    id: widget.id,
    name: widget.name,
    apiKeyId: String(widget.api_key_id),
    externalUserId: widget.external_user_id || 'anonymous',
    embedType: widget.embed_type,
    position: widget.position,
    width: widget.width || DEFAULT_WIDTH,
    height: widget.height || DEFAULT_HEIGHT,
    buttonTextOpen: widget.button_text_open || 'Chat',
    buttonTextClose: widget.button_text_close || 'Close',
    zIndex: widget.z_index || DEFAULT_Z_INDEX,
    isActive: widget.is_active,
  };
}

function toPayload(form: WidgetForm): WidgetInstallPayload {
  return {
    name: form.name.trim() || 'Main Website Widget',
    api_key_id: Number(form.apiKeyId),
    external_user_id: form.externalUserId.trim() || 'anonymous',
    embed_type: form.embedType,
    position: form.position,
    width: Number(form.width) || DEFAULT_WIDTH,
    height: Number(form.height) || DEFAULT_HEIGHT,
    button_text_open: form.buttonTextOpen.trim() || 'Chat',
    button_text_close: form.buttonTextClose.trim() || 'Close',
    z_index: Number(form.zIndex) || DEFAULT_Z_INDEX,
    is_active: form.isActive,
  };
}

function keyLabel(key: ApiKeyItem) {
  return `${key.name} - ${key.key_preview}`;
}

function initialPreviewMessage(key?: ApiKeyItem | null): PreviewMessage {
  return {
    role: 'assistant',
    content: key?.welcome_message || 'Hi! How can I help you today?',
  };
}

export default function WidgetInstallModule() {
  const toast = useToast();

  const [configs, setConfigs] = useState<WidgetInstall[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [form, setForm] = useState<WidgetForm>(defaultForm);
  const [realKey, setRealKey] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMessages, setPreviewMessages] = useState<PreviewMessage[]>([]);
  const [previewInput, setPreviewInput] = useState('');
  const [chatting, setChatting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const selectedKey = useMemo(
    () => apiKeys.find((key) => String(key.id) === form.apiKeyId) || null,
    [apiKeys, form.apiKeyId],
  );

  const widgetUrl = useMemo(() => {
    if (!realKey.trim()) return '';

    const url = new URL(`${window.location.origin}/widget`);
    url.searchParams.set('api_key', realKey.trim());
    url.searchParams.set('external_user_id', form.externalUserId.trim() || 'anonymous');

    return url.toString();
  }, [form.externalUserId, realKey]);

  const positionCss = useMemo(() => {
    return {
      horizontal: form.position.includes('left') ? 'left:20px;' : 'right:20px;',
      vertical: form.position.includes('top') ? 'top:20px;' : 'bottom:20px;',
      frameVertical: form.position.includes('top') ? 'top:72px;' : 'bottom:72px;',
    };
  }, [form.position]);

  const iframeSnippet = useMemo(() => {
    if (!widgetUrl) return '';

    return `<div style="position:fixed;${positionCss.horizontal}${positionCss.vertical}z-index:${form.zIndex};width:${form.width}px;height:${form.height}px;border:1px solid rgba(0,0,0,.12);border-radius:16px;overflow:hidden;box-shadow:0 14px 40px rgba(0,0,0,.22);background:#fff;">
  <iframe
    src="${widgetUrl}"
    title="Chat Widget"
    style="width:100%;height:100%;border:0;background:transparent"
    allow="microphone; autoplay"
  ></iframe>
</div>`;
  }, [form.height, form.width, form.zIndex, positionCss.horizontal, positionCss.vertical, widgetUrl]);

  const loaderSnippet = useMemo(() => {
    if (!widgetUrl) return '';

    return `<script>
(function () {
  var widgetUrl = ${JSON.stringify(widgetUrl)};
  var buttonOpenText = ${JSON.stringify(form.buttonTextOpen || 'Chat')};
  var buttonCloseText = ${JSON.stringify(form.buttonTextClose || 'Close')};

  var button = document.createElement("button");
  button.innerText = buttonOpenText;
  button.style.cssText = "position:fixed;z-index:${form.zIndex};${positionCss.horizontal}${positionCss.vertical}padding:12px 16px;border-radius:999px;border:0;background:#111;color:#fff;font-weight:700;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.2)";

  var frameWrap = document.createElement("div");
  frameWrap.style.cssText = "display:none;position:fixed;z-index:${form.zIndex};${positionCss.horizontal}${positionCss.frameVertical}width:${form.width}px;height:${form.height}px;border-radius:16px;overflow:hidden;box-shadow:0 14px 40px rgba(0,0,0,.22);background:#fff";

  var iframe = document.createElement("iframe");
  iframe.src = widgetUrl;
  iframe.title = "Chat Widget";
  iframe.allow = "microphone; autoplay";
  iframe.style.cssText = "width:100%;height:100%;border:0;background:transparent";
  frameWrap.appendChild(iframe);

  button.onclick = function () {
    var open = frameWrap.style.display === "block";
    frameWrap.style.display = open ? "none" : "block";
    button.innerText = open ? buttonOpenText : buttonCloseText;
  };

  document.body.appendChild(button);
  document.body.appendChild(frameWrap);
})();
</script>`;
  }, [
    form.buttonTextClose,
    form.buttonTextOpen,
    form.height,
    form.width,
    form.zIndex,
    positionCss.frameVertical,
    positionCss.horizontal,
    positionCss.vertical,
    widgetUrl,
  ]);

  async function loadPage(showSuccess = false) {
    try {
      setLoading(true);

      const [keys, widgets] = await Promise.all([getApiKeys(), getWidgetInstalls()]);

      setApiKeys(keys);
      setConfigs(widgets);

      setForm((current) => {
        const currentStillExists = current.id ? widgets.find((widget) => widget.id === current.id) : null;

        if (currentStillExists) return toForm(currentStillExists);
        if (widgets.length > 0) return toForm(widgets[0]);

        const firstActiveKey = keys.find((key) => key.is_active) || keys[0];

        return {
          ...defaultForm,
          apiKeyId: firstActiveKey ? String(firstActiveKey.id) : '',
        };
      });

      if (showSuccess) toast.success('Widget install data refreshed.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load widget install data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  function updateForm(patch: Partial<WidgetForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function resetPreview() {
    setRealKey('');
    setPreviewOpen(false);
    setPreviewInput('');
    setPreviewMessages([]);
  }

  function clearForm() {
    const firstActiveKey = apiKeys.find((key) => key.is_active) || apiKeys[0];

    setForm({
      ...defaultForm,
      apiKeyId: firstActiveKey ? String(firstActiveKey.id) : '',
    });
    resetPreview();
  }

  function editConfig(config: WidgetInstall) {
    setForm(toForm(config));
    resetPreview();
  }

  async function saveConfig() {
    if (!form.apiKeyId) {
      toast.error('Please select an API key.');
      return;
    }

    if (!form.name.trim()) {
      toast.error('Please enter a widget config name.');
      return;
    }

    try {
      setSaving(true);

      const payload = toPayload(form);
      const saved = form.id ? await updateWidgetInstall(form.id, payload) : await createWidgetInstall(payload);

      setConfigs((current) => {
        const exists = current.some((item) => item.id === saved.id);
        return exists ? current.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...current];
      });

      setForm(toForm(saved));
      resetPreview();

      toast.success(form.id ? 'Widget config updated.' : 'Widget config created.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save widget config');
    } finally {
      setSaving(false);
    }
  }

  async function deleteConfig(id: number) {
    if (!confirm('Delete this widget config?')) return;

    try {
      setDeletingId(id);
      await deleteWidgetInstall(id);

      setConfigs((current) => current.filter((item) => item.id !== id));

      if (form.id === id) clearForm();

      toast.success('Widget config deleted.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete widget config');
    } finally {
      setDeletingId(null);
    }
  }

  async function revealSelectedKey() {
    if (!selectedKey) {
      toast.error('Please select an API key first.');
      return;
    }

    try {
      setRevealing(true);

      const response = await revealApiKey(selectedKey.id);

      setRealKey(response.key);
      setPreviewOpen(true);
      setPreviewInput('');
      setPreviewMessages([initialPreviewMessage(selectedKey)]);
      toast.success('Embed options and live preview generated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reveal API key');
    } finally {
      setRevealing(false);
    }
  }

  async function sendPreviewMessage(event: FormEvent) {
    event.preventDefault();

    const message = previewInput.trim();

    if (!message || !realKey || chatting) return;

    const userMessage: PreviewMessage = {
      role: 'user',
      content: message,
    };

    setPreviewMessages((current) => [...current, userMessage]);
    setPreviewInput('');

    try {
      setChatting(true);

      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: realKey,
          message,
          external_user_id: form.externalUserId.trim() || 'anonymous',
        }),
      });

      const data = (await response.json().catch(() => null)) as ChatResponse | { detail?: string } | null;

      if (!response.ok) {
        const detail = data && 'detail' in data ? data.detail : 'Chat request failed';
        throw new Error(detail || 'Chat request failed');
      }

      const chatData = data as ChatResponse;

      setPreviewMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: chatData.answer || 'I could not generate a response.',
        },
      ]);
    } catch (err) {
      setPreviewMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Failed to send message.',
        },
      ]);
    } finally {
      setChatting(false);
    }
  }

  async function copy(text: string) {
    if (!text) return;

    await navigator.clipboard.writeText(text);
    toast.success('Copied.');
  }

  return (
    <div className="dashboard-page">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-950">Widget Install</h2>
          <p className="mt-1 text-sm text-slate-600">Save, edit, preview, and delete widget embed configurations.</p>
        </div>

        <div className="flex gap-3">
          <button className={buttonClass} type="button" onClick={clearForm}>
            <Plus size={16} />
            Add new widget
          </button>
          <button className={buttonClass} type="button" onClick={() => loadPage(true)} disabled={loading}>
            <RefreshCw size={16} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-950">1) Saved Widget Configs</h3>
          <span className="text-sm font-semibold text-slate-500">{configs.length} saved</span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">Loading widget configs...</div>
        ) : configs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            No saved widget configs yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {configs.map((config) => (
              <div
                key={config.id}
                className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                  form.id === config.id ? 'border-slate-950 bg-slate-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div>
                  <div className="font-black text-slate-950">{config.name}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    {config.embed_type} · {config.position} · {config.width}x{config.height} ·{' '}
                    {config.external_user_id || 'anonymous'}
                    {!config.is_active ? ' · inactive' : ''}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className={buttonClass} type="button" onClick={() => editConfig(config)}>
                    {form.id === config.id ? 'Editing' : 'Edit'}
                  </button>
                  <button
                    className={dangerButtonClass}
                    type="button"
                    onClick={() => deleteConfig(config.id)}
                    disabled={deletingId === config.id}
                  >
                    <Trash2 size={16} />
                    {deletingId === config.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-black text-slate-950">2) {form.id ? 'Edit Widget Setup' : 'New Widget Setup'}</h3>

          <div className="flex gap-2">
            <button className={primaryButtonClass} type="button" onClick={saveConfig} disabled={saving || loading}>
              <Save size={16} />
              {saving ? 'Saving...' : form.id ? 'Update widget config' : 'Save widget config'}
            </button>
            <button className={buttonClass} type="button" onClick={clearForm}>
              Clear / New
            </button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <label className={labelClass}>
            Config name
            <input className={inputClass} value={form.name} onChange={(event) => updateForm({ name: event.target.value })} />
          </label>

          <label className={labelClass}>
            API Key
            <select
              className={inputClass}
              value={form.apiKeyId}
              onChange={(event) => {
                updateForm({ apiKeyId: event.target.value });
                resetPreview();
              }}
            >
              <option value="">Select API key</option>
              {apiKeys.map((key) => (
                <option key={key.id} value={key.id}>
                  {keyLabel(key)}
                </option>
              ))}
            </select>
            {selectedKey && <span className="text-xs font-semibold text-slate-500">Selected: {keyLabel(selectedKey)}</span>}
          </label>

          <label className={labelClass}>
            external_user_id
            <input
              className={inputClass}
              value={form.externalUserId}
              onChange={(event) => updateForm({ externalUserId: event.target.value })}
            />
          </label>

          <label className={labelClass}>
            Embed type
            <select className={inputClass} value={form.embedType} onChange={(event) => updateForm({ embedType: event.target.value as EmbedType })}>
              <option value="iframe">iframe</option>
              <option value="loader">loader</option>
            </select>
          </label>

          <label className={labelClass}>
            Position
            <select className={inputClass} value={form.position} onChange={(event) => updateForm({ position: event.target.value as PositionType })}>
              <option value="bottom-right">bottom-right</option>
              <option value="bottom-left">bottom-left</option>
              <option value="top-right">top-right</option>
              <option value="top-left">top-left</option>
            </select>
          </label>

          <label className={labelClass}>
            Is active
            <select
              className={inputClass}
              value={form.isActive ? 'active' : 'inactive'}
              onChange={(event) => updateForm({ isActive: event.target.value === 'active' })}
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </label>

          <label className={labelClass}>
            Width
            <input
              className={inputClass}
              type="number"
              min={240}
              max={1200}
              value={form.width}
              onChange={(event) => updateForm({ width: Number(event.target.value || DEFAULT_WIDTH) })}
            />
          </label>

          <label className={labelClass}>
            Height
            <input
              className={inputClass}
              type="number"
              min={240}
              max={1400}
              value={form.height}
              onChange={(event) => updateForm({ height: Number(event.target.value || DEFAULT_HEIGHT) })}
            />
          </label>

          <label className={labelClass}>
            Button open text
            <input
              className={inputClass}
              value={form.buttonTextOpen}
              onChange={(event) => updateForm({ buttonTextOpen: event.target.value })}
            />
          </label>

          <label className={labelClass}>
            Button close text
            <input
              className={inputClass}
              value={form.buttonTextClose}
              onChange={(event) => updateForm({ buttonTextClose: event.target.value })}
            />
          </label>

          <label className={`${labelClass} lg:col-span-2`}>
            z-index
            <input
              className={inputClass}
              type="number"
              min={1}
              value={form.zIndex}
              onChange={(event) => updateForm({ zIndex: Number(event.target.value || DEFAULT_Z_INDEX) })}
            />
          </label>
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-black text-slate-950">3) Reveal Real API Key for Preview / Embed</h3>
        <button className={`${buttonClass} mt-4`} type="button" onClick={revealSelectedKey} disabled={!selectedKey || revealing}>
          {revealing ? 'Revealing...' : 'Reveal real key'}
        </button>
        <p className="mt-3 text-xs font-semibold text-slate-500">
          Real API key is kept only in page state for preview/snippet generation and is not saved in localStorage.
        </p>
        {selectedKey && <p className="mt-2 text-xs font-semibold text-slate-500">Masked value from API: {selectedKey.key_preview}</p>}
      </section>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-black text-slate-950">4) Embed Options</h3>

        {!realKey ? (
          <p className="mt-4 text-sm text-slate-500">Reveal the real API key above to generate embed code.</p>
        ) : (
          <div className="mt-4 grid gap-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <b>Option A - Fixed Iframe Embed (mic enabled)</b>
                <button className={buttonClass} type="button" onClick={() => copy(iframeSnippet)}>
                  <Copy size={16} />
                  Copy
                </button>
              </div>
              <textarea className="min-h-[180px] w-full rounded-xl border border-slate-300 p-3 font-mono text-xs" readOnly value={iframeSnippet} />
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <b>Option B - Floating button loader (mic enabled)</b>
                <button className={buttonClass} type="button" onClick={() => copy(loaderSnippet)}>
                  <Copy size={16} />
                  Copy
                </button>
              </div>
              <textarea className="min-h-[220px] w-full rounded-xl border border-slate-300 p-3 font-mono text-xs" readOnly value={loaderSnippet} />
            </div>
          </div>
        )}

        <p className="mt-3 text-xs font-semibold text-slate-500">
          Tip: For mic inside an iframe, the iframe must include allow=&quot;microphone&quot;. Some sites also require HTTPS.
        </p>
      </section>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-950">5) Live Preview</h3>
          {realKey && (
            <button className={buttonClass} type="button" onClick={() => setPreviewOpen((value) => !value)}>
              <Eye size={16} />
              {previewOpen ? 'Hide preview' : 'Show preview'}
            </button>
          )}
        </div>

        {!realKey ? (
          <p className="text-sm text-slate-500">Reveal a real API key above to preview.</p>
        ) : previewOpen ? (
          <div className="flex justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div
              className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
              style={{ width: Math.min(form.width, 520), height: Math.min(form.height, 720) }}
            >
              <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-950 px-4 py-3 text-white">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
                  <MessageCircle size={18} />
                </div>
                <div>
                  <div className="text-sm font-black">{selectedKey?.display_name || selectedKey?.name || 'Chat'}</div>
                  <div className="text-xs text-white/70">Online</div>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-auto bg-slate-50 p-4">
                {previewMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`max-w-[85%] rounded-2xl p-3 text-sm leading-6 shadow-sm ${
                      message.role === 'user'
                        ? 'ml-auto rounded-tr-md bg-blue-600 font-semibold text-white'
                        : 'rounded-tl-md bg-white text-slate-700'
                    }`}
                  >
                    {message.content}
                  </div>
                ))}

                {chatting && (
                  <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white p-3 text-sm leading-6 text-slate-500 shadow-sm">
                    Thinking...
                  </div>
                )}
              </div>

              <form onSubmit={sendPreviewMessage} className="border-t border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2">
                  <input
                    className="min-h-10 flex-1 rounded-full border border-slate-300 px-4 text-sm outline-none focus:border-blue-600"
                    value={previewInput}
                    onChange={(event) => setPreviewInput(event.target.value)}
                    placeholder="Type your message..."
                    disabled={chatting}
                  />
                  <button
                    className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    type="submit"
                    disabled={chatting || !previewInput.trim()}
                    aria-label="Send preview message"
                  >
                    <Send size={17} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Preview is ready.</p>
        )}
      </section>
    </div>
  );
}