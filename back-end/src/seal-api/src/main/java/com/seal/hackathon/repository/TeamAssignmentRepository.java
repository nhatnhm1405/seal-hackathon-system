package com.seal.hackathon.repository;

import com.seal.hackathon.entity.TeamAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamAssignmentRepository extends JpaRepository<TeamAssignment, Integer> {

    /**
     * Lấy tất cả team assignment đang active của một user với loại assignment cụ thể.
     * Dùng JOIN FETCH để tránh N+1 query khi load Team, Track, Event.
     */
    @Query("SELECT ta FROM TeamAssignment ta " +
           "JOIN FETCH ta.team t " +
           "JOIN FETCH t.event e " +
           "JOIN FETCH t.track tr " +
           "WHERE ta.user.userId = :userId " +
           "AND ta.assignmentType = :assignmentType " +
           "AND ta.isActive = true " +
           "ORDER BY ta.assignedAt DESC")
    List<TeamAssignment> findActiveAssignmentsByUserAndType(
            @Param("userId") Integer userId,
            @Param("assignmentType") String assignmentType);
}
