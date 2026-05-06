import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';

export default function NotesView() {
  const { state, addNote, updateNote, deleteNote } = useApp();
  const { currentUser, notes } = state;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!currentUser) return null;

  const myNotes = useMemo(
    () => notes.filter(note => note.userId === currentUser.id),
    [notes, currentUser.id]
  );

  function resetForm() {
    setTitle('');
    setContent('');
    setEditingId(null);
  }

  function submit() {
    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    if (!cleanTitle && !cleanContent) return;
    if (editingId) {
      updateNote(editingId, { title: cleanTitle || 'Без названия', content: cleanContent });
      resetForm();
      return;
    }
    addNote(cleanTitle || 'Без названия', cleanContent);
    resetForm();
  }

  function startEdit(noteId: string) {
    const note = myNotes.find(n => n.id === noteId);
    if (!note) return;
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
  }

  return (
    <div style={{ padding: '16px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>📝 Заметки</h1>
      </div>

      <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Заголовок"
          style={{ width: '100%', minHeight: 44, padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', marginBottom: 8 }}
        />
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Текст заметки"
          style={{ width: '100%', minHeight: 120, padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <button onClick={submit} style={{ minHeight: 44, padding: '0 14px', borderRadius: 8, border: 'none', background: '#BE185D', color: '#fff', fontWeight: 600 }}>
            {editingId ? 'Сохранить' : 'Добавить'}
          </button>
          {editingId && (
            <button onClick={resetForm} style={{ minHeight: 44, padding: '0 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff' }}>
              Отмена
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {myNotes.map(note => (
          <article key={note.id} style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: 12, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, wordBreak: 'break-word' }}>{note.title || 'Без названия'}</h2>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => startEdit(note.id)} style={{ minHeight: 36, padding: '0 10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff' }}>Изм.</button>
                <button onClick={() => deleteNote(note.id)} style={{ minHeight: 36, padding: '0 10px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C' }}>Удалить</button>
              </div>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#444', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{note.content}</p>
          </article>
        ))}
        {myNotes.length === 0 && (
          <div style={{ color: '#888', fontSize: 13 }}>Пока нет заметок.</div>
        )}
      </div>
    </div>
  );
}
