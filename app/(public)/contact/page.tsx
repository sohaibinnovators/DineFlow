import { restaurantInfo } from "@/lib/mock-data";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Lumina Kitchen for inquiries and private dining.",
};

export default function ContactPage() {
  return (
    <div>
      <section className="border-b border-border bg-navy px-4 py-14 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold tracking-wide text-orange uppercase">
            Contact
          </p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl">
            Get in touch
          </h1>
          <p className="mt-4 max-w-2xl text-white/75">
            Questions about the menu, private dining, or the DineFlow demo—
            send a note and we&apos;ll pretend to reply promptly.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <ContactForm />

        <aside className="space-y-6">
          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <h2 className="font-display text-xl text-navy">Details</h2>
            <ul className="mt-5 space-y-4 text-sm text-muted">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
                <span>
                  {restaurantInfo.address}
                  <br />
                  {restaurantInfo.city}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-orange" />
                {restaurantInfo.phone}
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-orange" />
                {restaurantInfo.email}
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-accent/60 p-6">
            <h2 className="font-display text-xl text-navy">Opening hours</h2>
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

          <div className="overflow-hidden rounded-xl border border-border bg-slate-100 shadow-sm">
            <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 bg-[linear-gradient(135deg,#e2e8f0_25%,transparent_25%),linear-gradient(225deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(315deg,#e2e8f0_25%,transparent_25%)] bg-[length:20px_20px] bg-[position:10px_0,10px_0,0_0,0_0] p-6 text-center">
              <MapPin className="h-8 w-8 text-orange" />
              <p className="font-display text-lg text-navy">Map placeholder</p>
              <p className="max-w-xs text-sm text-muted">
                {restaurantInfo.address}, {restaurantInfo.city}
              </p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
