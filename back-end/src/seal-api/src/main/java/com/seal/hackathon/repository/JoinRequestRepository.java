package com.seal.hackathon.repository;

import com.seal.hackathon.entity.JoinRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JoinRequestRepository extends JpaRepository<JoinRequest, Integer> {

    Optional<JoinRequest> findByTeam_TeamIdAndRequester_UserId(Integer teamId, Integer userId);

    /** Requests the participant has sent, by status. */
    List<JoinRequest> findByRequester_UserIdAndStatus(Integer userId, String status);

    /** All requests the participant has sent (any status), newest first. */
    List<JoinRequest> findByRequester_UserIdOrderByCreatedAtDesc(Integer userId);

    /** Pending requests addressed to a specific team (leader's inbox). */
    List<JoinRequest> findByTeam_TeamIdAndStatus(Integer teamId, String status);

    boolean existsByTeam_TeamIdAndRequester_UserIdAndStatus(Integer teamId, Integer userId, String status);
}
