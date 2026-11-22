import { orders } from "@/lib/mock-data";
import type { Metadata } from "next";
import { OrderDetail } from "./OrderDetail";

export async function generateStaticParams() {
  return orders
    .filter((order) => order.customerId === "cus-1")
    .map((order) => ({ id: order.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const order = orders.find((entry) => entry.id === id);
  return {
    title: order ? order.orderNumber : "Order",
  };
}

export default async function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderDetail id={id} />;
}
