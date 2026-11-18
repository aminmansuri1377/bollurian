"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "bollourian:list-font-bold";

/** UI-only preference: kept outside quote/domain settings so pricing and backup schemas never change. */
export function useListFontPreference() {
  const [listBold, setListBold] = useState(false);

  useEffect(() => {
    try {
      setListBold(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // A blocked localStorage must not prevent the price manager from working.
    }
  }, []);

  const toggleListBold = useCallback(() => {
    setListBold((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Keep the preference for this session even when persistence is unavailable.
      }
      return next;
    });
  }, []);

  return { listBold, toggleListBold };
}
