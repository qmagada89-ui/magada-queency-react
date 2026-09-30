import { useEffect, useState } from 'react';
import { tokens } from './api';
import Login from './components/Login.jsx';
import Products from './components/Products.jsx';

export default function App() {
  const [user, setUser] = useState(tokens.access ? tokens.user : null);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  return user
    ? <Products user={user} onLogout={() => setUser(null)} />
    : <Login onLogin={setUser} />;
}
