# SEAL – Software Engineering Hackathon Management System

SEAL (Software Engineering Agile League) is an academic hackathon organized annually by the Software Engineering Department in cooperation with PDP. Each year SEAL runs three seasons — Spring, Summer, and Fall — each of which may include multiple competition rounds (preliminary, qualifier, final).

This repository contains a full-stack web platform that digitizes and centralizes the operation of SEAL Hackathon events: event and round management, track/category management, team registration, submissions, judge scoring, ranking, prize announcement, and audit logging. The platform also supports an optional research-based-learning (RBL) track for studying inter-rater reliability among hackathon judges.


## Problem Statement

Event management is currently handled manually, which leads to:

- Manual, error-prone team registration and track management.
- Scoring done through separate spreadsheet nual collection and re-entry of results.
- Limited communication channels between organizers, mentors, teams, and participants.
- No audit trail for scoring decisions, disqrsals, reducing transparency.
- No systematic support for analyzing consistency between judges.

## Goals

- Manage hackathon events per season.
- Manage multiple rounds within an event.
- Manage competition tracks/categories.
- Manage teams and team members.
- Manage mentors, internal judges, and guest judges.
- Support round-based submissions from teams
- Support criteria-based scoring by judges.
- Automatically aggregate scores, compute raeams advance.
- Record an audit trail of key actions for transparency.
- Export results as CSV/Excel.
- (Optional/RBL) Collect scoring data to analyze inter-rater reliability among judges.

## User Roles

| Role | Description |
|------|-------------|
| Team Member | Member of a competing team; can view events, schedules, notifications, and results. |
| Team Leader | Team representative; can cres, register the team for a track, submitentries, and track results. |
| Mentor | Provides guidance to teams within
| Judge | Scores submissions for rounds/tracks they are assigned to; can be internal faculty or a guest judge. |
| Event Coordinator | Organizer/staff role; s, criteria, assignments, account approvals,submissions, rankings, and results. |
| Admin | Manages system accounts, permissiotion. |

## Tech Stack

**Frontend** (`front-end/src/seal-web`)
- React 18 + TypeScript
- Vite (dev server/build tool)
- React Router
- Tailwind CSS
- Radix UI / MUI components
- React Hook Form
- Recharts (dashboards/statistics)
- Vitest + Testing Library (unit/integration

**Backend** (`back-end/src/seal-api`)
- Java 21
- Spring Boot 4 (Web MVC, Data JPA, SecurityMail)
- Spring Security with JWT authentication
- OAuth2 login (Google, GitHub)
- MySQL (via Spring Data JPA / Hibernate)
- springdoc-openapi (Swagger UI)
- Google Gemini API integration (AI Judge Assistant, optional)
- Maven (with the included Maven Wrapper)

**Database**
- MySQL 8 (schema is generated from JPA entities; `ddl-auto=update`)

## Project Structure

seal-hackathon-system/
├── back-end/
│   └── src/seal-api/          # Spring Boot API (Maven project)
├── front-end/
│   └── src/seal-web/          # React + Vite web client
├── docs/
│   ├── documents/              # Project requirements, traceability matrix
│   └── report/                 # Engineerin
└── README.md

## Prerequisites

- Java 21 (JDK)
- Maven (or use the included `mvnw` / `mvnw. install required)
- Node.js 18+ and npm
- MySQL 8 running locally (or accessible via

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd seal-hackathon-system

2. Backend setup (back-end/src/seal-api)

1. Create a MySQL database user/credentials ckathon, is created automatically on firstrun since createDatabaseIfNotExist=true is set).
2. Configure local secrets. The app reads an .env.properties) file inback-end/src/seal-api for local overrides, or you can export environment variables directly. Supported variables:

| Variable                                | Purpose                                            | Default
                        |
|-----------------------------------------|----------------------------------------------------|----------------------
-------------------------|
| DB_USERNAME                             | MySQL username                                     | root
                        |
| DB_PASSWORD                             | MySQL password                                     | (see
application.properties)                  |
| JWT_SECRET                              | Base64-encoded JWT signing secret (32+ bytes)      | dev default provided
                        |
| SEED_SCENARIO                           | Demo data seeding: NONE, S0, S1, S2, S3            | NONE
                        |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | Google OAuth2 login                                | placeholder
                        |
| GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET | GitHub OAuth2 login                                | placeholder
                        |
| APP_FRONTEND_URL                        | Frontend URL used for OAuth2 redirects             | http://localhost:5173
                        |
| GEMINI_API_KEY / GEMINI_MODEL           | AI Judge Assistant (Google Gemini)                 | disabled if unset
                        |
| GITHUB_TOKEN                            | Optional PAT for reading participant GitHub repos  | unset (public repos
still work, rate-limited) |
| MAIL_USERNAME / MAIL_PASSWORD           | Gmail SMTP for outgoing email (OTP, notifications) | placeholder
                        |
| UPLOAD_DIR / PROBLEM_DIR                | File storage locations                             | uploads /
protected/problems                  |

2. Example back-end/src/seal-api/.env:

DB_USERNAME=root
DB_PASSWORD=your_local_password
JWT_SECRET=your_base64_secret
SEED_SCENARIO=S3
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
3. Run the API (from back-end/src/seal-api):

./mvnw spring-boot:run

3. On Windows:

mvnw.cmd spring-boot:run

3. The API starts on http://localhost:8080.
4. API documentation (Swagger UI) is available at:

http://localhost:8080/swagger-ui.html
5. Run backend tests:

./mvnw test

3. Frontend setup (front-end/src/seal-web)

1. Install dependencies:

cd front-end/src/seal-web
npm install
2. Start the development server:

npm run dev

2. The app runs on http://localhost:5173 by nd API at http://localhost:8080.
3. Build for production:

npm run build
4. Run frontend tests:

npm run test
# or, in watch mode:
npm run test:watch

Core Demo Flow

1. Event Coordinator logs in.
2. Event Coordinator creates a hackathon event.
3. Event Coordinator creates tracks and roun
4. Event Coordinator defines a scoring criteria set.
5. A Team Leader registers an account and is
6. Team Leader creates a team and adds members.
7. Team Leader registers the team for a trac
8. Team Leader submits an entry for a round.
9. Event Coordinator assigns judges.
10. Judges log in and score submissions.
11. The system computes scores and rankings.
12. Event Coordinator publishes results.
13. Teams view rankings and results.
14. Event Coordinator exports a CSV/Excel report.

Documentation

- docs/documents/ProjectRequirements.md — full project requirements, roles, use cases, and scope.
- docs/documents/seal_traceability_matrix.mdmatrix.
- docs/report/ — engineering reports produced throughout development.

License

This project was developed as part of the SWP391 course. No license has been declared; contact the project maintainers before reuse outside the course context.
