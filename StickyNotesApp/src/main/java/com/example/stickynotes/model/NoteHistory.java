package com.example.stickynotes.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "note_history")
public class NoteHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long noteId;

    @Enumerated(EnumType.STRING)
    private ChangeType changeType;

    @Column(columnDefinition = "TEXT")
    private String oldContent; // Can be null if it's a new note

    @Column(columnDefinition = "TEXT")
    private String newContent; // Can be null if deleted

    private LocalDateTime timestamp;

    public enum ChangeType {
        CREATED, UPDATED, DELETED
    }

    public NoteHistory() {
        this.timestamp = LocalDateTime.now();
    }

    public NoteHistory(Long noteId, ChangeType changeType, String oldContent, String newContent) {
        this.noteId = noteId;
        this.changeType = changeType;
        this.oldContent = oldContent;
        this.newContent = newContent;
        this.timestamp = LocalDateTime.now();
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getNoteId() {
        return noteId;
    }

    public void setNoteId(Long noteId) {
        this.noteId = noteId;
    }

    public ChangeType getChangeType() {
        return changeType;
    }

    public void setChangeType(ChangeType changeType) {
        this.changeType = changeType;
    }

    public String getOldContent() {
        return oldContent;
    }

    public void setOldContent(String oldContent) {
        this.oldContent = oldContent;
    }

    public String getNewContent() {
        return newContent;
    }

    public void setNewContent(String newContent) {
        this.newContent = newContent;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
