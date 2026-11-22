"use client";

import { useData } from "@/components/providers/DataProvider";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Input";
import { formatCurrency, formatDate } from "@/lib/utils";

const STAFF_ID = "stf-2";

export default function StaffProfilePage() {
  const { hydrated, store } = useData();

  if (!hydrated) return <LoadingState label="Loading profile..." />;

  const member = store.staff.find((person) => person.id === STAFF_ID);
  if (!member) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-muted">Staff profile not found in store.</p>
        </CardBody>
      </Card>
    );
  }

  const myOrders = store.orders.filter(
    (order) => order.assignedStaffId === STAFF_ID,
  );
  const completed = myOrders.filter((order) =>
    ["completed", "served"].includes(order.status),
  );
  const sales = myOrders.reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardBody className="flex flex-col items-center text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-navy text-2xl font-semibold text-white">
              {member.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </span>
            <h2 className="mt-4 font-display text-2xl text-navy">
              {member.name}
            </h2>
            <p className="mt-1 capitalize text-muted">{member.role}</p>
            <div className="mt-3">
              <Badge tone={statusTone(member.status)}>{member.status}</Badge>
            </div>
            <dl className="mt-6 w-full space-y-3 text-left text-sm">
              <div className="flex justify-between gap-3 border-b border-border pb-2">
                <dt className="text-muted">Shift</dt>
                <dd className="font-medium text-navy">{member.shift}</dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-border pb-2">
                <dt className="text-muted">Joined</dt>
                <dd className="font-medium text-navy">
                  {formatDate(member.joinedAt)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-border pb-2">
                <dt className="text-muted">Tickets today</dt>
                <dd className="font-medium text-navy">{myOrders.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Section sales</dt>
                <dd className="font-medium text-navy">
                  {formatCurrency(sales)}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Profile details"
            description="Contact info for floor service"
          />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input defaultValue={member.name} readOnly />
            </Field>
            <Field label="Role">
              <Input defaultValue={member.role} readOnly className="capitalize" />
            </Field>
            <Field label="Email">
              <Input defaultValue={member.email} readOnly />
            </Field>
            <Field label="Phone">
              <Input defaultValue={member.phone} readOnly />
            </Field>
            <Field label="Shift window" className="sm:col-span-2">
              <Input defaultValue={member.shift} readOnly />
            </Field>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Shift summary"
          description="Assigned tickets closed or still on the floor"
        />
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-slate-50 px-4 py-5">
            <p className="text-sm text-muted">Assigned orders</p>
            <p className="mt-2 font-display text-2xl text-navy">
              {myOrders.length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-slate-50 px-4 py-5">
            <p className="text-sm text-muted">Served / completed</p>
            <p className="mt-2 font-display text-2xl text-navy">
              {completed.length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-slate-50 px-4 py-5">
            <p className="text-sm text-muted">Ticket value</p>
            <p className="mt-2 font-display text-2xl text-navy">
              {formatCurrency(sales)}
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
