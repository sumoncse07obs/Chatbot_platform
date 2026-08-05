import { useEffect, useState } from 'react';
import {
  Bot,
  Brain,
  CircleAlert,
  HelpCircle,
  Lightbulb,
  LoaderCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

import {
  ApiKeyItem,
  getApiKeys,
} from '@/components/customer/module/apikeys/api/apikeyapi';
import {
  AgentProfile,
  generateAgentProfile,
  getAgentProfile,
} from '@/components/customer/module/agent/api/agentapi';
import { useToast } from '@/components/shared/toast/ToastProvider';

const buttonClass =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-extrabold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';

const primaryButtonClass =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-4 text-sm font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';

function ListCard({
  title,
  items,
  icon,
  emptyText,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  emptyText: string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-2xl bg-blue-50 text-blue-600">
          {icon}
        </div>
        <h3 className="text-lg font-black text-slate-950">{title}</h3>
      </div>

      {items.length > 0 ? (
        <ul className="mt-5 grid gap-3">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm leading-6 text-slate-500">{emptyText}</p>
      )}
    </section>
  );
}

export default function AgentModule() {
  const toast = useToast();

  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [selectedApiKeyId, setSelectedApiKeyId] = useState('');
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const selectedApiKey =
    apiKeys.find((item) => String(item.id) === selectedApiKeyId) || null;

  async function loadProfile(apiKeyId: number) {
    try {
      setLoading(true);
      const data = await getAgentProfile(apiKeyId);
      setProfile(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load Agent Profile';

      if (message.includes('not been generated yet')) {
        setProfile(null);
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadPage() {
    try {
      setLoading(true);

      const keys = await getApiKeys();
      const activeKeys = keys.filter((item) => item.is_active);

      setApiKeys(activeKeys);

      const firstKey = activeKeys[0];

      if (!firstKey) {
        setSelectedApiKeyId('');
        setProfile(null);
        return;
      }

      setSelectedApiKeyId(String(firstKey.id));
      await loadProfile(firstKey.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load Agent Setup');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function changeApiKey(apiKeyId: string) {
    setSelectedApiKeyId(apiKeyId);
    setProfile(null);

    if (apiKeyId) {
      await loadProfile(Number(apiKeyId));
    }
  }

  async function generateProfile(force = true) {
    if (!selectedApiKey) {
      toast.error('Create an active API key before building the agent.');
      return;
    }

    try {
      setGenerating(true);

      const data = await generateAgentProfile({
        api_key_id: selectedApiKey.id,
        force,
      });

      setProfile(data);

      if (data.is_ready) {
        toast.success('Agent understanding generated successfully.');
      } else {
        toast.error('Add and index resources before building the agent.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate Agent Profile');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="dashboard-page">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-700">
            <Brain size={15} />
            Automatic Agent Brain
          </div>

          <h2 className="mt-3 text-2xl font-black text-slate-950">Agent Setup</h2>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Your agent automatically learns from active, indexed resources. It uses this
            understanding to explain what it can help with and guide visitors naturally.
          </p>
        </div>

        <button
          className={primaryButtonClass}
          type="button"
          onClick={() => generateProfile(true)}
          disabled={!selectedApiKey || generating}
        >
          {generating ? <LoaderCircle className="animate-spin" size={16} /> : <Sparkles size={16} />}
          {generating ? 'Building agent...' : 'Rebuild agent'}
        </button>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="grid max-w-xl gap-2 text-sm font-bold text-slate-700">
          Select chatbot API key
          <select
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-600"
            value={selectedApiKeyId}
            onChange={(event) => changeApiKey(event.target.value)}
            disabled={loading || generating}
          >
            {apiKeys.length === 0 ? (
              <option value="">No active API keys available</option>
            ) : (
              apiKeys.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.display_name} — {item.name}
                </option>
              ))
            )}
          </select>
        </label>

        {selectedApiKey && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-4">
            <div className="grid size-10 place-items-center rounded-xl bg-slate-950 text-white">
              <Bot size={19} />
            </div>

            <div>
              <p className="font-black text-slate-950">{selectedApiKey.display_name}</p>
              <p className="text-sm text-slate-500">
                {profile?.is_ready ? 'Agent profile is ready' : 'Agent profile needs resources'}
              </p>
            </div>

            {profile?.last_generated_at && (
              <p className="ml-auto text-xs font-semibold text-slate-500">
                Updated {new Date(profile.last_generated_at).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </section>

      {loading ? (
        <section className="mt-6 grid min-h-56 place-items-center rounded-3xl border border-slate-200 bg-white">
          <div className="inline-flex items-center gap-3 text-sm font-bold text-slate-500">
            <LoaderCircle className="animate-spin" size={20} />
            Loading agent understanding...
          </div>
        </section>
      ) : !selectedApiKey ? (
        <section className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <Bot className="mx-auto text-slate-400" size={32} />
          <h3 className="mt-4 text-lg font-black text-slate-950">Create an API key first</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
            Each chatbot needs an active API key before the platform can build its Agent Profile.
          </p>
        </section>
      ) : !profile || !profile.is_ready ? (
        <section className="mt-6 rounded-3xl border border-dashed border-blue-300 bg-blue-50 p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white">
              <Lightbulb size={23} />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-black text-slate-950">Build your agent understanding</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
                Add active resources first—such as business details, services, FAQs, policies,
                pricing, or website content. Then click Build Agent. The platform will create the
                business summary and topics automatically.
              </p>

              {profile?.missing_information.length ? (
                <ul className="mt-4 grid gap-2 text-sm text-slate-700">
                  {profile.missing_information.map((item) => (
                    <li key={item} className="flex gap-2">
                      <CircleAlert className="mt-0.5 shrink-0 text-amber-600" size={16} />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}

              <button
                className={`${primaryButtonClass} mt-5`}
                type="button"
                onClick={() => generateProfile(true)}
                disabled={generating}
              >
                {generating ? <LoaderCircle className="animate-spin" size={16} /> : <Sparkles size={16} />}
                {generating ? 'Building agent...' : 'Build agent'}
              </button>
            </div>
          </div>
        </section>
      ) : (
        <div className="mt-6 grid gap-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Brain size={21} />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-950">What your agent understands</h3>
                <p className="text-sm text-slate-500">Generated automatically from your indexed resources.</p>
              </div>
            </div>

            <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {profile.business_summary || 'No business summary is available yet.'}
            </p>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <ListCard
              title="Supported topics"
              items={profile.supported_topics}
              icon={<Bot size={20} />}
              emptyText="No supported topics were detected."
            />

            <ListCard
              title="Services and products"
              items={profile.services}
              icon={<Sparkles size={20} />}
              emptyText="No specific services or products were detected."
            />

            <ListCard
              title="Suggested visitor questions"
              items={profile.suggested_questions}
              icon={<HelpCircle size={20} />}
              emptyText="No suggested questions were generated."
            />

            <ListCard
              title="Information to improve"
              items={profile.missing_information}
              icon={<CircleAlert size={20} />}
              emptyText="No important missing information was detected."
            />
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Human support fallback</h3>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {profile.handoff_message || 'No handoff message was generated.'}
            </p>

            <button
              className={`${buttonClass} mt-5`}
              type="button"
              onClick={() => generateProfile(true)}
              disabled={generating}
            >
              <RefreshCw className={generating ? 'animate-spin' : ''} size={16} />
              Refresh from resources
            </button>
          </section>
        </div>
      )}
    </div>
  );
}