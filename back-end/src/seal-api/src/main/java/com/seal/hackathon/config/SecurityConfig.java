package com.seal.hackathon.config;

import com.seal.hackathon.security.JwtAuthenticationEntryPoint;
import com.seal.hackathon.security.JwtAuthenticationFilter;
import com.seal.hackathon.security.oauth2.CustomOAuth2UserService;
import com.seal.hackathon.security.oauth2.OAuth2LoginSuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Main Spring Security configuration.
 *
 * Key decisions:
 * - CSRF disabled: REST API uses JWT, not session cookies.
 * - Stateless sessions: JWT carries state, no server-side session needed.
 * - JWT filter runs before UsernamePasswordAuthenticationFilter.
 * - OAuth2 login redirects to frontend with token on success.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity                   // enables @PreAuthorize on controller methods
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF — not needed for stateless REST + JWT
            .csrf(AbstractHttpConfigurer::disable)

            // Enable CORS with the configuration below
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // No HTTP session — all auth state lives in the JWT
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // Return JSON 401 instead of redirect to /login
            .exceptionHandling(ex ->
                ex.authenticationEntryPoint(jwtAuthenticationEntryPoint))

            // URL-level authorization rules
            .authorizeHttpRequests(auth -> auth
                // Public: auth endpoints
                .requestMatchers("/api/auth/**").permitAll()
                // Public: OAuth2 flow
                .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                // Public: error page
                .requestMatchers("/error").permitAll()
                // Public: Swagger UI (remove in production if desired)
                .requestMatchers("/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                // Public: list all hackathon events
                .requestMatchers("/api/events/**").permitAll()
                // Coordinator manages approvals, user activation, and role assignments
                .requestMatchers("/api/account-approvals/**").hasRole("EVENT_COORDINATOR")
                .requestMatchers("/api/users/**").hasRole("EVENT_COORDINATOR")
                // Participants access team and submission endpoints
                .requestMatchers("/api/teams/**", "/api/submissions/**")
                    .hasAnyRole("PARTICIPANT", "EVENT_COORDINATOR")
                // Judges access scoring endpoints
                .requestMatchers("/api/scores/**", "/api/judge/**").hasAnyRole("JUDGE", "EVENT_COORDINATOR")
                // Mentors access mentor endpoints
                .requestMatchers("/api/mentor/**").hasAnyRole("MENTOR", "EVENT_COORDINATOR")
                // Everything else must be authenticated
                .anyRequest().authenticated()
            )

            // OAuth2 login configuration
            .oauth2Login(oauth2 -> oauth2
                // Where the frontend sends user to start OAuth2 flow
                .authorizationEndpoint(a -> a.baseUri("/oauth2/authorization"))
                // Where Google/GitHub redirect back to
                .redirectionEndpoint(r -> r.baseUri("/login/oauth2/code/*"))
                // Our custom user service creates/updates the User entity
                .userInfoEndpoint(u -> u.userService(customOAuth2UserService))
                // On success: generate JWT and redirect to frontend
                .successHandler(oAuth2LoginSuccessHandler)
            )

            // JWT validation runs before Spring Security's default auth filter
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Allow requests from React dev server
        config.setAllowedOrigins(List.of("http://localhost:5173"));

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));

        // Required if frontend sends cookies (not needed for JWT but good practice)
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
