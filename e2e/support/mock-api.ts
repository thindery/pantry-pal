import type { Page, Route } from "@playwright/test";

/**
 * PP-150: stateful in-memory stand-in for the FastAPI routes the dashboard
 * calls. The harness has no backend; backend behavior is covered by pytest.
 * State lives for one test, so a reload sees what earlier requests saved,
 * and no real customer data is ever read or written.
 */
export interface MockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  lastUpdated: string;
}

export interface MockApi {
  items: Map<string, MockItem>;
  calls: string[];
}

const FREE_TIER = {
  tier: "free",
  limits: {
    maxItems: 50,
    receiptScansPerMonth: 5,
    aiCallsPerMonth: 10,
    voiceAssistant: false,
    multiDevice: false,
    sharedInventory: false,
    maxFamilyMembers: 1,
  },
  usage: { currentItems: 0, receiptScansThisMonth: 0, aiCallsThisMonth: 0, voiceSessionsThisMonth: 0 },
};

function json(route: Route, data: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
}

export async function installMockApi(page: Page, seed: MockItem[]): Promise<MockApi> {
  const api: MockApi = { items: new Map(seed.map((item) => [item.id, { ...item }])), calls: [] };

  await page.route(/googletagmanager\.com|google-analytics\.com|cloudflareinsights\.com/, (route) => route.abort());
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/\/$/, "");
    const method = request.method();
    if (path.startsWith("/api/auth")) return route.fallback();
    api.calls.push(`${method} ${path}`);

    if (path === "/api/items" && method === "GET") return json(route, [...api.items.values()]);
    const itemMatch = path.match(/^\/api\/items\/([^/]+)$/);
    if (itemMatch && method === "PUT") {
      const item = api.items.get(itemMatch[1]);
      if (!item) return json(route, null, 404);
      const patch = request.postDataJSON() as Partial<MockItem>;
      Object.assign(item, patch, { lastUpdated: new Date().toISOString() });
      return json(route, item);
    }
    if (path === "/api/activities" && method === "POST") {
      const body = request.postDataJSON() as { itemId: string; itemName: string; type: string; amount: number; source?: string };
      const item = api.items.get(body.itemId);
      if (!item) return json(route, null, 404);
      const delta = body.type === "ADD" ? body.amount : -body.amount;
      item.quantity = Math.max(0, item.quantity + delta);
      item.lastUpdated = new Date().toISOString();
      return json(route, { id: `act-${api.calls.length}`, ...body, timestamp: item.lastUpdated });
    }
    if (path === "/api/activities") return json(route, []);
    if (path === "/api/item-groups") return json(route, []);
    if (path === "/api/subscription/tier") return json(route, { ...FREE_TIER, usage: { ...FREE_TIER.usage, currentItems: api.items.size } });
    if (path === "/api/emails/welcome" || path === "/api/client-errors") return json(route, { ok: true });
    return json(route, []);
  });

  return api;
}
