import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LandingPageWrapper } from "@/components/LandingPageWrapper";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard/");
  }

  return <LandingPageWrapper />;
}