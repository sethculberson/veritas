import Sidebar from './components/Sidebar.jsx';
import MainContent from './components/MainContent.jsx';

function App() {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar/>
      <MainContent/>
    </div>
  );
}

export default App;
