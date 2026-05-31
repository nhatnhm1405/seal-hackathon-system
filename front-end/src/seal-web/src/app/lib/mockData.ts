export interface Role {
    role_id: number;
    role_name: 'EVENT_COORDINATOR' | 'MENTOR' | 'JUDGE';
    description: string;
}

export interface User {
    user_id: number;
    email: string;
    password_hash: string | null;
    full_name: string;
    user_type: 'FPT_STUDENT' | 'EXTERNAL_STUDENT' | 'STAFF';
    student_code: string | null;
    university: string | null;
    is_approved: boolean;
    is_active: boolean;
    oauth_provider: 'GITHUB' | 'GOOGLE' | null;
    oauth_id: string | null;
    created_at: string;
    updated_at: string | null;
}

export interface HackathonEvent {
    event_id: number;
    name: string;
    season: 'SPRING' | 'SUMMER' | 'FALL';
    year: number;
    description: string | null;
    registration_start: string | null;
    registration_end: string | null;
    start_date: string;
    end_date: string;
    status: 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    created_by: number;
    created_at: string;
}

export interface Track {
    track_id: number;
    event_id: number;
    name: string;
    description: string | null;
    created_at: string;
}

export interface Round {
    round_id: number;
    event_id: number;
    name: string;
    order_number: number;
    start_time: string;
    end_time: string;
    submission_deadline: string;
    top_n_advance: number | null;
    is_calibration: boolean;
    status: 'PENDING' | 'ACTIVE' | 'CLOSED' | 'FINALIZED';
}

export interface UserEventRole {
    id: number;
    user_id: number;
    role_id: number;
    event_id: number | null;
    track_id: number | null;
    round_id: number | null;
    judge_type: 'INTERNAL' | 'GUEST' | null;
    assigned_at: string;
    assigned_by: number | null;
}

export interface Team {
    team_id: number;
    event_id: number;
    track_id: number;
    name: string;
    description: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISQUALIFIED';
    disqualified_reason: string | null;
    disqualified_at: string | null;
    created_at: string;
}

export interface TeamMember {
    id: number;
    team_id: number;
    user_id: number;
    member_role: 'LEADER' | 'MEMBER';
    joined_at: string;
}

export interface Submission {
    submission_id: number;
    team_id: number;
    round_id: number;
    repo_url: string | null;
    demo_url: string | null;
    slide_url: string | null;
    description: string | null;
    submitted_at: string;
    submitted_by: number;
    status: 'DRAFT' | 'SUBMITTED' | 'LATE' | 'INVALID';
}

export interface ScoringCriteriaTemplate {
    template_id: number;
    name: string;
    description: string | null;
    is_default: boolean;
    created_at: string;
}

export interface ScoringCriteria {
    criteria_id: number;
    event_id: number | null;
    round_id: number | null;
    template_id: number | null;
    name: string;
    description: string | null;
    weight: number;
    max_score: number;
    order_number: number | null;
}

export interface Score {
    score_id: number;
    submission_id: number;
    judge_user_id: number;
    criteria_id: number;
    value: number;
    comment: string | null;
    is_draft: boolean;
    scored_at: string;
    updated_at: string | null;
}

export interface RoundResult {
    result_id: number;
    team_id: number;
    round_id: number;
    total_score: number;
    rank_position: number;
    advanced: boolean;
    is_published: boolean;
    finalized_at: string | null;
    finalized_by: number | null;
}

export interface Prize {
    prize_id: number;
    event_id: number;
    track_id: number | null;
    name: string;
    description: string | null;
    rank_position: number;
    team_id: number | null;
    awarded_at: string | null;
}

export interface Notification {
    notification_id: number;
    recipient_user_id: number;
    title: string;
    content: string | null;
    type: 'ANNOUNCEMENT' | 'RESULT' | 'REMINDER' | 'ASSIGNMENT' | 'APPROVAL' | null;
    related_event_id: number | null;
    is_read: boolean;
    created_at: string;
}

export interface AuditLog {
    log_id: number;
    actor_user_id: number;
    action: string;
    target_type: string | null;
    target_id: number | null;
    reason: string | null;
    metadata_json: string | null;
    ip_address: string | null;
    created_at: string;
}


export const roles: Role[] = [
    { role_id: 1, role_name: 'EVENT_COORDINATOR', description: 'SE Dept / PDP staff managing events' },
    { role_id: 2, role_name: 'MENTOR', description: 'Faculty mentor assigned to a track' },
    { role_id: 3, role_name: 'JUDGE', description: 'Judge scoring submissions' },
];

export const users: User[] = [
    // Coordinator
    { user_id: 1, email: 'coordinator@gmail.com', password_hash: '$2b$10$hash001', full_name: 'Nguyen Van A', user_type: 'STAFF', student_code: null, university: null, is_approved: true, is_active: true, oauth_provider: null, oauth_id: null, created_at: '2026-01-05T09:00:00', updated_at: null },
    // Team leaders & members (FPT)
    { user_id: 2, email: 'leader@gmail.com', password_hash: '$2b$10$hash002', full_name: 'Nguyen Duy T', user_type: 'FPT_STUDENT', student_code: 'SE000001', university: null, is_approved: true, is_active: true, oauth_provider: null, oauth_id: null, created_at: '2026-01-08T10:00:00', updated_at: null },
    { user_id: 3, email: 'member@gmail.com', password_hash: '$2b$10$hash003', full_name: 'Tran Thi H', user_type: 'FPT_STUDENT', student_code: 'SE000002', university: null, is_approved: true, is_active: true, oauth_provider: null, oauth_id: null, created_at: '2026-01-10T11:00:00', updated_at: null },
    // Mentor (FPT staff)
    { user_id: 4, email: 'mentor@gmail.com', password_hash: '$2b$10$hash004', full_name: 'Phan Thi L', user_type: 'STAFF', student_code: null, university: null, is_approved: true, is_active: true, oauth_provider: null, oauth_id: null, created_at: '2026-01-12T12:00:00', updated_at: null },
    // Internal judge (FPT staff)
    { user_id: 5, email: 'judge@fpt.edu', password_hash: '$2b$10$hash005', full_name: 'Le Thi Van A', user_type: 'STAFF', student_code: null, university: null, is_approved: true, is_active: true, oauth_provider: null, oauth_id: null, created_at: '2026-01-15T13:00:00', updated_at: null },
    { user_id: 6, email: 'jugde2@fpt.edu', password_hash: '$2b$10$hash006', full_name: 'Nguyen Van H', user_type: 'STAFF', student_code: null, university: null, is_approved: true, is_active: true, oauth_provider: null, oauth_id: null, created_at: '2026-01-18T14:00:00', updated_at: null },
    // Pending approval 
    { user_id: 7, email: 'pending@gmail.com', password_hash: '$2b$10$hash007', full_name: 'Hoang Van M', user_type: 'FPT_STUDENT', student_code: 'SE000003', university: null, is_approved: false, is_active: true, oauth_provider: null, oauth_id: null, created_at: '2026-05-20T09:30:00', updated_at: null },
    // Guest judge — tài khoản STAFF do Coordinator tạo 
    { user_id: 8, email: 'smith@guest.com', password_hash: '$2b$10$hash008', full_name: 'Guest Judge Smith', user_type: 'STAFF', student_code: null, university: null, is_approved: true, is_active: true, oauth_provider: null, oauth_id: null, created_at: '2026-02-01T08:00:00', updated_at: null },
    { user_id: 9, email: 'levh@seal.com', password_hash: '$2b$10$hash009', full_name: 'Le Van H', user_type: 'STAFF', student_code: null, university: null, is_approved: true, is_active: true, oauth_provider: null, oauth_id: null, created_at: '2026-01-20T10:00:00', updated_at: null },
    { user_id: 10, email: 'daomk@seal.com', password_hash: '$2b$10$hash010', full_name: 'Dao Manh K', user_type: 'STAFF', student_code: null, university: null, is_approved: true, is_active: true, oauth_provider: null, oauth_id: null, created_at: '2026-01-20T10:00:00', updated_at: null },
    { user_id: 11, email: 'nguyenqa@seal.com', password_hash: '$2b$10$hash011', full_name: 'Nguyen Quynh A', user_type: 'STAFF', student_code: null, university: null, is_approved: true, is_active: true, oauth_provider: null, oauth_id: null, created_at: '2026-01-21T10:00:00', updated_at: null },
    { user_id: 12, email: 'tranbt@seal.com', password_hash: '$2b$10$hash012', full_name: 'Tran Bao T', user_type: 'STAFF', student_code: null, university: null, is_approved: true, is_active: true, oauth_provider: null, oauth_id: null, created_at: '2026-01-21T10:00:00', updated_at: null },
    { user_id: 13, email: 'lehn@seal.com', password_hash: '$2b$10$hash013', full_name: 'Le Hanh N', user_type: 'STAFF', student_code: null, university: null, is_approved: true, is_active: true, oauth_provider: null, oauth_id: null, created_at: '2026-01-22T10:00:00', updated_at: null },
    { user_id: 14, email: 'phamdq@seal.com', password_hash: '$2b$10$hash014', full_name: 'Pham Danh Q', user_type: 'STAFF', student_code: null, university: null, is_approved: true, is_active: true, oauth_provider: null, oauth_id: null, created_at: '2026-01-22T10:00:00', updated_at: null },
    { user_id: 15, email: 'vutl@seal.com', password_hash: '$2b$10$hash015', full_name: 'Vu Tien L', user_type: 'STAFF', student_code: null, university: null, is_approved: true, is_active: true, oauth_provider: null, oauth_id: null, created_at: '2026-01-23T10:00:00', updated_at: null },
    { user_id: 16, email: 'domh@seal.com', password_hash: '$2b$10$hash016', full_name: 'Do Manh H', user_type: 'STAFF', student_code: null, university: null, is_approved: true, is_active: true, oauth_provider: null, oauth_id: null, created_at: '2026-01-23T10:00:00', updated_at: null },
    { user_id: 17, email: 'buink@seal.com', password_hash: '$2b$10$hash017', full_name: 'Bui Nguyen K', user_type: 'STAFF', student_code: null, university: null, is_approved: true, is_active: true, oauth_provider: null, oauth_id: null, created_at: '2026-01-24T10:00:00', updated_at: null },
    // External student — login bằng Google OAuth
    { user_id: 18, email: 'external@hust.edu.vn', password_hash: null, full_name: 'Nguyen Van A', user_type: 'EXTERNAL_STUDENT', student_code: 'HUST001', university: 'Hanoi University of Science and Technology', is_approved: true, is_active: true, oauth_provider: 'GOOGLE', oauth_id: 'google-uid-001', created_at: '2026-01-25T10:00:00', updated_at: null },
    // Member chưa assign vào team 
    { user_id: 19, email: 'levanb@gmail.com', password_hash: '$2b$10$hash019', full_name: 'Le Van B', user_type: 'FPT_STUDENT', student_code: 'SE000004', university: null, is_approved: true, is_active: true, oauth_provider: null, oauth_id: null, created_at: '2026-02-10T11:00:00', updated_at: null },
];


export const events: HackathonEvent[] = [
    {
        event_id: 1, name: 'SEAL Spring 2026', season: 'SPRING', year: 2026,
        description: 'Annual SEAL Hackathon - Spring semester 2026',
        registration_start: '2026-02-15T00:00:00', registration_end: '2026-03-05T23:59:00',
        start_date: '2026-03-01T00:00:00', end_date: '2026-05-31T23:59:00',
        status: 'IN_PROGRESS', created_by: 1, created_at: '2026-02-15T09:00:00',
    },
    {
        event_id: 2, name: 'SEAL Summer 2026', season: 'SUMMER', year: 2026,
        description: null, registration_start: null, registration_end: null,
        start_date: '2026-06-01T00:00:00', end_date: '2026-08-31T23:59:00',
        status: 'DRAFT', created_by: 1, created_at: '2026-05-01T09:00:00',
    },
];

export const tracks: Track[] = [
    { track_id: 1, event_id: 1, name: 'Web Application', description: 'Build impactful web apps', created_at: '2026-02-15T09:00:00' },
    { track_id: 2, event_id: 1, name: 'AI Solution', description: 'Leverage AI/ML for real problems', created_at: '2026-02-15T09:00:00' },
    { track_id: 3, event_id: 1, name: 'Education Tech', description: 'Technology for learning', created_at: '2026-02-15T09:00:00' },
    { track_id: 4, event_id: 1, name: 'Social Impact', description: 'Tech for social good', created_at: '2026-02-15T09:00:00' },
];

export const rounds: Round[] = [
    { round_id: 1, event_id: 1, name: 'Preliminary', order_number: 1, start_time: '2026-03-15T00:00:00', end_time: '2026-04-15T23:59:00', submission_deadline: '2026-04-15T23:59:00', top_n_advance: 5, is_calibration: false, status: 'CLOSED' },
    { round_id: 2, event_id: 1, name: 'Qualifier', order_number: 2, start_time: '2026-04-16T00:00:00', end_time: '2026-05-10T23:59:00', submission_deadline: '2026-05-10T23:59:00', top_n_advance: 3, is_calibration: false, status: 'ACTIVE' },
    { round_id: 3, event_id: 1, name: 'Final', order_number: 3, start_time: '2026-05-11T00:00:00', end_time: '2026-05-30T23:59:00', submission_deadline: '2026-05-30T23:59:00', top_n_advance: null, is_calibration: false, status: 'PENDING' },
];

export const userEventRoles: UserEventRole[] = [
    // Coordinator
    { id: 1, user_id: 1, role_id: 1, event_id: 1, track_id: null, round_id: null, judge_type: null, assigned_at: '2026-02-15T09:00:00', assigned_by: null },
    // Mentors
    { id: 2, user_id: 4, role_id: 2, event_id: 1, track_id: 1, round_id: null, judge_type: null, assigned_at: '2026-02-20T10:00:00', assigned_by: 1 },
    { id: 3, user_id: 4, role_id: 2, event_id: 1, track_id: 2, round_id: null, judge_type: null, assigned_at: '2026-02-20T10:00:00', assigned_by: 1 },
    // Judges
    { id: 4, user_id: 5, role_id: 3, event_id: 1, track_id: null, round_id: 1, judge_type: 'INTERNAL', assigned_at: '2026-03-01T08:00:00', assigned_by: 1 },
    { id: 5, user_id: 5, role_id: 3, event_id: 1, track_id: null, round_id: 2, judge_type: 'INTERNAL', assigned_at: '2026-03-01T08:00:00', assigned_by: 1 },
    { id: 6, user_id: 8, role_id: 3, event_id: 1, track_id: null, round_id: 2, judge_type: 'GUEST', assigned_at: '2026-04-01T08:00:00', assigned_by: 1 },
];

export const teams: Team[] = [
    { team_id: 1, event_id: 1, track_id: 1, name: 'StackTrace', description: null, status: 'APPROVED', disqualified_reason: null, disqualified_at: null, created_at: '2026-03-10T10:00:00' },
    { team_id: 2, event_id: 1, track_id: 2, name: 'ByteBuilders', description: null, status: 'APPROVED', disqualified_reason: null, disqualified_at: null, created_at: '2026-03-11T11:00:00' },
    { team_id: 3, event_id: 1, track_id: 3, name: 'CodeCraft', description: null, status: 'APPROVED', disqualified_reason: null, disqualified_at: null, created_at: '2026-03-12T12:00:00' },
    { team_id: 4, event_id: 1, track_id: 1, name: 'NullPointers', description: null, status: 'PENDING', disqualified_reason: null, disqualified_at: null, created_at: '2026-03-15T13:00:00' },
];

export const teamMembers: TeamMember[] = [
    { id: 1, team_id: 1, user_id: 2, member_role: 'LEADER', joined_at: '2026-03-10T10:00:00' },
    { id: 2, team_id: 1, user_id: 3, member_role: 'MEMBER', joined_at: '2026-03-10T10:30:00' },
    { id: 3, team_id: 1, user_id: 9, member_role: 'MEMBER', joined_at: '2026-03-10T11:00:00' },
    { id: 4, team_id: 1, user_id: 10, member_role: 'MEMBER', joined_at: '2026-03-10T11:30:00' },
    { id: 5, team_id: 2, user_id: 6, member_role: 'LEADER', joined_at: '2026-03-11T11:00:00' },
    { id: 6, team_id: 2, user_id: 11, member_role: 'MEMBER', joined_at: '2026-03-11T11:30:00' },
    { id: 7, team_id: 2, user_id: 12, member_role: 'MEMBER', joined_at: '2026-03-11T12:00:00' },
    { id: 8, team_id: 2, user_id: 13, member_role: 'MEMBER', joined_at: '2026-03-11T12:30:00' },
    { id: 9, team_id: 3, user_id: 6, member_role: 'LEADER', joined_at: '2026-03-12T12:00:00' },
    { id: 10, team_id: 3, user_id: 14, member_role: 'MEMBER', joined_at: '2026-03-12T12:30:00' },
    { id: 11, team_id: 3, user_id: 15, member_role: 'MEMBER', joined_at: '2026-03-12T13:00:00' },
    { id: 12, team_id: 4, user_id: 6, member_role: 'LEADER', joined_at: '2026-03-15T13:00:00' },
    { id: 13, team_id: 4, user_id: 16, member_role: 'MEMBER', joined_at: '2026-03-15T13:30:00' },
    { id: 14, team_id: 4, user_id: 17, member_role: 'MEMBER', joined_at: '2026-03-15T14:00:00' },
];

export const submissions: Submission[] = [
    { submission_id: 1, team_id: 1, round_id: 1, repo_url: 'github.com/stacktrace/app', demo_url: 'stacktrace.vercel.app', slide_url: 'slides.google.com/d/abc', description: null, submitted_at: '2026-04-14T20:00:00', submitted_by: 2, status: 'SUBMITTED' },
    { submission_id: 2, team_id: 1, round_id: 2, repo_url: 'github.com/stacktrace/app-v2', demo_url: 'stacktrace-v2.vercel.app', slide_url: 'slides.google.com/d/xyz', description: null, submitted_at: '2026-05-05T18:00:00', submitted_by: 2, status: 'SUBMITTED' },
    { submission_id: 3, team_id: 2, round_id: 1, repo_url: 'github.com/bytebuilders/ai', demo_url: 'bytebuilders.ai', slide_url: 'slides.google.com/d/bb1', description: null, submitted_at: '2026-04-14T22:00:00', submitted_by: 6, status: 'SUBMITTED' },
    { submission_id: 4, team_id: 2, round_id: 2, repo_url: 'github.com/bytebuilders/ai-v2', demo_url: 'bytebuilders-v2.ai', slide_url: 'slides.google.com/d/bb2', description: null, submitted_at: '2026-05-06T10:00:00', submitted_by: 6, status: 'SUBMITTED' },
];

export const scoringCriteriaTemplates: ScoringCriteriaTemplate[] = [
    { template_id: 1, name: 'Standard Hackathon Criteria', description: 'Default criteria set for SEAL events', is_default: true, created_at: '2026-01-01T00:00:00' },
];

export const scoringCriteria: ScoringCriteria[] = [
    { criteria_id: 1, event_id: 1, round_id: null, template_id: 1, name: 'Innovation', description: 'Novelty and creativity', weight: 1.5, max_score: 10, order_number: 1 },
    { criteria_id: 2, event_id: 1, round_id: null, template_id: 1, name: 'Technical Implementation', description: 'Code quality and architecture', weight: 2.0, max_score: 10, order_number: 2 },
    { criteria_id: 3, event_id: 1, round_id: null, template_id: 1, name: 'UI/UX Design', description: 'User experience quality', weight: 1.0, max_score: 10, order_number: 3 },
    { criteria_id: 4, event_id: 1, round_id: null, template_id: 1, name: 'Completeness', description: 'Feature completeness', weight: 1.5, max_score: 10, order_number: 4 },
    { criteria_id: 5, event_id: 1, round_id: null, template_id: 1, name: 'Presentation', description: 'Clarity of demo and pitch', weight: 1.0, max_score: 10, order_number: 5 },
];

export const scores: Score[] = [
    { score_id: 1, submission_id: 1, judge_user_id: 5, criteria_id: 1, value: 8, comment: null, is_draft: false, scored_at: '2026-04-15T10:00:00', updated_at: null },
    { score_id: 2, submission_id: 1, judge_user_id: 5, criteria_id: 2, value: 9, comment: null, is_draft: false, scored_at: '2026-04-15T10:00:00', updated_at: null },
    { score_id: 3, submission_id: 1, judge_user_id: 5, criteria_id: 3, value: 7, comment: null, is_draft: false, scored_at: '2026-04-15T10:00:00', updated_at: null },
    { score_id: 4, submission_id: 1, judge_user_id: 5, criteria_id: 4, value: 8, comment: null, is_draft: false, scored_at: '2026-04-15T10:00:00', updated_at: null },
    { score_id: 5, submission_id: 1, judge_user_id: 5, criteria_id: 5, value: 9, comment: null, is_draft: false, scored_at: '2026-04-15T10:00:00', updated_at: null },
];

export const roundResults: RoundResult[] = [
    { result_id: 1, team_id: 1, round_id: 1, total_score: 41.5, rank_position: 1, advanced: true, is_published: true, finalized_at: '2026-04-16T11:00:00', finalized_by: 1 },
    { result_id: 2, team_id: 2, round_id: 1, total_score: 38.0, rank_position: 2, advanced: true, is_published: true, finalized_at: '2026-04-16T11:00:00', finalized_by: 1 },
];

export const prizes: Prize[] = [
    { prize_id: 1, event_id: 1, track_id: null, name: 'Grand Champion', description: 'First place overall', rank_position: 1, team_id: null, awarded_at: null },
    { prize_id: 2, event_id: 1, track_id: null, name: 'Runner Up', description: 'Second place overall', rank_position: 2, team_id: null, awarded_at: null },
];

export const notifications: Notification[] = [
    { notification_id: 1, recipient_user_id: 2, title: 'Team StackTrace Approved', content: 'Your team registration has been approved.', type: 'APPROVAL', related_event_id: 1, is_read: true, created_at: '2026-03-10T15:00:00' },
    { notification_id: 2, recipient_user_id: 6, title: 'Team ByteBuilders Approved', content: 'Your team registration has been approved.', type: 'APPROVAL', related_event_id: 1, is_read: true, created_at: '2026-03-11T16:00:00' },
    { notification_id: 3, recipient_user_id: 2, title: 'Preliminary Round Results', content: 'Rankings for Preliminary round have been published.', type: 'RESULT', related_event_id: 1, is_read: true, created_at: '2026-04-16T11:00:00' },
    { notification_id: 4, recipient_user_id: 5, title: 'Judge Assignment — Round 2', content: 'You have been assigned as a judge for Qualifier.', type: 'ASSIGNMENT', related_event_id: 1, is_read: false, created_at: '2026-03-01T08:00:00' },
    { notification_id: 5, recipient_user_id: 7, title: 'Account Pending Approval', content: 'Your account is awaiting coordinator approval.', type: 'APPROVAL', related_event_id: null, is_read: false, created_at: '2026-05-20T09:30:00' },
];

export const auditLogs: AuditLog[] = [
    { log_id: 1, actor_user_id: 1, action: 'CREATE_EVENT', target_type: 'EVENT', target_id: 1, reason: null, metadata_json: null, ip_address: '192.168.1.1', created_at: '2026-02-15T09:00:00' },
    { log_id: 2, actor_user_id: 1, action: 'APPROVE_TEAM', target_type: 'TEAM', target_id: 1, reason: null, metadata_json: null, ip_address: '192.168.1.1', created_at: '2026-03-10T15:00:00' },
    { log_id: 3, actor_user_id: 2, action: 'CREATE_SUBMISSION', target_type: 'SUBMISSION', target_id: 1, reason: null, metadata_json: null, ip_address: '10.0.0.5', created_at: '2026-04-14T20:00:00' },
    { log_id: 4, actor_user_id: 5, action: 'FINALIZE_SCORE', target_type: 'SUBMISSION', target_id: 1, reason: null, metadata_json: null, ip_address: '10.0.0.8', created_at: '2026-04-15T10:00:00' },
    { log_id: 5, actor_user_id: 1, action: 'PUBLISH_RESULT', target_type: 'ROUND', target_id: 1, reason: null, metadata_json: null, ip_address: '192.168.1.1', created_at: '2026-04-16T11:00:00' },
];

export const MOCK_CREDENTIALS = {
    'coordinator@gmail.com': 1,
    'leader@gmail.com': 2,
    'member@gmail.com': 3,
    'mentor@gmail.com': 4,
    'judge@fpt.edu': 5,
    'pending@gmail.com': 7,
}
