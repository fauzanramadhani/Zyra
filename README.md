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

## Services & Ports

| Service | Port |
|---------|------|
| Frontend (Vite dev) | 5173 |
| Backend (Express) | 5000 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Adminer (DB UI) | 8080 |
| RedisInsight | 8001 |

## Getting Started

### Prerequisites
- Docker and Docker Compose
- WSL2 with Ubuntu (on Windows)
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

3. Build and start all services:
   ```bash
   make build
   make up
   ```

4. Push the database schema:
   ```bash
   make prisma-push
   ```

5. (Optional) Seed the database:
   ```bash
   make seed
   ```

6. Access the application at `http://localhost:5173`

### Database Administration
- **Adminer** (PostgreSQL GUI): http://localhost:8080
  - Server: `postgres`, User: `postgres`, Password: see `.env`, Database: `zyra`
- **RedisInsight** (Redis GUI): http://localhost:8001
  - Host: `redis`, Port: `6379`

## Available Commands

| Command | Description |
|---------|-------------|
| `make build` | Build all Docker containers |
| `make up` | Start all services (detached) |
| `make down` | Stop all services |
| `make restart` | Restart all services |
| `make logs-backend` | Tail backend logs |
| `make logs-frontend` | Tail frontend logs |
| `make prisma-push` | Push Prisma schema to database |
| `make prisma-migrate` | Run Prisma migrations |
| `make seed` | Seed the database |
| `make dev-frontend` | Run frontend locally (outside Docker) |
| `make clean` | Stop services and delete volumes |

## Project Structure

```
├── backend/
│   ├── prisma/           # Schema and seed
│   ├── src/
│   │   ├── controllers/  # Route handlers
│   │   ├── middleware/    # Auth, error handling, uploads
│   │   ├── routes/        # API route definitions
│   │   ├── services/      # WebSocket, job queues
│   │   ├── workers/       # Background job processors
│   │   ├── utils/         # Response helpers, CSV mapper
│   │   └── types/         # TypeScript type definitions
│   └── uploads/           # File upload storage
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── views/         # Page-level components
│   │   ├── store/         # Pinia state management
│   │   ├── services/      # API client, socket client
│   │   └── router/        # Vue Router configuration
│   └── public/
├── docker-compose.yml
├── Makefile
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
