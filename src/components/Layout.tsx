import { useState } from 'react';
import Sidebar, { type View } from './Sidebar';
import BottomNav from './BottomNav';
import TopBar from './TopBar';
import Dashboard from './Dashboard';
import DirectorDashboard from './DirectorDashboard';
import MyTasks from './MyTasks';
import IncomingTasks from './IncomingTasks';
import OutgoingTasks from './OutgoingTasks';
import Archive from './Archive';
import CreateTaskModal from './CreateTaskModal';
import PendingDirectorReview from './PendingDirectorReview';
import DirectorReviewQueue from './DirectorReviewQueue';
import WeekPlanner from './WeekPlanner';
import WaitingTasks from './WaitingTasks';
import SettingsView from './SettingsView';
import { useApp } from '../context/AppContext';

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
      case 'calendar-planner': return currentUser?.role === 'director' ? <DirectorDashboard searchQuery={searchQuery} /> : <Dashboard searchQuery={searchQuery} />;
      case 'week-planner': return <WeekPlanner searchQuery={searchQuery} />;
      case 'my-tasks': return <MyTasks searchQuery={searchQuery} />;
      case 'incoming': return <IncomingTasks searchQuery={searchQuery} />;
      case 'outgoing': return <OutgoingTasks searchQuery={searchQuery} />;
      case 'waiting': return <WaitingTasks searchQuery={searchQuery} />;
      case 'pending-director': return <PendingDirectorReview searchQuery={searchQuery} />;
      case 'director-review': return currentUser?.role === 'director' ? <DirectorReviewQueue searchQuery={searchQuery} /> : <Dashboard searchQuery={searchQuery} />;
      case 'team': return currentUser?.role === 'director' ? <DirectorDashboard searchQuery={searchQuery} /> : <Dashboard searchQuery={searchQuery} />;
      case 'archive': return <Archive searchQuery={searchQuery} />;
      case 'settings': return <SettingsView />;
      default: return <Dashboard searchQuery={searchQuery} />;
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#FAFAF8', overflow: 'hidden' }}>
      <div className="sidebar-wrapper">
        <Sidebar
          currentView={view}
          onViewChange={v => { setView(v); setSearchQuery(''); }}
          onCreateTask={() => setShowCreate(true)}
        />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <main className="main-scroll-area" style={{ flex: 1, overflowY: 'auto' }}>
          {renderView()}
        </main>
      </div>
      <BottomNav
        currentView={view}
        onViewChange={v => { setView(v); setSearchQuery(''); }}
        onCreateTask={() => setShowCreate(true)}
      />
      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
