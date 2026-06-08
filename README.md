# Zyra

An open-source alternative to Jira for project management and issue tracking. Built with Vue 3 and Express, Zyra supports Kanban/Scrum boards, sprint planning, real-time collaboration, and workspace-based multi-tenancy. Self-hosted and fully under your control.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3, TypeScript, Vite, TailwindCSS, Pinia, Vue Router, TipTap, vue-draggable-plus, Socket.IO |
| Backend | Express, TypeScript, Prisma ORM, Socket.IO, BullMQ, JWT, Multer, Zod |
| Database | PostgreSQL 15 |
| Queue/Cache | Redis 7 (BullMQ) |
| Infrastructure | Docker Compose |

## Features

### Authentication & Account Management
- JWT-based authentication with access/refresh token rotation
- User registration and login
- Profile management (avatar, bio, timezone, language)
- Password change and session management (list/revoke active sessions)

### Workspaces
- Multi-workspace support with slug-based routing
- Workspace members with role hierarchy (Owner, Admin, Member, Viewer)
- Email-based invitation system (invite, accept, reject, cancel, expire)
- Ownership transfer

### Teams & Permissions
- Team creation within workspaces
- Role-Based Access Control (RBAC) with granular permissions
- Configurable roles with permission assignment

### Projects
- Create and manage projects within workspaces
- Project key prefix for issue identification (e.g. PROJ-123)
- Project members with per-project roles
- Custom labels with color coding
- Custom workflow statuses per project

### Boards
- Kanban and Scrum board types
- Drag-and-drop card movement between columns
- Fractional indexing for precise card ordering
- Column management (create, rename, reorder, delete)
- Sprint-scoped board filtering

### Sprints
- Sprint lifecycle management (Future → Active → Completed)
- Sprint goals and date ranges
- Complete sprint action with issue handling

### Issues
- Issue types: Story, Task, Bug, Epic
- Priority levels: Low, Medium, High, Highest
- Story points estimation
- Assignee and reporter tracking
- Subtask hierarchy (parent-child)
- Epic grouping
- Rich text descriptions (TipTap editor)
- Custom fields (flexible key-value storage)
- Label tagging (many-to-many)
- Due dates

### Issue Linking & Blocking
- Link types: Blocks, Is Blocked By, Relates To, Duplicates, Is Duplicated By
- Visual blocked indicator on board cards
- Linked issues panel in issue detail modal
- Real-time blocked status updates via WebSocket

### Comments
- Threaded comments on issues
- Rich text comment body

### Attachments
- File upload on issues (drag-and-drop or file picker)
- Supports images, documents, and logs up to 50MB
- Download and delete attachments

### Notifications
- In-app notification inbox
- Types: System, Invitation, Assignment, Comment, Mention, Role Change
- Mark as read / mark all read / delete
- Real-time delivery via Socket.IO

### Real-Time Collaboration
- WebSocket-based live updates across all connected clients
- Board state synchronization (card moves, creates, deletes)
- Issue link events broadcast to project members

### Analytics
- Project-level analytics dashboard
- Status and priority distribution gauges
- Developer workload charts
- Sprint burndown and velocity tracking

### Automation (Workflow Rules)
- No-code **when → if → then** rule engine
- 9 trigger event types (issue created, updated, status changed, assigned, priority changed, deleted; sprint started, completed, created)
- 6 condition fields with 8 operators (equals, contains, greater than, etc.)
- 12 action types (change status, assign user, add label, add comment, send notification, move sprint, set priority, set story points, create subtask, archive issue, unassign, remove label)
- BullMQ-backed async execution with retry
- Dry-run testing before enabling rules
- Real-time execution logs with per-action results
- Sprint-level batch mode (e.g. change status on all sprint issues when sprint starts)

### Releases
- Version tracking with status lifecycle (Planned → In Progress → Released → Archived)
- Release date tracking and issue assignment to releases

### Issue Templates
- Predefined issue templates (type, priority, summary, description, story points)
- Speeds up repetitive issue creation

### CSV Import
- Upload CSV files with column mapping preview
- Background processing via BullMQ worker
- Progress tracking (percentage, success/failed counts)
- Per-row error logging
- Reusable mapping templates

### Audit Logging
- Full audit trail per user action
- Captures action type, details, and IP address

### Trash & Archive
- Soft delete with trash bin
- Archive/unarchive issues
- Restore from trash or permanently purge

### Search & Filtering
- Search issues by key or summary
- Filter by type, priority, and sprint
- Real-time filter application on board view

### Git Integration
- Connect GitHub, GitLab, or Bitbucket repositories to projects
- Auto-link commits, branches, and pull requests to issues via issue key detection (e.g. PHX-42)
- Webhook handler for automatic commit/PR ingestion
- Auto-update issue status when PR is merged
- Branch name suggestion based on issue type and key (e.g. `feature/phx-5-add-login`)

### Custom Workflows
- Visual workflow editor with states and transitions
- State categories: TODO, IN_PROGRESS, DONE
- Transition rules with conditions (role requirements, field constraints)
- Multiple workflows per project with default selection

### Gantt Chart & Dependency Graph
- Interactive Gantt chart with issue timelines
- Dependency graph visualization (nodes + edges)
- Critical path calculation through blocking dependencies
- Progress tracking per issue based on status
- Sprint grouping in timeline view

### Custom Dashboards
- Widget-based dashboards per user/project
- Widget types: Pie Chart, Bar Chart, Line Chart, Calendar, Activity Stream, Stats, Filter Results
- Configurable grid layout with drag-and-drop positioning
- Widget data endpoint with real-time aggregation

### Recurring Issues
- Schedule automatic issue creation (Daily, Weekly, Biweekly, Monthly, or Cron)
- Configurable issue template (summary, description, type, priority, assignee)
- Timezone-aware scheduling
- Manual trigger for testing
- Enable/disable toggle

### SLA & Due Date Tracking
- SLA policies per project and priority level
- Response time and resolution time targets (in minutes)
- Automatic SLA tracker creation when issues are created
- Breach detection with type classification (Response, Resolution, Both)
- SLA compliance report with percentage metrics

### Goals & OKR Tracking
- Objectives and Key Results hierarchy
- Progress tracking (0-100%) with auto-calculation from child goals
- Goal status: On Track, At Risk, Off Track, Completed
- Link goals to projects, epics, issues, or sprints
- Quarterly cycle support (Q1_2026, Q2_2026, etc.)
- Target/current value tracking with units

### Approval Workflows
- Multi-step approval rules per project
- Configurable trigger status and target status
- Multiple approvers with required approval count
- Approve/reject with comments
- Auto-move issue to target status upon full approval
- Pending approvals inbox for approvers

### Wiki / Knowledge Base
- Wiki spaces per project or workspace
- Hierarchical page structure (parent-child)
- Rich text content with revision history
- Auto-slug generation from titles
- Version tracking with full revision log

### Public Forms (Issue Submission)
- Create public forms for external bug reports or feature requests
- Customizable form fields (name, type, required, options)
- No authentication required for submission
- Auto-create issues from submissions
- Notify configured users on new submissions
- Submission history with IP tracking

### Email-to-Issue
- Configure email inboxes per project
- Incoming email webhook processing
- Auto-create issues from email subject/body
- Default type, priority, and assignee configuration
- Email processing status tracking (Pending, Processed, Failed)

### Slack & Discord Integration
- Webhook-based notifications to Slack or Discord channels
- Configurable event subscriptions (issue created, status changed, comment added, sprint events)
- Test webhook connectivity
- Formatted messages per provider (Slack blocks, Discord embeds)

### Timesheets & Time Reports
- Weekly timesheet per user with auto-creation
- Timesheet entries linked to issues and projects
- Billable vs non-billable hour tracking
- Submit/approve/reject workflow
- Project-level time reports with user breakdown
- Total hours, billable hours, and per-user aggregation

### AI-Powered Features
- **Smart Auto-Assign**: Suggests assignees based on workload and expertise (completed similar issues)
- **Duplicate Detection**: Keyword-based similarity scoring to find potential duplicate issues
- **Sprint Planning Suggestions**: Velocity calculation from past sprints + backlog prioritization to fit capacity
- **Issue Summary**: Auto-generated insights including age, comment activity, status changes, time logged, and actionable warnings

## Services & Ports

### Development Environment
| Service | Port | Description |
|---------|------|-------------|
| Frontend (Vite dev) | 5173 | Hot-reloaded Vue 3 app |
| Backend (Express) | 5000 | Dev server with nodemon |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Message Broker (BullMQ) |
| Adminer (DB UI) | 8080 | PostgreSQL Web Client |
| RedisInsight | 8001 | Redis Web Client |

### Production Environment
| Service | Port | Description |
|---------|------|-------------|
| Frontend (Vite preview) | 3000 | Compiled static files served via Node.js |
| Backend (Express) | 5000 | Compiled app in production mode |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Message Broker (BullMQ) |

---

## Getting Started

### Prerequisites
- Docker and Docker Compose
- (Optional) Node.js 20+ for local development without Docker

### Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd jira-local
   ```

2. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

### 1. Running in Development (Local / Hot Reload)
To build and start the development environment:
```bash
docker compose up --build
```
* **Auto-Reload**: Direct folder mapping (`volumes` bind mounts) is enabled. Any local edits immediately reload the frontend/backend.
* **Auto-Schema & Seed**: Database migrations (`prisma db push`) and data seeding run automatically inside the backend container at startup.
* **Access App**: http://localhost:5173
* **Access Database (Adminer)**: http://localhost:8080
* **Stop Services Safely**: `docker compose down`

### 2. Running in Production
To build and start the optimized production environment:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
* **Optimized Build**: Compiles TypeScript backend and Vite frontend into optimized build bundles (no source code directories are mounted).
* **Vite Preview on Node**: Serves the frontend statically on port `3000` using a Node.js-based preview engine.
* **Security Hardening**: Development client tools (Adminer, RedisInsight) are disabled/hidden.
* **Auto-Schema & Idempotent Seed**: Database pushes schema updates automatically. The seed script checks for existing users first, keeping your production data safe.
* **Access App**: http://localhost:3000
* **Stop Services Safely**: `docker compose -f docker-compose.prod.yml down` (never use `-v` in production to prevent volume loss).

---

## Project Structure

```
├── backend/
│   ├── prisma/           # Schema and seed
│   ├── src/
│   │   ├── controllers/  # Route handlers
│   │   ├── middleware/   # Auth, error handling, uploads
│   │   ├── routes/       # API route definitions
│   │   ├── services/     # WebSocket, job queues
│   │   ├── workers/      # Background job processors
│   │   ├── utils/        # Response helpers, CSV mapper
│   │   └── types/        # TypeScript type definitions
│   └── uploads/          # File upload storage
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── views/        # Page-level components
│   │   ├── store/        # Pinia state management
│   │   ├── services/     # API client, socket client
│   │   └── router/       # Vue Router configuration
│   └── public/
├── docker-compose.yml     # Development Compose File
├── docker-compose.prod.yml# Production Compose File
└── .env
```

## Development Notes

### Hot Reload
The frontend Vite config uses `usePolling: true` for file watching inside Docker on Windows/WSL2 mapped directories.

### WSL2 Resource Limits
To prevent excessive memory usage, create `C:\Users\<YourUsername>\.wslconfig`:
```ini
[wsl2]
memory=4GB
processors=4
```
Then restart WSL with `wsl --shutdown`.

## License

Zyra is open-source software licensed under the [MIT License](LICENSE).
