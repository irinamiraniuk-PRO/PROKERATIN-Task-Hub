import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { KB_SECTIONS, type KBArticle, type KBSection } from '../data/knowledgeBase';

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

export default function KnowledgeBase() {
  const { state } = useApp();
  const { currentUser } = state;
  const userColor = currentUser?.color ?? '#BE185D';

  const [selectedSection, setSelectedSection] = useState<KBSection | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Flatten all articles for search
  const allArticles = KB_SECTIONS.flatMap(s => s.articles.map(a => ({ ...a, sectionTitle: s.title, sectionEmoji: s.emoji })));
  const searchResults = searchQuery.trim().length > 1
    ? allArticles.filter(a =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  function handleBack() {
    if (selectedArticle) {
      setSelectedArticle(null);
    } else {
      setSelectedSection(null);
    }
  }

  // Render article content with basic markdown-like formatting
  function renderContent(text: string) {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('# ')) {
        return <h2 key={i} style={{ fontSize: 20, fontWeight: 800, color: '#111', margin: '0 0 12px', lineHeight: 1.3 }}>{line.slice(2)}</h2>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={i} style={{ fontSize: 16, fontWeight: 700, color: '#222', margin: '18px 0 8px', lineHeight: 1.3 }}>{line.slice(3)}</h3>;
      }
      if (line.startsWith('### ')) {
        return <h4 key={i} style={{ fontSize: 14, fontWeight: 700, color: '#333', margin: '14px 0 6px' }}>{line.slice(4)}</h4>;
      }
      if (line.startsWith('- [ ] ')) {
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, border: '2px solid #DDD', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#333' }}>{line.slice(6)}</span>
          </div>
        );
      }
      if (line.startsWith('- ')) {
        return <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}><span style={{ color: userColor, fontWeight: 700, flexShrink: 0 }}>•</span><span style={{ fontSize: 13, color: '#333', lineHeight: 1.5 }}>{formatInline(line.slice(2))}</span></div>;
      }
      if (/^\d+\. /.test(line)) {
        const num = line.match(/^(\d+)\. /)?.[1] ?? '';
        return (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            <span style={{ color: userColor, fontWeight: 700, fontSize: 13, flexShrink: 0, minWidth: 18 }}>{num}.</span>
            <span style={{ fontSize: 13, color: '#333', lineHeight: 1.5 }}>{formatInline(line.slice(num.length + 2))}</span>
          </div>
        );
      }
      if (line.trim() === '') {
        return <div key={i} style={{ height: 8 }} />;
      }
      return <p key={i} style={{ fontSize: 13, color: '#333', lineHeight: 1.6, margin: '0 0 6px' }}>{formatInline(line)}</p>;
    });
  }

  function formatInline(text: string): React.ReactNode {
    // Bold: **text**
    const parts = text.split(/(\*\*[^*]+\*\*|~~[^~]+~~)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('~~') && part.endsWith('~~')) {
        return <span key={i} style={{ textDecoration: 'line-through', color: '#888' }}>{part.slice(2, -2)}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          {(selectedSection || selectedArticle) && (
            <button
              onClick={handleBack}
              style={{
                background: '#F3F4F6', border: 'none', borderRadius: 8,
                padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#555',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#E5E7EB')}
              onMouseLeave={e => (e.currentTarget.style.background = '#F3F4F6')}
            >
              ← Назад
            </button>
          )}
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111' }}>
            {selectedArticle
              ? `${selectedSection?.emoji ?? '📚'} ${selectedArticle.title}`
              : selectedSection
              ? `${selectedSection.emoji} ${selectedSection.title}`
              : '📚 База знаний'}
          </h1>
        </div>
        {!selectedSection && !selectedArticle && (
          <p style={{ margin: 0, fontSize: 14, color: '#888' }}>
            Регламенты, инструкции, шаблоны и правила работы команды
          </p>
        )}
      </div>

      {/* Search (only on main screen) */}
      {!selectedSection && !selectedArticle && (
        <div style={{ marginBottom: 24, position: 'relative' }}>
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
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#aaa' }}
            >✕</button>
          )}
        </div>
      )}

      {/* Search results */}
      {!selectedSection && !selectedArticle && searchQuery.trim().length > 1 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
            Результаты поиска ({searchResults.length})
          </div>
          {searchResults.length === 0 ? (
            <div style={{ fontSize: 14, color: '#aaa', textAlign: 'center', padding: '24px 0' }}>Ничего не найдено</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {searchResults.map(a => {
                const tc = ARTICLE_TYPE_COLORS[a.type];
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      const section = KB_SECTIONS.find(s => s.articles.some(art => art.id === a.id));
                      if (section) { setSelectedSection(section); setSelectedArticle(a); }
                    }}
                    style={{
                      background: '#fff', border: '1px solid #EBEBEB', borderRadius: 10,
                      padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.15s',
                    }}
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

      {/* Sections grid */}
      {!selectedSection && !selectedArticle && !searchQuery.trim() && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
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
                  style={{
                    background: '#fff', border: '1.5px solid #EBEBEB', borderRadius: 12,
                    padding: '14px 18px', cursor: 'pointer', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = userColor; e.currentTarget.style.background = '#FAFAF8'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#EBEBEB'; e.currentTarget.style.background = '#fff'; }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>
                    {article.type === 'regulation' ? '📋' : article.type === 'instruction' ? '📖' : article.type === 'template' ? '📝' : article.type === 'checklist' ? '✅' : article.type === 'rules' ? '📏' : '🔗'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 3 }}>{article.title}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>
                      Обновлено: {new Date(article.updatedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10, background: tc.bg, color: tc.text, flexShrink: 0 }}>
                    {ARTICLE_TYPE_LABELS[article.type]}
                  </span>
                  <span style={{ fontSize: 16, color: '#ccc', flexShrink: 0 }}>›</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Article detail */}
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
          <div style={{
            background: '#fff', borderRadius: 14, border: '1.5px solid #EBEBEB',
            padding: '24px 28px', lineHeight: 1.6,
          }}>
            {renderContent(selectedArticle.content)}
          </div>

          {/* Copy button */}
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button
              onClick={() => navigator.clipboard.writeText(selectedArticle.content)}
              style={{
                padding: '9px 16px', borderRadius: 8, border: '1.5px solid #E0E0E0',
                background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#555',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F5F5F5')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
            >
              📋 Скопировать
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
