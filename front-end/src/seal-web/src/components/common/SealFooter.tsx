import { C } from "./PixelComponents";
import sealLogo from "../../assets/image.png";

export function SealFooter() {
    const columns = [
        {
            title: "Platform",
            links: ["Dashboard", "Events", "Teams", "Leaderboard"],
        },
        {
            title: "The Team",
            links: [
                "About the Project",
                "Our Team",
                "GitHub",
                "Contact",
            ],
        },
    ];

    return (
        <footer
            style={{
                background: "#050a0d",
                borderTop: `1px solid ${C.border}`,
                padding: "52px 24px 24px",
                width: "100%",
            }}
        >
            <div style={{ maxWidth: 1160, margin: "0 auto" }}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-10">
                    <div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                marginBottom: 16,
                            }}
                        >
                            <div
                                style={{
                                    height: 80,
                                    overflow: "visible",
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "center",
                                }}
                            >
                                <img
                                    src={sealLogo}
                                    alt="SEAL"
                                    style={{
                                        height: 160,
                                        width: "auto",
                                        objectFit: "contain",
                                        filter:
                                            "drop-shadow(0 0 8px rgba(34,197,94,0.35)) drop-shadow(0 0 16px rgba(59,130,246,0.2))",
                                    }}
                                />
                            </div>
                            <span
                                style={{
                                    color: C.text,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontWeight: 700,
                                    fontSize: 13,
                                    letterSpacing: "0.06em",
                                }}
                            >
                                SEAL Hackathon
                                Management System
                            </span>
                        </div>
                    </div>

                    {columns.map((col) => (
                        <div key={col.title}>
                            <div
                                style={{
                                    color: C.green,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: 10,
                                    letterSpacing: "0.12em",
                                    textTransform: "uppercase",
                                    marginBottom: 14,
                                }}
                            >
                                {col.title}
                            </div>
                            <div className="flex flex-col gap-2">
                                {col.links.map((l) => (
                                    <a
                                        key={l}
                                        href="#"
                                        style={{
                                            color: C.textMuted,
                                            fontFamily: "'JetBrains Mono', monospace",
                                            fontSize: 13,
                                            textDecoration: "none",
                                            transition: "color 0.15s",
                                        }}
                                        onMouseEnter={(e) =>
                                        ((e.target as HTMLElement).style.color =
                                            C.blueBright)
                                        }
                                        onMouseLeave={(e) =>
                                        ((e.target as HTMLElement).style.color =
                                            C.textMuted)
                                        }
                                    >
                                        {l}
                                    </a>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div
                    style={{
                        borderTop: `1px solid ${C.border}`,
                        paddingTop: 20,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 12,
                    }}
                >
                    <span
                        style={{
                            color: "rgba(134,239,172,0.35)",
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 12,
                        }}
                    >
                        © 2026 SEAL Hackathon. All rights reserved.
                    </span>
                    <div
                        style={{
                            height: 1,
                            flex: 1,
                            maxWidth: 200,
                            background:
                                "linear-gradient(90deg, transparent, rgba(59,130,246,0.3), transparent)",
                        }}
                    />
                    <span
                        style={{
                            color: C.blue,
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10,
                            letterSpacing: "0.08em",
                        }}
                    >
                        BUILD: PASSING
                    </span>
                </div>
            </div>
        </footer>
    );
}