import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LandingPageWrapper } from "@/components/LandingPageWrapper";

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard/");
  }

  return <LandingPageWrapper />;
}