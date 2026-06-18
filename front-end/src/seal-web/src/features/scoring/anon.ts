/**
 * Judge-side anonymisation of teams.
 *
 * Scoring must stay impartial, so the judging screens never show team names —
 * each team is shown as a stable, track-based code like `WEB-1`, `AI-2`.
 *
 * The code is derived from the judge's assignment roster (teamId + trackName),
 * not from whatever submissions happen to be loaded, so the same team keeps the
 * same code across rounds and across the Score / History pages.
 */

/** First word of the track name, uppercased: "Web Application" → "WEB". */
export function trackAbbrev(trackName?: string | null): string {
  const first = (trackName ?? "").trim().split(/\s+/)[0];
  return first ? first.toUpperCase() : "ENTRY";
}

export interface TeamRosterEntry { teamId: number; trackName?: string | null }

/**
 * Build a stable `teamId → code` map. Within each track, teams are numbered by
 * ascending teamId so the numbering is deterministic regardless of which
 * submissions are present.
 */
export function buildTeamCodeMap(roster: TeamRosterEntry[]): Map<number, string> {
  // Dedupe teams (the roster has one entry per round), keeping the track.
  const trackByTeam = new Map<number, string | null | undefined>();
  roster.forEach(r => { if (!trackByTeam.has(r.teamId)) trackByTeam.set(r.teamId, r.trackName); });

  // Group teamIds by track abbreviation.
  const teamsByTrack = new Map<string, number[]>();
  trackByTeam.forEach((track, teamId) => {
    const key = trackAbbrev(track);
    const arr = teamsByTrack.get(key) ?? [];
    arr.push(teamId);
    teamsByTrack.set(key, arr);
  });

  const codes = new Map<number, string>();
  teamsByTrack.forEach((teamIds, abbrev) => {
    teamIds.sort((a, b) => a - b).forEach((teamId, i) => codes.set(teamId, `${abbrev}-${i + 1}`));
  });
  return codes;
}
