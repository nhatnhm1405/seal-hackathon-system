// Mock data for HACKATHON Management System (HMS)

export interface User {
  user_id: number;
  role: 'PARTICIPANT' | 'MENTOR' | 'JUDGE' | 'COORDINATOR';
  email: string;
  full_name: string;
  student_type: 'FPT' | 'EXTERNAL' | null;
  student_id: string | null;
  university_name: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface AccountApproval {
  approval_id: number;
  user_id: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  note: string | null;
  created_at: string;
}

export interface HackathonEvent {
  event_id: number;
  event_name: string;
  season: 'SPRING' | 'SUMMER' | 'FALL';
  start_date: string;
  end_date: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED';
}

export interface Track {
  track_id: number;
  event_id: number;
  track_name: string;
  description: string;
  max_teams: number;
}

export interface Round {
  round_id: number;
  event_id: number;
  round_name: string;
  round_order: number;
  submission_deadline: string;
  top_n_advance: number | null;
  status: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
}

export interface Team {
  team_id: number;
  track_id: number;
  leader_id: number;
  team_name: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ELIMINATED';
  created_at: string;
}

export interface TeamMember {
  team_id: number;
  user_id: number;
  joined_at: string;
  is_leader: boolean;
}

export interface Submission {
  submission_id: number;
  team_id: number;
  round_id: number;
  repo_url: string | null;
  demo_url: string | null;
  slide_url: string | null;
  submitted_at: string;
}

export interface ScoringCriteria {
  criteria_id: number;
  criteria_name: string;
  description: string;
  max_score: number;
  weight: number;
}

export interface RoundCriteria {
  round_id: number;
  criteria_id: number;
  weight_override: number | null;
}

export interface JudgeAssignment {
  assignment_id: number;
  judge_id: number;
  round_id: number;
  judge_type: 'INTERNAL' | 'GUEST';
}

export interface MentorAssignment {
  mentor_id: number;
  track_id: number;
}

export interface Score {
  score_id: number;
  submission_id: number;
  judge_id: number;
  criteria_id: number;
  score_value: number;
  is_draft: boolean;
  scored_at: string;
}

export interface Ranking {
  ranking_id: number;
  team_id: number;
  round_id: number;
  total_score: number;
  position: number;
  is_advanced: boolean;
}

export interface Prize {
  prize_id: number;
  event_id: number;
  prize_name: string;
  description: string;
  rank_position: number | null;
}

export interface AuditLog {
  log_id: number;
  performed_by: number | null;
  action_type: string;
  entity_type: string;
  entity_id: number | null;
  details: string;
  created_at: string;
}

export const users: User[] = [
  { user_id: 1, role: 'COORDINATOR', email: 'coordinator@seal.edu', full_name: 'Nguyen HP', student_type: 'FPT', student_id: 'SE001', university_name: null, status: 'ACTIVE' },
  { user_id: 2, role: 'PARTICIPANT', email: 'leader@seal.edu', full_name: 'Nguyen DT', student_type: 'FPT', student_id: 'SE002', university_name: null, status: 'ACTIVE' },
  { user_id: 3, role: 'PARTICIPANT', email: 'member@seal.edu', full_name: 'Tran TH', student_type: 'FPT', student_id: 'SE003', university_name: null, status: 'ACTIVE' },
  { user_id: 4, role: 'MENTOR', email: 'mentor@seal.edu', full_name: 'Phan TL', student_type: 'FPT', student_id: 'SE004', university_name: null, status: 'ACTIVE' },
  { user_id: 5, role: 'JUDGE', email: 'judge@seal.edu', full_name: 'Dr. Le TVA', student_type: 'EXTERNAL', student_id: null, university_name: 'Hanoi University', status: 'ACTIVE' },
  { user_id: 6, role: 'PARTICIPANT', email: 'leader2@seal.edu', full_name: 'Hoang NM', student_type: 'FPT', student_id: 'SE006', university_name: null, status: 'ACTIVE' },
  // Pending approval — Hoang VM (self-registered, not yet approved)
  { user_id: 7, role: 'PARTICIPANT', email: 'pending@seal.edu', full_name: 'Hoang VM', student_type: 'FPT', student_id: 'SE007', university_name: null, status: 'INACTIVE' },
  // Guest judge created by coordinator — auto-approved, no queue
  { user_id: 8, role: 'JUDGE', email: 'smith@guest.edu', full_name: 'Guest Judge Smith', student_type: 'EXTERNAL', student_id: null, university_name: 'MIT', status: 'ACTIVE' },
  { user_id: 9, role: 'PARTICIPANT', email: 'le.vh@seal.edu', full_name: 'Le VH', student_type: 'FPT', student_id: 'SE009', university_name: null, status: 'ACTIVE' },
  { user_id: 10, role: 'PARTICIPANT', email: 'dao.mk@seal.edu', full_name: 'Dao MK', student_type: 'FPT', student_id: 'SE010', university_name: null, status: 'ACTIVE' },
  { user_id: 11, role: 'PARTICIPANT', email: 'nguyen.qa@seal.edu', full_name: 'Nguyen QA', student_type: 'FPT', student_id: 'SE011', university_name: null, status: 'ACTIVE' },
  { user_id: 12, role: 'PARTICIPANT', email: 'tran.bt@seal.edu', full_name: 'Tran BT', student_type: 'FPT', student_id: 'SE012', university_name: null, status: 'ACTIVE' },
  { user_id: 13, role: 'PARTICIPANT', email: 'le.hn@seal.edu', full_name: 'Le HN', student_type: 'FPT', student_id: 'SE013', university_name: null, status: 'ACTIVE' },
  { user_id: 14, role: 'PARTICIPANT', email: 'pham.dq@seal.edu', full_name: 'Pham DQ', student_type: 'FPT', student_id: 'SE014', university_name: null, status: 'ACTIVE' },
  { user_id: 15, role: 'PARTICIPANT', email: 'vu.tl@seal.edu', full_name: 'Vu TL', student_type: 'FPT', student_id: 'SE015', university_name: null, status: 'ACTIVE' },
  { user_id: 16, role: 'PARTICIPANT', email: 'do.mh@seal.edu', full_name: 'Do MH', student_type: 'FPT', student_id: 'SE016', university_name: null, status: 'ACTIVE' },
  { user_id: 17, role: 'PARTICIPANT', email: 'bui.nk@seal.edu', full_name: 'Bui NK', student_type: 'FPT', student_id: 'SE017', university_name: null, status: 'ACTIVE' },
  // No-team participant — used for the "Join an Event" onboarding demo
  { user_id: 18, role: 'PARTICIPANT', email: 'noteam@seal.edu', full_name: 'Kim LT', student_type: 'FPT', student_id: 'SE018', university_name: null, status: 'ACTIVE' },
];

export const accountApprovals: AccountApproval[] = [
  { approval_id: 1, user_id: 1, status: 'APPROVED', note: null, created_at: '2026-01-05T09:00:00' },
  { approval_id: 2, user_id: 2, status: 'APPROVED', note: null, created_at: '2026-01-08T10:00:00' },
  { approval_id: 3, user_id: 3, status: 'APPROVED', note: null, created_at: '2026-01-10T11:00:00' },
  { approval_id: 4, user_id: 4, status: 'APPROVED', note: null, created_at: '2026-01-12T12:00:00' },
  { approval_id: 5, user_id: 5, status: 'APPROVED', note: null, created_at: '2026-01-15T13:00:00' },
  { approval_id: 6, user_id: 6, status: 'APPROVED', note: null, created_at: '2026-01-18T14:00:00' },
  { approval_id: 7, user_id: 7, status: 'PENDING', note: null, created_at: '2026-05-20T09:30:00' },
  { approval_id: 8, user_id: 18, status: 'APPROVED', note: null, created_at: '2026-05-22T10:00:00' },
  // user 8 (Guest Judge Smith) created by coordinator — no approval queue
];

export const events: HackathonEvent[] = [
  { event_id: 1, event_name: 'SEAL Spring 2026', season: 'SPRING', start_date: '2026-03-01', end_date: '2026-05-31', status: 'OPEN' },
  { event_id: 2, event_name: 'SEAL Summer 2026', season: 'SUMMER', start_date: '2026-06-01', end_date: '2026-08-31', status: 'OPEN' },
  { event_id: 3, event_name: 'SEAL Fall 2026', season: 'FALL', start_date: '2026-09-01', end_date: '2026-11-30', status: 'DRAFT' },
];

export const tracks: Track[] = [
  { track_id: 1, event_id: 1, track_name: 'Web Application', description: 'Build impactful web apps', max_teams: 20 },
  { track_id: 2, event_id: 1, track_name: 'AI Solution', description: 'Leverage AI/ML for real problems', max_teams: 15 },
  { track_id: 3, event_id: 1, track_name: 'Education Tech', description: 'Technology for learning', max_teams: 15 },
  { track_id: 4, event_id: 1, track_name: 'Social Impact', description: 'Tech for social good', max_teams: 10 },
  // Summer 2026 tracks
  { track_id: 5, event_id: 2, track_name: 'Blockchain & Web3', description: 'Decentralized apps and smart contracts', max_teams: 10 },
  { track_id: 6, event_id: 2, track_name: 'Mobile Applications', description: 'iOS and Android experiences', max_teams: 15 },
  { track_id: 7, event_id: 2, track_name: 'Cloud & DevOps', description: 'Scalable cloud-native solutions', max_teams: 10 },
];

export const rounds: Round[] = [
  { round_id: 1, event_id: 1, round_name: 'Preliminary', round_order: 1, submission_deadline: '2026-04-15T23:59:00', top_n_advance: 5, status: 'CLOSED' },
  { round_id: 2, event_id: 1, round_name: 'Qualifier', round_order: 2, submission_deadline: '2026-05-10T23:59:00', top_n_advance: 3, status: 'ACTIVE' },
  { round_id: 3, event_id: 1, round_name: 'Final', round_order: 3, submission_deadline: '2026-05-30T23:59:00', top_n_advance: null, status: 'UPCOMING' },
  // Summer 2026 rounds
  { round_id: 4, event_id: 2, round_name: 'Preliminary', round_order: 1, submission_deadline: '2026-07-15T23:59:00', top_n_advance: 4, status: 'ACTIVE' },
  { round_id: 5, event_id: 2, round_name: 'Final', round_order: 2, submission_deadline: '2026-08-20T23:59:00', top_n_advance: null, status: 'UPCOMING' },
];

export const criteria: ScoringCriteria[] = [
  { criteria_id: 1, criteria_name: 'Innovation', description: 'Novelty and creativity', max_score: 10, weight: 1.5 },
  { criteria_id: 2, criteria_name: 'Technical Implementation', description: 'Code quality and architecture', max_score: 10, weight: 2.0 },
  { criteria_id: 3, criteria_name: 'UI/UX Design', description: 'User experience quality', max_score: 10, weight: 1.0 },
  { criteria_id: 4, criteria_name: 'Completeness', description: 'Feature completeness', max_score: 10, weight: 1.5 },
  { criteria_id: 5, criteria_name: 'Presentation', description: 'Clarity of demo and pitch', max_score: 10, weight: 1.0 },
];

export const roundCriteria: RoundCriteria[] = [
  { round_id: 1, criteria_id: 1, weight_override: null },
  { round_id: 1, criteria_id: 2, weight_override: null },
  { round_id: 1, criteria_id: 3, weight_override: null },
  { round_id: 1, criteria_id: 4, weight_override: null },
  { round_id: 1, criteria_id: 5, weight_override: null },
  { round_id: 2, criteria_id: 1, weight_override: null },
  { round_id: 2, criteria_id: 2, weight_override: null },
  { round_id: 2, criteria_id: 3, weight_override: null },
  { round_id: 2, criteria_id: 4, weight_override: null },
  { round_id: 2, criteria_id: 5, weight_override: null },
  { round_id: 3, criteria_id: 1, weight_override: null },
  { round_id: 3, criteria_id: 2, weight_override: null },
  { round_id: 3, criteria_id: 3, weight_override: null },
  { round_id: 3, criteria_id: 4, weight_override: null },
  { round_id: 3, criteria_id: 5, weight_override: null },
  // Summer 2026 rounds
  { round_id: 4, criteria_id: 1, weight_override: null },
  { round_id: 4, criteria_id: 2, weight_override: null },
  { round_id: 4, criteria_id: 3, weight_override: null },
  { round_id: 4, criteria_id: 4, weight_override: null },
  { round_id: 4, criteria_id: 5, weight_override: null },
  { round_id: 5, criteria_id: 1, weight_override: null },
  { round_id: 5, criteria_id: 2, weight_override: null },
  { round_id: 5, criteria_id: 3, weight_override: null },
  { round_id: 5, criteria_id: 4, weight_override: null },
  { round_id: 5, criteria_id: 5, weight_override: null },
];

export const teams: Team[] = [
  { team_id: 1, track_id: 1, leader_id: 2, team_name: 'StackTrace', status: 'APPROVED', created_at: '2026-03-10T10:00:00' },
  { team_id: 2, track_id: 2, leader_id: 6, team_name: 'ByteBuilders', status: 'APPROVED', created_at: '2026-03-11T11:00:00' },
  { team_id: 3, track_id: 3, leader_id: 6, team_name: 'CodeCraft', status: 'APPROVED', created_at: '2026-03-12T12:00:00' },
  { team_id: 4, track_id: 1, leader_id: 6, team_name: 'NullPointers', status: 'PENDING', created_at: '2026-03-15T13:00:00' },
  // Summer 2026 teams
  { team_id: 5, track_id: 5, leader_id: 2, team_name: 'CryptoSquad', status: 'APPROVED', created_at: '2026-06-10T10:00:00' },
  { team_id: 6, track_id: 6, leader_id: 6, team_name: 'MobileMinds', status: 'APPROVED', created_at: '2026-06-11T11:00:00' },
  { team_id: 7, track_id: 7, leader_id: 9, team_name: 'CloudBuilders', status: 'APPROVED', created_at: '2026-06-12T09:00:00' },
];

export const teamMembers: TeamMember[] = [
  { team_id: 1, user_id: 2, joined_at: '2026-03-10T10:00:00', is_leader: true },
  { team_id: 1, user_id: 3, joined_at: '2026-03-10T10:30:00', is_leader: false },
  { team_id: 1, user_id: 9, joined_at: '2026-03-10T11:00:00', is_leader: false },
  { team_id: 1, user_id: 10, joined_at: '2026-03-10T11:30:00', is_leader: false },
  { team_id: 2, user_id: 6, joined_at: '2026-03-11T11:00:00', is_leader: true },
  { team_id: 2, user_id: 11, joined_at: '2026-03-11T11:30:00', is_leader: false },
  { team_id: 2, user_id: 12, joined_at: '2026-03-11T12:00:00', is_leader: false },
  { team_id: 2, user_id: 13, joined_at: '2026-03-11T12:30:00', is_leader: false },
  { team_id: 3, user_id: 6, joined_at: '2026-03-12T12:00:00', is_leader: true },
  { team_id: 3, user_id: 14, joined_at: '2026-03-12T12:30:00', is_leader: false },
  { team_id: 3, user_id: 15, joined_at: '2026-03-12T13:00:00', is_leader: false },
  { team_id: 4, user_id: 6, joined_at: '2026-03-15T13:00:00', is_leader: true },
  { team_id: 4, user_id: 16, joined_at: '2026-03-15T13:30:00', is_leader: false },
  { team_id: 4, user_id: 17, joined_at: '2026-03-15T14:00:00', is_leader: false },
  // Summer 2026 team members
  { team_id: 5, user_id: 2, joined_at: '2026-06-10T10:00:00', is_leader: true },
  { team_id: 5, user_id: 11, joined_at: '2026-06-10T10:30:00', is_leader: false },
  { team_id: 5, user_id: 12, joined_at: '2026-06-10T11:00:00', is_leader: false },
  { team_id: 6, user_id: 6, joined_at: '2026-06-11T11:00:00', is_leader: true },
  { team_id: 6, user_id: 13, joined_at: '2026-06-11T11:30:00', is_leader: false },
  { team_id: 6, user_id: 14, joined_at: '2026-06-11T12:00:00', is_leader: false },
  { team_id: 7, user_id: 9, joined_at: '2026-06-12T09:00:00', is_leader: true },
  { team_id: 7, user_id: 15, joined_at: '2026-06-12T09:30:00', is_leader: false },
  { team_id: 7, user_id: 16, joined_at: '2026-06-12T10:00:00', is_leader: false },
];

export const judgeAssignments: JudgeAssignment[] = [
  // Spring 2026
  { assignment_id: 1, judge_id: 5, round_id: 1, judge_type: 'INTERNAL' },
  { assignment_id: 2, judge_id: 5, round_id: 2, judge_type: 'INTERNAL' },
  { assignment_id: 3, judge_id: 8, round_id: 2, judge_type: 'GUEST' },
  // Summer 2026 — both judges also assigned here
  { assignment_id: 4, judge_id: 5, round_id: 4, judge_type: 'INTERNAL' },
  { assignment_id: 5, judge_id: 8, round_id: 4, judge_type: 'GUEST' },
];

export const mentorAssignments: MentorAssignment[] = [
  // Spring 2026
  { mentor_id: 4, track_id: 1 },
  { mentor_id: 4, track_id: 2 },
  // Summer 2026 — same mentor assigned to new tracks
  { mentor_id: 4, track_id: 5 },
  { mentor_id: 4, track_id: 6 },
];

export const submissions: Submission[] = [
  // Spring 2026
  { submission_id: 1, team_id: 1, round_id: 1, repo_url: 'github.com/stacktrace/app', demo_url: 'stacktrace.vercel.app', slide_url: 'slides.google.com/d/abc', submitted_at: '2026-04-14T20:00:00' },
  { submission_id: 2, team_id: 1, round_id: 2, repo_url: 'github.com/stacktrace/app-v2', demo_url: 'stacktrace-v2.vercel.app', slide_url: 'slides.google.com/d/xyz', submitted_at: '2026-05-05T18:00:00' },
  { submission_id: 3, team_id: 2, round_id: 1, repo_url: 'github.com/bytebuilders/ai', demo_url: 'bytebuilders.ai', slide_url: 'slides.google.com/d/bb1', submitted_at: '2026-04-14T22:00:00' },
  { submission_id: 4, team_id: 2, round_id: 2, repo_url: 'github.com/bytebuilders/ai-v2', demo_url: 'bytebuilders-v2.ai', slide_url: 'slides.google.com/d/bb2', submitted_at: '2026-05-06T10:00:00' },
  // Summer 2026
  { submission_id: 5, team_id: 5, round_id: 4, repo_url: 'github.com/cryptosquad/dapp', demo_url: 'cryptosquad.vercel.app', slide_url: 'slides.google.com/d/cs1', submitted_at: '2026-07-10T20:00:00' },
  { submission_id: 6, team_id: 6, round_id: 4, repo_url: 'github.com/mobileminds/app', demo_url: 'mobileminds.app', slide_url: 'slides.google.com/d/mm1', submitted_at: '2026-07-11T18:00:00' },
  { submission_id: 7, team_id: 7, round_id: 4, repo_url: 'github.com/cloudbuilders/infra', demo_url: null, slide_url: 'slides.google.com/d/cb1', submitted_at: '2026-07-12T22:00:00' },
];

export const scores: Score[] = [
  // Spring 2026 — submission 1 (StackTrace, Preliminary): fully scored by judge 5
  { score_id: 1, submission_id: 1, judge_id: 5, criteria_id: 1, score_value: 8, is_draft: false, scored_at: '2026-04-15T10:00:00' },
  { score_id: 2, submission_id: 1, judge_id: 5, criteria_id: 2, score_value: 9, is_draft: false, scored_at: '2026-04-15T10:00:00' },
  { score_id: 3, submission_id: 1, judge_id: 5, criteria_id: 3, score_value: 7, is_draft: false, scored_at: '2026-04-15T10:00:00' },
  { score_id: 4, submission_id: 1, judge_id: 5, criteria_id: 4, score_value: 8, is_draft: false, scored_at: '2026-04-15T10:00:00' },
  { score_id: 5, submission_id: 1, judge_id: 5, criteria_id: 5, score_value: 9, is_draft: false, scored_at: '2026-04-15T10:00:00' },
  // Spring 2026 — submission 3 (ByteBuilders, Preliminary): fully scored by judge 5
  { score_id: 6, submission_id: 3, judge_id: 5, criteria_id: 1, score_value: 7, is_draft: false, scored_at: '2026-04-15T11:00:00' },
  { score_id: 7, submission_id: 3, judge_id: 5, criteria_id: 2, score_value: 8, is_draft: false, scored_at: '2026-04-15T11:00:00' },
  { score_id: 8, submission_id: 3, judge_id: 5, criteria_id: 3, score_value: 6, is_draft: false, scored_at: '2026-04-15T11:00:00' },
  { score_id: 9, submission_id: 3, judge_id: 5, criteria_id: 4, score_value: 7, is_draft: false, scored_at: '2026-04-15T11:00:00' },
  { score_id: 10, submission_id: 3, judge_id: 5, criteria_id: 5, score_value: 8, is_draft: false, scored_at: '2026-04-15T11:00:00' },
  // Summer 2026 — submission 5 (CryptoSquad, Preliminary): fully scored by judge 5
  { score_id: 11, submission_id: 5, judge_id: 5, criteria_id: 1, score_value: 9, is_draft: false, scored_at: '2026-07-13T10:00:00' },
  { score_id: 12, submission_id: 5, judge_id: 5, criteria_id: 2, score_value: 8, is_draft: false, scored_at: '2026-07-13T10:00:00' },
  { score_id: 13, submission_id: 5, judge_id: 5, criteria_id: 3, score_value: 8, is_draft: false, scored_at: '2026-07-13T10:00:00' },
  { score_id: 14, submission_id: 5, judge_id: 5, criteria_id: 4, score_value: 7, is_draft: false, scored_at: '2026-07-13T10:00:00' },
  { score_id: 15, submission_id: 5, judge_id: 5, criteria_id: 5, score_value: 9, is_draft: false, scored_at: '2026-07-13T10:00:00' },
  // Summer 2026 — submission 6 (MobileMinds, Preliminary): in-progress draft by judge 5
  { score_id: 16, submission_id: 6, judge_id: 5, criteria_id: 1, score_value: 7, is_draft: true, scored_at: '2026-07-14T09:00:00' },
  { score_id: 17, submission_id: 6, judge_id: 5, criteria_id: 2, score_value: 6, is_draft: true, scored_at: '2026-07-14T09:00:00' },
  // submission 7 (CloudBuilders) not yet scored
];

export const rankings: Ranking[] = [
  // Spring 2026 — Preliminary
  { ranking_id: 1, team_id: 1, round_id: 1, total_score: 41.5, position: 1, is_advanced: true },
  { ranking_id: 2, team_id: 2, round_id: 1, total_score: 38.0, position: 2, is_advanced: true },
  // Summer 2026 — Preliminary (partial, scoring in progress)
  { ranking_id: 3, team_id: 5, round_id: 4, total_score: 40.3, position: 1, is_advanced: true },
];

export const prizes: Prize[] = [
  { prize_id: 1, event_id: 1, prize_name: 'Grand Champion', description: 'First place', rank_position: 1 },
  { prize_id: 2, event_id: 1, prize_name: 'Runner Up', description: 'Second place', rank_position: 2 },
  { prize_id: 3, event_id: 2, prize_name: 'Grand Champion', description: 'First place', rank_position: 1 },
  { prize_id: 4, event_id: 2, prize_name: 'Runner Up', description: 'Second place', rank_position: 2 },
  { prize_id: 5, event_id: 2, prize_name: 'Best Innovation', description: 'Most creative solution', rank_position: null },
];

export const auditLogs: AuditLog[] = [
  { log_id: 1, performed_by: 1, action_type: 'EVENT_CREATED', entity_type: 'Event', entity_id: 1, details: 'Created event SEAL Spring 2026', created_at: '2026-02-15T09:00:00' },
  { log_id: 2, performed_by: 1, action_type: 'TEAM_APPROVED', entity_type: 'Team', entity_id: 1, details: 'Approved team StackTrace', created_at: '2026-03-10T15:00:00' },
  { log_id: 3, performed_by: 2, action_type: 'SUBMISSION_CREATED', entity_type: 'Submission', entity_id: 1, details: 'Team StackTrace submitted Preliminary round', created_at: '2026-04-14T20:00:00' },
  { log_id: 4, performed_by: 5, action_type: 'SCORING_FINALIZED', entity_type: 'Submission', entity_id: 1, details: 'Judge finalized scores for StackTrace', created_at: '2026-04-15T10:00:00' },
  { log_id: 5, performed_by: 1, action_type: 'RANKINGS_PUBLISHED', entity_type: 'Round', entity_id: 1, details: 'Published rankings for Preliminary round', created_at: '2026-04-16T11:00:00' },
];

// ── Notifications ──────────────────────────────────────────────────
export interface AppNotification {
  notification_id: number;
  user_id: number;
  type: 'info' | 'success' | 'warning';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const notifications: AppNotification[] = [
  { notification_id: 1, user_id: 2, type: 'success', title: 'Team Approved', message: 'Your team "StackTrace" has been approved by the coordinator. You can now submit your project.', is_read: false, created_at: '2026-03-10T15:00:00' },
  { notification_id: 2, user_id: 2, type: 'info', title: 'Qualifier Round Active', message: 'Round 2 – Qualifier is now open. Submission deadline is May 10, 2026.', is_read: false, created_at: '2026-04-17T09:00:00' },
  { notification_id: 3, user_id: 2, type: 'warning', title: 'Submission Deadline Soon', message: 'Your Qualifier submission is due in 3 days. Make sure to submit before May 10.', is_read: true, created_at: '2026-05-07T08:00:00' },
  { notification_id: 4, user_id: 3, type: 'success', title: 'Team Status Updated', message: 'Your team "StackTrace" has been approved and is now active for SEAL Spring 2026.', is_read: false, created_at: '2026-03-10T15:05:00' },
  { notification_id: 5, user_id: 3, type: 'info', title: 'Rankings Published', message: 'Preliminary round rankings are now available. Check the leaderboard for your position.', is_read: true, created_at: '2026-04-16T11:00:00' },
  { notification_id: 6, user_id: 5, type: 'info', title: 'New Scoring Assignment', message: 'You have been assigned to judge the Qualifier round for SEAL Spring 2026. 4 submissions await.', is_read: false, created_at: '2026-04-18T10:00:00' },
  { notification_id: 7, user_id: 1, type: 'warning', title: 'Pending Team Approvals', message: '2 team registrations are waiting for your approval. Review them in the Teams management panel.', is_read: false, created_at: '2026-05-25T09:00:00' },
  { notification_id: 8, user_id: 4, type: 'info', title: 'New Teams in Your Track', message: 'AI Solution track now has 3 registered teams. Review their profiles in My Tracks.', is_read: true, created_at: '2026-03-15T14:00:00' },
  { notification_id: 9, user_id: 18, type: 'info', title: 'Account Activated', message: 'Welcome to SEAL Hackathon! Your account is active. Join an event to start competing.', is_read: false, created_at: '2026-05-22T10:05:00' },
  { notification_id: 10, user_id: 1, type: 'success', title: 'Event Published', message: 'SEAL Spring 2026 has been published successfully. Registration is now open.', is_read: true, created_at: '2026-03-01T08:00:00' },
  { notification_id: 11, user_id: 5, type: 'info', title: 'Summer Event Assignment', message: 'You have been assigned to judge the Preliminary round for SEAL Summer 2026. 3 submissions are awaiting review.', is_read: false, created_at: '2026-06-15T10:00:00' },
  { notification_id: 12, user_id: 8, type: 'info', title: 'Summer Event Assignment', message: 'You have been assigned as Guest Judge for the Preliminary round of SEAL Summer 2026.', is_read: false, created_at: '2026-06-15T10:05:00' },
  { notification_id: 13, user_id: 4, type: 'info', title: 'New Track Assignments', message: 'You have been assigned to mentor Blockchain & Web3 and Mobile Applications tracks in SEAL Summer 2026.', is_read: false, created_at: '2026-06-15T11:00:00' },
];

export interface TeamInvite {
  invite_id: number;
  team_id: number;
  invited_user_id: number;
  invited_by: number;
  message: string;
  created_at: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
}

export const teamInvites: TeamInvite[] = [
  {
    invite_id: 1,
    team_id: 1,
    invited_user_id: 18,
    invited_by: 2,
    message: "Hey! We need a frontend dev for the Qualifier round. Want to join StackTrace?",
    created_at: '2026-05-23T09:00:00',
    status: 'PENDING',
  },
  {
    invite_id: 2,
    team_id: 3,
    invited_user_id: 18,
    invited_by: 6,
    message: "CodeCraft is looking for passionate builders. We think you'd be a great fit!",
    created_at: '2026-05-24T14:30:00',
    status: 'PENDING',
  },
  {
    invite_id: 3,
    team_id: 7,
    invited_user_id: 18,
    invited_by: 9,
    message: "We're building a cloud-native infra project for Summer 2026. Join CloudBuilders!",
    created_at: '2026-05-25T11:00:00',
    status: 'PENDING',
  },
  {
    invite_id: 4,
    team_id: 4,
    invited_user_id: 18,
    invited_by: 6,
    message: "NullPointers needs one more member before we get approved. Come join us!",
    created_at: '2026-05-26T08:45:00',
    status: 'PENDING',
  },
];

export const MOCK_CREDENTIALS: Record<string, number> = {
  'coordinator@seal.edu': 1,
  'leader@seal.edu': 2,
  'member@seal.edu': 3,
  'mentor@seal.edu': 4,
  'judge@seal.edu': 5,
  'smith@guest.edu': 8,
  'pending@seal.edu': 7,
  'noteam@seal.edu': 18,
};
