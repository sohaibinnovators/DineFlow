import { Suspense } from "react";
import { LoadingState } from "@/components/ui/EmptyState";
import { OrderConfirmationClient } from "./OrderConfirmationClient";

export const metadata = {
  title: "Order confirmation",
  description: "Your DineFlow order was placed.",
};

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading confirmation..." />}>
      <OrderConfirmationClient />
    </Suspense>
  );
}
