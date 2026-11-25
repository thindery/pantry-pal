/**
 * PP-178: Send to Instacart (Beta). The backend holds the key; the button only
 * shows when /api/instacart/status says it is on.
 */
import type { ShoppingListItem, PantryItem } from '../types';
import { fetchApi } from './apiService';

export interface InstacartLineItem {
  name: string;
  quantity: number;
  unit?: string;
  upc?: string;
}

/** Unchecked, non-archived rows only. UPC comes from the linked pantry item when it has a barcode. */
export function buildInstacartItems(
  shoppingList: ShoppingListItem[],
  inventory: PantryItem[],
): InstacartLineItem[] {
  return shoppingList
    .filter((item) => !item.isChecked && !item.isArchived && item.name.trim() !== '')
    .map((item) => {
      const pantryItem =
        item.pantryItemId != null
          ? inventory.find((i) => i.id === item.pantryItemId)
          : inventory.find((i) => i.name.toLowerCase() === item.name.toLowerCase());
      const line: InstacartLineItem = {
        name: item.name.trim(),
        quantity: item.suggestedQuantity > 0 ? item.suggestedQuantity : 1,
        unit: item.unit,
      };
      if (pantryItem?.barcode) line.upc = pantryItem.barcode;
      return line;
    });
}

export async function getInstacartEnabled(): Promise<boolean> {
  try {
    const res = await fetchApi<{ data?: { enabled?: boolean } }>('/api/instacart/status');
    return res?.data?.enabled === true;
  } catch {
    return false;
  }
}

export async function createInstacartLink(
  items: InstacartLineItem[],
): Promise<{ url: string; itemCount: number }> {
  const res = await fetchApi<{ data: { url: string; itemCount: number } }>(
    '/api/instacart/shopping-list',
    { method: 'POST', body: JSON.stringify({ items }) },
  );
  if (!res?.data?.url) throw new Error('Instacart did not return a link.');
  return res.data;
}
