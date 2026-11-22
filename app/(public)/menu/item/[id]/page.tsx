import { menuItems } from "@/lib/mock-data";
import type { Metadata } from "next";
import { FoodDetail } from "./FoodDetail";

export async function generateStaticParams() {
  return menuItems.map((item) => ({ id: item.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = menuItems.find((entry) => entry.id === id);
  return {
    title: item?.name ?? "Dish",
    description: item?.description,
  };
}

export default async function FoodDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FoodDetail id={id} />;
}
