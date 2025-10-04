import Sidebar from './components/Sidebar.tsx';
import MainContent from './components/MainContent.tsx';

function App() {
    const handleSearchSubmit = async (query : string) => {

    // Trigger Flask API call
    console.log(`--- Running analysis for: ${query} ---`);
    // Placeholder for API call: fetch('/api/analyze?ticker=' + query)
  };
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar/>
      <MainContent onSearch={handleSearchSubmit}/>
    </div>
  );
}

export default App;
