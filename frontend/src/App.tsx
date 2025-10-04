import Sidebar from './components/Sidebar.tsx';
import MainContent from './components/MainContent.tsx';

function App() {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar/>
      <MainContent/>
    </div>
  );
}

export default App;
