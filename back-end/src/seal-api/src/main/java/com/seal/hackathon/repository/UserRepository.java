package com.seal.hackathon.repository;

import com.seal.hackathon.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    // Find a user who previously logged in via OAuth2 with this provider + provider
    // ID
    Optional<User> findByProviderAndProviderId(String provider, String providerId);

    // Users awaiting coordinator approval
    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.userEventRoles WHERE u.isApproved = false AND u.isActive = true")
    List<User> findAllByIsApprovedFalseAndIsActiveTrue();

    // Fetch user together with all their roles to avoid N+1 in auth paths
    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.userEventRoles WHERE u.email = :email")
    Optional<User> findByEmailWithRoles(String email);

    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.userEventRoles WHERE u.userId = :userId")
    Optional<User> findByIdWithRoles(Integer userId);

    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.userEventRoles")
    List<User> findAllWithRoles();
}
