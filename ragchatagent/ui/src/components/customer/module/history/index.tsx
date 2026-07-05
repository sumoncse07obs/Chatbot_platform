import { FormEvent, MouseEvent, useEffect, useMemo, useState } from 'react';
import { Clock, MessageCircle, RefreshCw, Search, Trash2 } from 'lucide-react';
import {
  deleteHistoryConversation,
  getHistoryConversation,
  listHistory,
  HistoryConversation,
  HistoryConversationDetail,
} from '@/components/customer/module/history/api/historyapi';

function formatDate(value?: string | null) {
  if (!value) return 'No date';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';

  return date.toLocaleString();
}

function truncate(value?: string | null, maxLength = 90) {
  const text = (value || '').trim();

  if (!text) return 'No messages yet';
  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength).trim()}...`;
}

export default function HistoryModule() {
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState<HistoryConversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<HistoryConversationDetail | null>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const selectedMeta = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) || null,
    [conversations, selectedId],
  );

  async function loadConversations(nextPage = 1, silent = false) {
    try {
      if (!silent) {
        setLoadingList(true);
        setError('');
      }

      const response = await listHistory({
        search,
        page: nextPage,
        per_page: 20,
      });

      const rows = Array.isArray(response.data) ? response.data : [];

      setConversations(rows);
      setPage(response.page || nextPage);
      setLastPage(response.last_page || 1);

      setSelectedId((current) => {
        if (!rows.length) {
          setSelectedConversation(null);
          return null;
        }

        if (current && rows.some((conversation) => conversation.id === current)) {
          return current;
        }

        return rows[0].id;
      });
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to load chat history');
      }
    } finally {
      if (!silent) {
        setLoadingList(false);
      }
    }
  }

  async function loadConversation(conversationId: number, silent = false) {
    try {
      if (!silent) {
        setLoadingThread(true);
        setError('');
      }

      const response = await getHistoryConversation(conversationId);
      setSelectedConversation(response);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to load conversation');
      }
      setSelectedConversation(null);
    } finally {
      if (!silent) {
        setLoadingThread(false);
      }
    }
  }

  async function deleteConversation(conversationId: number) {
    if (deletingId) return;

    const confirmed = window.confirm('Delete this conversation? This will remove all messages.');
    if (!confirmed) return;

    try {
      setDeletingId(conversationId);
      setError('');

      await deleteHistoryConversation(conversationId);

      const remaining = conversations.filter((conversation) => conversation.id !== conversationId);
      const deletedSelected = selectedId === conversationId;
      const nextSelectedId = deletedSelected ? remaining[0]?.id ?? null : selectedId;

      setConversations(remaining);
      setSelectedId(nextSelectedId);

      if (deletedSelected) {
        setSelectedConversation(null);

        if (nextSelectedId) {
          await loadConversation(nextSelectedId);
        }
      }

      if (remaining.length === 0 && page > 1) {
        await loadConversations(page - 1);
      } else {
        await loadConversations(page, true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete conversation');
    } finally {
      setDeletingId(null);
    }
  }

  function handleListDelete(event: MouseEvent<HTMLButtonElement>, conversationId: number) {
    event.stopPropagation();
    deleteConversation(conversationId);
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    loadConversations(1);
  }

  useEffect(() => {
    loadConversations(1);
  }, []);

  useEffect(() => {
    if (!selectedId) return;

    loadConversation(selectedId);
  }, [selectedId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadConversations(page, true);

      if (selectedId) {
        loadConversation(selectedId, true);
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [page, search, selectedId]);

  return (
    <div className="dashboard-page">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-950">History</h2>
          <p className="mt-1 text-sm text-slate-600">View widget conversations and messages.</p>
        </div>

        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-extrabold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={() => loadConversations(page)}
          disabled={loadingList}
        >
          <RefreshCw size={16} />
          {loadingList ? 'Refreshing...' : 'Refresh'}
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
                  placeholder="Search conversations"
                />
              </div>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loadingList}
              >
                Search
              </button>
            </form>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {loadingList && conversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">Loading history...</div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">No conversations found.</div>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={`block w-full border-b border-slate-100 p-4 text-left transition hover:bg-slate-50 ${
                    selectedId === conversation.id ? 'bg-blue-50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-950 text-white">
                      <MessageCircle size={17} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-slate-950">
                            {conversation.external_user_id || `Conversation #${conversation.id}`}
                          </div>
                          <div className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">
                            {truncate(conversation.last_message)}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500">#{conversation.id}</span>
                          <button
                            type="button"
                            className="grid h-8 w-8 place-items-center rounded-full text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={(event) => handleListDelete(event, conversation.id)}
                            disabled={deletingId === conversation.id}
                            aria-label="Delete conversation"
                            title="Delete conversation"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <Clock size={13} />
                        {formatDate(conversation.last_message_at || conversation.created_at)}
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
              disabled={page <= 1 || loadingList}
              onClick={() => loadConversations(page - 1)}
            >
              Previous
            </button>
            <span className="font-semibold text-slate-500">
              Page {page} of {lastPage}
            </span>
            <button
              className="rounded-xl border border-slate-300 px-3 py-2 font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={page >= lastPage || loadingList}
              onClick={() => loadConversations(page + 1)}
            >
              Next
            </button>
          </div>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="shrink-0 border-b border-slate-200 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  {selectedMeta?.external_user_id || selectedConversation?.external_user_id || 'Conversation'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedId ? `Conversation #${selectedId}` : 'Select a conversation'}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:items-end">
                <div className="text-sm font-semibold text-slate-500">
                  {formatDate(selectedMeta?.last_message_at || selectedConversation?.last_message_at)}
                </div>

                {selectedId && (
                  <button
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-extrabold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    onClick={() => deleteConversation(selectedId)}
                    disabled={deletingId === selectedId}
                  >
                    <Trash2 size={16} />
                    {deletingId === selectedId ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-5">
            {loadingThread ? (
              <div className="py-12 text-center text-sm text-slate-500">Loading conversation...</div>
            ) : !selectedConversation ? (
              <div className="py-12 text-center text-sm text-slate-500">No conversation selected.</div>
            ) : selectedConversation.messages.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">No messages found.</div>
            ) : (
              <div className="space-y-3">
                {selectedConversation.messages.map((message) => {
                  const isUser = message.role === 'user';

                  return (
                    <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[82%] rounded-2xl p-3 text-sm leading-6 shadow-sm ${
                          isUser
                            ? 'rounded-tr-md bg-blue-600 font-semibold text-white'
                            : 'rounded-tl-md bg-white text-slate-700'
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words">{message.content}</div>
                        <div className={`mt-2 text-[11px] ${isUser ? 'text-white/70' : 'text-slate-400'}`}>
                          {formatDate(message.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}