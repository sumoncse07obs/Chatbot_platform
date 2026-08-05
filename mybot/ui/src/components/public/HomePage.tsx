import { useState } from 'react';
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Code2,
  Database,
  KeyRound,
  LockKeyhole,
  MessageCircle,
  Play,
  PlugZap,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Workflow,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const WIDGET_URL =
  'https://fapibot.vercel.app/widget?api_key=ck_live_0Ifb90uKaH89Yy_pGQl4hlW-djpgIhk3x5ml1Vy-qQU&external_user_id=anonymous';

const visitorSteps = [
  {
    number: '01',
    title: 'Open the chat',
    description: 'Click “Chat with me” to open the live chatbot demo.',
  },
  {
    number: '02',
    title: 'Enter your name',
    description: 'The chatbot starts by learning who it is speaking with.',
  },
  {
    number: '03',
    title: 'Ask naturally',
    description: 'Ask a question in your own words about services, support, pricing, or projects.',
  },
  {
    number: '04',
    title: 'Get guided help',
    description: 'The assistant answers from approved business knowledge and guides the next step.',
  },
];

const setupSteps = [
  {
    icon: KeyRound,
    title: 'Create your chatbot key',
    description: 'Configure the chatbot name, welcome message, API key, and assistant behavior.',
  },
  {
    icon: UploadCloud,
    title: 'Add business resources',
    description: 'Upload FAQs, PDFs, DOCX files, website content, services, and business information.',
  },
  {
    icon: BrainCircuit,
    title: 'Build the agent',
    description: 'Generate an agent profile so the chatbot understands your services, topics, and business goals.',
  },
  {
    icon: PlugZap,
    title: 'Install the widget',
    description: 'Copy one embed snippet and add the chatbot to your website or application.',
  },
];

const whatWeBuild = [
  {
    icon: MessageCircle,
    title: 'AI customer support chatbots',
    description: 'Answer customer questions from approved business information, FAQs, documents, services, and policies.',
  },
  {
    icon: BrainCircuit,
    title: 'RAG knowledge-base assistants',
    description: 'Turn PDFs, DOCX files, text, and website content into a searchable AI knowledge base with semantic search.',
  },
  {
    icon: Workflow,
    title: 'AI agent conversation flows',
    description: 'Route conversations, detect intent, guide visitors, collect leads, and hand important requests to a human team.',
  },
  {
    icon: PlugZap,
    title: 'Embeddable website chat widgets',
    description: 'Install a branded chatbot on React, WordPress, Laravel, Shopify, or custom websites using one embed snippet.',
  },
  {
    icon: KeyRound,
    title: 'Lead capture during chat',
    description: 'Capture visitor names, emails, and phone numbers naturally during conversation without opening a contact form.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure AI business platform',
    description: 'Manage API keys, resources, agent settings, conversations, roles, and customer data in one dashboard.',
  },
];

const technologies = [
  {
    icon: Code2,
    title: 'React + TypeScript',
    description: 'A responsive customer dashboard and embeddable website chat widget built for a fast, clean experience.',
  },
  {
    icon: Workflow,
    title: 'Python + FastAPI',
    description: 'An asynchronous AI microservice that manages chat, authentication, resources, agent logic, leads, and widget access.',
  },
  {
    icon: Database,
    title: 'PostgreSQL + pgvector',
    description: 'Stores chatbot settings, conversations, visitor leads, business resources, and vector embeddings for semantic search.',
  },
  {
    icon: BrainCircuit,
    title: 'OpenAI + GPT models',
    description: 'Uses OpenAI chat, embedding, speech, and transcription capabilities to power intelligent conversations.',
  },
  {
    icon: UploadCloud,
    title: 'RAG + semantic retrieval',
    description: 'Processes PDF, DOCX, text, and website knowledge into chunks and retrieves relevant context before answering.',
  },
  {
    icon: LockKeyhole,
    title: 'JWT + encrypted credentials',
    description: 'Role-based authentication, protected dashboard access, encrypted AI API keys, and Alembic database migrations.',
  },
];

export default function HomePage() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  function openChat() {
    setIsChatOpen(true);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <nav className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2 text-lg font-black tracking-tight">
            <span className="grid size-9 place-items-center rounded-xl bg-blue-600">
              <Bot size={20} />
            </span>
            YourBot
          </Link>

          <div className="flex items-center gap-3">
            <a
              href="#how-it-works"
              className="hidden text-sm font-semibold text-slate-300 transition hover:text-white md:block"
            >
              How it works
            </a>
            <a
              href="#what-we-build"
              className="hidden text-sm font-semibold text-slate-300 transition hover:text-white md:block"
            >
              What we build
            </a>
            <a
              href="#technology"
              className="hidden text-sm font-semibold text-slate-300 transition hover:text-white md:block"
            >
              Technology
            </a>
            <button
              type="button"
              onClick={openChat}
              className="hidden rounded-xl px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10 sm:inline-flex"
            >
              Try demo
            </button>
            <Link
              to="/login"
              className="rounded-xl bg-white px-4 py-2 text-sm font-extrabold text-slate-950 transition hover:bg-blue-100"
            >
              Login
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(37,99,235,0.35),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(14,165,233,0.24),transparent_25%)]" />

        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-200">
              <Sparkles size={16} />
              AI chatbot and AI agent platform
            </p>

            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              Turn your business knowledge into helpful AI conversations.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              YourBot gives website visitors grounded answers from your approved business
              information. It guides customers naturally, captures leads during chat, and helps
              your business stay available around the clock.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={openChat}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-extrabold text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-500"
              >
                Chat with me
                <MessageCircle size={18} />
              </button>

              <a
                href="#what-we-build"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 font-bold text-slate-100 transition hover:bg-white/10"
              >
                Explore capabilities
                <ArrowRight size={18} />
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-300">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={17} className="text-blue-400" />
                RAG knowledge search
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={17} className="text-blue-400" />
                Natural lead capture
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={17} className="text-blue-400" />
                Website-ready widget
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/8 p-5 shadow-2xl shadow-black/30 backdrop-blur sm:p-7">
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <span className="grid size-10 place-items-center rounded-xl bg-blue-600">
                  <Bot size={21} />
                </span>
                <div>
                  <p className="font-extrabold">YourBot Assistant</p>
                  <p className="text-xs text-emerald-400">● Online now</p>
                </div>
              </div>

              <div className="space-y-4 py-6 text-sm">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-800 px-4 py-3 text-slate-200">
                  Hi! Before we begin, what name should I use for you?
                </div>
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-3">
                  I’m Rahim. Can you build a chatbot for my business?
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-800 px-4 py-3 text-slate-200">
                  Nice to meet you, Rahim. Yes—we can help build a chatbot using your documents,
                  FAQs, website content, and business knowledge.
                </div>
              </div>

              <button
                type="button"
                onClick={openChat}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-blue-100"
              >
                <Play size={16} fill="currentColor" />
                Open live demo
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white py-20 text-slate-950">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-blue-600">
              How it works for visitors
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              A simple conversation, not a confusing support form.
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              Visitors ask in their own words. The chatbot uses your approved knowledge to answer,
              guide the conversation, and collect contact details naturally when follow-up is useful.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {visitorSteps.map((step) => (
              <article key={step.number} className="rounded-2xl border border-slate-200 p-6">
                <span className="text-sm font-black text-blue-600">{step.number}</span>
                <h3 className="mt-6 text-xl font-extrabold">{step.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="what-we-build" className="bg-slate-950 py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-blue-300">
              What we can build
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              AI chatbot and AI agent solutions for real business work.
            </h2>
            <p className="mt-4 leading-7 text-slate-300">
              YourBot is designed for businesses that need more than a basic chat box. Build a
              knowledge assistant, a lead-generation chatbot, or an AI support experience around
              your company’s real information.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {whatWeBuild.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <span className="grid size-11 place-items-center rounded-xl bg-blue-600 text-white">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-6 text-xl font-extrabold">{item.title}</h3>
                  <p className="mt-3 leading-7 text-slate-300">{item.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-slate-100 py-20 text-slate-950">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-blue-600">
                How businesses set it up
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Set up your chatbot in four clear steps.
              </h2>
              <p className="mt-4 leading-7 text-slate-600">
                Control your business information, assistant behavior, AI resources, leads, and
                website widget from one customer dashboard.
              </p>

              <Link
                to="/register"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-extrabold text-white transition hover:bg-slate-800"
              >
                Create your chatbot
                <ArrowRight size={18} />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {setupSteps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <article key={step.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600">
                        <Icon size={22} />
                      </span>
                      <span className="text-sm font-black text-slate-400">0{index + 1}</span>
                    </div>
                    <h3 className="mt-6 text-lg font-extrabold">{step.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="technology" className="bg-white py-20 text-slate-950">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-blue-600">
              Technology we use
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Built as a real AI platform, not just a chat box.
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              YourBot combines modern web development, secure data storage, large language models,
              vector embeddings, and semantic search to create useful AI experiences around your
              business knowledge.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {technologies.map((technology) => {
              const Icon = technology.icon;

              return (
                <article key={technology.title} className="rounded-2xl border border-slate-200 p-6">
                  <span className="grid size-11 place-items-center rounded-xl bg-slate-950 text-white">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-6 text-xl font-extrabold">{technology.title}</h3>
                  <p className="mt-3 leading-7 text-slate-600">{technology.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <MessageCircle className="text-blue-400" size={30} />
            <h2 className="mt-6 text-2xl font-black">Try the chatbot now</h2>
            <p className="mt-3 leading-7 text-slate-300">
              Open the live demo, ask a genuine question, and experience the visitor journey.
            </p>
            <button
              type="button"
              onClick={openChat}
              className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-extrabold transition hover:bg-blue-500"
            >
              Chat with me
            </button>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white p-8 text-slate-950">
            <ShieldCheck className="text-blue-600" size={30} />
            <h2 className="mt-6 text-2xl font-black">Manage your chatbot</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Sign in to manage resources, AI settings, agent understanding, API keys, widget
              installation, conversation history, and visitor leads.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 font-extrabold text-white transition hover:bg-slate-800"
            >
              Login to dashboard
            </Link>
          </article>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-7 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} YourBot. AI chat support made simple.
      </footer>

      <button
        type="button"
        onClick={() => setIsChatOpen((isOpen) => !isOpen)}
        className="fixed bottom-5 right-5 z-[999999] inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 font-extrabold text-white shadow-[0_12px_35px_rgba(37,99,235,0.4)] transition hover:bg-blue-500"
        aria-expanded={isChatOpen}
        aria-controls="chat-widget"
      >
        {isChatOpen ? <X size={18} /> : <MessageCircle size={18} />}
        {isChatOpen ? 'Close chat' : 'Chat with me'}
      </button>

      {isChatOpen && (
        <div
          id="chat-widget"
          className="fixed bottom-[76px] right-5 z-[999999] h-[620px] w-[380px] overflow-hidden rounded-2xl bg-white shadow-[0_14px_40px_rgba(0,0,0,0.3)] max-sm:bottom-[76px] max-sm:left-3 max-sm:right-3 max-sm:h-[calc(100dvh-96px)] max-sm:w-auto"
        >
          <iframe
            src={WIDGET_URL}
            title="Chat with me"
            allow="microphone; autoplay"
            className="h-full w-full border-0 bg-transparent"
          />
        </div>
      )}
    </main>
  );
}