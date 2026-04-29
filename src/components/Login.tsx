import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { User } from '../types';

/* ── helpers ─────────────────────────────────────── */
function initials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function hexAlpha(hex: string, alpha: number) {
  // convert #RRGGBB → rgba(r,g,b,alpha)
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ── sub-components ──────────────────────────────── */
interface UserCardProps {
  user: User;
  selected: boolean;
  onClick: () => void;
}

function UserCard({ user, selected, onClick }: UserCardProps) {
  const [hovered, setHovered] = useState(false);
  const color = user.color ?? '#BE185D';
  const isDirector = user.role === 'director';

  const glowShadow = hovered || selected
    ? `0 8px 32px ${hexAlpha(color, 0.35)}, 0 2px 8px ${hexAlpha(color, 0.2)}`
    : '0 2px 12px rgba(0,0,0,0.07)';

  const scale = selected ? 'scale(1.08) translateY(-6px)' : hovered ? 'scale(1.06) translateY(-4px)' : 'scale(1)';

  return (
    <div
      className="user-card"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected ? `linear-gradient(145deg, ${hexAlpha(color, 0.08)}, #fff)` : '#fff',
        borderRadius: 20,
        padding: '28px 22px 22px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        border: selected ? `2px solid ${color}` : `2px solid ${hovered ? hexAlpha(color, 0.4) : '#EBEBEB'}`,
        boxShadow: glowShadow,
        transform: scale,
        outline: 'none',
        position: 'relative',
        minWidth: 140,
      }}
    >
      {isDirector && (
        <div style={{
          position: 'absolute',
          top: -10,
          right: -6,
          background: color,
          color: '#fff',
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          padding: '3px 8px',
          borderRadius: 20,
          boxShadow: `0 2px 8px ${hexAlpha(color, 0.4)}`,
        }}>
          Директор
        </div>
      )}

      {/* Avatar */}
      <div style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${color}, ${hexAlpha(color, 0.6)})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: 24,
        fontWeight: 800,
        letterSpacing: '-0.5px',
        boxShadow: `0 4px 16px ${hexAlpha(color, 0.4)}`,
        flexShrink: 0,
        animation: 'avatarPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>
        {initials(user.name)}
      </div>

      {/* Name */}
      <div style={{
        fontSize: 14,
        fontWeight: 700,
        color: '#111',
        textAlign: 'center',
        lineHeight: 1.3,
      }}>
        {user.name}
      </div>

      {/* Role */}
      <div style={{
        fontSize: 11,
        color: isDirector ? color : '#888',
        fontWeight: isDirector ? 700 : 500,
        background: isDirector ? hexAlpha(color, 0.1) : '#F5F5F5',
        padding: '3px 10px',
        borderRadius: 20,
      }}>
        {isDirector ? '👑 Директор' : 'Сотрудник'}
      </div>
    </div>
  );
}

/* ── main component ──────────────────────────────── */
export default function Login() {
  const { state, login } = useApp();
  const users = state.users;

  const [step, setStep] = useState<'select' | 'password'>('select');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const color = selectedUser?.color ?? '#BE185D';

  function handleSelectUser(user: User) {
    setSelectedUser(user);
    setPassword('');
    setError('');
    setStep('password');
  }

  function handleBack() {
    setStep('select');
    setSelectedUser(null);
    setError('');
    setPassword('');
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    setTimeout(() => {
      const ok = login(selectedUser.login, password);
      if (!ok) {
        setError('Неверный пароль. Попробуйте ещё раз.');
        setSubmitting(false);
      }
    }, 300);
  }

  /* Quick-fill (demo) */
  function handleQuickLogin(user: User) {
    setSubmitting(true);
    setTimeout(() => {
      login(user.login, user.password);
    }, 350);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FFF0F7 0%, #FEFBFF 55%, #F0F4FF 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      padding: 24,
    }}>
      {/* Logo */}
      <div className="anim-fade-in" style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 56,
          height: 56,
          borderRadius: 16,
          background: 'linear-gradient(135deg, #BE185D, #EC4899)',
          boxShadow: '0 6px 24px rgba(190,24,93,0.35)',
          marginBottom: 14,
        }}>
          <span style={{ fontSize: 26 }}>✦</span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.8px', color: '#111' }}>
          PROKERATIN
        </div>
        <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>
          Система управления задачами
        </div>
      </div>

      {/* ── STEP 1: User selection ── */}
      {step === 'select' && (
        <div className="anim-scale-in" style={{ width: '100%', maxWidth: 720 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#222' }}>Выберите свой профиль</div>
            <div style={{ fontSize: 13, color: '#aaa', marginTop: 5 }}>Нажмите на карточку, чтобы войти</div>
          </div>

          <div
            className="stagger"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              justifyContent: 'center',
            }}
          >
            {users.map(user => (
              <div key={user.id} className="anim-scale-in">
                <UserCard
                  user={user}
                  selected={false}
                  onClick={() => handleSelectUser(user)}
                />
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 32, fontSize: 11, color: '#ccc' }}>
            PROKERATIN Task Hub • {new Date().getFullYear()}
          </div>
        </div>
      )}

      {/* ── STEP 2: Password entry ── */}
      {step === 'password' && selectedUser && (
        <div className="anim-scale-in" style={{ width: '100%', maxWidth: 380 }}>
          {/* Selected user preview */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 28,
            gap: 10,
          }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${color}, ${hexAlpha(color, 0.6)})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 28,
              fontWeight: 800,
              boxShadow: `0 6px 24px ${hexAlpha(color, 0.4)}`,
              animation: 'avatarPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
            }}>
              {initials(selectedUser.name)}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>{selectedUser.name}</div>
            {selectedUser.role === 'director' && (
              <div style={{
                background: color,
                color: '#fff',
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                padding: '3px 12px',
                borderRadius: 20,
              }}>
                👑 Директор
              </div>
            )}
          </div>

          {/* Password card */}
          <div style={{
            background: '#fff',
            borderRadius: 20,
            padding: '32px 28px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.1)',
          }}>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#888',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Пароль
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Введите пароль"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    border: `1.5px solid ${error ? '#FECACA' : '#E8E8E8'}`,
                    borderRadius: 10,
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#FAFAFA',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.target.style.borderColor = color)}
                  onBlur={e => (e.target.style.borderColor = error ? '#FECACA' : '#E8E8E8')}
                />
              </div>

              {error && (
                <div style={{
                  background: '#FEF2F2',
                  color: '#B91C1C',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  marginBottom: 16,
                  animation: 'fadeIn 0.25s ease',
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !password}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: submitting ? hexAlpha(color, 0.6) : color,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: submitting || !password ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  letterSpacing: '0.2px',
                  boxShadow: `0 4px 16px ${hexAlpha(color, 0.3)}`,
                }}
                onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = hexAlpha(color, 0.85); }}
                onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = color; }}
              >
                {submitting ? 'Входим...' : 'Войти'}
              </button>
            </form>

            {/* Quick demo login */}
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <button
                onClick={() => handleQuickLogin(selectedUser)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: color,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: 6,
                  textDecoration: 'underline',
                  textUnderlineOffset: 2,
                }}
              >
                Войти без пароля (демо)
              </button>
            </div>
          </div>

          {/* Back */}
          <button
            onClick={handleBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              margin: '18px auto 0',
              background: 'none',
              border: 'none',
              color: '#999',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: 500,
              padding: '6px 12px',
              borderRadius: 8,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#555')}
            onMouseLeave={e => (e.currentTarget.style.color = '#999')}
          >
            ← Выбрать другой профиль
          </button>
        </div>
      )}
    </div>
  );
}
