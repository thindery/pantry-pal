import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

// PP-185: customer-facing code says "AI" only. Model and vendor names live in
// server env/config, plus the admin-only provider panel (components/admin).
const BANNED = /gemini|gpt-|openai|claude|ollama|kimi|gemma|anthropic/i;
const ROOTS = ["app", "components", "content"].map((d) => path.resolve(__dirname, "..", d));
const ADMIN_ONLY = [path.sep + "components" + path.sep + "admin" + path.sep];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|json|md|mdx)$/.test(name)) out.push(full);
  }
  return out;
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("no model or vendor names in customer-facing code", () => {
  it("frontend app, components and content never name an AI model or vendor", () => {
    const offenders: string[] = [];
    for (const root of ROOTS) {
      let files: string[] = [];
      try {
        files = walk(root);
      } catch {
        continue;
      }
      for (const file of files) {
        if (ADMIN_ONLY.some((p) => file.includes(p))) continue;
        const match = stripComments(readFileSync(file, "utf8")).match(BANNED);
        if (match) offenders.push(`${path.relative(process.cwd(), file)}: ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
