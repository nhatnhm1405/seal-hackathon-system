package com.seal.hackathon.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * AI Judge Assistant output for a single submission.
 *
 * Advisory only: this is a Gemini-generated reading of the submission's own
 * description + links, meant to help a judge orient quickly. It deliberately
 * carries NO team identity so it stays compatible with anonymous judging.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiInsightResponse {

    /** 2–3 sentence neutral overview of what the project appears to do. */
    private String summary;

    /** Notable strengths inferred from the submission. */
    private List<String> strengths;

    /** Risks / gaps / things a judge may want to probe. */
    private List<String> concerns;

    /** One advisory note per configured scoring criterion. */
    private List<CriteriaInsight> criteriaInsights;

    /** Fixed reminder that this is AI-generated guidance, not a score. */
    private String disclaimer;

    /** Which model produced this (for transparency / RBL provenance). */
    private String model;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CriteriaInsight {
        private String criteriaName;
        /** Short note tying the submission to this criterion. */
        private String assessment;
        /** Suggested range as a string, e.g. "7-8 / 10". Advisory, never auto-applied. */
        private String suggestedScoreRange;
    }
}
