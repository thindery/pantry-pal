import { fetchApi } from "./apiService";
import type { ItemGroup } from "@/types";

export interface CreateItemGroupPayload {
  name: string;
  itemIds: string[];
  targetQuantity?: number | null;
}

export interface UpdateItemGroupPayload {
  name?: string;
  targetQuantity?: number | null;
}

export interface DeleteItemGroupResponse {
  deleted: boolean;
  id: string;
  unlinkedItemIds: string[];
}

export interface RemoveItemFromGroupResponse {
  unlinked: boolean;
  id: string;
  itemId: string;
  groupDeleted: boolean;
}

export const getItemGroups = async (): Promise<ItemGroup[]> => {
  const res = await fetchApi<{ success: boolean; data: ItemGroup[] }>("/api/item-groups");
  return res.data || [];
};

export const createItemGroup = async (payload: CreateItemGroupPayload): Promise<ItemGroup> => {
  const res = await fetchApi<{ success: boolean; data: ItemGroup }>("/api/item-groups", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
};

export const updateItemGroup = async (
  id: string,
  payload: UpdateItemGroupPayload
): Promise<ItemGroup> => {
  const res = await fetchApi<{ success: boolean; data: ItemGroup }>(`/api/item-groups/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
};

export const deleteItemGroup = async (id: string): Promise<DeleteItemGroupResponse> => {
  const res = await fetchApi<{ success: boolean; data: DeleteItemGroupResponse }>(
    `/api/item-groups/${id}`,
    {
      method: "DELETE",
    }
  );
  return res.data;
};

export const addItemToGroup = async (groupId: string, itemId: string): Promise<ItemGroup> => {
  const res = await fetchApi<{ success: boolean; data: ItemGroup }>(
    `/api/item-groups/${groupId}/items`,
    {
      method: "POST",
      body: JSON.stringify({ itemId }),
    }
  );
  return res.data;
};

export const removeItemFromGroup = async (
  groupId: string,
  itemId: string
): Promise<RemoveItemFromGroupResponse> => {
  const res = await fetchApi<{ success: boolean; data: RemoveItemFromGroupResponse }>(
    `/api/item-groups/${groupId}/items/${itemId}`,
    {
      method: "DELETE",
    }
  );
  return res.data;
};
