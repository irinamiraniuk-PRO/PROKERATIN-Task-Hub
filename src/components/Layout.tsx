import { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Dashboard from './Dashboard';
import DirectorDashboard from './DirectorDashboard';
import MyTasks from './MyTasks';
import IncomingTasks from './IncomingTasks';
import OutgoingTasks from './OutgoingTasks';
import Archive from './Archive';
import CreateTaskModal from './CreateTaskModal';
import { useApp } from '../context/AppContext';

type View = 'dashboard' | 'my-tasks' | 'incoming' | 'outgoing' | 'archive' | 'director';

export default function Layout() {
  const { state } = useApp();
  const [view, setView] = useState<View>('dashboard');
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { currentUser } = state;
  if (!currentUser) return null;

  function renderView() {
    switch (view) {
      case 'dashboard': return <Dashboard searchQuery={searchQuery} />;
      case 'my-tasks': return <MyTasks searchQuery={searchQuery} />;
      case 'incoming': return <IncomingTasks searchQuery={searchQuery} />;
      case 'outgoing': return <OutgoingTasks searchQuery={searchQuery} />;
      case 'archive': return <Archive searchQuery={searchQuery} />;
      case 'director': return currentUser?.role === 'director' ? <DirectorDashboard searchQuery={searchQuery} /> : <Dashboard searchQuery={searchQuery} />;
      default: return <Dashboard searchQuery={searchQuery} />;
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#FAFAF8', overflow: 'hidden' }}>
      <Sidebar
        currentView={view}
        onViewChange={v => { setView(v); setSearchQuery(''); }}
        onCreateTask={() => setShowCreate(true)}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {renderView()}
        </main>
      </div>

      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
