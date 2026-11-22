"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import Link from "next/link";
import { FormEvent, useState } from "react";

const dashboards = [
  { href: "/admin", label: "Admin dashboard", role: "General Manager" },
  { href: "/staff", label: "Staff dashboard", role: "Floor service" },
  { href: "/kitchen", label: "Kitchen dashboard", role: "Expo / KDS" },
  { href: "/customer", label: "Guest dashboard", role: "Customer portal" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [hint, setHint] = useState(false);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Enter a valid email.";
    if (!password) next.password = "Password is required.";
    else if (password.length < 6)
      next.password = "Password must be at least 6 characters.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setHint(true);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center px-4 py-14 sm:px-6">
      <div className="mx-auto grid w-full max-w-4xl gap-10 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <p className="text-sm font-semibold tracking-wide text-orange uppercase">
            Demo access
          </p>
          <h1 className="mt-3 font-display text-4xl text-navy">Sign in</h1>
          <p className="mt-3 text-muted">
            UI-only login for the DineFlow restaurant demo. No real
            authentication—use the dashboard links to explore roles.
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-8 space-y-5 rounded-xl border border-border bg-white p-6 shadow-sm"
            noValidate
          >
            <Field label="Email" error={errors.email}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="priya.shah@demo.mail"
                autoComplete="email"
              />
            </Field>
            <Field label="Password" error={errors.password}>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Field>
            <Button type="submit" variant="secondary" className="w-full">
              Sign in
            </Button>
            {hint ? (
              <p className="rounded-lg bg-accent px-3 py-2 text-sm text-navy">
                Demo only—pick a dashboard below to continue.
              </p>
            ) : null}
            <p className="text-center text-sm text-muted">
              New here?{" "}
              <Link href="/signup" className="font-medium text-orange hover:underline">
                Create an account
              </Link>
            </p>
          </form>
        </div>

        <aside className="rounded-xl border border-border bg-navy p-6 text-white">
          <h2 className="font-display text-2xl">Open a dashboard</h2>
          <p className="mt-2 text-sm text-white/70">
            Jump straight into a role for the Phase 1 demo.
          </p>
          <ul className="mt-6 space-y-3">
            {dashboards.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
                >
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="text-xs text-white/60">{item.role}</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
