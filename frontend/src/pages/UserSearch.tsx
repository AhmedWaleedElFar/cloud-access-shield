import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import type { UserListItem } from '@shared/types';
import Loading from '../components/Loading';
import Empty from '../components/Empty';
import RiskBadge from '../components/RiskBadge';

interface UserSearchProps {
  onSelectUser: (userId: string) => void;
}

const PAGE_SIZE = 25;

export default function UserSearch({ onSelectUser }: UserSearchProps) {
  const [allUsers, setAllUsers] = useState<UserListItem[]>([]);
  const [filtered, setFiltered] = useState<UserListItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getUsers();
        setAllUsers(res.data);
        setFiltered(res.data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSearch = useCallback(
    async (q: string) => {
      setQuery(q);
      setPage(1);
      if (q.length < 2) {
        setFiltered(allUsers);
        return;
      }
      try {
        const res = await api.searchUsers(q);
        setFiltered(res.data);
      } catch {
        setFiltered([]);
      }
    },
    [allUsers],
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageUsers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleRowKeyDown = useCallback(
    (e: React.KeyboardEvent, userId: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelectUser(userId);
      }
    },
    [onSelectUser],
  );

  if (loading) return <Loading message="Loading users..." />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Users</h2>

      <label htmlFor="user-search" className="sr-only">Search users</label>
      <input
        id="user-search"
        type="text"
        placeholder="Search by name or email..."
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
        aria-label="Search users by name or email"
      />

      <p className="text-sm text-gray-500" aria-live="polite">
        {filtered.length} user{filtered.length !== 1 ? 's' : ''} found
        {query && ` for "${query}"`}
      </p>

      {filtered.length === 0 ? (
        <Empty title="No users found" description="Try adjusting your search." />
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paths</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk</th>
                  <th scope="col" className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pageUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-blue-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset transition-colors duration-150"
                    onClick={() => onSelectUser(user.id)}
                    onKeyDown={(e) => handleRowKeyDown(e, user.id)}
                    tabIndex={0}
                    role="button"
                    aria-label={`View access paths for ${user.name}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.escalation_count ?? 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-semibold ${
                        (user.score ?? 0) >= 60 ? 'text-red-600' :
                        (user.score ?? 0) >= 30 ? 'text-orange-500' :
                        'text-green-600'
                      }`}>
                        {user.score ?? 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.has_high_risk ? (
                        <RiskBadge level="HIGH" />
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">OK</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <span className="text-blue-600 hover:text-blue-900">View Paths</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav className="flex items-center justify-between" aria-label="Pagination">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                aria-label="Previous page"
              >
                Previous
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span>Page</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={page}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1 && val <= totalPages) {
                      setPage(val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-14 px-2 py-1 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm"
                  aria-label={`Go to page`}
                />
                <span>of {totalPages}</span>
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                aria-label="Next page"
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
