import { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function Login() {
  const { login } = useApp();
  const [loginVal, setLoginVal] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = login(loginVal.trim(), password);
    if (!ok) setError('Неверный логин или пароль');
    else setError('');
  };

  const credentials = [
    { role: 'Директор', login: 'director', password: 'director123' },
    { role: 'Анна Смирнова', login: 'anna', password: 'anna123' },
    { role: 'Максим Козлов', login: 'maxim', password: 'maxim123' },
    { role: 'Елена Петрова', login: 'elena', password: 'elena123' },
    { role: 'Дмитрий Волков', login: 'dmitry', password: 'dmitry123' },
  ];

  return (
    <div style={{
      minHeight: '100vh', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center', padding: 24 }}>
        {/* Login card */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: '48px 40px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          minWidth: 340, maxWidth: 380, flex: '0 0 auto',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', color: '#111' }}>
              PROKERATIN
            </div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>Система управления задачами</div>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Логин
              </label>
              <input
                type="text"
                value={loginVal}
                onChange={e => { setLoginVal(e.target.value); setError(''); }}
                placeholder="Введите логин"
                style={{
                  width: '100%', padding: '10px 14px', border: '1.5px solid #e0e0e0', borderRadius: 8,
                  fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#FAFAF8',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = '#4A90D9')}
                onBlur={e => (e.target.style.borderColor = '#e0e0e0')}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Введите пароль"
                style={{
                  width: '100%', padding: '10px 14px', border: '1.5px solid #e0e0e0', borderRadius: 8,
                  fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#FAFAF8',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = '#4A90D9')}
                onBlur={e => (e.target.style.borderColor = '#e0e0e0')}
              />
            </div>

            {error && (
              <div style={{ background: '#FEE2E2', color: '#B91C1C', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button type="submit" style={{
              width: '100%', padding: '12px', background: '#4A90D9', color: '#fff', border: 'none',
              borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#357ABD')}
              onMouseLeave={e => (e.currentTarget.style.background = '#4A90D9')}
            >
              Войти
            </button>
          </form>
        </div>

        {/* Credentials hint */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          minWidth: 300, flex: '0 0 auto',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Демо-доступ
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {credentials.map(c => (
              <button
                key={c.login}
                onClick={() => { setLoginVal(c.login); setPassword(c.password); setError(''); }}
                style={{
                  background: '#FAFAF8', border: '1.5px solid #e8e8e8', borderRadius: 8,
                  padding: '10px 14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F0F4F8'; e.currentTarget.style.borderColor = '#4A90D9'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#FAFAF8'; e.currentTarget.style.borderColor = '#e8e8e8'; }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{c.role}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{c.login} / {c.password}</div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 14 }}>
            Нажмите на карточку, чтобы заполнить форму автоматически
          </div>
        </div>
      </div>
    </div>
  );
}
