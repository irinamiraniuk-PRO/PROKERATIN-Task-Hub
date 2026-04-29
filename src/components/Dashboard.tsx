import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Task } from '../types';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '20px 22px',
      border: '1px solid #EBEBEB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard({ searchQuery }: { searchQuery: string }) {
  const { state } = useApp();
  const { tasks, currentUser } = state;
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  if (!currentUser) return null;

  const myTasks = tasks.filter(t => t.assignedTo === currentUser.id || t.createdBy === currentUser.id);
  const today = new Date().toDateString();

  const stats = {
    todayTasks: myTasks.filter(t => new Date(t.createdAt).toDateString() === today).length,
    newTasks: myTasks.filter(t => t.status === 'new').length,
    inProgress: myTasks.filter(t => t.status === 'in_progress').length,
    waiting: myTasks.filter(t => ['waiting_response', 'transferred'].includes(t.status)).length,
    completed: myTasks.filter(t => ['completed', 'closed'].includes(t.status)).length,
    overdue: myTasks.filter(t => t.status === 'overdue' || (new Date(t.deadline) < new Date() && !['completed', 'closed'].includes(t.status))).length,
  };

  const total = myTasks.length || 1;
  const efficiency = Math.round((stats.completed / total) * 100);

  const urgentTasks = myTasks
    .filter(t => !['completed', 'closed'].includes(t.status) && (t.priority === 'urgent' || t.status === 'overdue'))
    .filter(t => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    })
    .slice(0, 6);

  const recentTasks = myTasks
    .filter(t => !['completed', 'closed'].includes(t.status))
    .filter(t => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div style={{ padding: '28px 28px', maxWidth: 1000 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#111' }}>
          Добро пожаловать, {currentUser.name.split(' ')[0]}! 👋
        </h1>
        <div style={{ fontSize: 13, color: '#888' }}>
          {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard label="Сегодня" value={stats.todayTasks} sub="новых задач" color="#4A90D9" />
        <StatCard label="Новые" value={stats.newTasks} sub="ожидают принятия" color="#3B5BDB" />
        <StatCard label="В работе" value={stats.inProgress} sub="активных" color="#D97706" />
        <StatCard label="Ожидание" value={stats.waiting} sub="переданных" color="#7C3AED" />
        <StatCard label="Выполнено" value={stats.completed} sub="завершённых" color="#059669" />
        <StatCard label="Просрочено" value={stats.overdue} sub="нужно внимание" color="#EF4444" />
      </div>

      {/* Efficiency bar */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', border: '1px solid #EBEBEB', marginBottom: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>Эффективность</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: efficiency >= 70 ? '#059669' : efficiency >= 40 ? '#D97706' : '#EF4444' }}>
            {efficiency}%
          </div>
        </div>
        <div style={{ height: 8, background: '#F0F0F0', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4,
            width: `${efficiency}%`,
            background: efficiency >= 70 ? '#10B981' : efficiency >= 40 ? '#F59E0B' : '#EF4444',
            transition: 'width 0.4s ease',
          }} />
        </div>
        <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>
          {stats.completed} из {myTasks.length} задач выполнено
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Urgent */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', border: '1px solid #EBEBEB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 14 }}>🔥 Срочные и просроченные</div>
          {urgentTasks.length === 0 ? (
            <div style={{ fontSize: 13, color: '#aaa' }}>Нет срочных задач 🎉</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {urgentTasks.map(t => <TaskCard key={t.id} task={t} onClick={setSelectedTask} />)}
            </div>
          )}
        </div>

        {/* Recent */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', border: '1px solid #EBEBEB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 14 }}>🕐 Последние задачи</div>
          {recentTasks.length === 0 ? (
            <div style={{ fontSize: 13, color: '#aaa' }}>Нет активных задач</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentTasks.map(t => <TaskCard key={t.id} task={t} onClick={setSelectedTask} />)}
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
