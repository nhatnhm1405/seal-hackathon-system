package com.seal.hackathon.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A lightweight view of a team a participant may request to join, plus whether
 * the current participant already has a pending request for it.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JoinableTeamResponse {
    private Integer teamId;
    private String name;
    private Integer eventId;
    private String eventName;
    private Integer trackId;
    private String trackName;
    private String status;
    private Integer memberCount;
    private String leaderName;
    private boolean alreadyRequested;
}
