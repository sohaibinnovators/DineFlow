import { restaurantInfo } from "@/lib/mock-data";
import { Clock, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { ReservationForm } from "./ReservationForm";

export const metadata: Metadata = {
  title: "Reservations",
  description: "Reserve a table at Lumina Kitchen.",
};

export default function ReservationsPage() {
  return (
    <div>
      <section className="border-b border-border bg-navy px-4 py-14 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold tracking-wide text-orange uppercase">
            Reservations
          </p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl">
            Book your table
          </h1>
          <p className="mt-4 max-w-2xl text-white/75">
            Preferential seating for parties of all sizes. Weekend evenings fill
            quickly—request early.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_0.8fr]">
        <ReservationForm />
        <aside className="space-y-6">
          <div className="rounded-xl border border-border bg-accent/60 p-6">
            <h2 className="font-display text-xl text-navy">Hours</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {restaurantInfo.hours.map((row) => (
                <li key={row.day} className="flex justify-between gap-4">
                  <span className="inline-flex items-center gap-2 text-navy">
                    <Clock className="h-4 w-4 text-orange" />
                    {row.day}
                  </span>
                  <span className="text-muted">{row.time}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <h2 className="font-display text-xl text-navy">Location</h2>
            <p className="mt-4 flex items-start gap-3 text-sm text-muted">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
              <span>
                {restaurantInfo.address}
                <br />
                {restaurantInfo.city}
              </span>
            </p>
            <p className="mt-3 flex items-center gap-3 text-sm text-muted">
              <Phone className="h-4 w-4 text-orange" />
              {restaurantInfo.phone}
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
