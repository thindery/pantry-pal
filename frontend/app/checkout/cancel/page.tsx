"use client";

import { useRouter } from "next/navigation";
import { CheckoutResult } from "@/components/CheckoutResult";

export default function CheckoutCancelPage() {
  const router = useRouter();

  return (
    <CheckoutResult
      status="cancel"
      onClose={() => router.push("/pricing/")}
    />
  );
}