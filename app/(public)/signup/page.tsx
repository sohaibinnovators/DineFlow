"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import Link from "next/link";
import { FormEvent, useState } from "react";

type FormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirm: string;
  role: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initial: FormState = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirm: "",
  role: "customer",
};

export default function SignupPage() {
  const [values, setValues] = useState<FormState>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [open, setOpen] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: FormErrors = {};
    if (!values.name.trim()) next.name = "Name is required.";
    if (!values.email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
      next.email = "Enter a valid email.";
    if (!values.phone.trim()) next.phone = "Phone is required.";
    if (!values.password) next.password = "Password is required.";
    else if (values.password.length < 6)
      next.password = "Use at least 6 characters.";
    if (values.confirm !== values.password)
      next.confirm = "Passwords do not match.";
    if (!values.role) next.role = "Select a role.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setValues(initial);
  }

  const roleHref =
    values.role === "admin"
      ? "/admin"
      : values.role === "staff"
        ? "/staff"
        : values.role === "kitchen"
          ? "/kitchen"
          : "/customer";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-14 sm:px-6">
      <p className="text-sm font-semibold tracking-wide text-orange uppercase">
        Demo access
      </p>
      <h1 className="mt-3 font-display text-4xl text-navy">Create account</h1>
      <p className="mt-3 text-muted">
        Sign-up UI only—no accounts are created. Choose a role to preview the
        matching dashboard after submit.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-8 space-y-5 rounded-xl border border-border bg-white p-6 shadow-sm"
        noValidate
      >
        <Field label="Full name" error={errors.name}>
          <Input
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Olivia Harper"
            autoComplete="name"
          />
        </Field>
        <Field label="Email" error={errors.email}>
          <Input
            type="email"
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>
        <Field label="Phone" error={errors.phone}>
          <Input
            type="tel"
            value={values.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="(206) 555-0100"
            autoComplete="tel"
          />
        </Field>
        <Field label="Role (demo)" error={errors.role}>
          <Select
            value={values.role}
            onChange={(e) => update("role", e.target.value)}
          >
            <option value="customer">Guest / Customer</option>
            <option value="staff">Staff</option>
            <option value="kitchen">Kitchen</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        <Field label="Password" error={errors.password}>
          <Input
            type="password"
            value={values.password}
            onChange={(e) => update("password", e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm password" error={errors.confirm}>
          <Input
            type="password"
            value={values.confirm}
            onChange={(e) => update("confirm", e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </Field>
        <Button type="submit" variant="secondary" className="w-full">
          Create account
        </Button>
        <p className="text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-orange hover:underline">
            Sign in
          </Link>
        </p>
      </form>

      <Modal open={open} onClose={close} title="Account ready (demo)">
        <p className="text-sm text-muted">
          Welcome, {values.name || "guest"}. In a live app we&apos;d create your
          profile. For this demo, open the {values.role} experience.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={roleHref}>
            <Button variant="secondary">Open dashboard</Button>
          </Link>
          <Button variant="outline" onClick={close}>
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
}
