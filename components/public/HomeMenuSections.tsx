"use client";

import { useData } from "@/components/providers/DataProvider";
import { MenuCard } from "@/components/public/MenuCard";
import { LoadingState } from "@/components/ui/EmptyState";
import Image from "next/image";
import Link from "next/link";

export function HomeMenuSections() {
  const { hydrated, store } = useData();

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <LoadingState label="Loading live menu..." />
      </div>
    );
  }

  const featured = store.menuItems
    .filter((item) => item.featured && item.available)
    .slice(0, 4);
  const popular = store.menuItems
    .filter((item) => item.popular && item.available)
    .slice(0, 6);
  const categories = store.categories;

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-semibold tracking-wide text-orange uppercase">
            Featured
          </p>
          <h2 className="mt-2 font-display text-3xl text-navy sm:text-4xl">
            Dishes guests ask for by name
          </h2>
          <p className="mt-3 text-muted">
            Signature plates from the live menu managed in DineFlow.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((item) => (
            <MenuCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="bg-accent/60 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-semibold tracking-wide text-orange uppercase">
              Categories
            </p>
            <h2 className="mt-2 font-display text-3xl text-navy sm:text-4xl">
              Explore the kitchen
            </h2>
            <p className="mt-3 text-muted">
              From light starters to late-evening pours—find your course.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/menu/${category.slug}`}
                className="group overflow-hidden rounded-xl border border-border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[16/10]">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-display text-xl text-navy">
                    {category.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {category.itemCount} dishes · {category.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-semibold tracking-wide text-orange uppercase">
            Popular
          </p>
          <h2 className="mt-2 font-display text-3xl text-navy sm:text-4xl">
            What the dining room orders most
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((item) => (
            <MenuCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </>
  );
}
