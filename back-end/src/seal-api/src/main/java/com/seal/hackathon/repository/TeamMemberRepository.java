package com.seal.hackathon.repository;

import com.seal.hackathon.entity.TeamMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamMemberRepository extends JpaRepository<TeamMember, Integer> {
    boolean existsByUser_UserIdAndTeam_Event_EventId(Integer userId, Integer eventId);

    /** Find all teams that a user belongs to, filtered by event status (e.g. OPEN, IN_PROGRESS) */
    List<TeamMember> findByUser_UserIdAndTeam_Event_StatusIn(Integer userId, List<String> statuses);

    /** Find all members of a specific team */
    List<TeamMember> findByTeam_TeamId(Integer teamId);
}
