export interface User {
    user_id: number
    full_name: string
    email: string
    role: 'PARTICIPANT' | 'MENTOR' | 'JUDGE' | 'COORDINATOR'
    student_type: 'FPT' | 'EXTERNAL' | null
    is_leader: boolean
    team_id: number | null
}

export interface Team {
    team_id: number
    team_name: string
    track_id: number
    status: 'ACTIVE' | 'DISQUALIFIED'
}

export interface TeamMember {
    user_id: number
    team_id: number
    joined_at: string
}

export interface Event {
    event_id: number
    event_name: string
    start_date: string
    end_date: string
}

export interface Track {
    track_id: number
    event_id: number
    track_name: string
    mentor_id: number | null
}

export interface Submission {
    submission_id: number
    team_id: number
    round_id: number
    repo_url: string
    demo_url: string
    submitted_at: string
}

export interface JudgeAssignment {
    judge_id: number
    team_id: number
    round_id: number
}

export interface ScoringCriteria {
    criteria_id: number
    criteria_name: string
    max_score: number
}