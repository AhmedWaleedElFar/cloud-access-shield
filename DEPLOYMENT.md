# Deployment Guide
## Phase 9: Deploy to Production

---

## Pre-Deployment Checklist

- [ ] All tests passing locally
- [ ] No console errors
- [ ] Environment variables configured
- [ ] .gitignore includes secrets
- [ ] Both repos pushed to GitHub
- [ ] README.md complete
- [ ] Screenshots taken and saved

---

## Backend Deployment (Render.com)

### Step 1: Prepare Backend for Production

**File: `backend/render.yaml`**

```yaml
services:
  - type: web
    name: cloud-access-shield-api
    env: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5000
      - key: NEO4J_URI
        scope: run
        sync: false
      - key: NEO4J_USERNAME
        scope: run
        sync: false
      - key: NEO4J_PASSWORD
        scope: run
        sync: false
```

### Step 2: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub account
3. Authorize Render to access your GitHub repos

### Step 3: Deploy Backend

1. **In Render Dashboard:**
   - Click "New +" → "Web Service"
   - Select your backend GitHub repo
   - Name: `cloud-access-shield-api`
   - Environment: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Click "Create Web Service"

2. **Set Environment Variables** (in Render Dashboard):
   - `NODE_ENV` = `production`
   - `NEO4J_URI` = `bolt+s://YOUR_INSTANCE_ID.databases.cognodb.cloud`
   - `NEO4J_USERNAME` = `cognodb`
   - `NEO4J_PASSWORD` = `YOUR_PASSWORD` (from CognoDB)
   - `PORT` = `5000`

3. **Wait for deployment**
   - Render will build and deploy automatically
   - Check the logs for any errors
   - Deployment usually takes 2-3 minutes

4. **Verify Deployment**
   ```bash
   # Get your backend URL from Render dashboard
   # Should look like: https://cloud-access-shield-api.onrender.com
   
   curl https://cloud-access-shield-api.onrender.com/health
   # Expected: {"status": "ok", "timestamp": "..."}
   
   curl https://cloud-access-shield-api.onrender.com/api/users?limit=5
   # Expected: {"users": [...], "total": 5, ...}
   ```

### Step 4: Seed Production Database

```bash
# Option 1: Run seed from your local machine
export NEO4J_URI="bolt+s://YOUR_INSTANCE_ID.databases.cognodb.cloud"
export NEO4J_USERNAME="cognodb"
export NEO4J_PASSWORD="YOUR_PASSWORD"
npm run seed

# Option 2: Add seed to Render deployment
# (Not recommended for production, but useful for demo)
```

---

## Frontend Deployment (Vercel)

### Step 1: Prepare Frontend for Production

**File: `frontend/.env.production`**

```env
VITE_API_URL=https://cloud-access-shield-api.onrender.com
```

### Step 2: Create Vercel Account

1. Go to https://vercel.com
2. Sign up with GitHub account
3. Authorize Vercel to access your GitHub repos

### Step 3: Deploy Frontend

1. **In Vercel Dashboard:**
   - Click "Add New..." → "Project"
   - Select your frontend GitHub repo
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variables:
     - `VITE_API_URL` = `https://cloud-access-shield-api.onrender.com`
   - Click "Deploy"

2. **Wait for deployment**
   - Vercel will build and deploy automatically
   - Deployment usually takes 1-2 minutes

3. **Verify Deployment**
   ```bash
   # Get your frontend URL from Vercel dashboard
   # Should look like: https://cloud-access-shield.vercel.app
   
   # Open in browser:
   # https://cloud-access-shield.vercel.app
   
   # Expected:
   # - Page loads
   # - Dashboard shows stats
   # - Can search for users
   # - Can view access paths
   # - No console errors
   ```

### Step 4: Update CORS Configuration

Since your frontend is now on Vercel, update backend CORS:

**File: `backend/src/middleware/cors.ts` (Update)**

```typescript
export const corsMiddleware = cors({
  origin: process.env.NODE_ENV === 'production'
    ? [
        'https://cloud-access-shield.vercel.app',
        'https://cloud-access-shield-*.vercel.app', // Preview deployments
      ]
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

**Then redeploy backend:**
```bash
# Commit and push changes to GitHub
git add -A
git commit -m "chore: update CORS for production Vercel URL"
git push

# Render will automatically redeploy
```

---

## Post-Deployment Verification

### Backend Verification

```bash
# 1. Health check
curl https://cloud-access-shield-api.onrender.com/health

# Expected output:
# {"status":"ok","timestamp":"2024-08-26T..."}

# 2. Test users endpoint
curl https://cloud-access-shield-api.onrender.com/api/users?limit=5

# Expected output:
# {"users":[...], "total":5, ...}

# 3. Test access paths
curl https://cloud-access-shield-api.onrender.com/api/access/paths/user_0

# Expected output:
# {"userId":"user_0", "paths":[...], "total":..., ...}

# 4. Test analytics
curl https://cloud-access-shield-api.onrender.com/api/analytics/dangerous-roles

# Expected output:
# {"roles":[...], "total":...}
```

### Frontend Verification (In Browser)

**Open:** https://cloud-access-shield.vercel.app

**Test Scenarios:**

1. **Dashboard Page**
   - [ ] Stats cards load (Total Users, Avg Access, etc.)
   - [ ] Escalation summary shows numbers
   - [ ] No error messages
   - [ ] No console errors (DevTools)

2. **Users Page**
   - [ ] Search input works
   - [ ] Type "user" and search
   - [ ] Results appear in table
   - [ ] "View Details" button works
   - [ ] Navigates to Access Paths page

3. **Access Paths Page**
   - [ ] User name and email display
   - [ ] Access paths load (multiple rows)
   - [ ] Each path shows hops and risk level
   - [ ] "Revoke Access" button appears
   - [ ] Risk badges show correct colors

4. **Analytics Page**
   - [ ] Dangerous roles table loads
   - [ ] Escalation summary stats display
   - [ ] Numbers match backend data

5. **Navigation**
   - [ ] All navigation tabs work
   - [ ] Page transitions are smooth
   - [ ] No 404 errors

6. **Error Handling**
   - [ ] Try searching for "zzzznonexistent"
   - [ ] "No users found" message appears
   - [ ] No crashes

7. **Performance**
   - [ ] Page loads in < 3 seconds
   - [ ] API responses in < 500ms
   - [ ] No network errors (DevTools Network tab)

---

## Troubleshooting

### Backend Issues

**Issue: Render shows "Build Failed"**
```
Solution:
1. Check Render logs for errors
2. Ensure package.json has correct build script
3. Verify tsconfig.json is valid
4. Run locally: npm run build
5. Push fix to GitHub, Render will retry
```

**Issue: "Cannot connect to CognoDB"**
```
Solution:
1. Verify NEO4J_URI, USERNAME, PASSWORD in Render
2. Test connection locally: npm run dev
3. Check CognoDB cloud console that instance is running
4. Verify no IP restrictions on CognoDB
```

**Issue: 502 Bad Gateway**
```
Solution:
1. Wait 2-3 minutes for Render to finish building
2. Check Render logs for runtime errors
3. Ensure PORT environment variable is set to 5000
4. Check database connection in logs
```

### Frontend Issues

**Issue: "API requests fail with CORS error"**
```
Solution:
1. Check backend CORS middleware includes Vercel URL
2. Verify VITE_API_URL environment variable is set correctly
3. Ensure backend is running and accessible
4. Check browser console for exact error message
```

**Issue: "Blank page or no data loads"**
```
Solution:
1. Open DevTools (F12) → Console tab
2. Check for JavaScript errors
3. Check Network tab → API requests
4. Verify VITE_API_URL points to correct backend
5. Ensure backend is running
```

**Issue: "Vercel build fails"**
```
Solution:
1. Check Vercel build logs
2. Ensure TypeScript compiles: npm run build locally
3. Verify .env.production has correct API_URL
4. Check for any hardcoded localhost URLs
5. Push fix to GitHub, Vercel will retry
```

---

## Scaling Considerations (For Free Tier)

### CognoDB Free Tier Limits
- 0.5 vCPU (burstable)
- 256 MB RAM
- 1 GB disk
- 200 concurrent connections

**Current data size:** ~5,350 nodes, ~20,000 relationships = ~200-300 MB

**Status:** ✅ Fits within free tier

### Render Free Tier Limits
- Shared resources
- 15-minute deploy timeout
- 1 free web service

**Status:** ✅ Sufficient for demo

### Vercel Free Tier Limits
- Unlimited deployments
- 100 GB bandwidth/month
- 12 serverless function executions/month

**Status:** ✅ Sufficient for demo

---

## Monitoring

### Backend Health Checks

Render provides automatic health checks. To view:
1. Go to Render Dashboard
2. Click on "cloud-access-shield-api" service
3. Check "Health" tab

### Log Monitoring

**Render Logs:**
```
1. Dashboard → cloud-access-shield-api → Logs
2. Filter by error level
3. Check for connection/query issues
```

**Vercel Logs:**
```
1. Vercel Project Settings → Functions
2. Or via CLI: vercel logs
```

---

## Demo Link

Once deployed, share these links:

```
Frontend: https://cloud-access-shield.vercel.app
Backend: https://cloud-access-shield-api.onrender.com/health
GitHub Backend: https://github.com/YOUR-USERNAME/cloud-access-shield-backend
GitHub Frontend: https://github.com/YOUR-USERNAME/cloud-access-shield-frontend
```

---

## Submission Preparation

Before submitting to hr@wexa.ai:

**File: `SUBMISSION.md`** (Create in root of project)

```markdown
# Cloud Access Shield - Submission

## Deployment Links
- **Demo:** https://cloud-access-shield.vercel.app
- **Backend Health:** https://cloud-access-shield-api.onrender.com/health
- **Backend GitHub:** https://github.com/YOUR-USERNAME/cloud-access-shield-backend
- **Frontend GitHub:** https://github.com/YOUR-USERNAME/cloud-access-shield-frontend

## Overview
Cloud Access Shield is a graph database-powered IAM & privilege escalation analyzer. It visualizes user permissions and detects hidden access paths through group hierarchies and role assignments.

## Data
- 5,000 users
- 200 groups (with hierarchy)
- 50 roles
- 100 resources
- 20,000+ relationships

## Key Features
1. User search with escalation detection
2. Access path visualization (multi-hop traversals)
3. Privilege escalation alerts
4. Dangerous roles analytics
5. Access revocation simulator

## Why Graph Database?
Detecting multi-hop access paths (User → Group → Role → Resource) is a graph-native operation. SQL requires complex recursive CTEs; graphs make it a single query.

## Technology Stack
- **Backend:** Node.js + Express + TypeScript
- **Frontend:** React + TypeScript + Tailwind CSS
- **Database:** CognoDB (Neo4j-compatible graph DB)
- **Hosting:** Render (backend) + Vercel (frontend)

## Queries Implemented
1. Get user access paths (multi-hop)
2. Detect escalation paths (HIGH risk resources)
3. Find dangerous roles
4. Simulate access (what-if analysis)
5. Get escalation summary stats

## Setup Instructions
See README.md in each repository for setup details.
```

---

## Final Deployment Checklist

- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Health check endpoint works
- [ ] All API endpoints return data
- [ ] Dashboard loads with stats
- [ ] User search works end-to-end
- [ ] Access paths display correctly
- [ ] Analytics page shows data
- [ ] No console errors in browser
- [ ] No errors in Render/Vercel logs
- [ ] Database seed data verified
- [ ] CORS configured for production
- [ ] Environment variables secured
- [ ] Demo links working
- [ ] README.md complete
- [ ] Screenshots included

---

**Next Phase:** Documentation & README (see DOCUMENTATION.md)
