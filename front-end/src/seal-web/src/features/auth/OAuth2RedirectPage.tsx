import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { setToken } from "@/shared/apiClient";
import { C, GradientText, FloatingParticles } from "@/shared/components/PixelComponents";

export function OAuth2RedirectPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const err = searchParams.get("error");

    if (err) {
      setError(decodeURIComponent(err));
      return;
    }

    if (!token) {
      setError("No authentication token received. Please try again.");
      return;
    }

    setToken(token, true);
    navigate("/dashboard", { replace: true });
  }, [searchParams, navigate]);

  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
      className="cyber-grid-bg"
    >
      <FloatingParticles count={20} />
      <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
        {error ? (
          <div style={{ maxWidth: 420 }}>
            <div style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.35)",
              padding: "24px 32px",
              marginBottom: 24,
            }}>
              <p style={{
                color: C.red,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                letterSpacing: "0.06em",
                marginBottom: 8,
              }}>
                AUTHENTICATION FAILED
              </p>
              <p style={{
                color: C.textMuted,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
              }}>
                {error}
              </p>
            </div>
            <button
              onClick={() => navigate("/login", { replace: true })}
              style={{
                background: "none",
                border: `1px solid ${C.border}`,
                color: C.text,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                letterSpacing: "0.08em",
                padding: "10px 24px",
                cursor: "pointer",
              }}
            >
              BACK TO LOGIN
            </button>
          </div>
        ) : (
          <div>
            <GradientText>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700 }}>
                AUTHENTICATING...
              </span>
            </GradientText>
            <div style={{ marginTop: 16, display: "flex", gap: 6, justifyContent: "center" }}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: 6, height: 6,
                    background: C.green,
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
