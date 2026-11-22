import { Button } from "@/components/ui/Button";
import { chefs, menuItems } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  return chefs.map((chef) => ({ id: chef.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const chef = chefs.find((person) => person.id === id);
  return {
    title: chef ? chef.name : "Chef",
    description: chef?.bio,
  };
}

export default async function ChefProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const chef = chefs.find((person) => person.id === id);
  if (!chef) notFound();

  const signature = menuItems.find(
    (item) => item.name.toLowerCase() === chef.signatureDish.toLowerCase(),
  );
  const others = chefs.filter((person) => person.id !== chef.id).slice(0, 3);

  return (
    <div>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-100">
          <Image
            src={chef.image}
            alt={chef.name}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 40vw"
            priority
          />
        </div>
        <div className="flex flex-col justify-center">
          <Link
            href="/chefs"
            className="text-sm text-muted transition hover:text-navy"
          >
            ← All chefs
          </Link>
          <h1 className="mt-4 font-display text-4xl text-navy sm:text-5xl">
            {chef.name}
          </h1>
          <p className="mt-2 text-lg text-orange">{chef.title}</p>
          <p className="mt-6 leading-relaxed text-muted">{chef.bio}</p>
          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-white p-4">
              <dt className="text-xs font-semibold tracking-wide text-muted uppercase">
                Specialty
              </dt>
              <dd className="mt-1 text-sm text-navy">{chef.specialty}</dd>
            </div>
            <div className="rounded-xl border border-border bg-white p-4">
              <dt className="text-xs font-semibold tracking-wide text-muted uppercase">
                Experience
              </dt>
              <dd className="mt-1 text-sm text-navy">
                {chef.experienceYears} years
              </dd>
            </div>
            <div className="rounded-xl border border-border bg-white p-4 sm:col-span-2">
              <dt className="text-xs font-semibold tracking-wide text-muted uppercase">
                Signature dish
              </dt>
              <dd className="mt-1 text-sm text-navy">{chef.signatureDish}</dd>
              {signature ? (
                <Link
                  href={`/menu/item/${signature.id}`}
                  className="mt-2 inline-block text-sm font-medium text-orange hover:underline"
                >
                  View on menu · {formatCurrency(signature.price)}
                </Link>
              ) : null}
            </div>
          </dl>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/reservations">
              <Button variant="secondary">Reserve a table</Button>
            </Link>
            <Link href="/menu">
              <Button variant="outline">Browse menu</Button>
            </Link>
          </div>
        </div>
      </section>

      {others.length > 0 ? (
        <section className="border-t border-border bg-slate-50 py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="font-display text-2xl text-navy">Also on the brigade</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {others.map((person) => (
                <Link
                  key={person.id}
                  href={`/chefs/${person.id}`}
                  className="overflow-hidden rounded-xl border border-border bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={person.image}
                      alt={person.name}
                      fill
                      className="object-cover"
                      sizes="33vw"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-display text-lg text-navy">
                      {person.name}
                    </h3>
                    <p className="text-sm text-orange">{person.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
