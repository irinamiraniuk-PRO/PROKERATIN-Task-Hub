
import { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Login from './components/Login';
import Layout from './components/Layout';

function AppInner() {
  const { state } = useApp();

  // Prevent browser back button from exiting the SPA while logged in
  useEffect(() => {
    if (!state.currentUser) return;
    // Push a state entry so there's something to "go back" to within the SPA
    if (!window.history.state?.spaLocked) {
      window.history.pushState({ spaLocked: true }, '');
    }
    function handlePopState() {
      // Re-push state to keep the user inside the app
      window.history.pushState({ spaLocked: true }, '');
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [state.currentUser]);

  if (state.currentUser) {
    return (
      <div className="anim-workspace" style={{ height: '100%' }}>
        <Layout />
      </div>
    );
  }

  return <Login />;
}

function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}

export default App;
