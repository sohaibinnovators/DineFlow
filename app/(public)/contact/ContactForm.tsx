"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { FormEvent, useState } from "react";

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initial: FormState = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

function validate(values: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!values.name.trim()) errors.name = "Name is required.";
  if (!values.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Enter a valid email.";
  }
  if (!values.subject.trim()) errors.subject = "Subject is required.";
  if (!values.message.trim()) {
    errors.message = "Message is required.";
  } else if (values.message.trim().length < 10) {
    errors.message = "Please write at least 10 characters.";
  }
  return errors;
}

export function ContactForm() {
  const [values, setValues] = useState<FormState>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [successOpen, setSuccessOpen] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSuccessOpen(true);
  }

  function closeSuccess() {
    setSuccessOpen(false);
    setValues(initial);
    setErrors({});
  }

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-xl border border-border bg-white p-6 shadow-sm"
        noValidate
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" error={errors.name}>
            <Input
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Your name"
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
        </div>
        <Field label="Subject" error={errors.subject}>
          <Input
            value={values.subject}
            onChange={(e) => update("subject", e.target.value)}
            placeholder="Private dining, press, feedback…"
          />
        </Field>
        <Field label="Message" error={errors.message}>
          <Textarea
            value={values.message}
            onChange={(e) => update("message", e.target.value)}
            placeholder="How can we help?"
          />
        </Field>
        <Button type="submit" variant="secondary" size="lg">
          Send message
        </Button>
        <p className="text-xs text-muted">
          Demo form only—nothing is submitted to a server.
        </p>
      </form>

      <Modal open={successOpen} onClose={closeSuccess} title="Message sent">
        <p className="text-sm text-muted">
          Thanks, {values.name || "guest"}. Your demo message about “
          {values.subject}” would reach the host team in a live deployment.
        </p>
        <div className="mt-5">
          <Button variant="primary" onClick={closeSuccess}>
            Close
          </Button>
        </div>
      </Modal>
    </>
  );
}
