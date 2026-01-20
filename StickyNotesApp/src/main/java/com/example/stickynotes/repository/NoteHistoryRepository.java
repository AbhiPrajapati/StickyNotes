package com.example.stickynotes.repository;

import com.example.stickynotes.model.NoteHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NoteHistoryRepository extends JpaRepository<NoteHistory, Long> {
    List<NoteHistory> findByNoteIdOrderByTimestampDesc(Long noteId);
}
