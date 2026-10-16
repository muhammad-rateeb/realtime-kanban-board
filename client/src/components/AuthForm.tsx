import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { errMessage } from "../lib/api";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { Spinner } from "../components/ui/Spinner";

interface AuthFormProps {
  title: string;
  subtitle: ReactNode;
  submitLabel: string;
  onSubmit: (fields: { name: string; email: string; password: string }) => Promise<void>;
  footer: ReactNode;
  showName?: boolean;
}

export function AuthForm({ title, subtitle, submitLabel, onSubmit, footer, showName }: AuthFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ name, email, password });
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
              <rect x="4" y="4" width="4.5" height="16" rx="1.5" />
              <rect x="10" y="4" width="4.5" height="10" rx="1.5" />
              <rect x="16" y="4" width="4" height="13" rx="1.5" />
            </svg>
          </span>
          <h1 className="text-xl font-bold text-slate-900">Kanban</h1>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {showName && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  maxLength={80}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="Ada Lovelace"
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={showName ? 8 : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                placeholder={showName ? "At least 8 characters" : "••••••••"}
                autoComplete={showName ? "new-password" : "current-password"}
              />
            </div>

            {error && <ErrorBanner message={error} />}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {submitting && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
              {submitting ? "Please wait…" : submitLabel}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">{footer}</p>
        <p className="mt-6 text-center text-xs text-slate-400">
          <Link to="/" className="hover:text-slate-600">
            ← Back to boards
          </Link>
        </p>
      </div>
    </div>
  );
}
