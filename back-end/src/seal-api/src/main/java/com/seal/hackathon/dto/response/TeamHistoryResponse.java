package com.seal.hackathon.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamHistoryResponse {

    private Integer eventId;
    private String eventName;
    private String season;
    private Integer year;
    private String eventStatus;
    private Integer teamId;
    private String teamName;
    private String trackName;
    private String teamStatus;
    private String myRole;
    private List<MemberInfo> members;
    private List<RoundInfo> rounds;
    private List<SubmissionInfo> submissions;
    private PrizeInfo prize;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MemberInfo {
        private String fullName;
        private String role;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoundInfo {
        private String roundName;
        private Boolean isFinal;
        private Integer rankPosition;
        private Boolean advanced;
        private BigDecimal totalScore;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubmissionInfo {
        private String roundName;
        private String repoUrl;
        private String demoUrl;
        private String slideUrl;
        private LocalDateTime submittedAt;
        private String status;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PrizeInfo {
        private String name;
        private Integer rankPosition;
        private LocalDateTime awardedAt;
    }
}
