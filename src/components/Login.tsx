import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/useApp';
import type { User } from '../types';
import BrandLogo from './BrandLogo';

const FALLBACK_LOGIN_USERS: User[] = [
  { id: 'irina', name: 'Ирина Миранюк', login: 'irina', role: 'director', color: '#BE185D' },
  { id: 'ulyana', name: 'Ульяна', login: 'ulyana', role: 'employee', color: '#0891B2' },
  { id: 'natali', name: 'Натали', login: 'natali', role: 'employee', color: '#EA580C' },
  { id: 'marina', name: 'Марина', login: 'marina', role: 'employee', color: '#16A34A' },
];

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

/* ── WelcomeOverlay ──────────────────────────────── */
function WelcomeOverlay({ user, leaving }: { user: User; leaving: boolean }) {
  const color = user.color ?? '#BE185D';
  const firstName = user.name.split(' ')[0];
  const isDirector = user.role === 'director';

  const subtitle = isDirector
    ? 'Открываем панель управления командой…'
    : 'Загружаем твой рабочий день…';

  return (
    <div
      className={leaving ? 'welcome-overlay-leave' : 'welcome-overlay-enter'}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        overflow: 'hidden',
      }}
    >
      {/* Radial ambient glow */}
      <div style={{
        position: 'absolute',
        width: 480,
        height: 480,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${hexAlpha(color, 0.18)} 0%, transparent 70%)`,
        animation: 'welcomeGlowPulse 2.4s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Thin progress line at top */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 3,
        background: `linear-gradient(90deg, ${color}, ${hexAlpha(color, 0.4)})`,
        transformOrigin: 'left center',
        animation: 'progressLine 1.45s cubic-bezier(0.4,0,0.2,1) both',
        className: 'welcome-progress',
      } as React.CSSProperties} />

      {/* Content card */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Avatar */}
        <div
          className="welcome-avatar-anim"
          style={{
            width: 108,
            height: 108,
            borderRadius: '50%',
            overflow: 'hidden',
            background: `linear-gradient(135deg, ${color}, ${hexAlpha(color, 0.6)})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: '-1px',
            boxShadow: `0 0 0 10px ${hexAlpha(color, 0.1)}, 0 20px 60px ${hexAlpha(color, 0.45)}`,
            animation: 'welcomeAvatarIn 0.55s cubic-bezier(0.34,1.56,0.64,1) 0s both',
            marginBottom: 22,
            flexShrink: 0,
          }}
        >
          {user.avatar
            ? <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials(user.name)
          }
        </div>

        {/* "Добро пожаловать" */}
        <div
          className="welcome-text-anim"
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#ADADAD',
            letterSpacing: '0.1px',
            animation: 'welcomeTextIn 0.4s ease 0.28s both',
            marginBottom: 4,
          }}
        >
          Добро пожаловать
        </div>

        {/* Name */}
        <div
          className="welcome-text-anim"
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: '#1A1A1A',
            letterSpacing: '-1px',
            lineHeight: 1.15,
            animation: 'welcomeTextIn 0.45s cubic-bezier(0.16,1,0.3,1) 0.36s both',
            marginBottom: 14,
          }}
        >
          {firstName} {isDirector && <span style={{ color }}>✦</span>}
        </div>

        {/* Subtitle */}
        <div
          className="welcome-text-anim"
          style={{
            fontSize: 14,
            color: '#888',
            fontWeight: 500,
            maxWidth: 280,
            lineHeight: 1.5,
            animation: 'welcomeTextIn 0.4s ease 0.54s both',
            marginBottom: 28,
          }}
        >
          {subtitle}
        </div>

        {/* Loading dots */}
        <div
          className="welcome-text-anim"
          style={{
            display: 'flex',
            gap: 8,
            animation: 'welcomeTextIn 0.3s ease 0.7s both',
          }}
        >
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="welcome-dot"
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: color,
                animation: `dotBounce 1.1s ease ${i * 0.14}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── UserCard ────────────────────────────────────── */
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
        background: selected ? `linear-gradient(145deg, ${hexAlpha(color, 0.06)}, #fff)` : '#fff',
        borderRadius: 16,
        padding: '24px 20px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 9,
        border: selected ? `1.5px solid ${color}` : `1.5px solid ${hovered ? hexAlpha(color, 0.3) : '#EEECEA'}`,
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
        overflow: 'hidden',
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
        {user.avatar
          ? <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : initials(user.name)
        }
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
        {isDirector ? '👑 Директор' : user.role === 'guest' ? 'Гость' : 'Сотрудник'}
      </div>
    </div>
  );
}

/* ── main component ──────────────────────────────── */
type Phase = 'select' | 'password' | 'welcome-in' | 'welcome-out';

export default function Login() {
  const { state, login } = useApp();
  const users = state.users.length > 0 ? state.users : FALLBACK_LOGIN_USERS;

  const [phase, setPhase] = useState<Phase>('select');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [enteringUser, setEnteringUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pendingCredentialsRef = useRef<{
    login: string;
    password: string;
    profileHint: Pick<User, 'name' | 'role' | 'color'>;
  } | null>(null);

  const color = selectedUser?.color ?? '#BE185D';

  /* Kick off login after overlay fully plays */
  useEffect(() => {
    if (phase !== 'welcome-in') return;
    // t1 switches the overlay to its leave animation at 1100 ms.
    // The login call is nested inside t1's callback so it is NOT cancelled
    // when the phase state update re-renders the component (which would
    // have cleared a top-level t2 and prevented login from ever firing).
    const t1 = setTimeout(() => {
      setPhase('welcome-out');
      setTimeout(async () => {
        const pending = pendingCredentialsRef.current;
        pendingCredentialsRef.current = null;
        if (!pending) return;
        const ok = await login(pending.login, pending.password, pending.profileHint);
        if (!ok) {
          setPhase('password');
          setSubmitting(false);
          setError('Не удалось выполнить вход. Проверьте данные и попробуйте ещё раз.');
        }
      }, 450); // 450 ms after leave starts = 1550 ms total
    }, 1100);
    return () => clearTimeout(t1);
  }, [phase, login]);

  function handleSelectUser(user: User) {
    setSelectedUser(user);
    setPassword('');
    setError('');
    setPhase('password');
  }

  function handleBack() {
    setPhase('select');
    setSelectedUser(null);
    setError('');
    setPassword('');
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    pendingCredentialsRef.current = {
      login: selectedUser.login,
      password,
      profileHint: {
        name: selectedUser.name,
        role: selectedUser.role,
        color: selectedUser.color,
      },
    };
    setEnteringUser(selectedUser);
    setPhase('welcome-in');
  }

  const showOverlay = phase === 'welcome-in' || phase === 'welcome-out';

  return (
    <>
      {/* ── Welcome overlay (portal-style fixed) ── */}
      {showOverlay && enteringUser && (
        <WelcomeOverlay user={enteringUser} leaving={phase === 'welcome-out'} />
      )}

      <div style={{
        minHeight: '100vh',
        width: '100%',
        overflowX: 'hidden',
        background: 'linear-gradient(145deg, #FBF7FF 0%, #FEFEFE 50%, #F5F8FF 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font)',
        padding: 24,
      }}>
        {/* Logo */}
        <div className="anim-fade-in" style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}>
            <BrandLogo width={180} height={180} />
            <div style={{ fontSize: 12.5, color: '#ADADAD', marginTop: 5, fontWeight: 400, letterSpacing: '0.3px' }}>
              Система управления задачами
            </div>
          </div>
        </div>

        {/* ── STEP 1: User selection ── */}
        {(phase === 'select') && (
          <div className="anim-scale-in" style={{ width: '100%', maxWidth: 720 }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.3px' }}>Выберите свой профиль</div>
              <div style={{ fontSize: 13, color: '#ADADAD', marginTop: 5 }}>Нажмите на карточку, чтобы войти</div>
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

            <div style={{ textAlign: 'center', marginTop: 36, fontSize: 11, color: '#D8D5D1' }}>
              PROKERATIN Task Hub • {new Date().getFullYear()}
            </div>
          </div>
        )}

        {/* ── STEP 2: Password entry ── */}
        {(phase === 'password' || phase === 'welcome-in' || phase === 'welcome-out') && selectedUser && (
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
                overflow: 'hidden',
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
                {selectedUser.avatar
                  ? <img src={selectedUser.avatar} alt={selectedUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initials(selectedUser.name)
                }
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
              {selectedUser.role === 'guest' && (
                <div style={{
                  background: '#F3F4F6',
                  color: '#374151',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.3px',
                  padding: '3px 10px',
                  borderRadius: 20,
                }}>
                  Гость
                </div>
              )}
            </div>

            {/* Password card */}
            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: '28px 24px',
              boxShadow: '0 4px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
              border: '1px solid #EEECEA',
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
                    disabled={submitting}
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
                  {submitting ? 'Входим…' : 'Войти'}
                </button>
              </form>
            </div>

            {/* Back */}
            {phase === 'password' && (
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
            )}
          </div>
        )}
      </div>
    </>
  );
}
