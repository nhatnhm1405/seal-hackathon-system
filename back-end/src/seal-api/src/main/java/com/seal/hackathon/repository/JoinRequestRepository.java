package com.seal.hackathon.repository;

import com.seal.hackathon.entity.JoinRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JoinRequestRepository extends JpaRepository<JoinRequest, Integer> {
    Optional<JoinRequest> findByTeam_TeamIdAndRequester_UserId(Integer teamId, Integer requesterUserId);
    List<JoinRequest> findByRequester_UserIdOrderByCreatedAtDesc(Integer requesterUserId);
    List<JoinRequest> findByTeam_TeamIdAndStatusOrderByCreatedAtDesc(Integer teamId, String status);
    List<JoinRequest> findByRequester_UserIdAndStatusAndTeam_Event_EventId(
            Integer requesterUserId,
            String status,
            Integer eventId
    );
}
