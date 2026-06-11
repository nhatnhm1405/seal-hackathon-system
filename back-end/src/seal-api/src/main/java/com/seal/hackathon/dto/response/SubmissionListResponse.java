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
public class SubmissionListResponse {
    private Integer eventId;
    private String eventName;
    private Integer roundId;
    private String roundName;
    private Integer total;
    private List<SubmissionSummaryResponse> submissions;
}
