package com.seal.hackathon.dto.response;

import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TeamDetailResponse {
    private Integer teamId;
    private Integer eventId;
    private String eventName;
    private Integer trackId;
    private String trackName;
    private String name;
    private String description;
    private String status;
    private String rejectedReason;
    private LocalDateTime rejectedAt;
    private String disqualifiedReason;
    private LocalDateTime disqualifiedAt;
    private LocalDateTime createdAt;
    private List<MemberInfo> members;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MemberInfo {
        private String fullName;
        private String role;
    }
}
