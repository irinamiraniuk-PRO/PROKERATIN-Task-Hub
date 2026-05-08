import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import type { Notification, NotificationType } from '../types';

function notifIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    new_task: '📋',
    task_transferred: '📤',
    task_returned: '↩️',
    task_closed: '🔒',
    new_comment: '💬',
    mention: '🔔',
  };
  return icons[type] ?? '🔔';
}

function notifColor(type: NotificationType): string {
  const colors: Record<NotificationType, string> = {
    new_task: '#4A90D9',
    task_transferred: '#7C3AED',
    task_returned: '#EF4444',
    task_closed: '#374151',
    new_comment: '#0891B2',
    mention: '#BE185D',
  };
  return colors[type] ?? '#888';
}

interface NotificationsPanelProps {
  onClose: () => void;
}

export default function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const { state, markNotificationRead, markAllRead } = useApp();
  const { currentUser, notifications } = state;
  const panelRef = useRef<HTMLDivElement>(null);

  const myNotifs = notifications
    .filter(n => n.userId === currentUser?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = myNotifs.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  function handleNotifClick(n: Notification) {
    if (!n.read) markNotificationRead(n.id);
  }

  return (
    <div
      ref={panelRef}
      className="notifications-panel"
      style={{
        position: 'fixed',
        top: 56,
        right: 16,
        width: 360,
        maxHeight: 520,
        background: '#fff',
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
        border: '1px solid #EBEBEB',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 200,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid #F0F0F0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>
          🔔 Уведомления {unreadCount > 0 && (
            <span style={{
              marginLeft: 6, fontSize: 11, fontWeight: 700,
              background: '#BE185D', color: '#fff',
              borderRadius: 8, padding: '2px 6px',
            }}>
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              fontSize: 11, color: '#4A90D9', background: 'none', border: 'none',
              cursor: 'pointer', fontWeight: 600, padding: '4px 8px', borderRadius: 6,
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FF')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            Прочитать все
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {myNotifs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#bbb', fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
            Уведомлений нет
          </div>
        ) : (
          myNotifs.map(n => (
            <div
              key={n.id}
              onClick={() => handleNotifClick(n)}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #F5F5F5',
                cursor: 'pointer',
                background: n.read ? '#fff' : '#FFF9FB',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = n.read ? '#FAFAF8' : '#FFF0F5')}
              onMouseLeave={e => (e.currentTarget.style.background = n.read ? '#fff' : '#FFF9FB')}
            >
              {/* Icon */}
              <div style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: `${notifColor(n.type)}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                flexShrink: 0,
              }}>
                {notifIcon(n.type)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12,
                  color: n.read ? '#333' : '#111',
                  fontWeight: n.read ? 400 : 600,
                  lineHeight: 1.4,
                  marginBottom: 3,
                }}>
                  {n.message}
                </div>
                <div style={{
                  fontSize: 11,
                  color: '#888',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {new Date(n.createdAt).toLocaleString('ru-RU', {
                    timeZone: 'Europe/Minsk',
                    day: '2-digit', month: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>

              {!n.read && (
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#BE185D', flexShrink: 0, marginTop: 4,
                }} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
