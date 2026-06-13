"use client";

import { create } from "zustand";
import { getDb } from "@/lib/db/database";
import type { Lead, Persona } from "@/lib/types";

type LeadInput = Omit<Lead, "id" | "createdAt">;

interface LeadsState {
  leads: Lead[];
  loaded: boolean;
  load: (persona?: Persona) => Promise<void>;
  createLead: (input: LeadInput) => Promise<void>;
  updateLead: (id: string, updates: Partial<LeadInput>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
}

export const useLeadsStore = create<LeadsState>((set) => ({
  leads: [],
  loaded: false,

  async load(persona) {
    const leads = await getDb(persona).leads.orderBy("createdAt").reverse().toArray();
    set({ leads, loaded: true });
  },

  async createLead(input) {
    const lead: Lead = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...input,
    };
    await getDb().leads.add(lead);
    set((state) => ({ leads: [lead, ...state.leads] }));
  },

  async updateLead(id, updates) {
    await getDb().leads.update(id, updates);
    set((state) => ({
      leads: state.leads.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    }));
  },

  async deleteLead(id) {
    await getDb().leads.delete(id);
    set((state) => ({ leads: state.leads.filter((l) => l.id !== id) }));
  },
}));
