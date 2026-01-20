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

const viewAllBtn = document.getElementById('view-all-btn');
const viewSharedBtn = document.getElementById('view-shared-btn');
const viewPrivateBtn = document.getElementById('view-private-btn');

const searchInput = document.getElementById('search-input');
const noteIdInput = document.getElementById('note-id');
const noteTitleInput = document.getElementById('note-title');
const noteContentInput = document.getElementById('note-content');
const modalTitle = document.getElementById('modal-title');
const historyList = document.getElementById('history-list');

// Share Modal Elements
const shareModal = document.getElementById('share-modal');
const closeShareBtn = document.querySelector('.close-share-btn');
const shareUserList = document.getElementById('share-user-list');
let noteToShareId = null;

// PIN Elements and State
const pinSetupModal = document.getElementById('pin-setup-modal');
const pinEntryModal = document.getElementById('pin-entry-modal');
const setupPinInput = document.getElementById('setup-pin-input');
const savePinBtn = document.getElementById('save-pin-btn');
const enterPinInput = document.getElementById('enter-pin-input');
const verifyPinBtn = document.getElementById('verify-pin-btn');
const cancelPinBtn = document.getElementById('cancel-pin-btn');
const notePrivateCheck = document.getElementById('note-private-check');

// Private Mode State
let isPrivateUnlocked = false;
let userHasPin = false;

let currentView = 'all'; // 'all', 'shared', or 'private'

// Auth Check
const token = localStorage.getItem('token');
const username = localStorage.getItem('username'); // Login username

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

// Notification State
let lastViewedShared = localStorage.getItem('lastViewedShared') || 0;

// Load notes on startup
let allNotes = []; // Store all notes for filtering
document.addEventListener('DOMContentLoaded', () => {
    fetchNotes();
    fetchUserStatus();
    console.log("App.js loaded - Polling should be DISABLED");
});

function fetchUserStatus() {
    authFetch(`${API_URL}/me`)
        .then(res => res.json())
        .then(user => {
            userHasPin = user.hasPrivatePin;
        })
        .catch(err => console.error('Error fetching user status:', err));
}

function fetchNotes() {
    authFetch(API_URL)
        .then(res => res.json())
        .then(notes => {
            allNotes = notes; // Save for client-side search
            checkForSharedUpdates();
            filterAndRenderNotes();
        })
        .catch(err => console.error('Error fetching notes:', err));
}

function checkForSharedUpdates() {
    // Find shared notes (Shared WITH me or BY me)
    const sharedNotes = allNotes.filter(note => {
        const isOwner = note.user && note.user.username === username;
        const hasSharedUsers = note.sharedWith && note.sharedWith.length > 0;
        return !isOwner || hasSharedUsers;
    });

    if (sharedNotes.length === 0) return;

    // Get max updatedAt from shared notes
    let maxUpdated = 0;
    sharedNotes.forEach(note => {
        const updatedTime = new Date(note.updatedAt).getTime();
        const createdTime = new Date(note.createdAt).getTime();
        const time = updatedTime || createdTime;
        if (time > maxUpdated) maxUpdated = time;
    });

    // If there is a newer update than last viewed:
    if (maxUpdated > lastViewedShared) {
        if (currentView !== 'shared') {
            viewSharedBtn.classList.add('has-notification');
        } else {
            // We are currently viewing Shared, so update the timestamp immediately
            lastViewedShared = Date.now();
            localStorage.setItem('lastViewedShared', lastViewedShared);
        }
    }
}

// View Filters
viewAllBtn.addEventListener('click', () => {
    currentView = 'all';
    isPrivateUnlocked = false;
    updateFilterBtns();
    filterAndRenderNotes();
});

viewSharedBtn.addEventListener('click', () => {
    currentView = 'shared';
    isPrivateUnlocked = false;
    // Clear notification
    viewSharedBtn.classList.remove('has-notification');
    lastViewedShared = Date.now();
    localStorage.setItem('lastViewedShared', lastViewedShared);

    updateFilterBtns();
    filterAndRenderNotes();
});

viewPrivateBtn.addEventListener('click', () => {
    if (isPrivateUnlocked) {
        currentView = 'private';
        updateFilterBtns();
        filterAndRenderNotes();
    } else {
        // Check if user has PIN
        if (userHasPin) {
            enterPinInput.value = '';
            pinEntryModal.style.display = 'flex';
            enterPinInput.focus();
        } else {
            setupPinInput.value = '';
            pinSetupModal.style.display = 'flex';
            setupPinInput.focus();
        }
    }
});

// PIN Logic
savePinBtn.addEventListener('click', () => {
    const pin = setupPinInput.value;
    if (pin.length !== 4) {
        alert('PIN must be 4 digits');
        return;
    }

    authFetch(`${API_URL}/pin/set`, {
        method: 'POST',
        body: JSON.stringify({ pin: pin })
    }).then(res => {
        if (res.ok) {
            userHasPin = true;
            pinSetupModal.style.display = 'none';
            // Auto unlock after setup
            isPrivateUnlocked = true;
            currentView = 'private';
            updateFilterBtns();
            filterAndRenderNotes();
            alert('PIN set successfully! You are now in your Private folder.');
        } else {
            alert('Error setting PIN');
        }
    });
});

verifyPinBtn.addEventListener('click', () => {
    const pin = enterPinInput.value;
    authFetch(`${API_URL}/pin/verify`, {
        method: 'POST',
        body: JSON.stringify({ pin: pin })
    })
        .then(res => res.json())
        .then(isValid => {
            if (isValid) {
                isPrivateUnlocked = true;
                pinEntryModal.style.display = 'none';
                currentView = 'private';
                updateFilterBtns();
                filterAndRenderNotes();
            } else {
                alert('Incorrect PIN');
                enterPinInput.value = '';
            }
        });
});

cancelPinBtn.addEventListener('click', () => {
    pinEntryModal.style.display = 'none';
});

function updateFilterBtns() {
    viewAllBtn.classList.remove('active');
    viewSharedBtn.classList.remove('active');
    viewPrivateBtn.classList.remove('active');

    if (currentView === 'all') {
        viewAllBtn.classList.add('active');
    } else if (currentView === 'shared') {
        viewSharedBtn.classList.add('active');
    } else if (currentView === 'private') {
        viewPrivateBtn.classList.add('active');
    }
}

// Search Logic
searchInput.addEventListener('input', (e) => {
    filterAndRenderNotes();
});

function filterAndRenderNotes() {
    const searchTerm = searchInput.value.toLowerCase();

    const filteredNotes = allNotes.filter(note => {
        // Text Match
        const matchesText = note.title.toLowerCase().includes(searchTerm) ||
            note.content.toLowerCase().includes(searchTerm);

        if (!matchesText) return false;

        // View Filter
        const isOwner = note.user && note.user.username === username;
        const hasSharedUsers = note.sharedWith && note.sharedWith.length > 0;
        const isShared = !isOwner || hasSharedUsers;
        const isPrivate = note.private; // note.private is boolean from backend

        if (currentView === 'private') {
            return isPrivate && isOwner; // Only show MY private notes
        } else if (currentView === 'shared') {
            return isShared && !isPrivate; // Hide private notes from Shared view
        } else {
            // My Notes (Normal) - Hide shared and hide private
            return !isShared && !isPrivate && isOwner;
        }
    });

    renderNotes(filteredNotes);
}

function renderNotes(notes) {
    notesContainer.innerHTML = '';
    notes.forEach(note => {
        const noteEl = document.createElement('div');
        noteEl.classList.add('note-card');

        // Deterministic rotation based on ID to avoid jumping on refresh
        // Use a simple hash of ID: (id * 13) % 7 - 3 gives range -3 to 3
        const rotation = ((note.id * 13) % 7) - 3;
        noteEl.style.setProperty('--rotation', `${rotation}deg`);

        // Added ondblclick event
        noteEl.setAttribute('ondblclick', `openEditModal(${note.id})`);

        // Generate User Avatars
        let avatarsHtml = '';
        const isOwner = note.user && note.user.username === username;

        if (isOwner) {
            // If I am the owner, show who strictly I shared it with
            if (note.sharedWith && note.sharedWith.length > 0) {
                avatarsHtml = '<div class="shared-users">';
                note.sharedWith.forEach(u => {
                    const initial = u.username.charAt(0).toUpperCase();
                    avatarsHtml += `<div class="user-avatar" title="Shared with: ${escapeHtml(u.username)}">${initial}</div>`;
                });
                avatarsHtml += '</div>';
            }
        } else {
            // If I am NOT the owner, show the Owner's avatar
            const initial = note.user.username.charAt(0).toUpperCase();
            avatarsHtml = `<div class="shared-users"><div class="user-avatar" style="background-color: #e91e63" title="Owner: ${escapeHtml(note.user.username)}">${initial}</div></div>`;
        }

        // Private Icon
        let privateIcon = '';
        if (note.private) {
            privateIcon = '<div class="private-badge" style="position: absolute; top: 5px; left: 5px; color: #555;"><span class="material-icons-outlined" style="font-size: 16px;">lock</span></div>';
        }

        noteEl.innerHTML = `
            ${avatarsHtml}
            ${privateIcon}
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
                <button class="action-btn" onclick="openShareModal(${note.id})" title="Share">
                    <span class="material-icons-outlined">share</span>
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

    // Reset private check
    if (notePrivateCheck) notePrivateCheck.checked = false;

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

    // Check if private checkbox exists (it should now)
    const isPrivate = notePrivateCheck ? notePrivateCheck.checked : false;

    if (!title || !content) {
        alert('Please fill in both title and content');
        return;
    }

    const noteData = { title, content, private: isPrivate };
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
                res.text().then(text => alert('Error saving note: ' + text));
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

                // Set private check
                if (notePrivateCheck) notePrivateCheck.checked = note.private;

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
    if (event.target == shareModal) {
        shareModal.style.display = 'none';
        noteToShareId = null;
    }
    // Added PIN modals
    if (event.target == pinSetupModal) {
        // Do not close setup on outside click to force setup? Maybe safe to allow close.
        pinSetupModal.style.display = 'none';
    }
    if (event.target == pinEntryModal) {
        pinEntryModal.style.display = 'none';
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

// Share Modal Logic
window.openShareModal = function (id) {
    noteToShareId = id;
    shareModal.style.display = 'flex';
    fetchPotentialShareUsers();
}

closeShareBtn.addEventListener('click', () => {
    shareModal.style.display = 'none';
    noteToShareId = null;
});

function fetchPotentialShareUsers() {
    authFetch(`${API_URL}/users`)
        .then(res => res.json())
        .then(users => {
            shareUserList.innerHTML = '';
            if (users.length === 0) {
                shareUserList.innerHTML = '<li>No users found to share with.</li>';
                return;
            }
            users.forEach(user => {
                const li = document.createElement('li');
                li.classList.add('user-share-item');
                li.innerHTML = `
                    <span>${escapeHtml(user.username)} (${escapeHtml(user.email)})</span>
                    <button class="share-btn-small" onclick="shareNoteWithUser('${user.username}')">Share</button>
                `;
                shareUserList.appendChild(li);
            });
        });
}

window.shareNoteWithUser = function (username) {
    if (!noteToShareId) return;

    authFetch(`${API_URL}/${noteToShareId}/share?username=${username}`, {
        method: 'POST'
    })
        .then(res => {
            if (res.ok) {
                alert(`Note shared with ${username}`);
                shareModal.style.display = 'none';
            } else {
                alert('Error sharing note or note already shared.');
            }
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
