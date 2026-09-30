import { useState } from 'react';
import { authApi, tokens, errorMessage } from '../api';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState({ text: '', ok: false });
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErrors({}); setNotice({ text: '', ok: false });
    try {
      if (mode === 'register') {
        await authApi.register(form);
        setMode('login');
        setNotice({ text: 'Account created. Log in with your new username.', ok: true });
        setForm({ ...form, password: '' });
      } else {
        const { data } = await authApi.login(form.username, form.password);
        tokens.save(data);
        onLogin(data.user);
      }
    } catch (err) {
      setErrors(err.response?.data?.errors || {});
      setNotice({ text: errorMessage(err), ok: false });
    } finally {
      setBusy(false);
    }
  }

  const isLogin = mode === 'login';

  return (
    <main className="auth">
      <section className="auth-card">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">▣</span>
          <span>Stockroom</span>
        </div>
        <h1>{isLogin ? 'Log in to manage products' : 'Create an account'}</h1>

        {notice.text && <p className={`notice ${notice.ok ? '' : 'is-error'}`} role="alert">{notice.text}</p>}

        <form onSubmit={submit} noValidate>
          <label>
            {isLogin ? 'Username or email' : 'Username'}
            <input value={form.username} onChange={set('username')} autoComplete="username" required />
            {errors.username && <small className="field-error">{errors.username}</small>}
          </label>

          {!isLogin && (
            <label>
              Email
              <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
              {errors.email && <small className="field-error">{errors.email}</small>}
            </label>
          )}

          <label>
            Password
            <input type="password" value={form.password} onChange={set('password')}
              autoComplete={isLogin ? 'current-password' : 'new-password'} required />
            {errors.password && <small className="field-error">{errors.password}</small>}
          </label>

          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}
          </button>
        </form>

        <p className="switch">
          {isLogin ? 'No account yet?' : 'Already registered?'}{' '}
          <button type="button" className="link" onClick={() => { setMode(isLogin ? 'register' : 'login'); setErrors({}); setNotice({ text: '', ok: false }); }}>
            {isLogin ? 'Create one' : 'Log in instead'}
          </button>
        </p>
      </section>
    </main>
  );
}
