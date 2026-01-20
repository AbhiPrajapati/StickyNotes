package com.example.stickynotes.repository;

import com.example.stickynotes.model.Note;
import com.example.stickynotes.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {
    List<Note> findByUserIdOrSharedWithContains(Long userId, User user);
}
