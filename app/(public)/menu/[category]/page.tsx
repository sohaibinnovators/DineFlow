import { categories } from "@/lib/mock-data";
import type { Metadata } from "next";
import { MenuBrowser } from "../MenuBrowser";

export async function generateStaticParams() {
  return categories.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const match = categories.find((item) => item.slug === category);
  return {
    title: match?.name ?? "Category",
    description: match?.description,
  };
}

export default async function MenuCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const match = categories.find((item) => item.slug === category);

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="mb-10 max-w-2xl">
        <p className="text-sm font-semibold tracking-wide text-orange uppercase">
          Category
        </p>
        <h1 className="mt-2 font-display text-4xl text-navy">
          {match?.name ?? category}
        </h1>
        <p className="mt-3 text-muted">
          {match?.description ?? "Browse dishes in this category."}
        </p>
      </div>
      <MenuBrowser initialCategorySlug={category} />
    </div>
  );
}
