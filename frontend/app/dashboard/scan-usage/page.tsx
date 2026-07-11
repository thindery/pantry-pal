import { redirect } from "next/navigation";

/** Legacy Gemini visual-usage route — decommissioned (PP-058). */
export default function ScanUsagePage() {
  redirect("/dashboard/");
}