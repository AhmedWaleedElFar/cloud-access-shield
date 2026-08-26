interface AccessPathsProps {
  userId: string | null;
}

export default function AccessPaths({ userId }: AccessPathsProps) {
  if (!userId) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Access Paths</h2>
        <p className="text-gray-600 mt-4">No user selected. Go to Users page to select one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Access Paths</h2>
      <p className="text-gray-600">Access paths for user {userId}.</p>
    </div>
  );
}
