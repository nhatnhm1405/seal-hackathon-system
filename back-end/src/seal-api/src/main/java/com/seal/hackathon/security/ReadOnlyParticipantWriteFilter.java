package com.seal.hackathon.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.seal.hackathon.dto.response.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

@Component
public class ReadOnlyParticipantWriteFilter extends OncePerRequestFilter {

    private static final Set<String> READ_METHODS = Set.of("GET", "HEAD", "OPTIONS");
    private static final Set<String> STUDENT_TYPES = Set.of("FPT_STUDENT", "EXTERNAL_STUDENT");

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!shouldBlock(request, principal)) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(),
                ApiResponse.error("Your account is read-only. Request participation access from a System Admin."));
    }

    private boolean shouldBlock(HttpServletRequest request, UserPrincipal principal) {
        if (READ_METHODS.contains(request.getMethod())) {
            return false;
        }
        if (principal.isActive()) {
            return false;
        }
        if (principal.getUserType() == null || !STUDENT_TYPES.contains(principal.getUserType().toUpperCase())) {
            return false;
        }

        String path = request.getRequestURI();
        return !(("POST".equals(request.getMethod()) && "/api/auth/logout".equals(path))
                || ("POST".equals(request.getMethod()) && "/api/participation-requests".equals(path))
                || ("PUT".equals(request.getMethod()) && "/api/auth/me".equals(path))
                || (("POST".equals(request.getMethod()) || "DELETE".equals(request.getMethod()))
                && "/api/auth/me/avatar".equals(path)));
    }
}
