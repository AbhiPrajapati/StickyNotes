package com.example.stickynotes.service;

import com.example.stickynotes.model.Note;
import com.example.stickynotes.model.NoteHistory;
import com.example.stickynotes.model.User;
import com.example.stickynotes.repository.NoteHistoryRepository;
import com.example.stickynotes.repository.NoteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NoteService {

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private NoteHistoryRepository noteHistoryRepository;

    @Autowired
    private com.example.stickynotes.repository.UserRepository userRepository;

    public List<Note> getAllNotes(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        return noteRepository.findByUserIdOrSharedWithContains(userId, user);
    }

    @Transactional
    public void shareNote(Long noteId, String username, Long currentUserId) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new RuntimeException("Note not found with id: " + noteId));

        if (!note.getUser().getId().equals(currentUserId)) {
            throw new RuntimeException("Only the owner can share the note");
        }

        User userToShare = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found with username: " + username));

        if (userToShare.getId().equals(currentUserId)) {
            throw new RuntimeException("Cannot share with yourself");
        }

        note.getSharedWith().add(userToShare);
        noteRepository.save(note);
    }

    public List<User> getPotentialShareUsers(Long currentUserId) {
        return userRepository.findByIdNot(currentUserId);
    }

    @Transactional
    public Note createNote(Note note, User user) {
        note.setUser(user);
        if (note.getSharedWith() == null) {
            note.setSharedWith(new java.util.HashSet<>());
        }
        Note savedNote = noteRepository.save(note);

        NoteHistory history = new NoteHistory(
                savedNote.getId(),
                NoteHistory.ChangeType.CREATED,
                null,
                savedNote.getContent());
        noteHistoryRepository.save(history);

        return savedNote;
    }

    @Transactional
    public Note updateNote(Long id, Note noteDetails, Long userId) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Note not found with id: " + id));

        boolean isOwner = note.getUser().getId().equals(userId);
        boolean isShared = note.getSharedWith().stream().anyMatch(u -> u.getId().equals(userId));

        if (!isOwner && !isShared) {
            throw new RuntimeException("Unauthorized access to note");
        }

        String oldContent = note.getContent();
        String newContent = noteDetails.getContent();

        // Only save history if content changed
        if (!oldContent.equals(newContent)) {
            NoteHistory history = new NoteHistory(
                    note.getId(),
                    NoteHistory.ChangeType.UPDATED,
                    oldContent,
                    newContent);
            noteHistoryRepository.save(history);
        }

        // Update fields
        note.setTitle(noteDetails.getTitle());
        note.setContent(newContent);

        return noteRepository.save(note);
    }

    @Transactional
    public void deleteNote(Long id, Long userId) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Note not found with id: " + id));

        if (!note.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized access to note");
        }

        NoteHistory history = new NoteHistory(
                note.getId(),
                NoteHistory.ChangeType.DELETED,
                note.getContent(),
                null);
        noteHistoryRepository.save(history);

        noteRepository.delete(note);
    }

    public List<NoteHistory> getHistory(Long noteId) {
        return noteHistoryRepository.findByNoteIdOrderByTimestampDesc(noteId);
    }
}
