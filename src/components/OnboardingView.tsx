import { useState } from 'react';
import { useApp } from '../context/AppContext';

interface OnboardingStep {
  id: string;
  icon: string;
  title: string;
  content: string;
  tasks?: string[];
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    icon: '👋',
    title: 'Добро пожаловать!',
    content: 'Ты присоединился к команде PROKERATIN! Этот раздел поможет тебе быстро освоиться и начать эффективно работать. Пройди все шаги — это займёт около 30 минут.',
  },
  {
    id: 'tasks-location',
    icon: '📋',
    title: 'Где смотреть задачи',
    content: 'В системе PROKERATIN Task Hub есть несколько разделов для работы с задачами:',
    tasks: [
      '📋 Мои задачи — все задачи, назначенные на тебя',
      '📥 Входящие — задачи, которые тебе передали другие сотрудники',
      '📤 Исходящие — задачи, которые ты создал или передал',
      '⏳ Жду ответ — задачи, где ты ожидаешь ответа от кого-то',
      '🔍 На проверке у директора — задачи, отправленные директору',
      '📊 Дашборд — обзор всех твоих задач',
      '⬛ Канбан-доска — задачи по колонкам статусов',
    ],
  },
  {
    id: 'accept-task',
    icon: '✅',
    title: 'Как принять задачу',
    content: 'Когда тебе назначают или передают задачу, нужно её принять:',
    tasks: [
      '1. Открой раздел "Входящие" или "Мои задачи"',
      '2. Нажми на карточку задачи, чтобы открыть её',
      '3. Нажми кнопку "✅ Принять"',
      '4. Задача перейдёт в статус "Принята"',
      '5. Когда начнёшь работу — нажми "▶️ Взять в работу"',
      '⚠️ Принимать задачу нужно в течение 30 минут после получения!',
    ],
  },
  {
    id: 'transfer-task',
    icon: '📤',
    title: 'Как передать задачу',
    content: 'Если задачу нужно выполнить другому сотруднику, её можно передать:',
    tasks: [
      '1. Открой задачу',
      '2. Нажми кнопку "📤 Передать"',
      '3. Выбери сотрудника из списка',
      '4. Нажми "Передать"',
      '5. Сотрудник получит уведомление',
      'ℹ️ Ты можешь передать задачу только если являешься исполнителем или директором',
    ],
  },
  {
    id: 'director-review',
    icon: '🔍',
    title: 'Как отправить директору на проверку',
    content: 'После выполнения задачи нужно отправить её директору на проверку:',
    tasks: [
      '1. Убедись, что задача в статусе "В работе" или "Принята"',
      '2. Открой задачу',
      '3. Нажми кнопку "🔍 На проверку директору"',
      '4. Задача перейдёт в статус "На проверке у директора"',
      '5. Директор проверит и либо одобрит, либо вернёт на доработку',
      '⚠️ Не закрывай задачи самостоятельно — это делает директор!',
    ],
  },
  {
    id: 'comments',
    icon: '💬',
    title: 'Как писать комментарии',
    content: 'Комментарии — важный инструмент коммуникации внутри задачи:',
    tasks: [
      '1. Открой задачу и перейди на вкладку "Комментарии"',
      '2. Пиши конкретно: что сделано, что нужно, что непонятно',
      '3. Используй @упоминание чтобы уведомить нужного человека',
      '   Например: "@Мария уточни пожалуйста..."',
      '4. Нажми "Отправить" или Ctrl+Enter',
      '✅ Фиксируй в комментариях все договорённости и важные моменты',
    ],
  },
  {
    id: 'close-tasks',
    icon: '✔️',
    title: 'Как закрывать задачи',
    content: 'Правила закрытия задач в системе:',
    tasks: [
      '1. Выполни задачу и проверь все пункты чек-листа',
      '2. Напиши итоговый комментарий с результатами',
      '3. Отправь на проверку директору',
      '4. Дождись одобрения — директор закроет задачу',
      '5. Если директор вернул на доработку — исправь и снова отправь',
      '❌ Нельзя закрывать задачи без выполнения!',
    ],
  },
  {
    id: 'first-tasks',
    icon: '🚀',
    title: 'Список первых задач',
    content: 'Вот что нужно сделать в первые дни работы:',
    tasks: [
      '☐ Прочитать все регламенты команды (раздел "База знаний")',
      '☐ Настроить профиль в Task Hub',
      '☐ Ознакомиться со всеми разделами системы',
      '☐ Выполнить тестовую задачу от директора',
      '☐ Написать директору о готовности приступить к работе',
      '☐ Задать все накопившиеся вопросы',
    ],
  },
  {
    id: 'rules',
    icon: '📏',
    title: 'Базовые правила работы',
    content: 'Запомни главные правила, которые обязательны для всех:',
    tasks: [
      '⏰ Принимать задачи в течение 30 минут',
      '📅 Соблюдать дедлайны (предупреждай заранее, если не успеваешь)',
      '💬 Обновлять статусы задач при изменении ситуации',
      '📝 Фиксировать всё в комментариях (не в личных сообщениях)',
      '🔍 Отправлять на проверку директору, не закрывать самостоятельно',
      '🤝 Уважительное общение с коллегами',
      '📚 При вопросах — сначала смотреть в Базу знаний',
    ],
  },
];

export default function OnboardingView() {
  const { state } = useApp();
  const { currentUser } = state;
  const userColor = currentUser?.color ?? '#BE185D';

  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const step = ONBOARDING_STEPS.find(s => s.id === activeStep) ?? null;
  const progress = completedSteps.size;
  const total = ONBOARDING_STEPS.length;
  const progressPct = Math.round((progress / total) * 100);

  function markDone(id: string) {
    setCompletedSteps(prev => new Set([...prev, id]));
    setActiveStep(null);
  }

  function findNextUncompleted(): string | null {
    const found = ONBOARDING_STEPS.find(s => !completedSteps.has(s.id));
    return found?.id ?? null;
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          {activeStep && (
            <button
              onClick={() => setActiveStep(null)}
              style={{
                background: '#F3F4F6', border: 'none', borderRadius: 8,
                padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#555',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#E5E7EB')}
              onMouseLeave={e => (e.currentTarget.style.background = '#F3F4F6')}
            >
              ← Назад
            </button>
          )}
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111' }}>
            🎓 Онбординг
          </h1>
        </div>
        {!activeStep && (
          <p style={{ margin: 0, fontSize: 14, color: '#888' }}>
            Твой план обучения — пройди все шаги, чтобы освоиться в системе
          </p>
        )}
      </div>

      {/* Welcome banner */}
      {!activeStep && completedSteps.size === 0 && (
        <div style={{
          background: `linear-gradient(135deg, ${userColor}15, ${userColor}08)`,
          border: `1.5px solid ${userColor}30`,
          borderRadius: 16, padding: '20px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{ fontSize: 48 }}>👋</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#111', marginBottom: 4 }}>
              Привет, {currentUser?.name.split(' ')[0] ?? 'коллега'}!
            </div>
            <div style={{ fontSize: 14, color: '#555', lineHeight: 1.5 }}>
              Добро пожаловать в PROKERATIN Task Hub!<br />
              Этот раздел поможет тебе быстро разобраться в системе. Пройди все шаги — это несложно и займёт около 30 минут.
            </div>
            <button
              onClick={() => setActiveStep(findNextUncompleted())}
              style={{
                marginTop: 12, padding: '9px 18px', borderRadius: 8, border: 'none',
                background: userColor, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              🚀 Начать обучение
            </button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {!activeStep && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Прогресс обучения</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: progressPct === 100 ? '#10B981' : userColor }}>
              {progress} / {total} шагов ({progressPct}%)
            </span>
          </div>
          <div style={{ height: 8, background: '#F0F0F0', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: `${progressPct}%`,
              background: progressPct === 100 ? '#10B981' : userColor,
              transition: 'width 0.4s ease',
            }} />
          </div>
          {progressPct === 100 && (
            <div style={{ marginTop: 10, padding: '10px 14px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0', fontSize: 13, color: '#065F46', fontWeight: 600 }}>
              🎉 Отлично! Ты прошёл весь онбординг. Добро пожаловать в команду!
            </div>
          )}
        </div>
      )}

      {/* Steps list */}
      {!activeStep && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ONBOARDING_STEPS.map((s, idx) => {
            const done = completedSteps.has(s.id);
            return (
              <button
                key={s.id}
                onClick={() => setActiveStep(s.id)}
                style={{
                  background: done ? '#F0FDF4' : '#fff',
                  border: `1.5px solid ${done ? '#BBF7D0' : '#EBEBEB'}`,
                  borderRadius: 12, padding: '14px 18px', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!done) { e.currentTarget.style.borderColor = userColor; e.currentTarget.style.background = '#FAFAF8'; } }}
                onMouseLeave={e => { if (!done) { e.currentTarget.style.borderColor = '#EBEBEB'; e.currentTarget.style.background = '#fff'; } }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: done ? '#10B981' : `${userColor}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: done ? 16 : 18, fontWeight: 800,
                  color: done ? '#fff' : userColor,
                }}>
                  {done ? '✓' : s.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: done ? '#065F46' : '#111' }}>
                    Шаг {idx + 1}: {s.title}
                  </div>
                  <div style={{ fontSize: 12, color: done ? '#10B981' : '#888', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {done ? 'Завершено ✓' : s.content.slice(0, 80) + '...'}
                  </div>
                </div>
                <span style={{ fontSize: 16, color: '#ccc', flexShrink: 0 }}>›</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Step detail */}
      {step && (
        <div>
          <div style={{
            background: '#fff', borderRadius: 14, border: '1.5px solid #EBEBEB',
            padding: '24px 28px', marginBottom: 16,
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{step.icon}</div>
            <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 800, color: '#111' }}>{step.title}</h2>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#555', lineHeight: 1.6 }}>{step.content}</p>
            {step.tasks && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {step.tasks.map((task, i) => {
                  const isCheckbox = task.startsWith('☐ ');
                  const isWarning = task.startsWith('⚠️') || task.startsWith('❌');
                  const isInfo = task.startsWith('ℹ️') || task.startsWith('✅') || task.startsWith('✅');
                  return (
                    <div key={i} style={{
                      padding: '10px 14px', borderRadius: 8,
                      background: isWarning ? '#FEF2F2' : isInfo ? '#F0FDF4' : '#FAFAF8',
                      border: `1px solid ${isWarning ? '#FECACA' : isInfo ? '#BBF7D0' : '#F0F0F0'}`,
                      fontSize: 13, color: isWarning ? '#B91C1C' : isInfo ? '#065F46' : '#333',
                      fontWeight: isWarning || isInfo ? 600 : 400,
                      lineHeight: 1.5,
                    }}>
                      {isCheckbox ? (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ width: 16, height: 16, borderRadius: 4, border: '2px solid #DDD', flexShrink: 0, marginTop: 1 }} />
                          <span>{task.slice(2)}</span>
                        </div>
                      ) : task}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {!completedSteps.has(step.id) && (
              <button
                onClick={() => markDone(step.id)}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: '#10B981', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                ✓ Понятно, отметить выполненным
              </button>
            )}
            {completedSteps.has(step.id) && (
              <div style={{ padding: '10px 16px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', fontSize: 13, fontWeight: 600, color: '#065F46' }}>
                ✓ Шаг выполнен
              </div>
            )}
            <button
              onClick={() => setActiveStep(null)}
              style={{
                padding: '10px 16px', borderRadius: 8, border: '1.5px solid #E0E0E0',
                background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#555',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F5F5F5')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
            >
              ← К списку шагов
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
