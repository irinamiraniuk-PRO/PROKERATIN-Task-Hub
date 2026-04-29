
import { AppProvider, useApp } from './context/AppContext';
import Login from './components/Login';
import Layout from './components/Layout';

function AppInner() {
  const { state } = useApp();

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
