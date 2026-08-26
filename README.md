# Cloud Access Shield

**IAM & Privilege Escalation Analyzer** powered by a graph database.

## Overview

Cloud Access Shield is a security dashboard that visualizes permissions, user groups, cloud roles, and infrastructure assets. It automatically detects hidden privilege escalation paths where employees or compromised credentials gain unexpected access to sensitive resources through multi-layered group memberships and role assumptions.

**Live Demo:** [cloud-access-shield.vercel.app](https://cloud-access-shield.vercel.app)

## Why a Graph Database?

Traditional relational databases struggle with multi-hop permission queries. Answering "What can User X reach through all nested groups and roles?" requires complex recursive CTEs that are slow and error-prone.

A graph database makes this natural:

| Problem | SQL Approach | Graph Approach |
|---------|-------------|----------------|
| "Find all resources User X can access through groups" | `WITH RECURSIVE` CTE, multiple JOINs, 50+ lines | Single Cypher query: `MATCH (u:User)-[:MEMBER_OF*]->(:Group)-[:HAS_ROLE]->(:Role)-[:CAN_ACCESS]->(r:Resource)` |
| "Detect privilege escalation chains" | Multiple self-joins, hard to maintain | Variable-length path traversal: `MATCH path = (u)-[:MEMBER_OF*1..6]->(g)-[:HAS_ROLE]->(r)-[:CAN_ACCESS]->(res)` |
| "Find cyclic group hierarchies" | Nearly impossible in SQL | Simple: `MATCH (g:Group)-[:MEMBER_OF*2..6]->(g)` |
| "What-if simulation (revoke access)" | Transaction + re-query | Filter paths by excluded relationships |

**Key insight:** Permissions ARE relationships. Graph databases model this directly, making security analysis both faster and more intuitive.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js + Express + TypeScript |
| **Frontend** | React + TypeScript + Tailwind CSS |
| **Database** | CognoDB (Neo4j-compatible graph DB) |
| **Hosting** | Render (backend) + Vercel (frontend) |

## Data Model

```
┌──────────┐     MEMBER_OF      ┌──────────┐     HAS_ROLE     ┌──────────┐    CAN_ACCESS    ┌──────────┐
│   User   │ ────────────────►  │   Group  │ ──────────────►  │   Role   │ ───────────────►  │ Resource │
│          │                    │          │                   │          │                   │          │
│ id       │                    │ id       │                   │ id       │                   │ id       │
│ email    │                    │ name     │                   │ name     │                   │ name     │
│ name     │                    │ risk_lvl │                   │ risk_lvl │                   │ type     │
│ created  │                    └──────────┘                   └──────────┘                   │ risk_lvl │
└──────────┘                         │                                                        └──────────┘
                                     │ MEMBER_OF (hierarchy)
                                     ▼
                                ┌──────────┐
                                │   Group  │  (parent group)
                                └──────────┘
```

**Node counts:** 1,000 Users · 23 Groups · 20 Roles · 30 Resources

**Relationship types:**
- `User -[MEMBER_OF]-> Group` — user belongs to a group
- `Group -[MEMBER_OF]-> Group` — group hierarchy (child → parent)
- `Group -[HAS_ROLE]-> Role` — group grants a role
- `Role -[CAN_ACCESS]-> Resource` — role grants resource access

**Cyclic dependency detected:** Infrastructure Alpha → Infrastructure Beta → Cloud Operations → Infrastructure Alpha

## Quick Start

### Prerequisites
- Node.js 18+
- CognoDB account (free tier works)

### 1. Clone & Install

```bash
git clone https://github.com/AhmedWaleedElFar/cloud-access-shield.git
cd cloud-access-shield

# Install backend
cd backend && npm install && cd ..

# Install frontend
cd frontend && npm install && cd ..
```

### 2. Configure Environment

Create `.env` in the project root:

```env
COGNODB_URI=neo4j+s://your-instance.cognodb.com:7687
COGNODB_USERNAME=neo4j
COGNODB_PASSWORD=your-password
```

### 3. Seed the Database

```bash
cd backend
npm run seed
```

This creates 1,000 users, 23 groups, 20 roles, 30 resources, and all relationships.

### 4. Run Development Servers

**Backend** (port 5000):
```bash
cd backend
npm run dev
```

**Frontend** (port 5173):
```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## API Documentation

### Health Check
```
GET /health
Response: { "status": "ok", "timestamp": "..." }
```

### Users
```
GET    /api/users                 — List all users with risk scores
GET    /api/users/search?q=alice  — Search by name or email
GET    /api/users/:id             — Get single user
GET    /api/users/stats           — Aggregate stats (total, avg, max, median)
GET    /api/users/:id/paths       — All access paths for a user
GET    /api/users/:id/escalation  — Detailed escalation analysis
GET    /api/users/:id/roles       — Roles granted to a user
GET    /api/users/roles/all       — All roles with resource counts
```

### Analytics
```
GET /api/analytics/escalations  — Batch escalation scores for all users
GET /api/analytics/cycles       — Detect cyclic group hierarchies
GET /api/analytics/forbidden    — Direct user→resource violations
```

### Access Control
```
POST /api/access/revoke    — Delete a relationship (permanent)
POST /api/access/simulate  — Preview impact of revocation (read-only)
```

**Revoke request:**
```json
{ "userId": "user_0", "relationshipType": "MEMBER_OF", "targetId": "grp_engineering" }
```

**Simulate request:**
```json
{ "userId": "user_0", "relationshipType": "MEMBER_OF", "targetId": "grp_engineering" }
```

**Simulate response:**
```json
{
  "userId": "user_0",
  "before": { "score": 65, "pathCount": 12, "uniqueResources": 8, "highRiskPaths": 5 },
  "after":  { "score": 42, "pathCount": 7,  "uniqueResources": 5, "highRiskPaths": 2 }
}
```

## Core Cypher Queries

### 1. Multi-Hop Access Paths (BFS)
Finds all resources a user can reach through group memberships:
```cypher
MATCH path = (u:User {id: $userId})-[:MEMBER_OF*1..6]->(g:Group)
       -[:HAS_ROLE]->(r:Role)-[:CAN_ACCESS]->(res:Resource)
RETURN DISTINCT [n IN nodes(path) | n] AS pathNodes, length(path) AS pathLength
```

### 2. Cycle Detection
Finds cyclic group hierarchies (e.g., A → B → C → A):
```cypher
MATCH path = (g:Group)-[:MEMBER_OF*2..6]->(g)
RETURN [n IN nodes(path) | n.name] AS cycleNames, length(path) AS cycleLen
```

### 3. Batch Escalation Scoring
Scores all users in a single query (avoids N+1):
```cypher
MATCH path = (u:User)-[:MEMBER_OF*1..6]->(g:Group)
       -[:HAS_ROLE]->(r:Role)-[:CAN_ACCESS]->(res:Resource)
WITH u, count(DISTINCT res) AS resCount,
     collect(DISTINCT r.risk_level) AS riskLevels,
     max(length(path)) AS maxPath
RETURN u.id, resCount, riskLevels, maxPath
```

### 4. Forbidden Path Detection
Finds direct user→resource access bypassing the Group→Role chain:
```cypher
MATCH (u:User)-[:CAN_ACCESS]->(res:Resource)
WHERE NOT (u)-[:MEMBER_OF]->(:Group)-[:HAS_ROLE]->(:Role)-[:CAN_ACCESS]->(res)
RETURN u.id, res.id
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + TS)                        │
│  Dashboard │ UserSearch │ AccessPaths │ Analytics                │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP (JSON)
┌────────────────────────▼────────────────────────────────────────┐
│                    BACKEND (Express + TS)                        │
│  /api/users │ /api/analytics │ /api/access │ /api/analyze       │
│  TieredCache │ BFS Path Finder │ Escalation Scorer              │
└────────────────────────┬────────────────────────────────────────┘
                         │ Bolt Protocol (neo4j-driver v5)
┌────────────────────────▼────────────────────────────────────────┐
│               COGNODB CLOUD (Graph Database)                    │
│  User ──MEMBER_OF──► Group ──HAS_ROLE──► Role ──CAN_ACCESS──►  │
│                     Resource                                     │
│  Group ──MEMBER_OF──► Group (hierarchy, may cycle)              │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
cloud-access-shield/
├── backend/
│   ├── src/
│   │   ├── index.ts            # Express server entry
│   │   ├── db.ts               # CognoDB driver init
│   │   ├── seed.ts             # Database seed script
│   │   ├── services/
│   │   │   ├── access.ts       # BFS paths, scoring, revoke, simulate
│   │   │   ├── users.ts        # User queries
│   │   │   └── cache.ts        # Tiered in-memory cache
│   │   ├── routes/
│   │   │   ├── users.ts        # User API endpoints
│   │   │   ├── analytics.ts    # Analytics endpoints
│   │   │   ├── access.ts       # Revoke + simulate endpoints
│   │   │   └── analyze.ts      # Batch analysis endpoints
│   │   └── middleware/
│   │       ├── cors.ts         # CORS configuration
│   │       └── errorHandler.ts # Error handling
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx             # Main layout + navigation
│   │   ├── config.ts           # API URL config
│   │   ├── lib/api.ts          # Axios API client
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx   # Stats overview
│   │   │   ├── UserSearch.tsx  # User list + search
│   │   │   ├── AccessPaths.tsx # Path visualization + sim/revoke
│   │   │   └── Analytics.tsx   # Risk analysis + top 10
│   │   └── components/
│   │       ├── RiskBadge.tsx
│   │       ├── Loading.tsx
│   │       ├── Empty.tsx
│   │       ├── ErrorMessage.tsx
│   │       ├── ConfirmDialog.tsx
│   │       ├── Toast.tsx
│   │       └── ErrorBoundary.tsx
│   ├── vite.config.ts
│   └── package.json
├── shared/
│   └── types.ts                # Shared TypeScript types
├── .env                        # CognoDB credentials (gitignored)
├── package.json                # Root scripts
└── README.md
```

## Deployment

### Backend (Render)
1. Push to GitHub
2. Connect repo to Render → New Web Service
3. Set environment variables: `COGNODB_URI`, `COGNODB_USERNAME`, `COGNODB_PASSWORD`
4. Build command: `cd backend && npm install && npm run build`
5. Start command: `cd backend && node dist/src/index.js`

### Frontend (Vercel)
1. Connect repo to Vercel
2. Root directory: `frontend`
3. Environment variable: `VITE_API_URL=https://cloud-access-shield-api.onrender.com`
4. Build command: `npm install && npm run build`

## Known Limitations

- **CognoDB free tier:** 256MB RAM — seed scale limited to ~1,000 users
- **No authentication:** This is a demo; production would add JWT/OAuth
- **In-memory cache:** No Redis; cache resets on server restart
- **Path length bound:** Cypher `*1..6` is literal (not parameterized) due to Cypher limitation

## License

ISC
