import { redirect } from "next/navigation";

/** Legacy AI visual-usage route — decommissioned (PP-058). */
export default function ScanUsagePage() {
  redirect("/dashboard/");
}