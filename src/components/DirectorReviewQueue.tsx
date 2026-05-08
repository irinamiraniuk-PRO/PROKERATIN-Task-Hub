import { useState } from 'react';
import { useApp } from '../context/useApp';
import type { Task } from '../types';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';

export default function DirectorReviewQueue({ searchQuery }: { searchQuery: string }) {
  const { state } = useApp();
  const { tasks, users, currentUser } = state;
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  if (!currentUser || currentUser.role !== 'director') return null;

  const reviewTasks = tasks.filter(t => t.status === 'pending_director_review');

  const filtered = reviewTasks.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
  });

  // Sort by sent date descending
  const sorted = [...filtered].sort((a, b) => {
    const da = a.sentToDirectorAt ?? a.createdAt;
    const db = b.sentToDirectorAt ?? b.createdAt;
    return new Date(db).getTime() - new Date(da).getTime();
  });

  return (
    <div style={{ padding: '28px 28px', maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#111', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 8, background: '#FEF9C3', fontSize: 18,
          }}>📋</span>
          Задачи на проверке
          {reviewTasks.length > 0 && (
            <span style={{ background: '#F59E0B', color: '#fff', borderRadius: 20, fontSize: 14, fontWeight: 700, padding: '2px 10px' }}>
              {reviewTasks.length}
            </span>
          )}
        </h1>
        <div style={{ fontSize: 13, color: '#888' }}>
          Задачи, которые сотрудники выполнили и отправили вам на проверку
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12,
        padding: '14px 18px', marginBottom: 24,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1D4ED8', marginBottom: 4 }}>Как работать с задачами на проверке:</div>
        <div style={{ fontSize: 12, color: '#3B82F6', lineHeight: 1.6 }}>
          Откройте задачу → прочитайте комментарии → <strong>«Одобрить и закрыть»</strong> или <strong>«Вернуть на доработку»</strong> (с обязательным комментарием).
        </div>
      </div>

      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: '#aaa' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#555', marginBottom: 6 }}>Нет задач на проверке</div>
          <div style={{ fontSize: 13 }}>Сотрудники ещё не отправили задачи на проверку</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map(t => {
            const assignee = users.find(u => u.id === t.assignedTo);
            const sentAt = t.sentToDirectorAt
              ? new Date(t.sentToDirectorAt).toLocaleString('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : null;
            return (
              <div key={t.id}>
                {assignee && (
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4, paddingLeft: 4 }}>
                    👤 От: <strong>{assignee.name}</strong>
                    {sentAt && <span style={{ marginLeft: 8, color: '#B45309' }}>• Отправлено: {sentAt}</span>}
                  </div>
                )}
                <TaskCard task={t} onClick={setSelectedTask} />
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
