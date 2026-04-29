import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Task } from '../types';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';

export default function DirectorDashboard({ searchQuery }: { searchQuery: string }) {
  const { state } = useApp();
  const { tasks, users } = state;
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const employees = users.filter(u => u.role === 'employee');

  const reviewTasks = tasks.filter(t => t.status === 'pending_director_review');
  const highPriorityActiveTasks = tasks.filter(t =>
    ['urgent', 'high'].includes(t.priority) && !['completed', 'closed'].includes(t.status)
  );
  const overdueTasks = tasks.filter(t => t.status === 'overdue');

  const filteredReview = reviewTasks.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.title.toLowerCase().includes(q);
  });

  const filteredHigh = highPriorityActiveTasks.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.title.toLowerCase().includes(q);
  });

  function userStats(userId: string) {
    const userTasks = tasks.filter(t => t.assignedTo === userId);
    const completed = userTasks.filter(t => ['completed', 'closed'].includes(t.status)).length;
    const total = userTasks.length;
    const eff = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      total,
      new: userTasks.filter(t => t.status === 'new').length,
      inProgress: userTasks.filter(t => t.status === 'in_progress').length,
      overdue: userTasks.filter(t => t.status === 'overdue').length,
      pendingReview: userTasks.filter(t => t.status === 'pending_director_review').length,
      returned: userTasks.filter(t => t.status === 'returned_for_revision').length,
      completed,
      efficiency: eff,
    };
  }

  return (
    <div style={{ padding: '28px 28px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#111' }}>👥 Команда и аналитика</h1>
        <div style={{ fontSize: 13, color: '#888' }}>Обзор всех задач и статистика по сотрудникам</div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Всего задач', value: tasks.length, color: '#4A90D9' },
          { label: 'На проверке', value: reviewTasks.length, color: '#D97706' },
          { label: 'В работе', value: tasks.filter(t => t.status === 'in_progress').length, color: '#7C3AED' },
          { label: 'Просрочено', value: overdueTasks.length, color: '#EF4444' },
          { label: 'Выполнено', value: tasks.filter(t => ['completed', 'closed'].includes(t.status)).length, color: '#059669' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', border: '1px solid #EBEBEB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Employee table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 28, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #F0F0F0' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>📈 Статистика по сотрудникам</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#FAFAF8' }}>
                {['Сотрудник', 'Всего', 'Новые', 'В работе', 'На проверке', 'Просрочено', 'Выполнено', 'Эффективность'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#666', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, i) => {
                const s = userStats(emp.id);
                return (
                  <tr key={emp.id} style={{ borderTop: '1px solid #F5F5F5', background: i % 2 === 0 ? '#fff' : '#FAFAF8' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#222' }}>{emp.name}</td>
                    <td style={{ padding: '12px 16px', color: '#555' }}>{s.total}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#E8F0FE', color: '#3B5BDB', borderRadius: 5, padding: '2px 7px', fontSize: 12, fontWeight: 600 }}>{s.new}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#DBEAFE', color: '#1D4ED8', borderRadius: 5, padding: '2px 7px', fontSize: 12, fontWeight: 600 }}>{s.inProgress}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {s.pendingReview > 0
                        ? <span style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 5, padding: '2px 7px', fontSize: 12, fontWeight: 600 }}>{s.pendingReview}</span>
                        : <span style={{ color: '#aaa' }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {s.overdue > 0
                        ? <span style={{ background: '#FEE2E2', color: '#B91C1C', borderRadius: 5, padding: '2px 7px', fontSize: 12, fontWeight: 600 }}>{s.overdue}</span>
                        : <span style={{ color: '#aaa' }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#D1FAE5', color: '#065F46', borderRadius: 5, padding: '2px 7px', fontSize: 12, fontWeight: 600 }}>{s.completed}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#F0F0F0', borderRadius: 3, minWidth: 60 }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${s.efficiency}%`,
                            background: s.efficiency >= 70 ? '#10B981' : s.efficiency >= 40 ? '#F59E0B' : '#EF4444',
                          }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#555', minWidth: 32 }}>{s.efficiency}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Review queue */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', border: '1px solid #EBEBEB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 14 }}>
            🔍 На проверке
            {filteredReview.length > 0 && (
              <span style={{ marginLeft: 8, background: '#FEF3C7', color: '#B45309', borderRadius: 10, fontSize: 11, padding: '2px 7px', fontWeight: 600 }}>
                {filteredReview.length}
              </span>
            )}
          </div>
          {filteredReview.length === 0 ? (
            <div style={{ fontSize: 13, color: '#aaa' }}>Нет задач на проверке</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredReview.map(t => <TaskCard key={t.id} task={t} onClick={setSelectedTask} />)}
            </div>
          )}
        </div>

        {/* High priority */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', border: '1px solid #EBEBEB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 14 }}>
            ⚡ Высокий приоритет
            {filteredHigh.length > 0 && (
              <span style={{ marginLeft: 8, background: '#FEE2E2', color: '#B91C1C', borderRadius: 10, fontSize: 11, padding: '2px 7px', fontWeight: 600 }}>
                {filteredHigh.length}
              </span>
            )}
          </div>
          {filteredHigh.length === 0 ? (
            <div style={{ fontSize: 13, color: '#aaa' }}>Нет срочных задач</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredHigh.slice(0, 6).map(t => <TaskCard key={t.id} task={t} onClick={setSelectedTask} />)}
            </div>
          )}
        </div>
      </div>

      {selectedTask && (
        <TaskModal
          task={state.tasks.find(t => t.id === selectedTask.id) ?? selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
