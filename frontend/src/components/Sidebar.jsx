function Sidebar() {
  return (
    <div className="w-64 flex-shrink-0 bg-gray-50 border-r border-gray-200 h-screen overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Veritas</h1>
        <p className="text-xs text-gray-500">Corporate Integrity Monitor</p>
      </div>

      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-600 mb-2 flex items-center">
          Recent Searches
        </h2>
      </div>
    </div>
  );
}

export default Sidebar;