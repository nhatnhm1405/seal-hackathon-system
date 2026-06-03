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
  { event_id: 2, event_name: 'SEAL Summer 2026', season: 'SUMMER', start_date: '2026-06-01', end_date: '2026-08-31', status: 'DRAFT' },
];

export const tracks: Track[] = [
  { track_id: 1, event_id: 1, track_name: 'Web Application', description: 'Build impactful web apps', max_teams: 20 },
  { track_id: 2, event_id: 1, track_name: 'AI Solution', description: 'Leverage AI/ML for real problems', max_teams: 15 },
  { track_id: 3, event_id: 1, track_name: 'Education Tech', description: 'Technology for learning', max_teams: 15 },
  { track_id: 4, event_id: 1, track_name: 'Social Impact', description: 'Tech for social good', max_teams: 10 },
];

export const rounds: Round[] = [
  { round_id: 1, event_id: 1, round_name: 'Preliminary', round_order: 1, submission_deadline: '2026-04-15T23:59:00', top_n_advance: 5, status: 'CLOSED' },
  { round_id: 2, event_id: 1, round_name: 'Qualifier', round_order: 2, submission_deadline: '2026-05-10T23:59:00', top_n_advance: 3, status: 'ACTIVE' },
  { round_id: 3, event_id: 1, round_name: 'Final', round_order: 3, submission_deadline: '2026-05-30T23:59:00', top_n_advance: null, status: 'UPCOMING' },
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
];

export const teams: Team[] = [
  { team_id: 1, track_id: 1, leader_id: 2, team_name: 'StackTrace', status: 'APPROVED', created_at: '2026-03-10T10:00:00' },
  { team_id: 2, track_id: 2, leader_id: 6, team_name: 'ByteBuilders', status: 'APPROVED', created_at: '2026-03-11T11:00:00' },
  { team_id: 3, track_id: 3, leader_id: 6, team_name: 'CodeCraft', status: 'APPROVED', created_at: '2026-03-12T12:00:00' },
  { team_id: 4, track_id: 1, leader_id: 6, team_name: 'NullPointers', status: 'PENDING', created_at: '2026-03-15T13:00:00' },
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
];

export const judgeAssignments: JudgeAssignment[] = [
  { assignment_id: 1, judge_id: 5, round_id: 1, judge_type: 'INTERNAL' },
  { assignment_id: 2, judge_id: 5, round_id: 2, judge_type: 'INTERNAL' },
  { assignment_id: 3, judge_id: 8, round_id: 2, judge_type: 'GUEST' },
];

export const mentorAssignments: MentorAssignment[] = [
  { mentor_id: 4, track_id: 1 },
];

export const submissions: Submission[] = [
  { submission_id: 1, team_id: 1, round_id: 1, repo_url: 'github.com/stacktrace/app', demo_url: 'stacktrace.vercel.app', slide_url: 'slides.google.com/d/abc', submitted_at: '2026-04-14T20:00:00' },
  { submission_id: 2, team_id: 1, round_id: 2, repo_url: 'github.com/stacktrace/app-v2', demo_url: 'stacktrace-v2.vercel.app', slide_url: 'slides.google.com/d/xyz', submitted_at: '2026-05-05T18:00:00' },
  { submission_id: 3, team_id: 2, round_id: 1, repo_url: 'github.com/bytebuilders/ai', demo_url: 'bytebuilders.ai', slide_url: 'slides.google.com/d/bb1', submitted_at: '2026-04-14T22:00:00' },
  { submission_id: 4, team_id: 2, round_id: 2, repo_url: 'github.com/bytebuilders/ai-v2', demo_url: 'bytebuilders-v2.ai', slide_url: 'slides.google.com/d/bb2', submitted_at: '2026-05-06T10:00:00' },
];

export const scores: Score[] = [
  { score_id: 1, submission_id: 1, judge_id: 5, criteria_id: 1, score_value: 8, is_draft: false, scored_at: '2026-04-15T10:00:00' },
  { score_id: 2, submission_id: 1, judge_id: 5, criteria_id: 2, score_value: 9, is_draft: false, scored_at: '2026-04-15T10:00:00' },
  { score_id: 3, submission_id: 1, judge_id: 5, criteria_id: 3, score_value: 7, is_draft: false, scored_at: '2026-04-15T10:00:00' },
  { score_id: 4, submission_id: 1, judge_id: 5, criteria_id: 4, score_value: 8, is_draft: false, scored_at: '2026-04-15T10:00:00' },
  { score_id: 5, submission_id: 1, judge_id: 5, criteria_id: 5, score_value: 9, is_draft: false, scored_at: '2026-04-15T10:00:00' },
];

export const rankings: Ranking[] = [
  { ranking_id: 1, team_id: 1, round_id: 1, total_score: 41.5, position: 1, is_advanced: true },
  { ranking_id: 2, team_id: 2, round_id: 1, total_score: 38.0, position: 2, is_advanced: true },
];

export const prizes: Prize[] = [
  { prize_id: 1, event_id: 1, prize_name: 'Grand Champion', description: 'First place', rank_position: 1 },
  { prize_id: 2, event_id: 1, prize_name: 'Runner Up', description: 'Second place', rank_position: 2 },
];

export const auditLogs: AuditLog[] = [
  { log_id: 1, performed_by: 1, action_type: 'EVENT_CREATED', entity_type: 'Event', entity_id: 1, details: 'Created event SEAL Spring 2026', created_at: '2026-02-15T09:00:00' },
  { log_id: 2, performed_by: 1, action_type: 'TEAM_APPROVED', entity_type: 'Team', entity_id: 1, details: 'Approved team StackTrace', created_at: '2026-03-10T15:00:00' },
  { log_id: 3, performed_by: 2, action_type: 'SUBMISSION_CREATED', entity_type: 'Submission', entity_id: 1, details: 'Team StackTrace submitted Preliminary round', created_at: '2026-04-14T20:00:00' },
  { log_id: 4, performed_by: 5, action_type: 'SCORING_FINALIZED', entity_type: 'Submission', entity_id: 1, details: 'Judge finalized scores for StackTrace', created_at: '2026-04-15T10:00:00' },
  { log_id: 5, performed_by: 1, action_type: 'RANKINGS_PUBLISHED', entity_type: 'Round', entity_id: 1, details: 'Published rankings for Preliminary round', created_at: '2026-04-16T11:00:00' },
];

export const MOCK_CREDENTIALS: Record<string, number> = {
  'coordinator@seal.edu': 1,
  'leader@seal.edu': 2,
  'member@seal.edu': 3,
  'mentor@seal.edu': 4,
  'judge@seal.edu': 5,
  'pending@seal.edu': 7,
  'noteam@seal.edu': 18,
};
