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
import KanbanBoard from './KanbanBoard';
import KnowledgeBase from './KnowledgeBase';
import OnboardingView from './OnboardingView';
import NotesView from './NotesView';
import { useApp } from '../context/AppContext';

export default function Layout() {
  const { state } = useApp();
  const [view, setView] = useState<View>('dashboard');
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { currentUser, tasks } = state;
  if (!currentUser) return null;

  const isDirector = currentUser.role === 'director';

  // All tasks visible to current user for kanban
  const visibleTasks = isDirector
    ? tasks
    : tasks.filter(t =>
        t.assignedTo === currentUser.id ||
        t.createdBy === currentUser.id ||
        t.transferredTo === currentUser.id
      );

  function renderView() {
    switch (view) {
      case 'dashboard': return <Dashboard searchQuery={searchQuery} onViewChange={v => { setView(v); setSearchQuery(''); }} />;
      case 'calendar-planner': return isDirector ? <DirectorDashboard searchQuery={searchQuery} /> : <Dashboard searchQuery={searchQuery} onViewChange={v => { setView(v); setSearchQuery(''); }} />;
      case 'week-planner': return <WeekPlanner searchQuery={searchQuery} />;
      case 'kanban': return (
        <div style={{ padding: '20px 24px' }}>
          <h1 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.3px' }}>▤ Канбан-доска</h1>
          <KanbanBoard tasks={visibleTasks} searchQuery={searchQuery} />
        </div>
      );
      case 'my-tasks': return <MyTasks searchQuery={searchQuery} />;
      case 'incoming': return <IncomingTasks searchQuery={searchQuery} />;
      case 'outgoing': return <OutgoingTasks searchQuery={searchQuery} />;
      case 'waiting': return <WaitingTasks searchQuery={searchQuery} />;
      case 'pending-director': return <PendingDirectorReview searchQuery={searchQuery} />;
      case 'director-review': return isDirector ? <DirectorReviewQueue searchQuery={searchQuery} /> : <Dashboard searchQuery={searchQuery} />;
      case 'team': return isDirector ? <DirectorDashboard searchQuery={searchQuery} /> : <Dashboard searchQuery={searchQuery} />;
      case 'archive': return <Archive searchQuery={searchQuery} />;
      case 'settings': return <SettingsView />;
      case 'knowledge-base': return <KnowledgeBase />;
      case 'notes': return <NotesView />;
      case 'onboarding': return <OnboardingView />;
      default: return <Dashboard searchQuery={searchQuery} />;
    }
  }

  return (
    <div style={{ display: 'flex', height: '100dvh', background: '#F7F7F5', overflow: 'hidden' }}>
      <div className="sidebar-wrapper">
        <Sidebar
          currentView={view}
          onViewChange={v => { setView(v); setSearchQuery(''); }}
          onCreateTask={() => setShowCreate(true)}
        />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <main className="main-scroll-area" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
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
