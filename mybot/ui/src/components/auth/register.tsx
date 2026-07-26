import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, dashboardPathForRole, saveAuth } from '@/api/auth/auth';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const auth = await register(form);
      saveAuth(auth);
      navigate(dashboardPathForRole(auth.user.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full min-w-0 h-12 rounded-2xl border border-slate-300 bg-white px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_32%),linear-gradient(135deg,#f8fafc_0%,#eef2ff_100%)] px-5 py-10">
      <section className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-10">
        <div className="mb-7">
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            Create account
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            New registration always becomes a normal user.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className="mb-2 block text-sm font-bold text-slate-700">First name</span>
              <input
                className={inputClass}
                value={form.first_name}
                onChange={(event) => updateField('first_name', event.target.value)}
                autoComplete="given-name"
              />
            </label>

            <label className="block min-w-0">
              <span className="mb-2 block text-sm font-bold text-slate-700">Last name</span>
              <input
                className={inputClass}
                value={form.last_name}
                onChange={(event) => updateField('last_name', event.target.value)}
                autoComplete="family-name"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Email</span>
            <input
              className={inputClass}
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              type="email"
              required
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Password</span>
            <input
              className={inputClass}
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
              type="password"
              required
              autoComplete="new-password"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Phone</span>
            <input
              className={inputClass}
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              type="tel"
              autoComplete="tel"
            />
          </label>

          <button
            type="submit"
            className="mt-1 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-blue-600 px-4 text-[15px] font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-65"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Register'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-extrabold text-blue-600 hover:text-blue-700">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}