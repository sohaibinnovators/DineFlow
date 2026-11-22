"use client";

import { CreateOrderForm } from "@/components/orders/CreateOrderForm";
import { useData } from "@/components/providers/DataProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/EmptyState";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminCreateOrderPage() {
  const { hydrated } = useData();
  const router = useRouter();

  if (!hydrated) return <LoadingState label="Loading order form..." />;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <Link href="/admin/orders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to orders
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader
          title="Create order"
          description="Build a ticket with live totals, then send it to the kitchen"
        />
        <CardBody>
          <CreateOrderForm
            onCancel={() => router.push("/admin/orders")}
            onSuccess={() => router.push("/admin/orders")}
          />
        </CardBody>
      </Card>
    </div>
  );
}
