import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import BrandLogo from './BrandLogo';

export default function SettingsView() {
  const { state, updateUserPassword, updateUserAvatar, exportState, importState } = useApp();
  const { currentUser } = state;
  if (!currentUser) return null;

  const color = currentUser.color ?? '#BE185D';
  const initials = currentUser.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ padding: '28px clamp(12px, 4vw, 28px)', maxWidth: 700, width: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#111' }}>⚙️ Настройки</h1>
        <div style={{ fontSize: 13, color: '#888' }}>Управление учётной записью и параметрами приложения</div>
      </div>

      {/* Profile */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', border: '1px solid #EBEBEB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>👤 Профиль</div>
          <BrandLogo width={120} height={36} />
        </div>
        <div className="responsive-grid-2">
          {[
            { label: 'Имя', value: currentUser.name },
            { label: 'Логин', value: currentUser.login },
            { label: 'Роль', value: currentUser.role === 'director' ? 'Директор' : 'Сотрудник' },
            { label: 'ID', value: currentUser.id },
          ].map(f => (
            <div key={f.label} style={{ background: '#FAFAF8', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{f.label}</div>
              <div style={{ fontSize: 14, color: '#111', fontWeight: 500 }}>{f.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Avatar upload */}
      <AvatarSection color={color} initials={initials} avatar={currentUser.avatar} onSave={updateUserAvatar} />

      {/* Password change */}
      <PasswordSection color={color} onSave={updateUserPassword} />

      {/* App settings info */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', border: '1px solid #EBEBEB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 16 }}>🌍 Часовой пояс и локаль</div>
        <div className="responsive-grid-2">
          {[
            { label: 'Часовой пояс', value: 'Europe/Minsk (UTC+3)' },
            { label: 'Язык', value: 'Русский' },
            { label: 'Формат даты', value: 'ДД.ММ.ГГГГ' },
            { label: 'Версия', value: 'v2.0.0' },
          ].map(f => (
            <div key={f.label} style={{ background: '#FAFAF8', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{f.label}</div>
              <div style={{ fontSize: 14, color: '#111', fontWeight: 500 }}>{f.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Users list */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', border: '1px solid #EBEBEB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 16 }}>👥 Пользователи системы</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {state.users.map(u => {
            const uInitials = u.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: u.id === currentUser.id ? '#FFF0F7' : '#FAFAF8', border: `1px solid ${u.id === currentUser.id ? '#FBCFE8' : '#EBEBEB'}` }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: `linear-gradient(135deg, ${u.color ?? '#BE185D'}, ${(u.color ?? '#BE185D')}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                  {u.avatar
                    ? <img src={u.avatar} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : uInitials
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{u.name} {u.id === currentUser.id ? '(Вы)' : ''}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>@{u.login} • {u.role === 'director' ? 'Директор' : 'Сотрудник'}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cross-device sync */}
      <SyncSection color={color} exportState={exportState} importState={importState} />
    </div>
  );
}

/* ── Avatar upload section ───────────────────────────── */
function AvatarSection({ color, initials, avatar, onSave }: {
  color: string; initials: string; avatar?: string; onSave: (dataUrl: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | undefined>(avatar);
  const [saved, setSaved] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Файл слишком большой. Максимальный размер — 2 МБ.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      setPreview(result);
      onSave(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', border: '1px solid #EBEBEB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 16 }}>🖼️ Фото профиля</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Current avatar preview */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
          background: `linear-gradient(135deg, ${color}, ${color}99)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 22, flexShrink: 0,
          boxShadow: `0 4px 14px ${color}40`,
        }}>
          {preview
            ? <img src={preview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials
          }
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: '#444', marginBottom: 10 }}>
            {preview ? 'Фото установлено. Нажмите «Изменить» для загрузки нового.' : 'Загрузите свою фотографию (JPG, PNG, до 2 МБ).'}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${color}`,
                background: color, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                transition: 'opacity 0.15s', fontFamily: 'var(--font)',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              {preview ? 'Изменить фото' : 'Загрузить фото'}
            </button>
            {preview && (
              <button
                onClick={() => { setPreview(undefined); onSave(''); }}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: '1.5px solid #EBEBEB',
                  background: '#FAFAF8', color: '#888', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s', fontFamily: 'var(--font)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = '#FECACA'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#FAFAF8'; e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#EBEBEB'; }}
              >
                Удалить
              </button>
            )}
          </div>
          {saved && (
            <div style={{ fontSize: 12, color: '#059669', marginTop: 8, fontWeight: 500 }}>✓ Фото обновлено</div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
      </div>
    </div>
  );
}

/* ── Password change section ─────────────────────────── */
function PasswordSection({ color, onSave }: { color: string; onSave: (current: string, next: string) => boolean }) {
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPwd.length < 4) { setError('Новый пароль должен быть не менее 4 символов.'); return; }
    if (newPwd !== confirmPwd) { setError('Новый пароль и подтверждение не совпадают.'); return; }
    const ok = onSave(currentPwd, newPwd);
    if (!ok) { setError('Текущий пароль введён неверно.'); return; }
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  const inputStyle = (borderOverride?: string): React.CSSProperties => ({
    width: '100%',
    padding: '10px 14px',
    border: `1.5px solid ${borderOverride ?? '#E8E8E8'}`,
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    background: '#FAFAFA',
    fontFamily: 'var(--font)',
    transition: 'border-color 0.15s',
  });

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', border: '1px solid #EBEBEB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 16 }}>🔒 Изменить пароль</div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Текущий пароль
            </label>
            <input
              type="password"
              value={currentPwd}
              onChange={e => { setCurrentPwd(e.target.value); setError(''); }}
              placeholder="Введите текущий пароль"
              style={inputStyle(error && !currentPwd ? '#FECACA' : undefined)}
              onFocus={e => { e.target.style.borderColor = color; }}
              onBlur={e => { e.target.style.borderColor = '#E8E8E8'; }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Новый пароль
            </label>
            <input
              type="password"
              value={newPwd}
              onChange={e => { setNewPwd(e.target.value); setError(''); }}
              placeholder="Введите новый пароль"
              style={inputStyle()}
              onFocus={e => { e.target.style.borderColor = color; }}
              onBlur={e => { e.target.style.borderColor = '#E8E8E8'; }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Повторите новый пароль
            </label>
            <input
              type="password"
              value={confirmPwd}
              onChange={e => { setConfirmPwd(e.target.value); setError(''); }}
              placeholder="Повторите новый пароль"
              style={inputStyle(error.includes('совпадают') ? '#FECACA' : undefined)}
              onFocus={e => { e.target.style.borderColor = color; }}
              onBlur={e => { e.target.style.borderColor = error.includes('совпадают') ? '#FECACA' : '#E8E8E8'; }}
            />
          </div>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', color: '#B91C1C', borderRadius: 8, padding: '9px 14px', fontSize: 13, marginTop: 12 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: '#ECFDF5', color: '#059669', borderRadius: 8, padding: '9px 14px', fontSize: 13, marginTop: 12, fontWeight: 500 }}>
            ✓ Пароль успешно изменён
          </div>
        )}

        <button
          type="submit"
          disabled={!currentPwd || !newPwd || !confirmPwd}
          style={{
            marginTop: 16, padding: '10px 20px', borderRadius: 8, border: 'none',
            background: (!currentPwd || !newPwd || !confirmPwd) ? '#E8E8E8' : color,
            color: (!currentPwd || !newPwd || !confirmPwd) ? '#ADADAD' : '#fff',
            fontSize: 14, fontWeight: 600, cursor: (!currentPwd || !newPwd || !confirmPwd) ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s', fontFamily: 'var(--font)',
          }}
        >
          Сохранить пароль
        </button>
      </form>
    </div>
  );
}

/* ── Cross-device sync section ───────────────────────── */
function SyncSection({ color, exportState, importState }: {
  color: string;
  exportState: () => string;
  importState: (json: string) => boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  function handleExport() {
    const json = exportState();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prokeratin-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const ok = importState(text);
      setImportStatus(ok ? 'ok' : 'error');
      setTimeout(() => setImportStatus('idle'), 4000);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const btnBase: React.CSSProperties = {
    padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', transition: 'opacity 0.15s', fontFamily: 'var(--font)',
    border: 'none',
  };

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', border: '1px solid #EBEBEB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginTop: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 6 }}>📲 Синхронизация между устройствами</div>
      <div style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.55 }}>
        Данные хранятся локально в браузере. Чтобы перенести все данные (пароль, фото, заметки, задачи) на другое устройство, экспортируйте файл резервной копии и импортируйте его на новом устройстве.
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={handleExport}
          style={{ ...btnBase, background: color, color: '#fff' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          📤 Экспорт данных
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          style={{ ...btnBase, background: '#F4F4F2', color: '#333', border: '1.5px solid #DEDAD6' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          📥 Импорт данных
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={handleImportFile} />
      </div>
      {importStatus === 'ok' && (
        <div style={{ marginTop: 12, background: '#ECFDF5', color: '#059669', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 500 }}>
          ✓ Данные успешно импортированы. Все изменения применены.
        </div>
      )}
      {importStatus === 'error' && (
        <div style={{ marginTop: 12, background: '#FEF2F2', color: '#B91C1C', borderRadius: 8, padding: '9px 14px', fontSize: 13 }}>
          Не удалось импортировать файл. Убедитесь, что это корректный файл резервной копии.
        </div>
      )}
    </div>
  );
}
