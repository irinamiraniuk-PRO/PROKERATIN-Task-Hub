import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Task } from '../types';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';

export default function PendingDirectorReview({ searchQuery }: { searchQuery: string }) {
  const { state } = useApp();
  const { tasks, currentUser } = state;
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  if (!currentUser) return null;

  const pendingTasks = tasks.filter(t =>
    t.assignedTo === currentUser.id &&
    t.status === 'pending_director_review'
  );

  const filtered = pendingTasks.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
  });

  return (
    <div style={{ padding: '28px 28px', maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#111', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 8, background: '#FEF9C3', fontSize: 18,
          }}>🔍</span>
          На проверке у директора
        </h1>
        <div style={{ fontSize: 13, color: '#888' }}>
          Задачи, которые вы отправили директору и ожидаете результата проверки
        </div>
      </div>

      {/* Info banner */}
      <div style={{
        background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12,
        padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 20 }}>⏳</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>Задачи ожидают решения директора</div>
          <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
            Директор ознакомится с результатами и либо одобрит задачу, либо вернёт на доработку с комментарием.
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: '#aaa' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#555', marginBottom: 6 }}>Нет задач на проверке</div>
          <div style={{ fontSize: 13 }}>
            {pendingTasks.length === 0
              ? 'Вы ещё не отправили задачи директору на проверку'
              : 'Нет задач по вашему запросу'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(t => {
            const sentAt = t.sentToDirectorAt
              ? new Date(t.sentToDirectorAt).toLocaleString('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : null;
            return (
              <div key={t.id} style={{ position: 'relative' }}>
                <TaskCard task={t} onClick={setSelectedTask} />
                {sentAt && (
                  <div style={{
                    position: 'absolute', top: 12, right: 50,
                    fontSize: 11, color: '#92400E', background: '#FEF3C7',
                    padding: '2px 8px', borderRadius: 5, fontWeight: 500,
                  }}>
                    Отправлено: {sentAt}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedTask && (
        <TaskModal
          task={state.tasks.find(t => t.id === selectedTask.id) ?? selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
