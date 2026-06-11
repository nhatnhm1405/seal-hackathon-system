package com.seal.hackathon.dto.response;

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
public class TeamListResponse {

    private Integer eventId;
    private String eventName;
    private Integer trackId;
    private String trackName;
    private Integer total;
    private List<TeamSummaryResponse> teams;

}
