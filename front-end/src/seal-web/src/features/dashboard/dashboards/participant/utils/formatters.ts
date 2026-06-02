export const TRACK_SPOTS_LEFT: Record<number, number> = { 1: 4, 2: 7, 3: 9, 4: 2 };

export function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function fmtShort(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}