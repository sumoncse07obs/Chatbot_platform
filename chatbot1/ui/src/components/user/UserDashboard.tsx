import { MessageCircle, Sparkles, UserRound } from 'lucide-react';

const cards = [
  {
    icon: MessageCircle,
    title: 'Chat',
    text: 'Future area where users interact with the agent or RAG chatbot.',
  },
  {
    icon: UserRound,
    title: 'Profile',
    text: 'Manage user profile details and basic account information.',
  },
  {
    icon: Sparkles,
    title: 'AI Experience',
    text: 'Personalized AI responses and memory can be added here later.',
  },
];

export default function UserDashboard() {
  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-blue-600">
          User only
        </span>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">User Dashboard</h1>
        <p className="mt-2 text-slate-500">Only normal user accounts can access this dashboard.</p>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <Icon className="text-blue-600" />
              <h3 className="mt-4 text-xl font-bold text-slate-950">{card.title}</h3>
              <p className="mt-2 leading-6 text-slate-500">{card.text}</p>
            </article>
          );
        })}
      </section>
    </div>
  );
}
