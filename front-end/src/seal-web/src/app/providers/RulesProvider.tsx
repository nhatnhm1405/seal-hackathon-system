import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { useTour } from "@/app/providers/TourProvider";
import { CompetitionRulesModal } from "@/shared/components/CompetitionRulesModal";

interface RulesContextType {
  openRules: () => void;
  closeRules: () => void;
}

const RulesContext = createContext<RulesContextType | null>(null);

export function useRules() {
  const ctx = useContext(RulesContext);
  if (!ctx) throw new Error("useRules must be used within RulesProvider");
  return ctx;
}

// Session flag → the rules popup auto-shows once per login session for participants.
const SEEN_KEY = "sealRulesSeen";

export function RulesProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const { maybeAutoStartTour } = useTour();
  const [open, setOpen] = useState(false);
  // True only while the currently-open popup was auto-shown on login (not the
  // footer link) — used to hand off to the onboarding tour on close.
  const autoShownRef = useRef(false);

  const openRules = useCallback(() => setOpen(true), []);

  const closeRules = useCallback(() => {
    setOpen(false);
    if (autoShownRef.current) {
      autoShownRef.current = false;
      // First-time participants with no team flow straight into the onboarding tour.
      if (currentUser?.role === "PARTICIPANT" && currentUser.team_id === null) {
        maybeAutoStartTour();
      }
    }
  }, [currentUser, maybeAutoStartTour]);

  // Auto-open once per session for participants; reset the flag on logout so the
  // next login shows it again.
  useEffect(() => {
    if (!currentUser) {
      sessionStorage.removeItem(SEEN_KEY);
      return;
    }
    if (currentUser.role === "PARTICIPANT" && !sessionStorage.getItem(SEEN_KEY)) {
      sessionStorage.setItem(SEEN_KEY, "1");
      autoShownRef.current = true;
      setOpen(true);
    }
  }, [currentUser]);

  return (
    <RulesContext.Provider value={{ openRules, closeRules }}>
      {children}
      <CompetitionRulesModal open={open} onClose={closeRules} />
    </RulesContext.Provider>
  );
}
