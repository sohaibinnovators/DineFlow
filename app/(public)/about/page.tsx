import { Button } from "@/components/ui/Button";
import { chefs, restaurantInfo } from "@/lib/mock-data";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "The story behind Lumina Kitchen — a DineFlow restaurant demo.",
};

const ABOUT_IMAGE =
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80";
const DINING_IMAGE =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80";

export default function AboutPage() {
  return (
    <div>
      <section className="border-b border-border bg-navy px-4 py-16 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold tracking-wide text-orange uppercase">
            About
          </p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl">
            {restaurantInfo.name}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/75">
            A coastal contemporary dining room built to demonstrate how{" "}
            {restaurantInfo.productName} powers a polished guest-facing brand
            and calm back-of-house operations.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
          <Image
            src={ABOUT_IMAGE}
            alt="Fine dining plate"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        </div>
        <div>
          <h2 className="font-display text-3xl text-navy">Our philosophy</h2>
          <p className="mt-4 leading-relaxed text-muted">
            We cook for the season and plate for the moment. Produce arrives
            from nearby markets; proteins are sourced with care; pastry finishes
            every meal with intention. Service stays unhurried but attentive—
            never theatrical.
          </p>
          <p className="mt-3 leading-relaxed text-muted">
            Lumina is entirely fictional demo content. Every dish, chef bio, and
            reservation is here to showcase a premium restaurant experience
            powered by DineFlow.
          </p>
        </div>
      </section>

      <section className="bg-accent/50 py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl text-navy">The room</h2>
            <p className="mt-4 leading-relaxed text-muted">
              Soft lighting, warm timber, and harbor-facing windows set a composed
              tone. The floor seats intimate twos through private eights, with a
              chef&apos;s counter for guests who want the line in view.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-navy">
              <li>· Seasonal tasting menus midweek</li>
              <li>· Full à la carte every evening</li>
              <li>· Craft cocktails & thoughtful non-alcoholic pours</li>
              <li>· Private dining for celebrations</li>
            </ul>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl">
            <Image
              src={DINING_IMAGE}
              alt="Restaurant interior"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl text-navy">Leadership in the kitchen</h2>
            <p className="mt-2 text-muted">
              Meet the chefs shaping every service.
            </p>
          </div>
          <Link href="/chefs">
            <Button variant="outline">All chefs</Button>
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {chefs.map((chef) => (
            <Link
              key={chef.id}
              href={`/chefs/${chef.id}`}
              className="rounded-xl border border-border bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="relative mb-3 aspect-square overflow-hidden rounded-lg">
                <Image
                  src={chef.image}
                  alt={chef.name}
                  fill
                  className="object-cover"
                  sizes="200px"
                />
              </div>
              <h3 className="font-display text-lg text-navy">{chef.name}</h3>
              <p className="text-sm text-orange">{chef.title}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-slate-50 px-4 py-14 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-2xl text-navy">Join us for dinner</h2>
            <p className="mt-2 text-muted">
              {restaurantInfo.address} · {restaurantInfo.city}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/reservations">
              <Button variant="secondary">Reserve a table</Button>
            </Link>
            <Link href="/menu">
              <Button variant="outline">Browse menu</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
