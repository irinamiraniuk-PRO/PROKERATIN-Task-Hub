
import { AppProvider, useApp } from './context/AppContext';
import Login from './components/Login';
import Layout from './components/Layout';

function AppInner() {
  const { state } = useApp();
  return state.currentUser ? <Layout /> : <Login />;
}

function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}

export default App;
