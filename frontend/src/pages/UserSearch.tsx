import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { UserListItem } from '@shared/types';

interface UserSearchProps {
  onSelectUser: (userId: string) => void;
}

export default function UserSearch({ onSelectUser }: UserSearchProps) {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getUsers();
        setUsers(res.data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      const res = await api.getUsers();
      setUsers(res.data);
      return;
    }
    setSearching(true);
    try {
      const res = await api.searchUsers(q);
      setUsers(res.data);
    } catch {
      // silent
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Users</h2>
        <p className="text-gray-600">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Users</h2>

      <input
        type="text"
        placeholder="Search by name or email..."
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      {searching && <p className="text-gray-500">Searching...</p>}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Access</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.slice(0, 100).map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onSelectUser(user.id)}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.escalation_count ?? 0}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.has_high_risk ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">HIGH</span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">OK</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button className="text-blue-600 hover:text-blue-900">View Paths</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length > 100 && (
          <p className="px-6 py-3 text-sm text-gray-500">Showing 100 of {users.length} users</p>
        )}
      </div>
    </div>
  );
}
