package com.seal.hackathon.repository;

import com.seal.hackathon.entity.TeamMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamMemberRepository extends JpaRepository<TeamMember, Integer> {
    boolean existsByUser_UserIdAndTeam_Event_EventId(Integer userId, Integer eventId);

    /** Find all teams that a user belongs to, filtered by event status. */
    List<TeamMember> findByUser_UserIdAndTeam_Event_StatusIn(Integer userId, List<String> statuses);

    /** Find all teams that a user belongs to, newest team first. */
    List<TeamMember> findByUser_UserIdOrderByTeam_CreatedAtDesc(Integer userId);

    /** Find all members of a specific team */
    List<TeamMember> findByTeam_TeamId(Integer teamId);

    boolean existsByTeam_TeamIdAndUser_UserId(Integer teamId, Integer userId);
}
