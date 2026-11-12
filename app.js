/* ============================================================
   notes-app.js — Notes App logic
   Handles: add, edit, delete, count update, empty state
   • Enter on title field saves the note
   • Shift+Enter in textarea saves the note
   • Default sample cards are cleared on first real note added
   ============================================================ */

const grid         = document.getElementById('notes-grid');
const countEl      = document.getElementById('notes-count');
const titleInput   = document.getElementById('note-title');
const contentInput = document.getElementById('note-content');
const addBtn       = document.getElementById('add-btn');
const NOTES_STORAGE_KEY = 'notes-data';

// Rotating accent colours for dynamically created cards
const ACCENT_COLORS = [
  '#C94F32', // terracotta
  '#B0763C', // amber
  '#5B8A72', // sage
  '#6A7BAF', // periwinkle
  '#9A5B8A', // mauve
  '#7A884A', // olive
];

// Track whether the default sample cards are still present
let defaultsCleared = false;

/* ── Helpers ── */

function clearDefaultCards() {
  if (defaultsCleared) return;
  grid.querySelectorAll('.note-card[data-sample]').forEach(c => c.remove());
  defaultsCleared = true;
}

function loadSavedNotes() {
  try {
    const storedNotes = localStorage.getItem(NOTES_STORAGE_KEY);
    if (storedNotes === null) return null;

    const parsedNotes = JSON.parse(storedNotes);
    if (!Array.isArray(parsedNotes)) return [];

    return parsedNotes.filter(
      (note) =>
        note &&
        typeof note === 'object' &&
        !Array.isArray(note) &&
        typeof note.title === 'string' &&
        typeof note.content === 'string' &&
        typeof note.createdAt === 'string' &&
        !Number.isNaN(Date.parse(note.createdAt))
    );
  } catch (error) {
    console.warn('Could not load saved notes.', error);
    return null;
  }
}

function persistNotes() {
  const notes = Array.from(
    grid.querySelectorAll('.note-card:not([data-sample])')
  ).map((card) => ({
    title: card.querySelector('.note-card-title').textContent,
    content: card.querySelector('.note-card-content').textContent,
    createdAt: card.dataset.createdAt,
  }));

  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch (error) {
    console.warn('Could not save notes to local storage.', error);
  }
}

function restoreSavedNotes() {
  const notes = loadSavedNotes();
  if (notes === null) return;

  // A stored empty array also means the user intentionally removed all notes.
  clearDefaultCards();
  notes.forEach((note) => {
    grid.appendChild(createNoteCard(note.title, note.content, new Date(note.createdAt)));
  });
  updateCount();
}

function updateCount() {
  const n = grid.querySelectorAll('.note-card').length;
  countEl.textContent =
    n === 0 ? 'No notes yet' :
    n === 1 ? '1 note saved' :
              `${n} notes saved`;

  const empty = grid.querySelector('.empty-state');

  if (n === 0 && !empty) {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.setAttribute('role', 'status');
    div.setAttribute('aria-live', 'polite');
    div.innerHTML = `
      <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" fill="none"
           viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round"
              d="M9 12h6m-3-3v6M3 6a2 2 0 012-2h14a2 2 0 012 2v14
                 a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"/>
      </svg>
      <p class="empty-title">No notes yet</p>
      <p class="empty-sub">Create your first note above — it'll appear here.</p>`;
    grid.appendChild(div);
  } else if (n > 0 && empty) {
    empty.remove();
  }
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  });
}

/* SVG icon factories */
function makeEditSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round"
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0
             002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828
             15H9v-2.828l8.586-8.586z"/>
  </svg>`;
}

function makeTrashSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round"
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0
             01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0
             00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
  </svg>`;
}

function makeCalSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" stroke-width="2" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <path d="M16 2v4M8 2v4M3 10h18"/>
  </svg>`;
}

/* ── Card factory ── */

function attachCardListeners(card) {
  card.querySelector('.delete').addEventListener('click', () => {
    card.style.transition = 'opacity 0.2s, transform 0.2s';
    card.style.opacity    = '0';
    card.style.transform  = 'scale(0.95)';
    setTimeout(() => {
      card.remove();
      updateCount();
      persistNotes();
    }, 200);
  });

  card.querySelector('.edit').addEventListener('click', () => {
    titleInput.value   = card.querySelector('.note-card-title').textContent;
    contentInput.value = card.querySelector('.note-card-content').textContent;
    card.remove();
    updateCount();
    titleInput.focus();
  });
}

function createNoteCard(title, content, createdAt = new Date()) {
  const cardCount = grid.querySelectorAll('.note-card').length;
  const accent    = ACCENT_COLORS[cardCount % ACCENT_COLORS.length];

  const article = document.createElement('article');
  article.className = 'note-card';
  article.dataset.createdAt = createdAt.toISOString();
  article.setAttribute('role', 'listitem');
  article.style.setProperty('--accent', accent);

  article.innerHTML = `
    <h2 class="note-card-title"></h2>
    <p class="note-card-content"></p>
    <footer class="note-card-footer">
      <span class="note-date">
        ${makeCalSVG()}
        ${formatDate(createdAt)}
      </span>
      <div class="card-actions">
        <button class="icon-btn edit" type="button">${makeEditSVG()}</button>
        <button class="icon-btn delete" type="button">${makeTrashSVG()}</button>
      </div>
    </footer>`;

  // Treat user-provided note text as text, never as HTML.
  article.querySelector('.note-card-title').textContent = title;
  article.querySelector('.note-card-content').textContent = content;
  article.querySelector('.edit').setAttribute('aria-label', `Edit ${title}`);
  article.querySelector('.delete').setAttribute('aria-label', `Delete ${title}`);

  attachCardListeners(article);
  return article;
}

/* ── Core save action ── */

function saveNote() {
  const title   = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (!title && !content) {
    titleInput.focus();
    return;
  }

  // Remove sample cards the very first time the user saves a real note
  clearDefaultCards();

  const card = createNoteCard(title || 'Untitled', content || '');
  grid.insertBefore(card, grid.firstChild);
  persistNotes();

  titleInput.value   = '';
  contentInput.value = '';
  updateCount();
  titleInput.focus();
}

/* ── Event listeners ── */

// Button click
addBtn.addEventListener('click', saveNote);

// Enter on title input saves the note
titleInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    saveNote();
  }
});

// Shift+Enter in textarea saves; plain Enter inserts a newline (normal behaviour)
contentInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.shiftKey) {
    e.preventDefault();
    saveNote();
  }
});

/* ── Wire up sample (static HTML) cards ── */

// Mark them so clearDefaultCards() can find them
grid.querySelectorAll('.note-card').forEach(card => {
  card.dataset.sample = 'true';
  attachCardListeners(card);
});

restoreSavedNotes();


const themeToggle = document.getElementById("theme-toggle");
function applyTheme(theme){const isDark=theme==="dark";document.body.classList.toggle("dark-mode",isDark);if(themeToggle){themeToggle.textContent=isDark?"☀️ Light Mode":"🌙 Dark Mode";}localStorage.setItem("notes-theme",theme);}
function toggleTheme(){const current=document.body.classList.contains("dark-mode")?"dark":"light";applyTheme(current==="dark"?"light":"dark");}
applyTheme(localStorage.getItem("notes-theme")||"light");
if(themeToggle){themeToggle.addEventListener("click",toggleTheme);}
