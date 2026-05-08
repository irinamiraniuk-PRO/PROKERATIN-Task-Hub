import { useEffect, useState } from 'react';
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

const VIEW_IDS: View[] = [
  'dashboard',
  'calendar-planner',
  'week-planner',
  'kanban',
  'my-tasks',
  'incoming',
  'outgoing',
  'waiting',
  'pending-director',
  'director-review',
  'team',
  'archive',
  'settings',
  'knowledge-base',
  'notes',
  'onboarding',
];

function isView(value: unknown): value is View {
  return typeof value === 'string' && VIEW_IDS.includes(value as View);
}

export default function Layout() {
  const { state, syncStatus } = useApp();
  const [view, setView] = useState<View>(() => {
    const appView = window.history.state?.appView;
    return isView(appView) ? appView : 'dashboard';
  });
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const { currentUser, tasks } = state;
  const isDirector = currentUser?.role === 'director';

  function changeView(nextView: View) {
    if (nextView === view) return;
    setView(nextView);
    setSearchQuery('');
    window.history.pushState({ appView: nextView }, '');
  }

  useEffect(() => {
    const appView = window.history.state?.appView;
    window.history.replaceState({ appView: isView(appView) ? appView : 'dashboard' }, '');
  }, []);

  useEffect(() => {
    function handlePopState(event: PopStateEvent) {
      const appView = event.state?.appView;
      if (isView(appView)) {
        setView(appView);
        setSearchQuery('');
        return;
      }
      setView('dashboard');
      setSearchQuery('');
      window.history.replaceState({ appView: 'dashboard' }, '');
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (!currentUser) return null;

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
      case 'dashboard': return <Dashboard searchQuery={searchQuery} onViewChange={v => changeView(v)} onOpenNotifications={() => setShowNotifications(true)} />;
      case 'calendar-planner': return isDirector ? <DirectorDashboard searchQuery={searchQuery} /> : <Dashboard searchQuery={searchQuery} onViewChange={v => changeView(v)} onOpenNotifications={() => setShowNotifications(true)} />;
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
      case 'director-review': return isDirector ? <DirectorReviewQueue searchQuery={searchQuery} /> : <Dashboard searchQuery={searchQuery} onOpenNotifications={() => setShowNotifications(true)} />;
      case 'team': return isDirector ? <DirectorDashboard searchQuery={searchQuery} /> : <Dashboard searchQuery={searchQuery} onOpenNotifications={() => setShowNotifications(true)} />;
      case 'archive': return <Archive searchQuery={searchQuery} />;
      case 'settings': return <SettingsView />;
      case 'knowledge-base': return <KnowledgeBase />;
      case 'notes': return <NotesView />;
      case 'onboarding': return <OnboardingView />;
      default: return <Dashboard searchQuery={searchQuery} />;
    }
  }

  return (
    <div style={{ display: 'flex', height: '100dvh', width: '100%', background: '#F7F7F5', overflow: 'hidden' }}>
      <div className="sidebar-wrapper">
        <Sidebar
          currentView={view}
          onViewChange={v => changeView(v)}
          onCreateTask={() => setShowCreate(true)}
        />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showNotifications={showNotifications}
          onToggleNotifications={() => setShowNotifications(v => !v)}
          onCloseNotifications={() => setShowNotifications(false)}
        />
        {!syncStatus.supportsCrossDeviceSync && (
          <div style={{ padding: '10px 16px', background: '#FEF3C7', color: '#92400E', borderBottom: '1px solid #FDE68A', fontSize: 13, fontWeight: 600 }}>
            {syncStatus.warning}
          </div>
        )}
        <main className="main-scroll-area" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {renderView()}
        </main>
      </div>
      <BottomNav
        currentView={view}
        onViewChange={v => changeView(v)}
        onCreateTask={() => setShowCreate(true)}
      />
      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
