export const CLIENT_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

const DISMISSED_KEY = "pantry-pal-dismissed-build-id";

export async function fetchLiveBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`/build-id.txt?${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return text || null;
  } catch {
    return null;
  }
}

export function isNewerBuildAvailable(liveBuildId: string | null): boolean {
  if (!liveBuildId || CLIENT_BUILD_ID === "dev") return false;
  if (liveBuildId === CLIENT_BUILD_ID) return false;

  try {
    const dismissed = sessionStorage.getItem(DISMISSED_KEY);
    if (dismissed === liveBuildId) return false;
  } catch {
    // sessionStorage unavailable
  }

  return true;
}

export function dismissBuildUpdate(liveBuildId: string): void {
  try {
    sessionStorage.setItem(DISMISSED_KEY, liveBuildId);
  } catch {
    // ignore
  }
}