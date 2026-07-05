package com.seal.hackathon.security.oauth2;

import com.seal.hackathon.security.JwtService;
import com.seal.hackathon.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;

/**
 * Called after a successful OAuth2 login.
 *
 * Checks is_approved before issuing a JWT.
 * On success: redirects to {frontend}/oauth2/redirect?token=JWT_TOKEN
 * On failure: redirects to {frontend}/login?error=REASON
 */
@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final JwtService jwtService;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException {

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();

        // First-time OAuth users haven't picked their account type yet — let them in
        // (token issued) so they can finish on the complete-profile screen. The
        // approval gate applies only once their profile is complete.
        boolean profileIncomplete = "PENDING_PROFILE".equals(principal.getUserType());

        if (!profileIncomplete) {
            if (!principal.isApproved()) {
                // Account created but not yet approved by a coordinator
                response.sendRedirect(frontendUrl + "/login?error=ACCOUNT_NOT_APPROVED");
                return;
            }
        }

        List<String> roles = principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .map(a -> a.replace("ROLE_", ""))
                .toList();

        String token = jwtService.generateToken(principal, principal.getUserId(), roles);

        response.sendRedirect(frontendUrl + "/oauth2/redirect?token=" + token);
    }
}
