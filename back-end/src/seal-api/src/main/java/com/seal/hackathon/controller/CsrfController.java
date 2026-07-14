package com.seal.hackathon.controller;

import com.seal.hackathon.dto.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Bootstrap endpoint the SPA hits before its first state-changing request.
 *
 * The token is returned in JSON because production serves the SPA and API from
 * different subdomains. The browser still stores the API host's CSRF cookie, but
 * frontend JavaScript cannot reliably read that cookie via document.cookie.
 */
@RestController
public class CsrfController {

    private final CsrfTokenRepository csrfTokenRepository;

    public CsrfController(CsrfTokenRepository csrfTokenRepository) {
        this.csrfTokenRepository = csrfTokenRepository;
    }

    @GetMapping("/api/csrf")
    public ResponseEntity<ApiResponse<Map<String, String>>> csrf(
            HttpServletRequest request,
            HttpServletResponse response) {
        CsrfToken csrfToken = csrfTokenRepository.loadToken(request);
        if (csrfToken == null) {
            csrfToken = csrfTokenRepository.generateToken(request);
            csrfTokenRepository.saveToken(csrfToken, request, response);
        }

        return ResponseEntity.ok(ApiResponse.success(
                "CSRF token issued.",
                Map.of("token", csrfToken.getToken())));
    }
}
