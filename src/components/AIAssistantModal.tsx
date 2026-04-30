import { useState } from 'react';
import type { Task } from '../types';

interface AIAction {
  id: string;
  icon: string;
  label: string;
  prompt: string;
  placeholder: string;
}

const AI_ACTIONS: AIAction[] = [
  {
    id: 'clarify',
    icon: '✍️',
    label: 'Сформулировать задачу понятнее',
    prompt: 'Переформулируй задачу чётко и понятно для исполнителя.',
    placeholder: 'Переформулированная задача появится здесь...',
  },
  {
    id: 'checklist',
    icon: '✅',
    label: 'Сделать чек-лист',
    prompt: 'Составь пошаговый чек-лист для выполнения этой задачи.',
    placeholder: 'Чек-лист появится здесь...',
  },
  {
    id: 'director-comment',
    icon: '👔',
    label: 'Написать комментарий директору',
    prompt: 'Напиши профессиональный комментарий директору о статусе задачи.',
    placeholder: 'Текст комментария для директора появится здесь...',
  },
  {
    id: 'client-reply',
    icon: '📨',
    label: 'Написать ответ клиенту',
    prompt: 'Напиши вежливый и профессиональный ответ клиенту по данной задаче.',
    placeholder: 'Текст ответа клиенту появится здесь...',
  },
  {
    id: 'brief-designer',
    icon: '🎨',
    label: 'Составить ТЗ дизайнеру',
    prompt: 'Составь подробное техническое задание для дизайнера.',
    placeholder: 'ТЗ для дизайнера появится здесь...',
  },
  {
    id: 'brief-dev',
    icon: '💻',
    label: 'Составить ТЗ программисту',
    prompt: 'Составь подробное техническое задание для программиста.',
    placeholder: 'ТЗ для программиста появится здесь...',
  },
  {
    id: 'summary',
    icon: '📄',
    label: 'Сделать краткое резюме задачи',
    prompt: 'Сделай краткое резюме задачи в 3–5 предложениях.',
    placeholder: 'Резюме задачи появится здесь...',
  },
  {
    id: 'explain',
    icon: '🧑‍🏫',
    label: 'Объяснить сотруднику, что нужно сделать',
    prompt: 'Объясни сотруднику простыми словами, что именно нужно сделать по этой задаче.',
    placeholder: 'Объяснение для сотрудника появится здесь...',
  },
  {
    id: 'mailing',
    icon: '📧',
    label: 'Составить текст для рассылки',
    prompt: 'Напиши привлекательный текст для email или мессенджер-рассылки на основе этой задачи.',
    placeholder: 'Текст рассылки появится здесь...',
  },
  {
    id: 'github-prompt',
    icon: '🐙',
    label: 'Составить промпт для GitHub Copilot',
    prompt: 'Составь чёткий промпт для GitHub Copilot или другого AI-помощника по этой задаче.',
    placeholder: 'Промпт для GitHub Copilot появится здесь...',
  },
  {
    id: 'letter',
    icon: '✉️',
    label: 'Составить письмо',
    prompt: 'Напиши профессиональное деловое письмо на основе этой задачи.',
    placeholder: 'Текст письма появится здесь...',
  },
  {
    id: 'plan',
    icon: '🗓️',
    label: 'Сделать план выполнения',
    prompt: 'Составь детальный план выполнения задачи с этапами и сроками.',
    placeholder: 'План выполнения появится здесь...',
  },
];

// Prototype responses for each action
function generatePrototypeResponse(action: AIAction, task: Task): string {
  const t = task.title;
  const d = task.description;

  switch (action.id) {
    case 'clarify':
      return `**Задача:** ${t}\n\n**Что нужно сделать:**\n${d || 'Выполнить задачу согласно описанию.'}\n\n**Исполнитель должен:**\n• Ознакомиться с требованиями\n• Выполнить работу в срок\n• Отчитаться о результате`;
    case 'checklist':
      return `**Чек-лист для задачи "${t}":**\n\n☐ Ознакомиться с задачей и требованиями\n☐ Уточнить непонятные моменты\n☐ Подготовить необходимые материалы\n☐ Выполнить основную работу\n☐ Проверить результат\n☐ Написать итоговый комментарий\n☐ Отправить на проверку директору`;
    case 'director-comment':
      return `Добрый день!\n\nОтчитываюсь по задаче "${t}".\n\n${d ? `Задача: ${d}\n\n` : ''}Работа выполнена в полном объёме. Прошу ознакомиться с результатами и дать обратную связь.\n\nЕсли есть вопросы или пожелания по доработке — готов внести изменения в кратчайшие сроки.\n\nС уважением`;
    case 'client-reply':
      return `Добрый день!\n\nСпасибо за обращение.\n\nПо вашему вопросу сообщаем: ${d || 'ваш запрос принят в работу и будет выполнен в установленные сроки'}.\n\nЕсли у вас возникнут дополнительные вопросы — мы всегда готовы помочь.\n\nС уважением,\nКоманда PROKERATIN`;
    case 'brief-designer':
      return `**ТЗ для дизайнера**\n\n**Задача:** ${t}\n\n**Описание:**\n${d || 'Создать визуальный материал согласно брендбуку компании.'}\n\n**Требования:**\n• Формат: PNG/JPG, разрешение 1920×1080 (или по необходимости)\n• Цвета бренда: #BE185D, #111111, #FFFFFF\n• Стиль: современный, минималистичный\n• Текст: согласовать отдельно\n\n**Дедлайн:** указан в задаче\n**Правок:** до 2 бесплатных`;
    case 'brief-dev':
      return `**ТЗ для программиста**\n\n**Задача:** ${t}\n\n**Описание:**\n${d || 'Реализовать функциональность согласно требованиям.'}\n\n**Функциональные требования:**\n1. Ознакомиться с задачей\n2. Реализовать согласно описанию\n3. Написать тесты\n4. Создать PR с описанием изменений\n\n**Критерии приёмки:**\n• Функциональность работает корректно\n• Код задокументирован\n• Тесты проходят\n\n**Стек:** согласно проекту\n**Дедлайн:** указан в задаче`;
    case 'summary':
      return `**Резюме задачи**\n\n📌 **Название:** ${t}\n\n📝 **Суть:** ${d || 'Необходимо выполнить задачу согласно указанным требованиям.'}\n\n🎯 **Цель:** завершить работу в срок и передать директору на проверку.\n\n👤 **Исполнитель:** назначен в задаче\n📅 **Дедлайн:** указан в задаче`;
    case 'explain':
      return `Привет!\n\nТебе назначена задача: **"${t}"**\n\n**Что нужно сделать:**\n${d || 'Выполнить задачу согласно описанию.'}\n\n**Шаги:**\n1. Прочитай задачу внимательно\n2. Если что-то непонятно — спроси в комментариях\n3. Выполни работу\n4. Напиши в комментариях, что сделал\n5. Нажми "На проверку директору"\n\nЕсли возникнут вопросы — пиши в комментарии к задаче!`;
    case 'mailing':
      return `**Тема:** ${t}\n\nПривет, [Имя]!\n\n${d || 'У нас есть для тебя важная новость.'}\n\nПодробнее — по ссылке ниже 👇\n\n[Кнопка: Узнать больше]\n\nЕсли есть вопросы — ответь на это письмо или напишите нам напрямую.\n\nС уважением,\nКоманда PROKERATIN`;
    case 'github-prompt':
      return `**Промпт для GitHub Copilot:**\n\n\`\`\`\nЗадача: ${t}\n\n${d ? `Описание: ${d}\n\n` : ''}Требования:\n- Реализовать функциональность согласно описанию\n- Использовать TypeScript и React\n- Придерживаться существующего стиля кода\n- Добавить необходимые типы\n- Код должен быть чистым и понятным\n\nПожалуйста, реализуй это поэтапно, объясняя каждый шаг.\n\`\`\``;
    case 'letter':
      return `Уважаемый(ая) [получатель],\n\nПишу вам по вопросу: "${t}".\n\n${d ? d + '\n\n' : ''}Прошу вас ознакомиться с данной информацией и, при необходимости, предпринять соответствующие действия.\n\nЕсли у вас возникнут вопросы или потребуется дополнительная информация, пожалуйста, не стесняйтесь обращаться.\n\nС уважением,\n[Ваше имя]\nPROKERATIN`;
    case 'plan':
      return `**План выполнения задачи "${t}"**\n\n**Этап 1: Подготовка**\n• Изучить задачу и требования\n• Уточнить непонятные моменты\n• Подготовить материалы\n\n**Этап 2: Выполнение**\n• Приступить к основной работе\n• Фиксировать прогресс в комментариях\n• При необходимости — запросить помощь\n\n**Этап 3: Проверка**\n• Проверить результат на соответствие требованиям\n• Внести корректировки\n• Написать итоговый отчёт\n\n**Этап 4: Завершение**\n• Отправить на проверку директору\n• Ответить на вопросы при возврате\n• Закрыть задачу после одобрения`;
    default:
      return 'Текст будет сгенерирован AI-помощником...';
  }
}

interface AIAssistantModalProps {
  task: Task;
  onClose: () => void;
}

export default function AIAssistantModal({ task, onClose }: AIAssistantModalProps) {
  const [selectedAction, setSelectedAction] = useState<AIAction | null>(null);
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleSelectAction(action: AIAction) {
    setSelectedAction(action);
    setGeneratedText('');
    setCopied(false);
  }

  function handleGenerate() {
    if (!selectedAction) return;
    setIsGenerating(true);
    setGeneratedText('');
    // Simulate AI generation with a delay
    setTimeout(() => {
      setGeneratedText(generatePrototypeResponse(selectedAction, task));
      setIsGenerating(false);
    }, 1200);
  }

  function handleCopy() {
    if (!generatedText) return;
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function renderGeneratedText(text: string) {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**') && !line.slice(2, -2).includes('**')) {
        return <p key={i} style={{ margin: '0 0 6px', fontWeight: 700, color: '#111', fontSize: 14 }}>{line.slice(2, -2)}</p>;
      }
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const rendered = parts.map((p, j) => {
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={j}>{p.slice(2, -2)}</strong>;
        return <span key={j}>{p}</span>;
      });
      if (line.startsWith('☐ ')) {
        return (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'flex-start' }}>
            <div style={{ width: 15, height: 15, border: '2px solid #DDD', borderRadius: 3, flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13, color: '#333', lineHeight: 1.5 }}>{line.slice(2)}</span>
          </div>
        );
      }
      if (line.startsWith('• ')) {
        const bulletText = line.slice(2);
        const bulletParts = bulletText.split(/(\*\*[^*]+\*\*)/g);
        const bulletRendered = bulletParts.map((p, j) => {
          if (p.startsWith('**') && p.endsWith('**')) return <strong key={j}>{p.slice(2, -2)}</strong>;
          return <span key={j}>{p}</span>;
        });
        return <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3 }}><span style={{ color: '#BE185D', fontWeight: 700 }}>•</span><span style={{ fontSize: 13, color: '#333', lineHeight: 1.5, flex: 1 }}>{bulletRendered}</span></div>;
      }
      if (line.trim() === '') return <div key={i} style={{ height: 8 }} />;
      return <p key={i} style={{ margin: '0 0 4px', fontSize: 13, color: '#333', lineHeight: 1.6 }}>{rendered}</p>;
    });
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F0F0F0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'linear-gradient(135deg, #7C3AED, #BE185D)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
                }}>
                  🤖
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#111' }}>AI-помощник</div>
                  <div style={{ fontSize: 11, color: '#aaa' }}>Прототип · Без подключения AI</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                Задача: <span style={{ fontWeight: 600, color: '#333' }}>{task.title}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>✕</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Action list */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
              Выберите действие
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {AI_ACTIONS.map(action => {
                const isSelected = selectedAction?.id === action.id;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleSelectAction(action)}
                    style={{
                      padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${isSelected ? '#7C3AED' : '#E0E0E0'}`,
                      background: isSelected ? '#F5F3FF' : '#FAFAF8',
                      cursor: 'pointer', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 8,
                      transition: 'all 0.15s',
                      color: isSelected ? '#5B21B6' : '#333',
                    }}
                    onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = '#7C3AED'; e.currentTarget.style.background = '#FDFBFF'; } }}
                    onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = '#E0E0E0'; e.currentTarget.style.background = '#FAFAF8'; } }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{action.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, lineHeight: 1.3 }}>{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generate button */}
          {selectedAction && (
            <div>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: isGenerating ? '#DDD' : 'linear-gradient(135deg, #7C3AED, #BE185D)',
                  color: '#fff', fontSize: 14, fontWeight: 700, cursor: isGenerating ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, transition: 'opacity 0.15s',
                  width: '100%', justifyContent: 'center',
                }}
                onMouseEnter={e => { if (!isGenerating) e.currentTarget.style.opacity = '0.88'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                {isGenerating ? (
                  <>⏳ Генерирую...</>
                ) : (
                  <>{selectedAction.icon} {selectedAction.label}</>
                )}
              </button>
            </div>
          )}

          {/* Generated result */}
          {(generatedText || isGenerating) && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                Результат
              </div>
              <div style={{
                background: '#FAFAF8', borderRadius: 12, border: '1.5px solid #E8E8E8',
                padding: '16px 18px', minHeight: 80,
              }}>
                {isGenerating ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#888' }}>
                    <span style={{ fontSize: 18 }}>⏳</span>
                    <span style={{ fontSize: 13 }}>AI думает...</span>
                  </div>
                ) : (
                  <div>{renderGeneratedText(generatedText)}</div>
                )}
              </div>
              {!isGenerating && generatedText && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    onClick={handleCopy}
                    style={{
                      padding: '8px 16px', borderRadius: 8, border: '1.5px solid #E0E0E0',
                      background: copied ? '#F0FDF4' : '#fff',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      color: copied ? '#065F46' : '#555',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                    onMouseEnter={e => { if (!copied) e.currentTarget.style.background = '#F5F5F5'; }}
                    onMouseLeave={e => { if (!copied) e.currentTarget.style.background = '#fff'; }}
                  >
                    {copied ? '✓ Скопировано!' : '📋 Скопировать'}
                  </button>
                  <button
                    onClick={handleGenerate}
                    style={{
                      padding: '8px 16px', borderRadius: 8, border: '1.5px solid #E0E0E0',
                      background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#555',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F5F5F5')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                  >
                    🔄 Повторить
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!selectedAction && !generatedText && (
            <div style={{ textAlign: 'center', padding: '16px 0', color: '#bbb' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🤖</div>
              <div style={{ fontSize: 13 }}>Выберите действие выше, чтобы начать</div>
            </div>
          )}
        </div>

        {/* Footer note */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid #F0F0F0', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: '#bbb', textAlign: 'center' }}>
            🤖 Прототип AI-помощника · В будущем будет подключён реальный AI
          </div>
        </div>
      </div>
    </div>
  );
}
