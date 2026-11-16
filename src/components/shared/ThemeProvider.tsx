"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const initTheme = useThemeStore((state) => state.initTheme);
  const checkSession = useAuthStore((state) => state.checkSession);
  const initLanguage = useLanguageStore((state) => state.initLanguage);

  useEffect(() => {
    initLanguage();
    initTheme();
    checkSession();
  }, [initLanguage, initTheme, checkSession]);

  return <>{children}</>;
}
