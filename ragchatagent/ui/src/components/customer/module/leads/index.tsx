import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Mail, Phone, RefreshCw, Search, UserRound } from 'lucide-react';
import { Lead, listLeads } from '@/components/customer/module/history/api/historyapi';

function formatDate(value?: string | null) {
  if (!value) return 'No date';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';

  return date.toLocaleString();
}

function leadName(lead: Lead) {
  return lead.name || lead.email || lead.phone || lead.external_user_id || `Lead #${lead.id}`;
}

export default function LeadsModule() {
  const [search, setSearch] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedId) || null,
    [leads, selectedId],
  );

  async function loadLeads(nextPage = 1) {
    try {
      setLoading(true);
      setError('');

      const response = await listLeads({
        search,
        page: nextPage,
        per_page: 20,
      });

      const rows = Array.isArray(response.data) ? response.data : [];

      setLeads(rows);
      setPage(response.page || nextPage);
      setLastPage(response.last_page || 1);
      setTotal(response.total || 0);

      setSelectedId((current) => {
        if (!rows.length) return null;
        if (current && rows.some((lead) => lead.id === current)) return current;
        return rows[0].id;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    loadLeads(1);
  }

  useEffect(() => {
    loadLeads(1);
  }, []);

  return (
    <div className="dashboard-page">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-950">Leads</h2>
          <p className="mt-1 text-sm text-slate-600">
            Captured visitor contact details from widget conversations.
          </p>
        </div>

        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-extrabold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={() => loadLeads(page)}
          disabled={loading}
        >
          <RefreshCw size={16} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="grid h-[calc(100vh-190px)] min-h-[620px] gap-5 xl:grid-cols-[390px_1fr]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="shrink-0 border-b border-slate-200 p-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-950 outline-none focus:border-blue-600"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search leads"
                />
              </div>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                Search
              </button>
            </form>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {loading && leads.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">Loading leads...</div>
            ) : leads.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">No leads found.</div>
            ) : (
              leads.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => setSelectedId(lead.id)}
                  className={`block w-full border-b border-slate-100 p-4 text-left transition hover:bg-slate-50 ${
                    selectedId === lead.id ? 'bg-blue-50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-950 text-white">
                      <UserRound size={17} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black text-slate-950">{leadName(lead)}</div>
                      <div className="mt-1 truncate text-sm text-slate-600">
                        {lead.email || lead.phone || lead.external_user_id}
                      </div>
                      <div className="mt-2 text-xs font-semibold text-slate-500">
                        {lead.conversation_count} conversations
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between border-t border-slate-200 p-4 text-sm">
            <button
              className="rounded-xl border border-slate-300 px-3 py-2 font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => loadLeads(page - 1)}
            >
              Previous
            </button>
            <span className="font-semibold text-slate-500">
              Page {page} of {lastPage}
            </span>
            <button
              className="rounded-xl border border-slate-300 px-3 py-2 font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={page >= lastPage || loading}
              onClick={() => loadLeads(page + 1)}
            >
              Next
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h3 className="text-lg font-black text-slate-950">
              {selectedLead ? leadName(selectedLead) : 'Lead details'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {total} captured leads
            </p>
          </div>

          {!selectedLead ? (
            <div className="p-8 text-center text-sm text-slate-500">Select a lead to view details.</div>
          ) : (
            <div className="grid gap-4 p-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-black uppercase tracking-wider text-slate-400">Contact</div>
                <div className="mt-3 grid gap-3 text-sm font-semibold text-slate-700">
                  <div>Name: {selectedLead.name || '-'}</div>
                  <div className="flex items-center gap-2">
                    <Mail size={15} />
                    {selectedLead.email || '-'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={15} />
                    {selectedLead.phone || '-'}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-black uppercase tracking-wider text-slate-400">Source</div>
                <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-700">
                  <div>Widget: {selectedLead.display_name || selectedLead.api_key_name || '-'}</div>
                  <div>Visitor ID: {selectedLead.external_user_id}</div>
                  <div>Conversations: {selectedLead.conversation_count}</div>
                  <div>Last message: {formatDate(selectedLead.last_message_at)}</div>
                  <div>Captured: {formatDate(selectedLead.created_at)}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-black uppercase tracking-wider text-slate-400">Notes</div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {selectedLead.notes || 'No notes captured yet.'}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}