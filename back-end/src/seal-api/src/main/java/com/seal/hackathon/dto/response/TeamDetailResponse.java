package com.seal.hackathon.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamDetailResponse {
    private Integer teamId;
    private Integer eventId;
    private String eventName;
    private Integer trackId;
    private String trackName;
    private String name;
    private String description;
    private String status;
    private String disqualifiedReason;
    private LocalDateTime disqualifiedAt;
    private LocalDateTime createdAt;
    private List<MemberInfo> members;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MemberInfo {
        private Integer userId;
        private String fullName;
        private String email;
        private String memberRole;
        private LocalDateTime joinedAt;
    }
}
