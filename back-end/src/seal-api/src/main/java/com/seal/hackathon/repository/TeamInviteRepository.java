package com.seal.hackathon.repository;

import com.seal.hackathon.entity.TeamInvite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamInviteRepository extends JpaRepository<TeamInvite, Integer> {
    List<TeamInvite> findByInvitedUser_UserIdAndStatus(Integer userId, String status);
    Optional<TeamInvite> findByTeam_TeamIdAndInvitedUser_UserId(Integer teamId, Integer userId);
    boolean existsByTeam_TeamIdAndInvitedUser_UserId(Integer teamId, Integer userId);
}
