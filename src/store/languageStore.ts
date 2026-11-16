import { create } from "zustand";
import { Language, translations } from "@/i18n/translations";

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
  initLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: "km", // Default to Khmer as requested
  setLanguage: (lang: Language) => {
    set({ language: lang });
    if (typeof window !== "undefined") {
      localStorage.setItem("pos_language", lang);
      document.documentElement.setAttribute("lang", lang);
    }
  },
  toggleLanguage: () => {
    const nextLang: Language = get().language === "km" ? "en" : "km";
    get().setLanguage(nextLang);
  },
  t: (key: string) => {
    const lang = get().language;
    const langDict = translations[lang];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fallback to English dictionary
    if (translations.en && translations.en[key]) {
      return translations.en[key];
    }
    return key;
  },
  initLanguage: () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pos_language") as Language | null;
      if (saved === "km" || saved === "en") {
        set({ language: saved });
        document.documentElement.setAttribute("lang", saved);
      }
    }
  },
}));
