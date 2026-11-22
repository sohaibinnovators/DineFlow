import { HomeMenuSections } from "@/components/public/HomeMenuSections";
import { Button } from "@/components/ui/Button";
import {
  chefs,
  restaurantInfo,
  specialOffers,
  testimonials,
} from "@/lib/mock-data";
import { Clock, Mail, MapPin, Phone, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80";
const ABOUT_IMAGE =
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80";

export default function HomePage() {
  return (
    <div>
      <section className="relative min-h-[88vh] overflow-hidden">
        <Image
          src={HERO_IMAGE}
          alt="Lumina Kitchen dining room"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/70 to-navy/40" />
        <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-center px-4 py-24 sm:px-6">
          <p className="animate-fade-up font-display text-5xl tracking-tight text-white sm:text-6xl md:text-7xl">
            {restaurantInfo.name}
          </p>
          <h1 className="animate-fade-up mt-5 max-w-xl text-2xl font-medium text-white/95 sm:text-3xl [animation-delay:80ms]">
            Coastal contemporary dining with quiet confidence
          </h1>
          <p className="animate-fade-up mt-4 max-w-lg text-base text-white/75 sm:text-lg [animation-delay:140ms]">
            Seasonal plates, refined service, and an atmosphere worth lingering
            for—right in Riverview District.
          </p>
          <div className="animate-fade-up mt-8 flex flex-wrap gap-3 [animation-delay:200ms]">
            <Link href="/reservations">
              <Button variant="secondary" size="lg">
                Reserve Table
              </Button>
            </Link>
            <Link href="/menu">
              <Button
                variant="outline"
                size="lg"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                View Menu
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <HomeMenuSections />

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
          <Image
            src={ABOUT_IMAGE}
            alt="Plated course at Lumina Kitchen"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide text-orange uppercase">
            Our story
          </p>
          <h2 className="mt-2 font-display text-3xl text-navy sm:text-4xl">
            A modern harbor table
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            Lumina Kitchen is a fictional Riverview dining room built for the
            DineFlow demo—showcasing how a premium restaurant presents itself
            online while operations stay organized behind the scenes.
          </p>
          <p className="mt-3 leading-relaxed text-muted">
            Expect coastal contemporary cooking, calm service, and menus that
            change with the market.
          </p>
          <Link href="/about" className="mt-6 inline-block">
            <Button variant="outline">Learn more about us</Button>
          </Link>
        </div>
      </section>

      <section className="bg-navy py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-semibold tracking-wide text-orange uppercase">
              Special offers
            </p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">
              Limited-time evenings
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {specialOffers.map((offer) => (
              <div
                key={offer.id}
                className="grid overflow-hidden rounded-xl bg-white/5 sm:grid-cols-[1.1fr_1fr]"
              >
                <div className="relative min-h-48">
                  <Image
                    src={offer.image}
                    alt={offer.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 40vw"
                  />
                </div>
                <div className="flex flex-col justify-center p-6">
                  <p className="text-sm font-semibold text-orange">
                    {offer.discountLabel}
                  </p>
                  <h3 className="mt-2 font-display text-2xl">{offer.title}</h3>
                  <p className="mt-2 text-sm text-white/70">{offer.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-semibold tracking-wide text-orange uppercase">
              The brigade
            </p>
            <h2 className="mt-2 font-display text-3xl text-navy sm:text-4xl">
              Chefs behind the pass
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {chefs.map((chef) => (
              <Link
                key={chef.id}
                href={`/chefs/${chef.id}`}
                className="group overflow-hidden rounded-xl border border-border bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  <Image
                    src={chef.image}
                    alt={chef.name}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-display text-xl text-navy">{chef.name}</h3>
                  <p className="mt-1 text-sm text-orange">{chef.title}</p>
                  <p className="mt-2 text-sm text-muted">{chef.specialty}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-semibold tracking-wide text-orange uppercase">
            Guests say
          </p>
          <h2 className="mt-2 font-display text-3xl text-navy sm:text-4xl">
            Notes from the table
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((item) => (
            <blockquote
              key={item.id}
              className="rounded-xl border border-border bg-white p-6 shadow-sm"
            >
              <div className="flex gap-1 text-orange">
                {Array.from({ length: item.rating }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-orange" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-navy/80">
                “{item.quote}”
              </p>
              <div className="mt-6 flex items-center gap-3">
                <Image
                  src={item.avatar}
                  alt={item.name}
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-semibold text-navy">{item.name}</p>
                  <p className="text-xs text-muted">{item.role}</p>
                </div>
              </div>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-accent/40 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold tracking-wide text-orange uppercase">
              Visit us
            </p>
            <h2 className="mt-2 font-display text-3xl text-navy sm:text-4xl">
              Hours & contact
            </h2>
            <ul className="mt-8 space-y-3">
              {restaurantInfo.hours.map((row) => (
                <li
                  key={row.day}
                  className="flex items-start justify-between gap-4 border-b border-border/80 pb-3 text-sm"
                >
                  <span className="flex items-center gap-2 text-navy">
                    <Clock className="h-4 w-4 text-orange" />
                    {row.day}
                  </span>
                  <span className="text-muted">{row.time}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <div className="space-y-4 text-sm">
              <p className="flex items-start gap-3 text-navy">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
                <span>
                  {restaurantInfo.address}
                  <br />
                  {restaurantInfo.city}
                </span>
              </p>
              <p className="flex items-center gap-3 text-navy">
                <Phone className="h-4 w-4 text-orange" />
                {restaurantInfo.phone}
              </p>
              <p className="flex items-center gap-3 text-navy">
                <Mail className="h-4 w-4 text-orange" />
                {restaurantInfo.email}
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/reservations">
                <Button variant="secondary">Reserve a table</Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline">Contact</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
