"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { staff } from "@/lib/mock-data";
import Image from "next/image";
import { useState } from "react";

const profile = staff.find((member) => member.id === "stf-1") ?? staff[0];

export default function AdminProfilePage() {
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardBody className="flex flex-col items-center text-center">
            {profile.avatar ? (
              <Image
                src={profile.avatar}
                alt={profile.name}
                width={96}
                height={96}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-accent text-2xl font-medium text-orange">
                PS
              </div>
            )}
            <h2 className="mt-4 font-display text-xl text-navy">
              {profile.name}
            </h2>
            <p className="mt-1 text-sm text-muted capitalize">{profile.role}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Badge tone="success">{profile.status}</Badge>
              <Badge tone="navy">Admin</Badge>
            </div>
            <p className="mt-4 text-sm text-muted">{profile.shift}</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Profile details"
            description="Update your contact information and preferences"
            action={
              saved ? (
                <span className="text-sm font-medium text-success">Saved</span>
              ) : null
            }
          />
          <CardBody>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                setSaved(true);
                window.setTimeout(() => setSaved(false), 2000);
              }}
            >
              <Field label="Full name">
                <Input defaultValue={profile.name} />
              </Field>
              <Field label="Role">
                <Input defaultValue={profile.role} disabled />
              </Field>
              <Field label="Email">
                <Input type="email" defaultValue={profile.email} />
              </Field>
              <Field label="Phone">
                <Input defaultValue={profile.phone} />
              </Field>
              <Field label="Shift">
                <Input defaultValue={profile.shift} />
              </Field>
              <Field label="Preferred language">
                <Input defaultValue="English" />
              </Field>
              <Field label="Bio" className="sm:col-span-2">
                <Textarea defaultValue="General Manager overseeing Lumina Kitchen floor operations, reservations, and guest experience." />
              </Field>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
                <Button type="submit">Save profile</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
