import { FormEvent, useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardPathForRole, login, saveAuth } from '@/api/auth/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const auth = await login({ email, password });
      saveAuth(auth);
      navigate(dashboardPathForRole(auth.user.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_32%),linear-gradient(135deg,#f8fafc_0%,#eef2ff_100%)] px-5 py-8">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-lg font-black tracking-tight text-slate-950"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white">
            <LockKeyhole size={18} />
          </span>
          YourBot
        </Link>

        <div className="mt-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Welcome back
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Sign in to manage your chatbot dashboard.
          </p>
        </div>

        {error && <div className="error-box mt-6">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Email address
            <input
              className="h-12 rounded-2xl border border-slate-300 px-4 text-[15px] outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Password
            <div className="relative">
              <input
                className="h-12 w-full rounded-2xl border border-slate-300 px-4 pr-12 text-[15px] outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />

              <button
                type="button"
                className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-blue-600"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            className="mt-1 inline-flex min-h-12 items-center justify-center rounded-2xl bg-blue-600 px-4 text-[15px] font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-65"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Want to learn about the chatbot?{' '}
          <Link to="/" className="font-extrabold text-blue-600 hover:text-blue-700">
            Visit home page
          </Link>
        </p>
      </section>
    </main>
  );
}