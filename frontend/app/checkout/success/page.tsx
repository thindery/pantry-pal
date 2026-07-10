"use client";

import { useRouter } from "next/navigation";
import { CheckoutResult } from "@/components/CheckoutResult";

export default function CheckoutSuccessPage() {
  const router = useRouter();

  return (
    <CheckoutResult
      status="success"
      onClose={() => router.push("/dashboard/")}
    />
  );
}