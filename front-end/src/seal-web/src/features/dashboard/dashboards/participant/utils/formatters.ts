export function fmtDate(iso?: string) {
    return iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—";
}

export function fmtShort(iso?: string) {
    return iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
}

export function roundStatusColor(status?: string): "green" | "yellow" | "red" | "gray" {
    const s = (status ?? "").toUpperCase();
    if (["ACTIVE", "OPEN", "IN_PROGRESS"].includes(s)) return "green";
    if (["UPCOMING", "PENDING", "DRAFT"].includes(s)) return "yellow";
    if (["CLOSED", "CANCELLED"].includes(s)) return "red";
    return "gray";
}

export function teamStatusColor(status?: string): "green" | "yellow" | "red" | "gray" {
    const s = (status ?? "").toUpperCase();
    if (s === "APPROVED") return "green";
    if (s === "PENDING") return "yellow";
    if (s === "REJECTED" || s === "DISQUALIFIED") return "red";
    return "gray";
}
