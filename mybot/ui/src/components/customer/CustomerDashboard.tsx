import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Code2,
  KeyRound,
  Rocket,
  Settings2,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const setupSteps = [
  {
    step: 'Step 1',
    title: 'Set up your profile',
    description:
      'Add your business information and profile details so your workspace is ready to manage.',
    buttonLabel: 'Set up profile',
    to: '/customer/profile',
    icon: UserRound,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    step: 'Step 2',
    title: 'Add chatbot knowledge',
    description:
      'Add documents, website content, FAQs, and other resources your chatbot should use to answer visitors.',
    buttonLabel: 'Add resources',
    to: '/customer/resources',
    icon: BookOpen,
    color: 'bg-violet-50 text-violet-600',
  },
  {
    step: 'Step 3',
    title: 'Configure AI and create an API key',
    description:
      'Create your chatbot API key and set its name, welcome message, avatar, temperature, and system prompt.',
    buttonLabel: 'Configure chatbot',
    to: '/customer/apikeys',
    icon: Settings2,
    color: 'bg-amber-50 text-amber-600',
  },
  {
    step: 'Step 4',
    title: 'Create your website widget',
    description:
      'Choose the API key, button text, position, widget size, and create a saved widget configuration.',
    buttonLabel: 'Set up widget',
    to: '/customer/widget-install',
    icon: KeyRound,
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    step: 'Step 5',
    title: 'Copy code to your website',
    description:
      'In Widget Install, reveal your API key, choose iframe or loader code, and copy the generated code into your website.',
    buttonLabel: 'Get install code',
    to: '/customer/widget-install',
    icon: Code2,
    color: 'bg-rose-50 text-rose-600',
  },
];

export default function CustomerDashboard() {
  return (
    <div className="mx-auto max-w-6xl">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-7 text-white shadow-sm sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1.5 text-xs font-extrabold text-blue-100">
              <Rocket size={15} />
              Chatbot setup guide
            </span>

            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
              Set up your chatbot in five steps
            </h1>

            <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
              Complete these steps to train your chatbot, create a secure API key, and add a
              working chat widget to your website.
            </p>
          </div>

          <Link
            to="/customer/widget-install"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-blue-100"
          >
            Continue setup
            <ChevronRight size={17} />
          </Link>
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-5">
          <h2 className="text-2xl font-black text-slate-950">Setup checklist</h2>
          <p className="mt-1 text-sm text-slate-600">
            Follow the steps in order for the best chatbot experience.
          </p>
        </div>

        <div className="grid gap-4">
          {setupSteps.map((item, index) => {
            const Icon = item.icon;

            return (
              <article
                key={item.step}
                className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:flex-row sm:items-center sm:p-6"
              >
                <div
                  className={`grid size-12 shrink-0 place-items-center rounded-2xl ${item.color}`}
                >
                  <Icon size={22} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-blue-600">
                    {item.step}
                  </p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">{item.title}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </div>

                <Link
                  to={item.to}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-800 transition hover:border-blue-600 hover:bg-blue-50 hover:text-blue-700"
                >
                  {item.buttonLabel}
                  <ChevronRight size={16} />
                </Link>

                {index < setupSteps.length - 1 && (
                  <div className="hidden text-slate-300 lg:block">
                    <CheckCircle2 size={20} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-7 rounded-3xl border border-blue-100 bg-blue-50 p-6 sm:p-8">
        <h2 className="text-xl font-black text-slate-950">How to add the chatbot to your website</h2>

        <ol className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
          <li>
            <strong>1.</strong> Open <strong>Widget Install</strong> after creating an API key.
          </li>
          <li>
            <strong>2.</strong> Create and save a widget configuration with your preferred position
            and size.
          </li>
          <li>
            <strong>3.</strong> Click the option to reveal the API key and generate the embed code.
          </li>
          <li>
            <strong>4.</strong> Copy either the loader script or iframe code.
          </li>
          <li>
            <strong>5.</strong> Paste the copied code before the closing{' '}
            <code className="rounded bg-white px-1.5 py-0.5 font-bold">&lt;/body&gt;</code> tag of
            your website, then publish your website.
          </li>
        </ol>

        <Link
          to="/customer/widget-install"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-blue-700"
        >
          Open Widget Install
          <ChevronRight size={17} />
        </Link>
      </section>
    </div>
  );
}