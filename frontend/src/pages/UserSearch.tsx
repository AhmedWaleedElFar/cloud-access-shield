interface UserSearchProps {
  onSelectUser: (userId: string) => void;
}

export default function UserSearch({ onSelectUser: _onSelectUser }: UserSearchProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">User Search</h2>
      <p className="text-gray-600">Search functionality coming in Phase 6.</p>
    </div>
  );
}
