export function formatQuantity(quantity: number, unit: string): string {
  const rounded =
    Math.abs(quantity - Math.round(quantity)) < 1e-9 ? Math.round(quantity) : quantity;
  const label = String(rounded);
  const raw = (unit || "units").trim();
  const lower = raw.toLowerCase();

  if (lower === "unit" || lower === "units") {
    return `${label} ${quantity === 1 ? "unit" : "units"}`;
  }

  if (quantity === 1 && lower.endsWith("s") && !lower.endsWith("ss") && lower !== "lbs") {
    return `${label} ${raw.slice(0, -1)}`;
  }

  return `${label} ${raw}`;
}
