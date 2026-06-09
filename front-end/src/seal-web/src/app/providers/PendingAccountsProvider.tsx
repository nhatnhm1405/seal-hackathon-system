import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { apiFetch } from "@/shared/apiClient";
import { useAuth } from "@/app/providers/AuthProvider";

// Shared source of truth for the coordinator sidebar's "pending accounts" badge.
// CoordAccountsPage and the sidebar both read this so an approve/reject on the
// page updates the badge immediately — no page refresh needed.
interface PendingAccountsContextType {
  pendingCount: number;
  setPendingCount: (n: number) => void;
  refreshPendingCount: () => Promise<void>;
}

const PendingAccountsContext = createContext<PendingAccountsContextType | null>(null);

interface RawUser {
  isApproved?: boolean | null; is_approved?: boolean | null;
  isActive?: boolean | null; is_active?: boolean | null;
}

// PENDING = registered but not yet approved, and still active (not rejected).
// Mirrors deriveStatus() in CoordAccountsPage.
function countPending(users: RawUser[]): number {
  return users.filter(u => {
    const isApproved = u.isApproved ?? u.is_approved ?? false;
    const isActive = u.isActive ?? u.is_active ?? true;
    return !isApproved && isActive;
  }).length;
}

export function PendingAccountsProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: RawUser[] }>('/api/users');
      setPendingCount(countPending(res.data ?? []));
    } catch {
      /* keep last known count on failure */
    }
  }, []);

  // Seed the badge on login so it's correct before the Accounts page is opened.
  useEffect(() => {
    if (role !== 'COORDINATOR') { setPendingCount(0); return; }
    refreshPendingCount();
  }, [role, refreshPendingCount]);

  return (
    <PendingAccountsContext.Provider value={{ pendingCount, setPendingCount, refreshPendingCount }}>
      {children}
    </PendingAccountsContext.Provider>
  );
}

export function usePendingAccounts() {
  const ctx = useContext(PendingAccountsContext);
  if (!ctx) throw new Error('usePendingAccounts must be used within PendingAccountsProvider');
  return ctx;
}
