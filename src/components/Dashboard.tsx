import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Task } from '../types';
import TaskModal from './TaskModal';

const TZ = 'Europe/Minsk';

// ── Dark luxury palette ───────────────────────────────────────────────
const GOLD        = '#C9A84C';
const GOLD_BORDER = 'rgba(201,168,76,0.2)';
const GOLD_BG     = 'rgba(201,168,76,0.1)';
const BG_MAIN     = '#0A0A0A';
const BG_CARD     = '#131210';
const BG_ELEVATED = '#1C1A16';
const BG_INPUT    = '#18160F';
const BORDER      = 'rgba(255,255,255,0.07)';
const TEXT        = '#F0EBE0';
const TEXT2       = '#9A8E7A';
const TEXT3       = '#4A4438';

// ── Status / Priority helpers ─────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  new:                     { label: 'Новая',           color: GOLD },
  accepted:                { label: 'Принята',         color: '#8AAFC0' },
  in_progress:             { label: 'В работе',        color: '#8AAFC0' },
  waiting_response:        { label: 'Жду ответа',      color: '#D4944A' },
  transferred:             { label: 'Передана',        color: '#A07850' },
  pending_director_review: { label: 'На проверке',     color: '#C8B460' },
  returned_for_revision:   { label: 'На доработку',    color: '#B85858' },
  completed:               { label: 'Выполнена',       color: '#5FA87A' },
  closed:                  { label: 'Закрыта',         color: '#4A7A5A' },
  postponed:               { label: 'Отложена',        color: '#706858' },
  overdue:                 { label: 'Просрочена',      color: '#B85858' },
  blocked:                 { label: 'Заблок.',         color: '#806878' },
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#B85858',
  high:   GOLD,
  medium: '#8AAFC0',
  low:    '#3E3830',
};

// ── Quick Notes (localStorage) ────────────────────────────────────────
type Note = { id: string; text: string; createdAt: string };
const NOTES_KEY = 'prokeratin_quick_notes_v1';

function loadNotes(): Note[] {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) ?? '[]') as Note[]; }
  catch { return []; }
}
function saveNotes(notes: Note[]): void {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}
function mkId(): string { return Math.random().toString(36).slice(2); }

// ── Helpers ───────────────────────────────────────────────────────────
function getMondayOfWeek(date: Date): Date {
  const localStr = date.toLocaleDateString('en-CA', { timeZone: TZ });
  const [y, m, d] = localStr.split('-').map(Number);
  const local = new Date(y, m - 1, d);
  const day = local.getDay();
  local.setDate(local.getDate() + (day === 0 ? -6 : 1 - day));
  return local;
}
function isInCurrentWeek(iso: string, monday: Date): boolean {
  const d = new Date(iso);
  const dStr = d.toLocaleDateString('en-CA', { timeZone: TZ });
  const [dy, dm, dd] = dStr.split('-').map(Number);
  const dLocal = new Date(dy, dm - 1, dd);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return dLocal >= monday && dLocal <= sunday;
}
function greeting(firstName: string): string {
  const h = parseInt(new Date().toLocaleString('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }));
  if (h < 12) return `Доброе утро, ${firstName}`;
  if (h < 18) return `Добрый день, ${firstName}`;
  return `Добрый вечер, ${firstName}`;
}
function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { timeZone: TZ, day: 'numeric', month: 'short' });
}

// ── Sub-components ────────────────────────────────────────────────────

function SectionHead({ title, count, action, onAction }: {
  title: string; count?: number; action?: string; onAction?: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 2, height: 14, borderRadius: 1,
          background: `linear-gradient(180deg, ${GOLD}, ${GOLD}50)`,
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, letterSpacing: '-0.1px' }}>{title}</span>
        {count !== undefined && count > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 600, color: GOLD,
            background: GOLD_BG, padding: '1px 7px', borderRadius: 10,
          }}>{count}</span>
        )}
      </div>
      {action && onAction && (
        <button
          onClick={onAction}
          style={{
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 11, color: TEXT2, fontFamily: 'var(--font)', padding: '2px 0',
          }}
        >
          {action} ›
        </button>
      )}
    </div>
  );
}

function DarkEmpty({ text }: { text: string }) {
  return (
    <div style={{ padding: '14px 0', textAlign: 'center', color: TEXT3, fontSize: 12 }}>
      {text}
    </div>
  );
}

function TaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  const st = STATUS_MAP[task.status] ?? { label: task.status, color: TEXT2 };
  const pcolor = PRIORITY_COLOR[task.priority] ?? TEXT3;
  const overdueFlag = new Date(task.deadline) < new Date() && !['completed', 'closed'].includes(task.status);
  const done = task.checklist && task.checklist.length > 0
    ? Math.round((task.checklist.filter(i => i.done).length / task.checklist.length) * 100)
    : null;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 11,
        padding: '11px 13px',
        background: BG_ELEVATED,
        borderRadius: 10,
        border: `1px solid ${BORDER}`,
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = GOLD_BORDER;
        (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = BORDER;
        (e.currentTarget as HTMLDivElement).style.background = BG_ELEVATED;
      }}
    >
      <div style={{ width: 3, minHeight: 32, borderRadius: 2, background: pcolor, flexShrink: 0, alignSelf: 'stretch' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 500, color: TEXT,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          marginBottom: 4,
        }}>
          {task.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10, fontWeight: 600, color: st.color,
            padding: '1px 6px', borderRadius: 4,
            background: `${st.color}18`, letterSpacing: '0.1px',
          }}>
            {st.label}
          </span>
          {task.tags && task.tags.length > 0 && (
            <span style={{ fontSize: 10, color: TEXT3 }}>#{task.tags[0]}</span>
          )}
          <span style={{ fontSize: 10, color: overdueFlag ? '#B85858' : TEXT3 }}>
            {overdueFlag ? '⚠ ' : ''}{fmtShort(task.deadline)}
          </span>
          {done !== null && (
            <span style={{ fontSize: 10, color: TEXT3 }}>☑ {done}%</span>
          )}
        </div>
      </div>
      <div style={{ color: TEXT3, fontSize: 15, flexShrink: 0 }}>›</div>
    </div>
  );
}

function IncomingRow({ task, fromName, onClick }: { task: Task; fromName: string; onClick: () => void }) {
  const initials = fromName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 13px',
        background: BG_ELEVATED,
        borderRadius: 10,
        border: `1px solid ${BORDER}`,
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = GOLD_BORDER; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = BORDER; }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: `linear-gradient(135deg, ${GOLD}60, ${GOLD}25)`,
        border: `1px solid ${GOLD_BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, color: GOLD, flexShrink: 0,
      }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 500, color: TEXT,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {task.title}
        </div>
        <div style={{ fontSize: 10, color: TEXT2, marginTop: 2 }}>
          от {fromName} · {fmtShort(task.createdAt)}
        </div>
      </div>
      <div style={{ color: TEXT3, fontSize: 15, flexShrink: 0 }}>›</div>
    </div>
  );
}

function KpiCard({ icon, value, label, highlight }: {
  icon: string; value: number | string; label: string; highlight?: boolean;
}) {
  return (
    <div style={{
      background: highlight ? GOLD_BG : BG_CARD,
      border: `1px solid ${highlight ? GOLD_BORDER : BORDER}`,
      borderRadius: 14,
      padding: '16px 14px',
      display: 'flex', flexDirection: 'column', gap: 6,
      position: 'relative', overflow: 'hidden',
    }}>
      {highlight && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
        }} />
      )}
      <div style={{ fontSize: 17, lineHeight: 1 }}>{icon}</div>
      <div style={{
        fontSize: 26, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.5px',
        color: highlight ? GOLD : TEXT,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: TEXT2, fontWeight: 500, letterSpacing: '0.1px' }}>{label}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
export default function Dashboard({
  searchQuery,
  onViewChange,
}: {
  searchQuery: string;
  onViewChange?: (v: string) => void;
}) {
  const { state } = useApp();
  const { tasks, currentUser, users, notifications } = state;
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [noteInput, setNoteInput] = useState('');

  if (!currentUser) return null;

  const now = new Date();
  const monday = getMondayOfWeek(now);
  const isDirector = currentUser.role === 'director';
  const firstName = currentUser.name.split(' ')[0];
  const initials = currentUser.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const userColor = currentUser.color ?? GOLD;
  const unreadCount = notifications.filter(n => n.userId === currentUser.id && !n.read).length;

  const myTasks = isDirector
    ? tasks
    : tasks.filter(t =>
        t.assignedTo === currentUser.id ||
        t.createdBy === currentUser.id ||
        t.transferredTo === currentUser.id
      );

  function applySearch(list: Task[]): Task[] {
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }

  // KPI counts
  const totalCount      = myTasks.length;
  const activeCount     = myTasks.filter(t => !['completed', 'closed'].includes(t.status)).length;
  const pendingReviewCount = myTasks.filter(t => t.status === 'pending_director_review').length;
  const completedCount  = myTasks.filter(t => ['completed', 'closed'].includes(t.status)).length;

  // Block 3 — My active tasks (sorted by deadline, up to 5)
  const myActiveTasks = applySearch(
    myTasks
      .filter(t => !['completed', 'closed'].includes(t.status))
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
  ).slice(0, 5);

  // Block 4 — Incoming
  const incomingTasks = applySearch(tasks.filter(t => {
    if (t.transferredTo === currentUser.id && t.status === 'transferred') return true;
    if (t.assignedTo === currentUser.id && t.status === 'new' && t.createdBy !== currentUser.id) return true;
    return false;
  })).slice(0, 4);

  // Director: also show tasks pending review
  const pendingReviewList = isDirector
    ? applySearch(tasks.filter(t => t.status === 'pending_director_review')).slice(0, 4)
    : [];

  // Block 6 — Upcoming deadlines (next 7 days) or week tasks
  const in7 = new Date(now);
  in7.setDate(in7.getDate() + 7);
  const upcomingTasks = applySearch(
    myTasks
      .filter(t => {
        const d = new Date(t.deadline);
        return d >= now && d <= in7 && !['completed', 'closed'].includes(t.status);
      })
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
  ).slice(0, 5);

  // Week progress
  const weekTasks = myTasks.filter(t =>
    isInCurrentWeek(t.plannedDate ?? t.deadline, monday) && !['completed', 'closed'].includes(t.status)
  );
  const weekDone = myTasks.filter(t =>
    ['completed', 'closed'].includes(t.status) && isInCurrentWeek(t.deadline, monday)
  ).length;
  const weekTotal = weekTasks.length + weekDone;
  const weekPct = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;

  // Overdue count for alert
  const overdueCount = myTasks.filter(t =>
    t.status === 'overdue' || (new Date(t.deadline) < now && !['completed', 'closed'].includes(t.status))
  ).length;

  // Notes handlers
  function addNote() {
    const text = noteInput.trim();
    if (!text) return;
    const updated = [{ id: mkId(), text, createdAt: new Date().toISOString() }, ...notes].slice(0, 20);
    setNotes(updated);
    saveNotes(updated);
    setNoteInput('');
  }
  function deleteNote(id: string) {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    saveNotes(updated);
  }

  // Director employee summary
  const employees = users.filter(u => u.role === 'employee');

  return (
    <div style={{ background: BG_MAIN, minHeight: '100%' }}>

      {/* ── Block 1: Hero Header ──────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(160deg, #141210 0%, #0D0C09 55%, #0A0A0A 100%)',
        borderBottom: `1px solid ${GOLD_BORDER}`,
        padding: '20px 18px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Gold shimmer line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent 0%, ${GOLD}70 50%, transparent 100%)`,
        }} />
        {/* Subtle background glow */}
        <div style={{
          position: 'absolute', top: -60, right: -40, width: 180, height: 180,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${GOLD}08 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        {/* Top row: Logo + controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '3px',
              color: TEXT3, textTransform: 'uppercase', lineHeight: 1, marginBottom: 3,
            }}>
              PROKERATIN
            </div>
            <div style={{
              fontSize: 13, fontWeight: 700, letterSpacing: '2px',
              color: GOLD, textTransform: 'uppercase', lineHeight: 1,
            }}>
              TASK HUB
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Bell */}
            <div style={{ position: 'relative' }}>
              <button style={{
                width: 36, height: 36, borderRadius: '50%',
                border: `1px solid ${GOLD_BORDER}`,
                background: 'rgba(255,255,255,0.04)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, color: TEXT2,
                transition: 'background 0.12s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = GOLD_BG; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              >
                🔔
              </button>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -2, right: -2,
                  background: GOLD, color: '#0A0A0A',
                  fontSize: 9, fontWeight: 800,
                  borderRadius: 100, padding: '1px 4px', minWidth: 14, textAlign: 'center',
                  lineHeight: '13px',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            {/* Avatar */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: `1.5px solid ${GOLD_BORDER}`,
              background: `linear-gradient(135deg, ${userColor}60, ${userColor}25)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: GOLD,
            }}>
              {initials}
            </div>
          </div>
        </div>

        {/* Greeting */}
        <div>
          <div style={{
            fontSize: 23, fontWeight: 700, color: TEXT,
            letterSpacing: '-0.5px', lineHeight: 1.2, marginBottom: 7,
          }}>
            {greeting(firstName)}
          </div>
          <div style={{ fontSize: 13, color: TEXT2, fontWeight: 400, lineHeight: 1.5 }}>
            {activeCount > 0
              ? <>
                  <span style={{ color: GOLD, fontWeight: 600 }}>{activeCount}</span> активных задач
                  {pendingReviewCount > 0 && <> · <span style={{ color: '#C8B460', fontWeight: 600 }}>{pendingReviewCount}</span> на проверке</>}
                  {overdueCount > 0 && <> · <span style={{ color: '#B85858', fontWeight: 600 }}>{overdueCount}</span> просрочено</>}
                </>
              : 'Нет активных задач — отличный день!'}
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div style={{ padding: '18px 16px 8px' }}>

        {/* ── Block 2: KPI Cards ──────────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 10, marginBottom: 18,
        }}>
          <KpiCard icon="◈" value={totalCount}        label="Всего задач"  />
          <KpiCard icon="▶" value={activeCount}        label="Активные"    highlight={activeCount > 0} />
          <KpiCard icon="◎" value={pendingReviewCount} label="На проверке" highlight={pendingReviewCount > 0} />
          <KpiCard icon="✓" value={completedCount}     label="Выполнено"   />
        </div>

        {/* ── Block 3: My Tasks ───────────────────────────────────── */}
        <div style={{
          background: BG_CARD, borderRadius: 14,
          padding: '15px 14px', border: `1px solid ${BORDER}`, marginBottom: 12,
        }}>
          <SectionHead
            title="Мои задачи"
            count={activeCount}
            action="Все"
            onAction={onViewChange ? () => onViewChange('my-tasks') : undefined}
          />
          {myActiveTasks.length === 0
            ? <DarkEmpty text="Нет активных задач" />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {myActiveTasks.map(t => (
                  <TaskRow key={t.id} task={t} onClick={() => setSelectedTask(t)} />
                ))}
              </div>
            )
          }
        </div>

        {/* ── Block 4: Incoming / Requests ────────────────────────── */}
        <div style={{
          background: BG_CARD, borderRadius: 14,
          padding: '15px 14px', border: `1px solid ${BORDER}`, marginBottom: 12,
        }}>
          <SectionHead
            title={isDirector ? 'Входящие и проверки' : 'Входящие запросы'}
            count={incomingTasks.length + pendingReviewList.length}
            action="Все"
            onAction={onViewChange ? () => onViewChange(isDirector ? 'director-review' : 'incoming') : undefined}
          />
          {incomingTasks.length === 0 && pendingReviewList.length === 0
            ? <DarkEmpty text="Нет входящих запросов" />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {incomingTasks.map(t => {
                  const fromUser = users.find(u => u.id === (t.transferredFrom ?? t.createdBy));
                  return (
                    <IncomingRow
                      key={t.id}
                      task={t}
                      fromName={fromUser?.name ?? 'Система'}
                      onClick={() => setSelectedTask(t)}
                    />
                  );
                })}
                {pendingReviewList.map(t => {
                  const fromUser = users.find(u => u.id === t.assignedTo);
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 13px',
                        background: BG_ELEVATED, borderRadius: 10,
                        border: `1px solid rgba(200,180,96,0.2)`,
                        cursor: 'pointer', transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = GOLD_BORDER; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(200,180,96,0.2)'; }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'rgba(200,180,96,0.15)', border: '1px solid rgba(200,180,96,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, color: '#C8B460', flexShrink: 0,
                      }}>◎</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.title}
                        </div>
                        <div style={{ fontSize: 10, color: TEXT2, marginTop: 2 }}>
                          Ожидает проверки · {fromUser?.name ?? '—'}
                        </div>
                      </div>
                      <div style={{ color: TEXT3, fontSize: 15, flexShrink: 0 }}>›</div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>

        {/* ── Block 5: Quick Notes ─────────────────────────────────── */}
        <div style={{
          background: BG_CARD, borderRadius: 14,
          padding: '15px 14px', border: `1px solid ${BORDER}`, marginBottom: 12,
        }}>
          <SectionHead title="Заметки" count={notes.length} />
          <div style={{ display: 'flex', gap: 8, marginBottom: notes.length > 0 ? 10 : 0 }}>
            <input
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addNote(); }}
              placeholder="Быстрая заметка..."
              style={{
                flex: 1, padding: '9px 12px',
                background: BG_INPUT,
                border: `1px solid ${BORDER}`,
                borderRadius: 9, color: TEXT, fontSize: 13,
                outline: 'none', fontFamily: 'var(--font)',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = GOLD_BORDER; }}
              onBlur={e => { e.target.style.borderColor = BORDER; }}
            />
            <button
              onClick={addNote}
              style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: noteInput.trim() ? GOLD : BG_ELEVATED,
                border: `1px solid ${noteInput.trim() ? GOLD : BORDER}`,
                cursor: 'pointer', color: noteInput.trim() ? '#0A0A0A' : TEXT3,
                fontSize: 18, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              +
            </button>
          </div>
          {notes.length === 0
            ? <DarkEmpty text="Заметок нет — напишите что-нибудь" />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {notes.slice(0, 5).map(n => (
                  <div key={n.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '9px 11px',
                    background: BG_ELEVATED, borderRadius: 9,
                    border: `1px solid ${BORDER}`,
                  }}>
                    <div style={{
                      width: 2, minHeight: 20, borderRadius: 1,
                      background: `${GOLD}50`, flexShrink: 0, alignSelf: 'stretch',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: TEXT, lineHeight: 1.55 }}>{n.text}</div>
                      <div style={{ fontSize: 10, color: TEXT3, marginTop: 3 }}>
                        {new Date(n.createdAt).toLocaleDateString('ru-RU', {
                          timeZone: TZ, day: 'numeric', month: 'short',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteNote(n.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: TEXT3, fontSize: 13, padding: '1px 3px',
                        flexShrink: 0, lineHeight: 1, fontFamily: 'var(--font)',
                        transition: 'color 0.12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#B85858'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = TEXT3; }}
                      title="Удалить"
                    >✕</button>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* ── Block 6: Upcoming Deadlines + Week Progress ──────────── */}
        <div style={{
          background: BG_CARD, borderRadius: 14,
          padding: '15px 14px', border: `1px solid ${BORDER}`, marginBottom: 12,
        }}>
          {/* Week progress bar */}
          <SectionHead title="Ближайшие дедлайны" count={upcomingTasks.length} />
          {weekTotal > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: TEXT2 }}>Прогресс недели</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: weekPct >= 70 ? '#5FA87A' : weekPct >= 40 ? '#D4944A' : TEXT2 }}>
                  {weekPct}%
                </div>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  width: `${weekPct}%`,
                  background: weekPct >= 70
                    ? 'linear-gradient(90deg, #4A8A60, #5FA87A)'
                    : weekPct >= 40
                    ? `linear-gradient(90deg, #B07830, ${GOLD})`
                    : `linear-gradient(90deg, ${GOLD}80, ${GOLD})`,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <div style={{ fontSize: 10, color: TEXT3 }}>
                {weekDone} из {weekTotal} задач выполнено
              </div>
            </div>
          )}

          {upcomingTasks.length === 0
            ? <DarkEmpty text="Нет задач в ближайшие 7 дней" />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {upcomingTasks.map(t => {
                  const msLeft = new Date(t.deadline).getTime() - now.getTime();
                  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
                  const st = STATUS_MAP[t.status] ?? { label: t.status, color: TEXT2 };
                  const pcolor = PRIORITY_COLOR[t.priority] ?? TEXT3;
                  const urgent = daysLeft <= 1;
                  const soon = daysLeft <= 3;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 11,
                        padding: '10px 13px',
                        background: BG_ELEVATED, borderRadius: 10,
                        border: `1px solid ${urgent ? 'rgba(184,88,88,0.3)' : BORDER}`,
                        cursor: 'pointer', transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = GOLD_BORDER; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = urgent ? 'rgba(184,88,88,0.3)' : BORDER; }}
                    >
                      <div style={{ width: 3, minHeight: 28, borderRadius: 2, background: pcolor, flexShrink: 0, alignSelf: 'stretch' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 12.5, fontWeight: 500, color: TEXT,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {t.title}
                        </div>
                        <div style={{ fontSize: 10, color: st.color, marginTop: 2 }}>{st.label}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontSize: 11, fontWeight: 600,
                          color: urgent ? '#B85858' : soon ? '#D4944A' : TEXT2,
                        }}>
                          {fmtShort(t.deadline)}
                        </div>
                        <div style={{ fontSize: 10, color: urgent ? '#B85858' : TEXT3 }}>
                          {daysLeft === 0 ? 'Сегодня' : daysLeft === 1 ? 'Завтра' : `${daysLeft} дн.`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>

        {/* ── Director: Team Overview ──────────────────────────────── */}
        {isDirector && employees.length > 0 && (
          <div style={{
            background: BG_CARD, borderRadius: 14,
            padding: '15px 14px', border: `1px solid ${BORDER}`, marginBottom: 12,
          }}>
            <SectionHead title="Команда" count={employees.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {employees.map(emp => {
                const empTasks = tasks.filter(t => t.assignedTo === emp.id);
                const empActive = empTasks.filter(t => !['closed', 'completed'].includes(t.status));
                const empCompleted = empTasks.filter(t => ['completed', 'closed'].includes(t.status)).length;
                const empOverdue = empActive.filter(t =>
                  t.status === 'overdue' || (new Date(t.deadline) < now && !['completed', 'closed'].includes(t.status))
                ).length;
                const empPending = empActive.filter(t => t.status === 'pending_director_review').length;
                const empEff = empTasks.length > 0 ? Math.round((empCompleted / empTasks.length) * 100) : 0;
                const empColor = emp.color ?? GOLD;
                const empInitials = emp.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div key={emp.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 13px',
                    background: BG_ELEVATED, borderRadius: 10, border: `1px solid ${BORDER}`,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: `linear-gradient(135deg, ${empColor}70, ${empColor}30)`,
                      border: `1px solid ${empColor}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: empColor,
                    }}>
                      {empInitials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: TEXT, letterSpacing: '-0.1px' }}>{emp.name}</div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: empEff >= 70 ? '#5FA87A' : empEff >= 40 ? '#D4944A' : TEXT2 }}>
                          {empEff}%
                        </div>
                      </div>
                      <div style={{ height: 3, background: BORDER, borderRadius: 2, overflow: 'hidden', marginBottom: 5 }}>
                        <div style={{
                          height: '100%', borderRadius: 2,
                          width: `${empEff}%`,
                          background: empEff >= 70 ? '#5FA87A' : empEff >= 40 ? '#D4944A' : TEXT3,
                          transition: 'width 0.4s',
                        }} />
                      </div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, color: TEXT3 }}>{empActive.length} активных</span>
                        {empOverdue > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#B85858', background: 'rgba(184,88,88,0.12)', padding: '0 5px', borderRadius: 4 }}>
                            ⚠ {empOverdue} просроч.
                          </span>
                        )}
                        {empPending > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#C8B460', background: 'rgba(200,180,96,0.12)', padding: '0 5px', borderRadius: 4 }}>
                            ◎ {empPending} проверка
                          </span>
                        )}
                        {empOverdue === 0 && empPending === 0 && (
                          <span style={{ fontSize: 10, color: '#5FA87A' }}>✓ Всё ок</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>{/* end main content */}

      {selectedTask && (
        <TaskModal
          task={state.tasks.find(t => t.id === selectedTask.id) ?? selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
