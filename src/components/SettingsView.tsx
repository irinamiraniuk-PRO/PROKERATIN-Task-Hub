import { useApp } from '../context/AppContext';

export default function SettingsView() {
  const { state } = useApp();
  const { currentUser } = state;
  if (!currentUser) return null;

  return (
    <div style={{ padding: '28px 28px', maxWidth: 700 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#111' }}>⚙️ Настройки</h1>
        <div style={{ fontSize: 13, color: '#888' }}>Управление учётной записью и параметрами приложения</div>
      </div>

      {/* Profile */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', border: '1px solid #EBEBEB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 16 }}>👤 Профиль</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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

      {/* App settings info */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', border: '1px solid #EBEBEB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 16 }}>🌍 Часовой пояс и локаль</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
          {state.users.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: u.id === currentUser.id ? '#FFF0F7' : '#FAFAF8', border: `1px solid ${u.id === currentUser.id ? '#FBCFE8' : '#EBEBEB'}` }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${u.color ?? '#BE185D'}, ${(u.color ?? '#BE185D')}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {u.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{u.name} {u.id === currentUser.id ? '(Вы)' : ''}</div>
                <div style={{ fontSize: 11, color: '#888' }}>@{u.login} • {u.role === 'director' ? 'Директор' : 'Сотрудник'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
