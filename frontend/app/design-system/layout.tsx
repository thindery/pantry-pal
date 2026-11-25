import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

// PP-072: /design-system is an internal reference. Same server-side gate as
// /admin (middleware also redirects), so it never renders for the public.
export const dynamic = "force-dynamic";

export default async function DesignSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin/");
  }

  if (!session.user.isAdmin) {
    redirect("/dashboard/");
  }

  return children;
}
