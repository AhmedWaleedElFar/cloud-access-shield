import { useEffect, useState, useCallback } from 'react';
import { api } from './lib/api';
import Dashboard from './pages/Dashboard';
import UserSearch from './pages/UserSearch';
import AccessPaths from './pages/AccessPaths';
import Analytics from './pages/Analytics';
import DatabaseOfflineAlert from './components/DatabaseOfflineAlert';
import ErrorBoundary from './components/ErrorBoundary';

type Page = 'dashboard' | 'users' | 'access' | 'analytics';

const navItems: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '&#x1F4CA;' },
  { id: 'users', label: 'Users', icon: '&#x1F465;' },
  { id: 'access', label: 'Access Paths', icon: '&#x1F517;' },
  { id: 'analytics', label: 'Analytics', icon: '&#x1F4C8;' },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isDatabaseOnline, setIsDatabaseOnline] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

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
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectUser = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setCurrentPage('access');
  }, []);

  const handleNavKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = (index + 1) % navItems.length;
        setCurrentPage(navItems[next].id);
        (e.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = (index - 1 + navItems.length) % navItems.length;
        setCurrentPage(navItems[prev].id);
        (e.currentTarget.parentElement?.children[prev] as HTMLElement)?.focus();
      }
    },
    [],
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {!isDatabaseOnline && <DatabaseOfflineAlert />}

      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">CAS</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Cloud Access Shield</h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">IAM & Privilege Escalation Analyzer</p>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 sticky top-[68px] z-20" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 sm:space-x-8 overflow-x-auto" role="tablist">
            {navItems.map((item, index) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={currentPage === item.id}
                aria-controls={`panel-${item.id}`}
                id={`tab-${item.id}`}
                tabIndex={currentPage === item.id ? 0 : -1}
                onClick={() => setCurrentPage(item.id)}
                onKeyDown={(e) => handleNavKeyDown(e, index)}
                className={`relative px-3 py-4 border-b-2 font-medium text-sm transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded ${
                  currentPage === item.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="mr-1.5" dangerouslySetInnerHTML={{ __html: item.icon }} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main
        className="max-w-7xl mx-auto px-4 pt-8 pb-8 sm:px-6 lg:px-8 animate-in fade-in duration-200"
        role="tabpanel"
        id={`panel-${currentPage}`}
        aria-labelledby={`tab-${currentPage}`}
        key={currentPage}
      >
        <ErrorBoundary>
          {currentPage === 'dashboard' && <Dashboard />}
          {currentPage === 'users' && <UserSearch onSelectUser={handleSelectUser} />}
          {currentPage === 'access' && <AccessPaths userId={selectedUserId} />}
          {currentPage === 'analytics' && <Analytics />}
        </ErrorBoundary>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          <p>Cloud Access Shield. Graph Database-powered IAM Analysis.</p>
        </div>
      </footer>
    </div>
  );
}
