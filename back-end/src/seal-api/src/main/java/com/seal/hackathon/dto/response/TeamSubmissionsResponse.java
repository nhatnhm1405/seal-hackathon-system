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
public class TeamSubmissionsResponse {
    private Integer teamId;
    private String teamName;
    private Integer total;
    private List<SubmissionSummaryResponse> submissions;
}
