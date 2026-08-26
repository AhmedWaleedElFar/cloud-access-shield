# Master Architect & Planner Directives
## Project: Cloud Access Shield (Graph-Powered IAM Analyzer)

**System Overview:** 
Cloud Access Shield is a full-stack TypeScript application backed by a graph database (CognoDB/Neo4j). It detects privilege escalation paths by analyzing the relationships between Users, Groups, Roles, and Resources.

**Goal of this Document:**
This document serves as the master blueprint for the **Planner Agent**. The Planner must read this document and break it down into discrete prompts for the **Builder Agent**. 

**Crucial Human-in-the-Loop Directive:**
The human architect aims to achieve deep expertise in full-stack TypeScript, React, and Graph DB integrations. Therefore, every instruction the Planner gives to the Builder **MUST** include a mandate to explain the *“why”* behind the code. The Builder is not just generating syntax; it is acting as a senior mentor explaining system design, TypeScript concepts, and full-stack data flow to the human.

---

## 1. Architectural Constraints (STRICT COMPLIANCE REQUIRED)

1.  **Repository Structure:** This MUST be a single monorepo containing both `/backend` and `/frontend` directories. Do not split into two repositories.
2.  **Database Driver:** The backend MUST use the official `neo4j-driver` package (v5+). Under no circumstances should the deprecated `neo4j` package be used.
3.  **Memory Limits (CognoDB Free Tier):** The graph database operates on a 256MB RAM / 0.5 vCPU constraint. 
    *   The seed data MUST be downscaled (Max: 1000 Users, 30 Groups, 20 Roles, 30 Resources).
    *   All Cypher queries MUST use explicit relationship labels and bounded path lengths (e.g., `*1..3`) to prevent combinatorial explosion and Out-Of-Memory (OOM) crashes.
4.  **Type Safety:** Strict mode must be enabled in all `tsconfig.json` files. No implicit `any`.

---

## 2. Execution Phases (Planner to Builder Directives)

The Planner should translate the following phases into sequential prompts for the Builder. Do not proceed to the next phase until the human architect has reviewed and approved the Builder's output and explanations.

### Phase 1: Monorepo Setup & Type-Driven Design
**Tasks for Builder:**
*   Initialize a root monorepo directory.
*   Setup the `/backend` (Node/Express) and `/frontend` (Vite/React) subdirectories.
*   Create `backend/src/types.ts` defining strict interfaces for: `User`, `Group`, `Role`, `Resource`, `AccessPath`, and an `EscalationSummary`. Use TypeScript unions for `RiskLevel` ('LOW' | 'MEDIUM' | 'HIGH').
*   **Explanation Directive:** Instruct the Builder to explain the difference between `interface` and `type` aliases in TypeScript, and why defining data contracts first is crucial for full-stack architecture.

### Phase 2: Database Abstraction & Security Layer
**Tasks for Builder:**
*   Implement `backend/src/db.ts` to initialize the `neo4j-driver` using environment variables (`NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`).
*   Implement a robust connection pooling strategy and a `testConnection` health-check function.
*   Create the Express server entry point (`index.ts`) with standard security middleware (CORS, error boundaries).
*   **Explanation Directive:** Instruct the Builder to explain how Node's asynchronous event loop handles database connection pools, and how to securely pass environment variables without leaking secrets.

### Phase 3: Graph Constraints & Resilient Seeding
**Tasks for Builder:**
*   Write `backend/src/seed.ts`.
*   **CRITICAL:** Before inserting data, the script MUST execute Cypher commands to create `UNIQUE` constraints on the `id` property for all nodes (`User`, `Group`, `Role`, `Resource`) and an index on `Resource.risk_level`.
*   Implement a deterministic or randomized seeder bounded to the exact memory limits (1000 users max).
*   **Explanation Directive:** Instruct the Builder to explain why Graph databases require programmatic indexes/constraints (unlike relational schemas which enforce them on table creation) and how this prevents OOM errors on cheap infrastructure.

### Phase 4: Bounded Graph Traversals (Cypher)
**Tasks for Builder:**
*   Create `backend/src/queries.ts`.
*   Implement multi-hop queries for IAM escalation. 
*   **CRITICAL:** The Cypher traversal MUST look exactly like this to prevent timeouts: 
    `MATCH path = (u:User {id: $userId})-[:MEMBER_OF*1..3]->(g:Group)-[:HAS_ROLE]->(role:Role)-[:CAN_ACCESS]->(r:Resource)`
*   Implement parameterized queries to prevent Cypher injection.
*   **Explanation Directive:** Instruct the Builder to break down the Cypher syntax. Have it explain *why* specifying explicit relationship types (`:MEMBER_OF`) and bounds (`*1..3`) changes the algorithmic complexity of the traversal from exponential to linear.

### Phase 5: API Controllers & Route Scaffolding
**Tasks for Builder:**
*   Create Express routes (`/api/users`, `/api/access`, `/api/analytics`).
*   Wire the Cypher query functions to the routes. 
*   Implement standard JSON response wrapping and HTTP status codes (200, 400, 404, 500).
*   **Explanation Directive:** Instruct the Builder to trace the lifecycle of an HTTP request: how Express parses the URL parameters, passes it to the Cypher query, awaits the Promise, and maps the database records into the TypeScript interfaces defined in Phase 1 before sending the JSON response.

### Phase 6: Frontend State & Component Architecture
**Tasks for Builder:**
*   Implement the React frontend using Tailwind CSS.
*   Create a centralized API client in `frontend/src/lib/api.ts` using `axios`.
*   Build the main views: Dashboard (Stats), User Search, Access Paths (Visualization), and Analytics.
*   **Explanation Directive:** Instruct the Builder to explain how React's `useEffect` and `useState` hooks manage the asynchronous data fetching from the backend API. Have it explain how TypeScript generics (`<T>`) can be used with Axios to guarantee the API response matches the frontend UI interfaces.

### Phase 7: Deployment Configuration
**Tasks for Builder:**
*   Write a `render.yaml` file for deploying the Node backend.
*   Provide Vercel deployment commands and environment variable configurations for the frontend.
*   Update CORS middleware to dynamically accept the production frontend URL.
*   **Explanation Directive:** Instruct the Builder to explain the concept of Cross-Origin Resource Sharing (CORS) and why the browser enforces it between the Vercel frontend and Render backend.
