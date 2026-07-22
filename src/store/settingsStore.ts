import { create } from "zustand";

interface Settings {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  taxRate?: number;
  receiptHeader?: string;
  receiptFooter?: string;
}

interface SettingsState {
  settings: Settings | null;
  loading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (newSettings: Settings) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  loading: false,
  fetchSettings: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        set({ settings: data });
      }
    } catch (err) {
      console.error("Error fetching settings in store:", err);
    } finally {
      set({ loading: false });
    }
  },
  updateSettings: (newSettings) => {
    set({ settings: newSettings });
  },
}));
