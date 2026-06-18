package com.seal.hackathon.service;

import com.seal.hackathon.dto.response.SystemLogResponse;
import com.seal.hackathon.entity.SystemLog;
import com.seal.hackathon.entity.User;
import com.seal.hackathon.repository.SystemLogRepository;
import com.seal.hackathon.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Writes and reads platform/admin events (SystemLog). Admin operations call
 * {@link #record} to leave an audit trail; the System Log screen reads via
 * {@link #getAllLogs}. SYSTEM_ADMIN-only at the API layer.
 */
@Service
@RequiredArgsConstructor
public class SystemLogService {

    private final SystemLogRepository systemLogRepository;
    private final UserRepository userRepository;

    /**
     * Appends a system-log entry. The actor must be an existing user; the call
     * is a no-op trail and never blocks the business action that triggered it.
     */
    @Transactional
    public void record(Integer actorUserId, String action, String detail) {
        User actor = userRepository.findById(actorUserId).orElse(null);
        if (actor == null) {
            return; // best-effort logging — don't fail the caller over a missing actor
        }
        systemLogRepository.save(SystemLog.builder()
                .actor(actor)
                .action(action)
                .detail(detail)
                .build());
    }

    @Transactional(readOnly = true)
    public List<SystemLogResponse> getAllLogs() {
        return systemLogRepository.findAllWithActor().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private SystemLogResponse mapToResponse(SystemLog log) {
        return SystemLogResponse.builder()
                .logId(log.getLogId())
                .actorUserId(log.getActor().getUserId())
                .actorName(log.getActor().getFullName())
                .action(log.getAction())
                .detail(log.getDetail())
                .ipAddress(log.getIpAddress())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
