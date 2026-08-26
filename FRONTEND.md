# Frontend Implementation Guide
## Phases 5-8: Setup, Components, Integration, & Polish

---

## Phase 5: Frontend Setup & Scaffolding (1 hour)

### Step 5.1: Create React + Vite Project

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
```

### Step 5.2: Install Dependencies

```bash
# HTTP client
npm install axios swr

# UI & styling (Tailwind already in Vite template)
npm install -D tailwindcss postcss autoprefixer

# Optional: UI components (icons, etc.)
npm install lucide-react
```

### Step 5.3: Tailwind Configuration

**File: `tailwind.config.js`**

```javascript
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        risk: {
          high: '#ef4444',
          medium: '#f59e0b',
          low: '#10b981',
        },
      },
    },
  },
  plugins: [],
}
```

**File: `postcss.config.js`**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### Step 5.4: Environment Configuration

**File: `.env.local`**

```env
VITE_API_URL=http://localhost:5000
```

**File: `src/config.ts`**

```typescript
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const API_TIMEOUT = 30000; // 30 seconds
```

### Step 5.5: API Client Setup

**File: `src/lib/api.ts`**

```typescript
import axios, { AxiosError, AxiosResponse } from 'axios';
import { API_URL, API_TIMEOUT } from '../config';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 404) {
      console.error('Not found:', error.config?.url);
    } else if (error.response?.status === 500) {
      console.error('Server error:', error.message);
    } else if (error.message === 'Network Error') {
      console.error('Database connection failed');
    }
    return Promise.reject(error);
  }
);

// API Methods
export const api = {
  // Health
  checkHealth: () => apiClient.get('/health'),

  // Users
  getUsers: (limit: number = 50, offset: number = 0) =>
    apiClient.get('/api/users', { params: { limit, offset } }),
  
  searchUsers: (query: string) =>
    apiClient.get('/api/users/search', { params: { q: query } }),
  
  getUser: (id: string) =>
    apiClient.get(`/api/users/${id}`),

  // Access
  getAccessPaths: (userId: string, depth?: number) =>
    apiClient.get(`/api/access/paths/${userId}`, { params: { depth } }),
  
  getEscalationPaths: (userId: string) =>
    apiClient.get(`/api/access/escalations/${userId}`),
  
  revokeAccess: (userId: string, groupId: string) =>
    apiClient.post('/api/access/revoke', { userId, groupId }),
  
  simulateAccess: (userId: string, groupId: string) =>
    apiClient.post('/api/access/simulate', { userId, groupId }),

  // Analytics
  getDangerousRoles: (limit?: number) =>
    apiClient.get('/api/analytics/dangerous-roles', { params: { limit } }),
  
  getEscalationSummary: () =>
    apiClient.get('/api/analytics/escalation-summary'),
  
  getUserStats: () =>
    apiClient.get('/api/analytics/user-stats'),
};
```

### Step 5.6: Shared Types

**File: `src/types/index.ts`**

```typescript
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface User {
  id: string;
  email: string;
  name: string;
  created_at?: string;
  escalation_count?: number;
  has_high_risk?: boolean;
}

export interface AccessPath {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    risk_level?: RiskLevel;
  }>;
  hops: number;
  riskLevel: RiskLevel;
}

export interface Role {
  id: string;
  name: string;
  risk_level: RiskLevel;
  resource_count: number;
}

export interface EscalationSummary {
  at_risk_count: number;
  avg_access: number;
  max_access: number;
  min_access: number;
}

export interface UserStats {
  total_users: number;
  avg_access: number;
  max_access: number;
  median_access: number;
}
```

### Step 5.7: Main App Structure

**File: `src/App.tsx`**

```typescript
import { useEffect, useState } from 'react';
import { api } from './lib/api';
import Dashboard from './pages/Dashboard';
import UserSearch from './pages/UserSearch';
import AccessPaths from './pages/AccessPaths';
import Analytics from './pages/Analytics';
import DatabaseOfflineAlert from './components/DatabaseOfflineAlert';

type Page = 'dashboard' | 'users' | 'access' | 'analytics';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isDatabaseOnline, setIsDatabaseOnline] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Check database connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await api.checkHealth();
        setIsDatabaseOnline(true);
      } catch {
        setIsDatabaseOnline(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setCurrentPage('access');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!isDatabaseOnline && <DatabaseOfflineAlert />}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Cloud Access Shield</h1>
            <p className="text-sm text-gray-500">IAM & Privilege Escalation Analyzer</p>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`px-3 py-4 border-b-2 font-medium text-sm ${
                currentPage === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentPage('users')}
              className={`px-3 py-4 border-b-2 font-medium text-sm ${
                currentPage === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setCurrentPage('access')}
              className={`px-3 py-4 border-b-2 font-medium text-sm ${
                currentPage === 'access'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Access Paths
            </button>
            <button
              onClick={() => setCurrentPage('analytics')}
              className={`px-3 py-4 border-b-2 font-medium text-sm ${
                currentPage === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Analytics
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'users' && <UserSearch onSelectUser={handleSelectUser} />}
        {currentPage === 'access' && <AccessPaths userId={selectedUserId} />}
        {currentPage === 'analytics' && <Analytics />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          <p>Cloud Access Shield © 2024. Graph Database-powered IAM Analysis.</p>
        </div>
      </footer>
    </div>
  );
}
```

### Step 5.8: Test Frontend Setup

```bash
npm run dev

# Expected output:
# VITE v... ready in ... ms
# ➜  Local:   http://localhost:5173/
# ➜  press h + enter to show help
```

**Expected in browser:**
- App title: "Cloud Access Shield"
- Navigation tabs: Dashboard, Users, Access Paths, Analytics
- No TypeScript errors

---

## Phase 6: Frontend Components & Pages (3 hours)

### Step 6.1: Reusable Components

**File: `src/components/RiskBadge.tsx`**

```typescript
import { RiskLevel } from '../types';

interface RiskBadgeProps {
  level: RiskLevel | undefined;
  className?: string;
}

export default function RiskBadge({ level, className = '' }: RiskBadgeProps) {
  const styles = {
    HIGH: 'bg-red-100 text-red-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-green-100 text-green-800',
  };

  const labels = {
    HIGH: '🔴 HIGH',
    MEDIUM: '🟡 MEDIUM',
    LOW: '🟢 LOW',
  };

  const style = level ? styles[level] : 'bg-gray-100 text-gray-800';
  const label = level ? labels[level] : 'UNKNOWN';

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${style} ${className}`}>
      {label}
    </span>
  );
}
```

**File: `src/components/Loading.tsx`**

```typescript
interface LoadingProps {
  message?: string;
}

export default function Loading({ message = 'Loading...' }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin">
        <div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
      </div>
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  );
}
```

**File: `src/components/Empty.tsx`**

```typescript
interface EmptyProps {
  title: string;
  description?: string;
}

export default function Empty({ title, description }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-6xl mb-4">📭</div>
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && <p className="text-gray-500 mt-2">{description}</p>}
    </div>
  );
}
```

**File: `src/components/ErrorMessage.tsx`**

```typescript
interface ErrorMessageProps {
  title: string;
  message?: string;
}

export default function ErrorMessage({ title, message }: ErrorMessageProps) {
  return (
    <div className="rounded-md bg-red-50 p-4 mb-4">
      <div className="flex">
        <div className="text-red-400 mr-3">⚠️</div>
        <div>
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          {message && <p className="text-sm text-red-700 mt-1">{message}</p>}
        </div>
      </div>
    </div>
  );
}
```

**File: `src/components/DatabaseOfflineAlert.tsx`**

```typescript
export default function DatabaseOfflineAlert() {
  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-3">
      <div className="max-w-7xl mx-auto">
        <p className="text-sm text-red-800">
          ⚠️ <strong>Database Connection Failed:</strong> Unable to reach CognoDB. Please check your connection or try again later.
        </p>
      </div>
    </div>
  );
}
```

### Step 6.2: Dashboard Page

**File: `src/pages/Dashboard.tsx`**

```typescript
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { EscalationSummary, UserStats } from '../types';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';

export default function Dashboard() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [summary, setSummary] = useState<EscalationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsRes, summaryRes] = await Promise.all([
          api.getUserStats(),
          api.getEscalationSummary(),
        ]);

        setStats(statsRes.data);
        setSummary(summaryRes.data);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
        {error && <ErrorMessage title="Error" message={error} />}
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Users"
            value={stats.total_users}
            icon="👥"
          />
          <StatCard
            label="Avg Access Count"
            value={stats.avg_access}
            icon="📊"
          />
          <StatCard
            label="Max Access Count"
            value={stats.max_access}
            icon="📈"
          />
          <StatCard
            label="Median Access Count"
            value={stats.median_access}
            icon="📉"
          />
        </div>
      )}

      {/* Escalation Summary */}
      {summary && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Escalation Risk Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-gray-600 text-sm">Users at Risk (>20 accesses)</p>
              <p className="text-3xl font-bold text-red-600">{summary.at_risk_count}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Avg Resource Access</p>
              <p className="text-3xl font-bold text-blue-600">{summary.avg_access}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Max Resource Access</p>
              <p className="text-3xl font-bold text-orange-600">{summary.max_access}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="text-2xl mb-2">{icon}</div>
      <p className="text-gray-600 text-sm font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
  );
}
```

### Step 6.3: User Search Page

**File: `src/pages/UserSearch.tsx`**

```typescript
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { User } from '../types';
import Loading from '../components/Loading';
import Empty from '../components/Empty';
import ErrorMessage from '../components/ErrorMessage';
import RiskBadge from '../components/RiskBadge';

interface UserSearchProps {
  onSelectUser: (userId: string) => void;
}

export default function UserSearch({ onSelectUser }: UserSearchProps) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const res = await api.searchUsers(query);
      setUsers(res.data.users);
      setSearched(true);
    } catch (err) {
      setError('Failed to search users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">User Search</h2>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          placeholder="Search by email or name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Search
        </button>
      </form>

      {error && <ErrorMessage title="Error" message={error} />}

      {loading && <Loading message="Searching users..." />}

      {searched && !loading && users.length === 0 && (
        <Empty
          title="No users found"
          description={`Try searching with a different email or name`}
        />
      )}

      {/* Results */}
      {users.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Access Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.name}</td>
                    <td className="px-6 py-4 text-sm">
                      {user.escalation_count !== undefined ? (
                        user.has_high_risk ? (
                          <RiskBadge level="HIGH" />
                        ) : (
                          <span className="text-gray-600">{user.escalation_count} resources</span>
                        )
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => onSelectUser(user.id)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        View Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Step 6.4: Access Paths Page

**File: `src/pages/AccessPaths.tsx`**

```typescript
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { AccessPath, User } from '../types';
import Loading from '../components/Loading';
import Empty from '../components/Empty';
import ErrorMessage from '../components/ErrorMessage';
import RiskBadge from '../components/RiskBadge';

interface AccessPathsProps {
  userId: string | null;
}

export default function AccessPaths({ userId }: AccessPathsProps) {
  const [user, setUser] = useState<User | null>(null);
  const [paths, setPaths] = useState<AccessPath[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setUser(null);
      setPaths([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [userRes, pathsRes] = await Promise.all([
          api.getUser(userId),
          api.getAccessPaths(userId),
        ]);

        setUser(userRes.data);
        setPaths(pathsRes.data.paths);
      } catch (err) {
        setError('Failed to load access paths');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  if (!userId) {
    return (
      <Empty
        title="No user selected"
        description="Go to Users page to select a user"
      />
    );
  }

  if (loading) return <Loading message="Loading access paths..." />;

  return (
    <div className="space-y-6">
      {error && <ErrorMessage title="Error" message={error} />}

      {user && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
          <p className="text-gray-600">{user.email}</p>
        </div>
      )}

      {paths.length === 0 ? (
        <Empty
          title="No access paths found"
          description={`User has no access to any resources`}
        />
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Access Paths ({paths.length})
          </h3>
          {paths.map((path, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {path.hops} hops
                  </span>
                  <RiskBadge level={path.riskLevel} />
                </div>
              </div>

              {/* Path visualization */}
              <div className="flex items-center overflow-x-auto gap-2">
                {path.nodes.map((node, nodeIdx) => (
                  <div key={nodeIdx} className="flex items-center gap-2 flex-shrink-0">
                    <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm">
                      <div className="text-xs text-gray-600">{node.type}</div>
                      <div className="font-medium text-gray-900">{node.label}</div>
                    </div>
                    {nodeIdx < path.nodes.length - 1 && (
                      <div className="text-gray-400">→</div>
                    )}
                  </div>
                ))}
              </div>

              <button
                className="mt-4 px-4 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100 font-medium text-sm"
              >
                🔒 Revoke Access
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Step 6.5: Analytics Page

**File: `src/pages/Analytics.tsx`**

```typescript
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Role, EscalationSummary } from '../types';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import RiskBadge from '../components/RiskBadge';

export default function Analytics() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [summary, setSummary] = useState<EscalationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [rolesRes, summaryRes] = await Promise.all([
          api.getDangerousRoles(),
          api.getEscalationSummary(),
        ]);

        setRoles(rolesRes.data.roles);
        setSummary(summaryRes.data);
      } catch (err) {
        setError('Failed to load analytics');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <Loading message="Loading analytics..." />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>

      {error && <ErrorMessage title="Error" message={error} />}

      {/* Escalation Summary */}
      {summary && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Escalation Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-gray-600 text-sm">Users at Risk</p>
              <p className="text-2xl font-bold text-red-600">{summary.at_risk_count}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Avg Access</p>
              <p className="text-2xl font-bold text-blue-600">{summary.avg_access}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Max Access</p>
              <p className="text-2xl font-bold text-orange-600">{summary.max_access}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Min Access</p>
              <p className="text-2xl font-bold text-green-600">{summary.min_access}</p>
            </div>
          </div>
        </div>
      )}

      {/* Dangerous Roles */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Top Dangerous Roles</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Resource Access</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{role.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{role.resource_count}</td>
                  <td className="px-6 py-4 text-sm">
                    <RiskBadge level={role.risk_level} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

### Phase 6 Verification

```bash
npm run dev

# In browser at http://localhost:5173:
# ✓ Dashboard page loads with stats
# ✓ Users page has search functionality
# ✓ Access Paths page works
# ✓ Analytics page displays roles
# ✓ All styling is consistent
# ✓ No TypeScript errors
```

---

## Phase 7: Frontend-Backend Integration (1.5 hours)

### Step 7.1: Connect Access Path Actions

Update **`src/pages/AccessPaths.tsx`** to add revoke functionality:

```typescript
// Add to state
const [revoking, setRevoking] = useState(false);
const [success, setSuccess] = useState<string | null>(null);

// Add revoke handler
const handleRevoke = async (groupId: string, index: number) => {
  if (!userId) return;

  try {
    setRevoking(true);
    await api.revokeAccess(userId, groupId);
    
    // Remove path from list
    const newPaths = paths.filter((_, i) => i !== index);
    setPaths(newPaths);
    
    setSuccess('Access revoked successfully');
    setTimeout(() => setSuccess(null), 3000);
  } catch (err) {
    setError('Failed to revoke access');
    console.error(err);
  } finally {
    setRevoking(false);
  }
};

// Update button to call handler
<button
  onClick={() => handleRevoke(path.nodes[1].id, idx)}
  disabled={revoking}
  className="mt-4 px-4 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100 font-medium text-sm disabled:opacity-50"
>
  🔒 Revoke Access
</button>

// Add success message
{success && (
  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded text-green-800">
    ✓ {success}
  </div>
)}
```

### Phase 7 Verification

```bash
# Start backend
cd backend
npm run dev

# Start frontend (in another terminal)
cd frontend
npm run dev

# Test flow:
# 1. Go to Dashboard → See stats load
# 2. Go to Users → Search for a user
# 3. Click "View Details" → Access Paths load
# 4. Click "Revoke Access" → Path should disappear
# 5. Go to Analytics → See dangerous roles
```

---

## Phase 8: UI Polish & Error Handling (2 hours)

### Step 8.1: Create Toast Notification Component

**File: `src/components/Toast.tsx`**

```typescript
import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const styles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white',
  };

  return (
    <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg ${styles[type]} z-50 animate-bounce`}>
      {message}
    </div>
  );
}
```

### Step 8.2: Add Confirmation Modal

**File: `src/components/ConfirmDialog.tsx`**

```typescript
interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
}

export default function ConfirmDialog({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDangerous = false,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-gray-600 mt-2">{message}</p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 text-white rounded font-medium ${
              isDangerous
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Step 8.3: Global Styling

**File: `src/styles/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-in;
}

.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}

/* Responsive */
@media (max-width: 640px) {
  .container {
    padding: 1rem;
  }
}
```

### Step 8.4: Enhanced Error Handling

Update all pages with better error messages and retry logic:

**File: `src/lib/useApi.ts`** (Custom hook)

```typescript
import { useState, useCallback } from 'react';
import { AxiosError } from 'axios';

interface UseApiOptions {
  onError?: (error: string) => void;
  onSuccess?: (data: any) => void;
}

export function useApi<T>(
  apiFn: () => Promise<any>,
  options?: UseApiOptions
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFn();
      setData(response.data);
      options?.onSuccess?.(response.data);
      return response.data;
    } catch (err) {
      const errorMessage = getErrorMessage(err as AxiosError);
      setError(errorMessage);
      options?.onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFn, options]);

  const retry = useCallback(() => execute(), [execute]);

  return { data, loading, error, execute, retry };
}

function getErrorMessage(error: AxiosError): string {
  if (error.code === 'ECONNABORTED') {
    return 'Request timeout. Please try again.';
  } else if (error.response?.status === 404) {
    return 'Resource not found.';
  } else if (error.response?.status === 500) {
    return 'Server error. Please try again later.';
  } else if (error.message === 'Network Error') {
    return 'Network error. Check your connection and database status.';
  }
  return error.message || 'An error occurred. Please try again.';
}
```

### Phase 8 Verification

```bash
# Visual inspection:
# ✓ All pages have consistent styling
# ✓ Colors are brand-appropriate
# ✓ Typography hierarchy is clear
# ✓ Loading spinners appear during API calls
# ✓ Empty states show helpful messages
# ✓ Error messages are user-friendly
# ✓ Hover states on buttons work
# ✓ Form inputs are styled correctly
# ✓ Tables are readable with good contrast
# ✓ Responsive design on mobile browser (DevTools)

# Test scenarios:
# 1. No users found → "No users found" message ✓
# 2. No access paths → "No access paths found" message ✓
# 3. Database offline → "Database connection failed" alert ✓
# 4. Slow network → Loading spinner shows ✓
# 5. Successful action → Toast notification appears ✓
```

---

## Summary

You now have a complete, polished frontend with:
✅ React + TypeScript with Tailwind CSS
✅ All API endpoints integrated
✅ 4 main pages: Dashboard, Users, AccessPaths, Analytics
✅ Reusable components (RiskBadge, Loading, Empty, Error)
✅ Professional styling and UX
✅ Error handling + loading states
✅ Responsive design

**Next Phase:** Deployment (see DEPLOYMENT.md)
