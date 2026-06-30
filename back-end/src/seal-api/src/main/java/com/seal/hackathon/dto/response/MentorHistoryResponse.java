package com.seal.hackathon.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MentorHistoryResponse {
    private Integer eventId;
    private String eventName;
    private String season;
    private Integer year;
    private String eventStatus;
    private List<TrackGroup> tracks;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrackGroup {
        private Integer trackId;
        private String trackName;
        private List<TeamResult> teams;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamResult {
        private Integer teamId;
        private String teamName;
        private String teamStatus;
        private Integer finalRank;
        private String prizeName;
    }
}
