import { useState } from 'react';
import type React from 'react';
import { useApp } from '../context/AppContext';
import { KB_SECTIONS, type KBArticle, type KBSection } from '../data/knowledgeBase';
import type { UserKBArticle } from '../types';

const ARTICLE_TYPE_LABELS: Record<KBArticle['type'], string> = {
  regulation: 'Регламент',
  instruction: 'Инструкция',
  template: 'Шаблон',
  checklist: 'Чек-лист',
  rules: 'Правила',
  link: 'Ссылка',
};

const ARTICLE_TYPE_COLORS: Record<KBArticle['type'], { bg: string; text: string }> = {
  regulation: { bg: '#DBEAFE', text: '#1E40AF' },
  instruction: { bg: '#D1FAE5', text: '#065F46' },
  template: { bg: '#FEF3C7', text: '#92400E' },
  checklist: { bg: '#EDE9FE', text: '#5B21B6' },
  rules: { bg: '#FCE7F3', text: '#9D174D' },
  link: { bg: '#F0FDF4', text: '#166534' },
};

const ARTICLE_TYPE_ICON: Record<KBArticle['type'], string> = {
  regulation: '📋', instruction: '📖', template: '📝',
  checklist: '✅', rules: '📏', link: '🔗',
};

interface UserArticleFormProps {
  initial?: UserKBArticle;
  onSave: (data: Omit<UserKBArticle, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

function UserArticleForm({ initial, onSave, onCancel }: UserArticleFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [type, setType] = useState<UserKBArticle['type']>(initial?.type ?? 'instruction');
  const [url, setUrl] = useState(initial?.url ?? '');

  function handleSave() {
    if (!title.trim()) return;
    onSave({ title: title.trim(), content, type, url: url.trim() || undefined });
  }

  return (
    <div style={{
      background: '#fff', border: '1.5px solid #EEECEA', borderRadius: 14, padding: '20px 22px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#111', marginBottom: 14 }}>
        {initial ? '✏️ Редактировать статью' : '+ Новая статья'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Заголовок *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Название статьи..."
            autoFocus
            style={{
              width: '100%', marginTop: 6, padding: '9px 12px', border: '1.5px solid #EEECEA',
              borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'var(--font)',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Тип</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as UserKBArticle['type'])}
            style={{
              width: '100%', marginTop: 6, padding: '9px 12px', border: '1.5px solid #EEECEA',
              borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'var(--font)',
              background: '#fff', cursor: 'pointer',
            }}
          >
            {(Object.keys(ARTICLE_TYPE_LABELS) as UserKBArticle['type'][]).map(t => (
              <option key={t} value={t}>{ARTICLE_TYPE_ICON[t]} {ARTICLE_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        {type === 'link' && (
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>URL</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://..."
              style={{
                width: '100%', marginTop: 6, padding: '9px 12px', border: '1.5px solid #EEECEA',
                borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'var(--font)',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Содержимое</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Опишите здесь регламент, инструкцию или шаблон... Поддерживается Markdown: # заголовок, ## подзаголовок, - пункт"
            style={{
              width: '100%', marginTop: 6, padding: '9px 12px', border: '1.5px solid #EEECEA',
              borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'var(--font)',
              minHeight: 180, resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1.5px solid #EEECEA',
              background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#666',
              fontFamily: 'var(--font)',
            }}
          >Отмена</button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: title.trim() ? '#1A1A1A' : '#E0E0E0',
              color: title.trim() ? '#fff' : '#999',
              fontSize: 13, fontWeight: 600, cursor: title.trim() ? 'pointer' : 'default',
              fontFamily: 'var(--font)',
            }}
          >💾 Сохранить</button>
        </div>
      </div>
    </div>
  );
}

export default function KnowledgeBase() {
  const { state, addUserKBArticle, updateUserKBArticle, deleteUserKBArticle } = useApp();
  const { currentUser, userKBArticles } = state;
  const userColor = currentUser?.color ?? '#BE185D';

  const [selectedSection, setSelectedSection] = useState<KBSection | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null);
  const [selectedUserArticle, setSelectedUserArticle] = useState<UserKBArticle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMyArticles, setShowMyArticles] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);

  const myArticles = userKBArticles.filter(a => a.userId === currentUser?.id);

  // Flatten all articles for search
  const allArticles = KB_SECTIONS.flatMap(s => s.articles.map(a => ({ ...a, sectionTitle: s.title, sectionEmoji: s.emoji })));
  const searchResults = searchQuery.trim().length > 1
    ? allArticles.filter(a =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];
  const mySearchResults = searchQuery.trim().length > 1
    ? myArticles.filter(a =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  function handleBack() {
    if (selectedUserArticle) { setSelectedUserArticle(null); return; }
    if (selectedArticle) { setSelectedArticle(null); return; }
    if (selectedSection) { setSelectedSection(null); return; }
    if (showMyArticles) { setShowMyArticles(false); }
  }

  const isDeep = !!(selectedSection || selectedArticle || selectedUserArticle || showMyArticles);

  // Render article content with basic markdown-like formatting
  function renderContent(text: string) {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('# ')) return <h2 key={i} style={{ fontSize: 20, fontWeight: 800, color: '#111', margin: '0 0 12px', lineHeight: 1.3 }}>{line.slice(2)}</h2>;
      if (line.startsWith('## ')) return <h3 key={i} style={{ fontSize: 16, fontWeight: 700, color: '#222', margin: '18px 0 8px', lineHeight: 1.3 }}>{line.slice(3)}</h3>;
      if (line.startsWith('### ')) return <h4 key={i} style={{ fontSize: 14, fontWeight: 700, color: '#333', margin: '14px 0 6px' }}>{line.slice(4)}</h4>;
      if (line.startsWith('- [ ] ')) return (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 16, height: 16, borderRadius: 4, border: '2px solid #DDD', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#333' }}>{line.slice(6)}</span>
        </div>
      );
      if (line.startsWith('- ')) return <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}><span style={{ color: userColor, fontWeight: 700, flexShrink: 0 }}>•</span><span style={{ fontSize: 13, color: '#333', lineHeight: 1.5 }}>{formatInline(line.slice(2))}</span></div>;
      if (/^\d+\. /.test(line)) {
        const num = line.match(/^(\d+)\. /)?.[1] ?? '';
        return <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}><span style={{ color: userColor, fontWeight: 700, fontSize: 13, flexShrink: 0, minWidth: 18 }}>{num}.</span><span style={{ fontSize: 13, color: '#333', lineHeight: 1.5 }}>{formatInline(line.slice(num.length + 2))}</span></div>;
      }
      if (line.trim() === '') return <div key={i} style={{ height: 8 }} />;
      return <p key={i} style={{ fontSize: 13, color: '#333', lineHeight: 1.6, margin: '0 0 6px' }}>{formatInline(line)}</p>;
    });
  }

  function formatInline(text: string): React.ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*|~~[^~]+~~)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      if (part.startsWith('~~') && part.endsWith('~~')) return <span key={i} style={{ textDecoration: 'line-through', color: '#888' }}>{part.slice(2, -2)}</span>;
      return <span key={i}>{part}</span>;
    });
  }

  const editingArticle = editingArticleId ? myArticles.find(a => a.id === editingArticleId) : null;

  return (
    <div style={{ padding: '20px 24px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
          {isDeep && (
            <button
              onClick={handleBack}
              style={{
                background: '#F3F4F6', border: 'none', borderRadius: 8,
                padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#555',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#E5E7EB')}
              onMouseLeave={e => (e.currentTarget.style.background = '#F3F4F6')}
            >← Назад</button>
          )}
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111' }}>
            {selectedUserArticle ? `👤 ${selectedUserArticle.title}`
              : selectedArticle ? `${selectedSection?.emoji ?? '📚'} ${selectedArticle.title}`
              : selectedSection ? `${selectedSection.emoji} ${selectedSection.title}`
              : showMyArticles ? '👤 Мои статьи'
              : '📚 База знаний'}
          </h1>
          {!isDeep && (
            <button
              onClick={() => setShowAddForm(v => !v)}
              style={{
                marginLeft: 'auto',
                padding: '7px 14px', borderRadius: 8, border: 'none',
                background: userColor, color: '#fff', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font)',
                boxShadow: `0 2px 8px ${userColor}35`,
              }}
            >+ Добавить статью</button>
          )}
        </div>
        {!isDeep && (
          <p style={{ margin: 0, fontSize: 14, color: '#888' }}>
            Регламенты, инструкции, шаблоны и правила работы команды
          </p>
        )}
      </div>

      {/* Add article form */}
      {showAddForm && !isDeep && (
        <div style={{ marginBottom: 20 }}>
          <UserArticleForm
            onSave={data => { addUserKBArticle(data); setShowAddForm(false); setShowMyArticles(true); }}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Search (only on main screen) */}
      {!selectedSection && !selectedArticle && !selectedUserArticle && !showMyArticles && (
        <div style={{ marginBottom: 20, position: 'relative' }}>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск по базе знаний..."
            style={{
              width: '100%', padding: '10px 14px 10px 40px',
              borderRadius: 10, border: '1.5px solid #E0E0E0',
              fontSize: 14, outline: 'none', boxSizing: 'border-box',
              background: '#FAFAF8',
            }}
            onFocus={e => (e.target.style.borderColor = userColor)}
            onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
          />
          <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#aaa' }}>🔍</span>
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#aaa' }}>✕</button>
          )}
        </div>
      )}

      {/* Search results */}
      {!selectedSection && !selectedArticle && !selectedUserArticle && !showMyArticles && searchQuery.trim().length > 1 && (
        <div style={{ marginBottom: 24 }}>
          {mySearchResults.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Мои статьи ({mySearchResults.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {mySearchResults.map(a => {
                  const tc = ARTICLE_TYPE_COLORS[a.type];
                  return (
                    <button key={a.id} onClick={() => setSelectedUserArticle(a)}
                      style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      <span style={{ fontSize: 20 }}>👤</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{a.title}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>Моя статья</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: tc.bg, color: tc.text }}>{ARTICLE_TYPE_LABELS[a.type]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            База знаний ({searchResults.length})
          </div>
          {searchResults.length === 0 && mySearchResults.length === 0 ? (
            <div style={{ fontSize: 14, color: '#aaa', textAlign: 'center', padding: '24px 0' }}>Ничего не найдено</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {searchResults.map(a => {
                const tc = ARTICLE_TYPE_COLORS[a.type];
                return (
                  <button key={a.id}
                    onClick={() => { const section = KB_SECTIONS.find(s => s.articles.some(art => art.id === a.id)); if (section) { setSelectedSection(section); setSelectedArticle(a); } }}
                    style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FAFAF8'; e.currentTarget.style.borderColor = userColor; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#EBEBEB'; }}
                  >
                    <span style={{ fontSize: 20 }}>{a.sectionEmoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 2 }}>{a.title}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{a.sectionTitle}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: tc.bg, color: tc.text, flexShrink: 0 }}>
                      {ARTICLE_TYPE_LABELS[a.type]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main sections grid + My Articles */}
      {!selectedSection && !selectedArticle && !selectedUserArticle && !showMyArticles && !searchQuery.trim() && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {/* My Articles tile */}
          <button
            onClick={() => setShowMyArticles(true)}
            style={{
              background: `${userColor}10`, border: `1.5px solid ${userColor}40`, borderRadius: 14,
              padding: '18px 16px', cursor: 'pointer', textAlign: 'left',
              display: 'flex', flexDirection: 'column', gap: 8,
              transition: 'all 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = userColor; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = `${userColor}40`; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{ fontSize: 28 }}>👤</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: userColor }}>Мои статьи</div>
            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.4 }}>Ваши личные заметки и статьи базы знаний</div>
            <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>
              {myArticles.length} {myArticles.length === 1 ? 'статья' : myArticles.length < 5 ? 'статьи' : 'статей'}
            </div>
          </button>

          {KB_SECTIONS.map(section => (
            <button
              key={section.id}
              onClick={() => setSelectedSection(section)}
              style={{
                background: '#fff', border: '1.5px solid #EBEBEB', borderRadius: 14,
                padding: '18px 16px', cursor: 'pointer', textAlign: 'left',
                display: 'flex', flexDirection: 'column', gap: 8,
                transition: 'all 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = userColor; e.currentTarget.style.boxShadow = `0 4px 16px ${userColor}22`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#EBEBEB'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}
            >
              <div style={{ fontSize: 28 }}>{section.emoji}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{section.title}</div>
              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.4 }}>{section.description}</div>
              <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>
                {section.articles.length} {section.articles.length === 1 ? 'материал' : section.articles.length < 5 ? 'материала' : 'материалов'}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* My Articles view */}
      {showMyArticles && !selectedUserArticle && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: '#888' }}>Ваши личные статьи и заметки в базе знаний</div>
            <button
              onClick={() => setShowAddForm(v => !v)}
              style={{
                padding: '7px 14px', borderRadius: 8, border: 'none',
                background: userColor, color: '#fff', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font)',
              }}
            >+ Добавить</button>
          </div>
          {showAddForm && (
            <div style={{ marginBottom: 16 }}>
              <UserArticleForm
                onSave={data => { addUserKBArticle(data); setShowAddForm(false); }}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          )}
          {myArticles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#C0BDB9', background: '#FAFAF8', borderRadius: 12, border: '1.5px dashed #EEECEA' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📝</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#888', marginBottom: 6 }}>Нет статей</div>
              <div style={{ fontSize: 13 }}>Добавьте свою первую статью в базу знаний</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {myArticles.map(article => {
                const tc = ARTICLE_TYPE_COLORS[article.type];
                const isEditing = editingArticleId === article.id;
                if (isEditing && editingArticle) {
                  return (
                    <div key={article.id}>
                      <UserArticleForm
                        initial={editingArticle}
                        onSave={data => { updateUserKBArticle(article.id, data); setEditingArticleId(null); }}
                        onCancel={() => setEditingArticleId(null)}
                      />
                    </div>
                  );
                }
                return (
                  <div
                    key={article.id}
                    style={{ background: '#fff', border: '1.5px solid #EBEBEB', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                      {ARTICLE_TYPE_ICON[article.type]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setSelectedUserArticle(article)}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 3 }}>{article.title}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>Создана: {new Date(article.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10, background: tc.bg, color: tc.text, flexShrink: 0 }}>{ARTICLE_TYPE_LABELS[article.type]}</span>
                    <button onClick={() => setEditingArticleId(article.id)} style={{ background: 'none', border: '1px solid #EEECEA', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', fontSize: 12, color: '#666' }}>✏️</button>
                    <button onClick={() => { if (window.confirm('Удалить статью?')) deleteUserKBArticle(article.id); }} style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', fontSize: 12, color: '#EF4444' }}>🗑️</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* User article detail */}
      {selectedUserArticle && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 10, background: ARTICLE_TYPE_COLORS[selectedUserArticle.type].bg, color: ARTICLE_TYPE_COLORS[selectedUserArticle.type].text }}>
              {ARTICLE_TYPE_LABELS[selectedUserArticle.type]}
            </span>
            <span style={{ fontSize: 12, color: '#888', padding: '4px 0' }}>
              Создана: {new Date(selectedUserArticle.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button onClick={() => setEditingArticleId(selectedUserArticle.id)} style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #EEECEA', background: '#fff', cursor: 'pointer', fontSize: 12 }}>✏️ Редактировать</button>
              <button onClick={() => { if (window.confirm('Удалить?')) { deleteUserKBArticle(selectedUserArticle.id); setSelectedUserArticle(null); } }} style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #FECACA', background: '#FEF2F2', cursor: 'pointer', fontSize: 12, color: '#EF4444' }}>🗑️</button>
            </div>
          </div>
          {editingArticleId === selectedUserArticle.id && editingArticle ? (
            <UserArticleForm
              initial={editingArticle}
              onSave={data => { updateUserKBArticle(selectedUserArticle.id, data); setEditingArticleId(null); setSelectedUserArticle({ ...selectedUserArticle, ...data }); }}
              onCancel={() => setEditingArticleId(null)}
            />
          ) : (
            <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #EBEBEB', padding: '24px 28px', lineHeight: 1.6 }}>
              {selectedUserArticle.url && (
                <div style={{ marginBottom: 16 }}>
                  <a href={selectedUserArticle.url} target="_blank" rel="noopener noreferrer" style={{ color: userColor, fontWeight: 600, fontSize: 14 }}>
                    🔗 {selectedUserArticle.url}
                  </a>
                </div>
              )}
              {selectedUserArticle.content
                ? renderContent(selectedUserArticle.content)
                : <div style={{ color: '#aaa', fontStyle: 'italic' }}>Нет содержимого</div>
              }
            </div>
          )}
        </div>
      )}

      {/* Section articles list */}
      {selectedSection && !selectedArticle && (
        <div>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>{selectedSection.description}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {selectedSection.articles.map(article => {
              const tc = ARTICLE_TYPE_COLORS[article.type];
              return (
                <button
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  style={{ background: '#fff', border: '1.5px solid #EBEBEB', borderRadius: 12, padding: '14px 18px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = userColor; e.currentTarget.style.background = '#FAFAF8'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#EBEBEB'; e.currentTarget.style.background = '#fff'; }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {ARTICLE_TYPE_ICON[article.type]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 3 }}>{article.title}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>Обновлено: {new Date(article.updatedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10, background: tc.bg, color: tc.text, flexShrink: 0 }}>{ARTICLE_TYPE_LABELS[article.type]}</span>
                  <span style={{ fontSize: 16, color: '#ccc', flexShrink: 0 }}>›</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Shared article detail */}
      {selectedArticle && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {(() => {
              const tc = ARTICLE_TYPE_COLORS[selectedArticle.type];
              return (
                <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 10, background: tc.bg, color: tc.text }}>
                  {ARTICLE_TYPE_LABELS[selectedArticle.type]}
                </span>
              );
            })()}
            <span style={{ fontSize: 12, color: '#888', padding: '4px 0' }}>
              Обновлено: {new Date(selectedArticle.updatedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          </div>
          <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #EBEBEB', padding: '24px 28px', lineHeight: 1.6 }}>
            {renderContent(selectedArticle.content)}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button
              onClick={() => navigator.clipboard.writeText(selectedArticle.content)}
              style={{ padding: '9px 16px', borderRadius: 8, border: '1.5px solid #E0E0E0', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F5F5F5')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
            >📋 Скопировать</button>
          </div>
        </div>
      )}
    </div>
  );
}
