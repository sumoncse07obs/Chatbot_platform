import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5 py-8">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-5xl font-bold text-slate-950">404</h1>
        <p className="mt-3 text-slate-500">This page does not exist.</p>
        <Link
          to="/login"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-blue-600 px-5 font-bold text-white hover:bg-blue-700"
        >
          Back to login
        </Link>
      </section>
    </main>
  );
}
