import { createContext, useContext, type ReactNode } from "react";

import type { Business } from "@/db/types";

type BusinessContextValue = {
  business: Business | null;
  refresh: () => void;
};

const BusinessContext = createContext<BusinessContextValue>({
  business: null,
  refresh: () => {}
});

export function BusinessProvider({
  business,
  refresh,
  children
}: BusinessContextValue & { children: ReactNode }) {
  return (
    <BusinessContext.Provider value={{ business, refresh }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  return useContext(BusinessContext);
}

export function useCurrency() {
  return useContext(BusinessContext).business?.currency ?? "GHS";
}
