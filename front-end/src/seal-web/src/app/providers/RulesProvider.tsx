import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { useTour } from "@/app/providers/TourProvider";
import { CompetitionRulesModal } from "@/shared/components/CompetitionRulesModal";
import { RoleGuideModal } from "@/shared/components/RoleGuideModal";

interface RulesContextType {
  openRules: () => void;
  closeRules: () => void;
  // Label for the footer link — varies by role (rules vs role guide).
  rulesLinkLabel: string;
}

const RulesContext = createContext<RulesContextType | null>(null);

export function useRules() {
  const ctx = useContext(RulesContext);
  if (!ctx) throw new Error("useRules must be used within RulesProvider");
  return ctx;
}

// Which roles get an auto-shown popup, and what the footer link is called.
const ROLE_GUIDE_LABEL: Record<string, string> = {
  PARTICIPANT: "Competition Rules",
  MENTOR: "Mentor Guide",
  JUDGE: "Judge Guide",
};

// Session flag → the popup auto-shows once per login session, keyed by role so a
// multi-role staff member sees each role's guide once.
const seenKey = (role: string) => `sealRulesSeen:${role}`;

export function RulesProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const { maybeAutoStartTour } = useTour();
  const [open, setOpen] = useState(false);
  // True only while the currently-open popup was auto-shown on login (not the
  // footer link) — used to hand off to the onboarding tour on close.
  const autoShownRef = useRef(false);

  const role = currentUser?.role ?? "";
  const hasGuide = role in ROLE_GUIDE_LABEL;

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

  // Auto-open once per session for any role that has a guide; reset the flags on
  // logout so the next login shows them again.
  useEffect(() => {
    if (!currentUser) {
      Object.keys(ROLE_GUIDE_LABEL).forEach(r => sessionStorage.removeItem(seenKey(r)));
      return;
    }
    if (hasGuide && !sessionStorage.getItem(seenKey(role))) {
      sessionStorage.setItem(seenKey(role), "1");
      autoShownRef.current = true;
      setOpen(true);
    }
  }, [currentUser, role, hasGuide]);

  return (
    <RulesContext.Provider value={{ openRules, closeRules, rulesLinkLabel: ROLE_GUIDE_LABEL[role] ?? "Competition Rules" }}>
      {children}
      {role === "MENTOR" ? <RoleGuideModal role="MENTOR" open={open} onClose={closeRules} />
        : role === "JUDGE" ? <RoleGuideModal role="JUDGE" open={open} onClose={closeRules} />
        : <CompetitionRulesModal open={open} onClose={closeRules} />}
    </RulesContext.Provider>
  );
}
