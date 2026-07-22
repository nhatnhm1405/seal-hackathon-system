export const S1_DEMO = {
  eventName: 'SEAL Summer 2026',
  targetTeamName: 'Arsenal',
  pendingTeamName: 'Real Madrid (pending)',
  password: 'Test@1234',
  coordinator: {
    email: 'coordinator@fpt.edu.vn',
    roleLabel: 'Coordinator',
  },
  arsenalLeader: {
    email: 'p1@fpt.edu.vn',
  },
  inviteMember: {
    email: 'p42@fpt.edu.vn',
    displayName: 'Aurélien Tchouaméni',
  },
  tracks: [
    'Web Application',
    'AI Solution',
    'Education Tech',
    'Social Impact',
  ],
  expectedRoundCount: 2,
  expectedCriteriaCountPerRound: 5,
} as const;
