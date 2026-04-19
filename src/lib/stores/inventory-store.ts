"use client";

import { create } from "zustand";
import { storage } from "@/lib/db/storage";
import type { InventoryItem } from "@/lib/types";

interface InventoryState {
  items: InventoryItem[];
  loaded: boolean;
  load: () => Promise<void>;
  createItem: (input: {
    name: string;
    notes: string;
    tags: string[];
  }) => Promise<InventoryItem>;
  updateItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  items: [],
  loaded: false,

  async load() {
    set({ items: await storage.getInventoryItems(), loaded: true });
  },

  async createItem(input) {
    const item = await storage.createInventoryItem(input);
    set((state) => ({ items: [item, ...state.items] }));
    return item;
  },

  async updateItem(id, updates) {
    await storage.updateInventoryItem(id, updates);
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    }));
  },

  async deleteItem(id) {
    await storage.deleteInventoryItem(id);
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));
  },
}));
