import Sidebar from './components/Sidebar.tsx';
import MainContent from './components/MainContent.tsx';
import { useState } from 'react';

function App() {
  // State to manage selected company from sidebar
  const [selectedFromSidebar, setSelectedFromSidebar] = useState<{company: string, cik: string} | null>(null);

  const handleSearchSubmit = async (query : string) => {
    // Trigger Flask API call
    console.log(`--- Running analysis for: ${query} ---`);
    // Placeholder for API call: fetch('/api/analyze?ticker=' + query)
  };

  const handleSidebarSearchSelect = (company: string, cik: string) => {
    setSelectedFromSidebar({ company, cik });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar onSearchSelect={handleSidebarSearchSelect}/>
      <MainContent 
        onSearch={handleSearchSubmit} 
        selectedFromSidebar={selectedFromSidebar}
        clearSelectedFromSidebar={() => setSelectedFromSidebar(null)}
      />
    </div>
  );
}

export default App;
