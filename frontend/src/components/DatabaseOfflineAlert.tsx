export default function DatabaseOfflineAlert() {
  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-3" role="alert">
      <div className="max-w-7xl mx-auto">
        <p className="text-sm text-red-800">
          <strong>Database Connection Failed:</strong> Unable to reach CognoDB. Please check your connection or try again later.
        </p>
      </div>
    </div>
  );
}
