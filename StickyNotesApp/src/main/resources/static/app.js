const API_URL = '/api/notes';

const notesContainer = document.getElementById('notes-container');
const addNoteBtn = document.getElementById('add-note-btn');
const logoutBtn = document.getElementById('logout-btn');
const userDisplay = document.getElementById('user-display');
const noteModal = document.getElementById('note-modal');
const historyModal = document.getElementById('history-modal');
const closeModalBtn = document.querySelector('.close-btn');
const closeHistoryBtn = document.querySelector('.close-history-btn');
const saveNoteBtn = document.getElementById('save-note-btn');

const searchInput = document.getElementById('search-input');
const noteIdInput = document.getElementById('note-id');
const noteTitleInput = document.getElementById('note-title');
const noteContentInput = document.getElementById('note-content');
const modalTitle = document.getElementById('modal-title');
const historyList = document.getElementById('history-list');

// Auth Check
const token = localStorage.getItem('token');
const username = localStorage.getItem('username');

if (!token) {
    window.location.href = 'login.html';
}

if (userDisplay && username) {
    userDisplay.textContent = `Hello, ${username}`;
}

// Common Fetch with Auth
async function authFetch(url, options = {}) {
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = 'Bearer ' + token;

    // Default to JSON content type for body
    if (options.body && !options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, options);

    if (res.status === 401) {
        logout();
        throw new Error('Unauthorized');
    }

    return res;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = 'login.html';
}

logoutBtn.addEventListener('click', logout);

// Load notes on startup
let allNotes = []; // Store all notes for filtering
document.addEventListener('DOMContentLoaded', fetchNotes);

function fetchNotes() {
    authFetch(API_URL)
        .then(res => res.json())
        .then(notes => {
            allNotes = notes; // Save for client-side search
            renderNotes(notes);
        })
        .catch(err => console.error('Error fetching notes:', err));
}

// Search Logic
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredNotes = allNotes.filter(note =>
        note.title.toLowerCase().includes(searchTerm) ||
        note.content.toLowerCase().includes(searchTerm)
    );
    renderNotes(filteredNotes);
});

function renderNotes(notes) {
    notesContainer.innerHTML = '';
    notes.forEach(note => {
        const noteEl = document.createElement('div');
        noteEl.classList.add('note-card');

        // Random rotation for sticky note feel
        const rotation = Math.floor(Math.random() * 6) - 3;
        noteEl.style.setProperty('--rotation', `${rotation}deg`);

        // Added ondblclick event
        noteEl.setAttribute('ondblclick', `openEditModal(${note.id})`);

        noteEl.innerHTML = `
            <div class="note-title">${escapeHtml(note.title)}</div>
            <div class="note-content">${escapeHtml(note.content)}</div>
            <div class="note-actions">
                <button class="action-btn" onclick="openEditModal(${note.id})" title="Edit">
                    <span class="material-icons-outlined">edit</span>
                </button>
                <button class="action-btn" onclick="openHistoryModal(${note.id})" title="History">
                    <span class="material-icons-outlined">history</span>
                </button>
                <button class="action-btn" onclick="deleteNote(${note.id})" title="Delete">
                    <span class="material-icons-outlined">delete_outline</span>
                </button>
            </div>
        `;
        notesContainer.appendChild(noteEl);
    });
}

// Open Modal for New Note
addNoteBtn.addEventListener('click', () => {
    noteIdInput.value = '';
    noteTitleInput.value = '';
    noteContentInput.value = '';
    modalTitle.textContent = 'New Note';
    noteModal.style.display = 'flex';
});

// Close Modals
closeModalBtn.addEventListener('click', () => {
    noteModal.style.display = 'none';
});

closeHistoryBtn.addEventListener('click', () => {
    historyModal.style.display = 'none';
});

// Save Note (Create or Update)
saveNoteBtn.addEventListener('click', () => {
    const id = noteIdInput.value;
    const title = noteTitleInput.value;
    const content = noteContentInput.value;

    if (!title || !content) {
        alert('Please fill in both title and content');
        return;
    }

    const noteData = { title, content };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/${id}` : API_URL;

    authFetch(url, {
        method: method,
        body: JSON.stringify(noteData)
    })
        .then(res => {
            if (res.ok) {
                noteModal.style.display = 'none';
                fetchNotes();
            } else {
                console.error('Error saving note');
            }
        });
});

// Edit Note
window.openEditModal = function (id) {
    authFetch(API_URL)
        .then(res => res.json())
        .then(notes => {
            const note = notes.find(n => n.id === id);
            if (note) {
                noteIdInput.value = note.id;
                noteTitleInput.value = note.title;
                noteContentInput.value = note.content;
                modalTitle.textContent = 'Edit Note';
                noteModal.style.display = 'flex';
            }
        });
}

// Delete Note Logic
const deleteModal = document.getElementById('delete-modal');
const closeDeleteBtn = document.querySelector('.close-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
let noteToDeleteId = null;

window.deleteNote = function (id) {
    noteToDeleteId = id;
    deleteModal.style.display = 'flex';
}

// Close Delete Modal
closeDeleteBtn.addEventListener('click', () => {
    deleteModal.style.display = 'none';
    noteToDeleteId = null;
});

cancelDeleteBtn.addEventListener('click', () => {
    deleteModal.style.display = 'none';
    noteToDeleteId = null;
});

window.onclick = function (event) {
    if (event.target == noteModal) {
        noteModal.style.display = 'none';
    }
    if (event.target == historyModal) {
        historyModal.style.display = 'none';
    }
    if (event.target == deleteModal) {
        deleteModal.style.display = 'none';
        noteToDeleteId = null;
    }
}

confirmDeleteBtn.addEventListener('click', () => {
    if (noteToDeleteId) {
        authFetch(`${API_URL}/${noteToDeleteId}`, {
            method: 'DELETE'
        })
            .then(res => {
                if (res.ok) {
                    fetchNotes();
                    deleteModal.style.display = 'none';
                    noteToDeleteId = null;
                } else {
                    alert('Error deleting note');
                }
            });
    }
});

// View History
window.openHistoryModal = function (id) {
    authFetch(`${API_URL}/history/${id}`)
        .then(res => res.json())
        .then(history => {
            historyList.innerHTML = '';
            if (history.length === 0) {
                historyList.innerHTML = '<li>No history found.</li>';
            }
            history.forEach(item => {
                const itemEl = document.createElement('li');
                itemEl.classList.add('history-item');

                let contentDisplay = '';
                if (item.changeType === 'UPDATED') {
                    contentDisplay = `
                        <div><strong>Old:</strong> ${escapeHtml(item.oldContent)}</div>
                        <div><strong>New:</strong> ${escapeHtml(item.newContent)}</div>
                    `;
                } else if (item.changeType === 'CREATED') {
                    contentDisplay = `<div><strong>Content:</strong> ${escapeHtml(item.newContent)}</div>`;
                } else {
                    contentDisplay = `<div><strong>Deleted Content:</strong> ${escapeHtml(item.oldContent)}</div>`;
                }

                itemEl.innerHTML = `
                    <div class="history-meta">
                        <span class="change-type-${item.changeType}">${item.changeType}</span> 
                        at ${new Date(item.timestamp).toLocaleString()}
                    </div>
                    ${contentDisplay}
                `;
                historyList.appendChild(itemEl);
            });
            historyModal.style.display = 'flex';
        });
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
