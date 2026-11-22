import { Button } from "@/components/ui/Button";
import { chefs } from "@/lib/mock-data";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Chefs",
  description: "Meet the culinary team behind Lumina Kitchen.",
};

export default function ChefsPage() {
  return (
    <div>
      <section className="border-b border-border bg-navy px-4 py-14 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold tracking-wide text-orange uppercase">
            Culinary team
          </p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl">Our chefs</h1>
          <p className="mt-4 max-w-2xl text-white/75">
            Leadership on the line—seasonal cooking, precise pastry, and service
            that never rushes quality.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2">
          {chefs.map((chef) => (
            <article
              key={chef.id}
              className="grid overflow-hidden rounded-xl border border-border bg-white shadow-sm sm:grid-cols-[0.9fr_1.1fr]"
            >
              <div className="relative min-h-64">
                <Image
                  src={chef.image}
                  alt={chef.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 40vw"
                />
              </div>
              <div className="flex flex-col justify-center p-6">
                <h2 className="font-display text-2xl text-navy">{chef.name}</h2>
                <p className="mt-1 text-sm font-medium text-orange">
                  {chef.title}
                </p>
                <p className="mt-3 text-sm text-muted line-clamp-3">{chef.bio}</p>
                <p className="mt-4 text-sm text-navy">
                  Specialty: {chef.specialty}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {chef.experienceYears} years · Signature: {chef.signatureDish}
                </p>
                <Link href={`/chefs/${chef.id}`} className="mt-5">
                  <Button variant="outline" size="sm">
                    View profile
                  </Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
