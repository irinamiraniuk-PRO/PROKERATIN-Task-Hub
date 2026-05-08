import { useState } from 'react';
import type React from 'react';
import { useApp } from '../context/useApp';
import type { Note } from '../types';

const MIN_NOTES_FOR_SEARCH = 4;
const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit', year: 'numeric',
};

const NOTE_COLORS = [
  '#FFFBEB', '#FEF3C7', '#FFF7ED', '#FEF2F2', '#F0FDF4',
  '#EFF6FF', '#F5F3FF', '#FDF4FF', '#F0F9FF', '#F7F7F5',
];
const NOTE_EMOJIS = ['📝', '💡', '⭐', '🔖', '📌', '🎯', '🧠', '✅', '🔥', '💬'];

interface NoteEditorProps {
  initial?: Note;
  onSave: (data: { title: string; content: string; emoji: string; color: string }) => void;
  onCancel: () => void;
}

function NoteEditor({ initial, onSave, onCancel }: NoteEditorProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '📝');
  const [color, setColor] = useState(initial?.color ?? '#FFFBEB');

  function handleSave() {
    if (!title.trim()) return;
    onSave({ title: title.trim(), content, emoji, color });
  }

  return (
    <div style={{
      background: color, borderRadius: 14, padding: '20px 22px',
      border: '1.5px solid rgba(0,0,0,0.06)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      display: 'flex', flexDirection: 'column', gap: 14,
      minHeight: 340,
    }}>
      {/* Emoji + color row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {NOTE_EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              style={{
                fontSize: 18, background: emoji === e ? 'rgba(0,0,0,0.1)' : 'transparent',
                border: 'none', cursor: 'pointer', borderRadius: 6, padding: '2px 4px',
                transition: 'background 0.1s',
              }}
            >{e}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
          {NOTE_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 18, height: 18, borderRadius: '50%', background: c,
                border: color === c ? '2px solid #333' : '1.5px solid rgba(0,0,0,0.15)',
                cursor: 'pointer', padding: 0,
                boxShadow: color === c ? '0 0 0 2px #fff, 0 0 0 4px #333' : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Заголовок заметки..."
        style={{
          fontSize: 18, fontWeight: 700, background: 'transparent', border: 'none',
          outline: 'none', color: '#111', fontFamily: 'var(--font)',
          borderBottom: '1.5px solid rgba(0,0,0,0.1)',
          paddingBottom: 8,
        }}
        autoFocus
      />

      {/* Content */}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Начните писать... Поддерживается базовое форматирование Markdown: **жирный**, *курсив*, # заголовок"
        style={{
          flex: 1, minHeight: 180, fontSize: 14, background: 'transparent', border: 'none',
          outline: 'none', color: '#333', fontFamily: 'var(--font)', resize: 'vertical',
          lineHeight: 1.6,
        }}
      />

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 16px', borderRadius: 8, border: '1.5px solid #EEECEA',
            background: 'transparent', fontSize: 13, cursor: 'pointer',
            color: '#666', fontFamily: 'var(--font)',
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
            fontFamily: 'var(--font)', transition: 'all 0.12s',
          }}
        >💾 Сохранить</button>
      </div>
    </div>
  );
}

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('# ')) return <div key={i} style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: '8px 0 4px' }}>{line.slice(2)}</div>;
    if (line.startsWith('## ')) return <div key={i} style={{ fontSize: 15, fontWeight: 700, color: '#222', margin: '6px 0 3px' }}>{line.slice(3)}</div>;
    if (line.startsWith('- ') || line.startsWith('• ')) return (
      <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: '2px 0' }}>
        <span style={{ color: '#BE185D', fontWeight: 700, flexShrink: 0 }}>•</span>
        <span>{renderInline(line.slice(2))}</span>
      </div>
    );
    if (line === '') return <div key={i} style={{ height: 8 }} />;
    return <div key={i} style={{ lineHeight: 1.6 }}>{renderInline(line)}</div>;
  });
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    return <span key={i}>{part}</span>;
  });
}

export default function NotesView() {
  const { state, createNote, updateNote, deleteNote } = useApp();
  const { currentUser, notes } = state;
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  if (!currentUser) return null;

  const userColor = currentUser.color ?? '#BE185D';
  const myNotes = notes.filter(n => n.userId === currentUser.id);

  const filteredNotes = searchQuery.trim()
    ? myNotes.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : myNotes;

  const pinnedNotes = filteredNotes.filter(n => n.pinned);
  const regularNotes = filteredNotes.filter(n => !n.pinned);

  const viewingNote = viewingId ? myNotes.find(n => n.id === viewingId) : null;
  const editingNote = editingId ? myNotes.find(n => n.id === editingId) : null;

  function handleCreate(data: { title: string; content: string; emoji: string; color: string }) {
    createNote(data);
    setCreating(false);
  }

  function handleUpdate(noteId: string, data: { title: string; content: string; emoji: string; color: string }) {
    updateNote(noteId, data);
    setEditingId(null);
    setViewingId(noteId);
  }

  function handleDelete(noteId: string) {
    if (window.confirm('Удалить заметку?')) {
      deleteNote(noteId);
      if (viewingId === noteId) setViewingId(null);
    }
  }

  // Viewing a note
  if (viewingNote && editingId !== viewingNote.id) {
    return (
      <div style={{ padding: '20px 24px', maxWidth: 780 }}>
        {/* Back button */}
        <button
          onClick={() => setViewingId(null)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: '#888', marginBottom: 16,
            fontFamily: 'var(--font)',
          }}
        >← Все заметки</button>

        <div style={{
          background: viewingNote.color, borderRadius: 16, padding: '24px 28px',
          border: '1.5px solid rgba(0,0,0,0.06)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 28 }}>{viewingNote.emoji}</span>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111', letterSpacing: '-0.3px' }}>{viewingNote.title}</h1>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => updateNote(viewingNote.id, { pinned: !viewingNote.pinned })}
                title={viewingNote.pinned ? 'Открепить' : 'Закрепить'}
                style={{
                  padding: '6px 10px', borderRadius: 7, border: '1.5px solid rgba(0,0,0,0.1)',
                  background: viewingNote.pinned ? '#FEF3C7' : 'transparent',
                  cursor: 'pointer', fontSize: 14,
                }}
              >{viewingNote.pinned ? '📌' : '📍'}</button>
              <button
                onClick={() => { setEditingId(viewingNote.id); }}
                style={{
                  padding: '6px 12px', borderRadius: 7, border: '1.5px solid rgba(0,0,0,0.1)',
                  background: 'transparent', cursor: 'pointer', fontSize: 13,
                  color: '#555', fontFamily: 'var(--font)',
                }}
              >✏️ Редактировать</button>
              <button
                onClick={() => handleDelete(viewingNote.id)}
                style={{
                  padding: '6px 10px', borderRadius: 7, border: '1.5px solid #FECACA',
                  background: '#FEF2F2', cursor: 'pointer', fontSize: 13,
                  color: '#EF4444', fontFamily: 'var(--font)',
                }}
              >🗑️</button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 20 }}>
            Создана: {new Date(viewingNote.createdAt).toLocaleString('ru-RU', { ...DATE_FORMAT_OPTIONS, hour: '2-digit', minute: '2-digit' })}
            {viewingNote.updatedAt !== viewingNote.createdAt && ` • Изменена: ${new Date(viewingNote.updatedAt).toLocaleString('ru-RU', { ...DATE_FORMAT_OPTIONS, hour: '2-digit', minute: '2-digit' })}`}
          </div>
          {viewingNote.content
            ? <div style={{ fontSize: 14, color: '#333', lineHeight: 1.7 }}>{renderMarkdown(viewingNote.content)}</div>
            : <div style={{ fontSize: 14, color: '#aaa', fontStyle: 'italic' }}>Нет содержимого</div>
          }
        </div>

        {/* Editor if editing */}
        {editingId === viewingNote.id && editingNote && (
          <div style={{ marginTop: 20 }}>
            <NoteEditor
              initial={editingNote}
              onSave={data => handleUpdate(viewingNote.id, data)}
              onCancel={() => setEditingId(null)}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1100 }} className="anim-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.4px' }}>
            📝 Заметки
          </h1>
          <div style={{ fontSize: 12.5, color: '#ADADAD' }}>{myNotes.length} заметок</div>
        </div>
        <button
          onClick={() => { setCreating(true); setViewingId(null); setEditingId(null); }}
          style={{
            padding: '9px 18px', borderRadius: 9, border: 'none',
            background: userColor, color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: `0 2px 10px ${userColor}35`,
            fontFamily: 'var(--font)',
          }}
        >+ Новая заметка</button>
      </div>

      {/* Search */}
      {myNotes.length > MIN_NOTES_FOR_SEARCH && (
        <div style={{ position: 'relative', marginBottom: 16, maxWidth: 380 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#C0BDB9', fontSize: 13 }}>⌕</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск по заметкам..."
            style={{
              width: '100%', padding: '8px 12px 8px 30px', border: '1.5px solid #EEECEA',
              borderRadius: 8, fontSize: 13, outline: 'none', background: '#F7F7F5',
              fontFamily: 'var(--font)', boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {/* Create form */}
      {creating && (
        <div style={{ marginBottom: 24 }}>
          <NoteEditor
            onSave={handleCreate}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {/* Pinned */}
      {pinnedNotes.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#ADADAD', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>📌 Закреплённые</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {pinnedNotes.map(note => (
              <NoteCard key={note.id} note={note} onOpen={setViewingId} onPin={id => updateNote(id, { pinned: false })} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* All notes */}
      {regularNotes.length > 0 ? (
        <div>
          {pinnedNotes.length > 0 && (
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ADADAD', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Все заметки</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {regularNotes.map(note => (
              <NoteCard key={note.id} note={note} onOpen={setViewingId} onPin={id => updateNote(id, { pinned: true })} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      ) : myNotes.length === 0 && !creating ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px', color: '#C0BDB9',
          background: '#FAFAF8', borderRadius: 16, border: '1.5px dashed #EEECEA',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#888', marginBottom: 6 }}>Нет заметок</div>
          <div style={{ fontSize: 13, marginBottom: 18 }}>Создайте свою первую заметку прямо сейчас</div>
          <button
            onClick={() => setCreating(true)}
            style={{
              padding: '10px 22px', borderRadius: 9, border: 'none',
              background: userColor, color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font)',
            }}
          >+ Создать заметку</button>
        </div>
      ) : searchQuery && filteredNotes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#C0BDB9' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          Ничего не найдено
        </div>
      ) : null}
    </div>
  );
}

function NoteCard({ note, onOpen, onPin, onDelete }: {
  note: Note;
  onOpen: (id: string) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const preview = note.content.replace(/[#*]/g, '').slice(0, 120);

  return (
    <div
      style={{
        background: note.color, borderRadius: 12, padding: '16px 18px',
        border: '1.5px solid rgba(0,0,0,0.06)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
        display: 'flex', flexDirection: 'column', gap: 8, minHeight: 140,
        position: 'relative',
      }}
      onClick={() => onOpen(note.id)}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>{note.emoji}</span>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#111', lineHeight: 1.3, flex: 1, wordBreak: 'break-word' }}>{note.title}</div>
      </div>
      {preview && (
        <div style={{ fontSize: 12.5, color: '#555', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const }}>
          {preview}{note.content.length > 120 ? '…' : ''}
        </div>
      )}
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: '#aaa' }}>
          {new Date(note.updatedAt).toLocaleDateString('ru-RU', DATE_FORMAT_OPTIONS)}
        </div>
        <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={e => { e.stopPropagation(); onPin(note.id); }}
            title={note.pinned ? 'Открепить' : 'Закрепить'}
            style={{
              width: 26, height: 26, borderRadius: 6, border: 'none',
              background: 'rgba(0,0,0,0.06)', cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >{note.pinned ? '📌' : '📍'}</button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(note.id); }}
            style={{
              width: 26, height: 26, borderRadius: 6, border: 'none',
              background: 'rgba(0,0,0,0.06)', cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#EF4444',
            }}
          >✕</button>
        </div>
      </div>
    </div>
  );
}
