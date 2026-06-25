package com.seal.hackathon.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.seal.hackathon.dto.response.AiInsightResponse;
import com.seal.hackathon.entity.ScoringCriteria;
import com.seal.hackathon.entity.Submission;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.ScoringCriteriaRepository;
import com.seal.hackathon.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

/**
 * AI Judge Assistant — generates an advisory reading of a submission to help a
 * judge orient before scoring. Backed by Google Gemini.
 *
 * Design constraints:
 * - Anonymity-safe: the prompt never includes team name or member identity, so
 *   it stays compatible with the anonymous judging flow.
 * - Advisory only: returns notes + suggested score RANGES; it never writes scores.
 */
@Service
@RequiredArgsConstructor
public class AiJudgeAssistantService {

    private final SubmissionRepository submissionRepository;
    private final ScoringCriteriaRepository scoringCriteriaRepository;
    // Constructed directly (not injected): Spring Boot 4's webmvc starter does not
    // expose an ObjectMapper bean by default, and a plain mapper is all we need
    // for parsing Gemini's JSON. The initializer also excludes it from the
    // Lombok @RequiredArgsConstructor, so no bean lookup is attempted.
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.ai.gemini.api-key:}")
    private String apiKey;

    @Value("${app.ai.gemini.model:gemini-2.0-flash}")
    private String model;

    @Value("${app.ai.gemini.base-url:https://generativelanguage.googleapis.com/v1beta}")
    private String baseUrl;

    /** Transient errors (503/429) are retried this many times before failing. */
    private static final int MAX_ATTEMPTS = 3;

    private static final String DISCLAIMER =
            "AI (Gemini)-generated from the submission's description and links. "
            + "For reference only — it does not replace the judge's evaluation and does not auto-score.";

    @Transactional(readOnly = true)
    public AiInsightResponse analyzeSubmission(Integer submissionId) {
        if (apiKey == null || apiKey.isBlank() || apiKey.startsWith("your-")) {
            throw new BadRequestException(
                    "AI Judge Assistant is not configured. Set GEMINI_API_KEY in the backend's .env file.");
        }

        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));

        if (isBlank(submission.getDescription())
                && isBlank(submission.getRepoUrl())
                && isBlank(submission.getDemoUrl())
                && isBlank(submission.getSlideUrl())) {
            throw new BadRequestException(
                    "This submission has no description or links for the AI to analyze.");
        }

        List<ScoringCriteria> criteria = scoringCriteriaRepository
                .findAllByRound_RoundIdOrderByOrderNumber(submission.getRound().getRoundId());

        String prompt = buildPrompt(submission, criteria);
        String rawJson = callGemini(prompt);
        AiInsightResponse insight = parseInsight(rawJson);
        insight.setDisclaimer(DISCLAIMER);
        insight.setModel(model);
        return insight;
    }

    // ── Prompt ──────────────────────────────────────────────────────────

    private String buildPrompt(Submission s, List<ScoringCriteria> criteria) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are a scoring assistant for a software-engineering hackathon. ")
          .append("Read the submission below and give an objective, concise assessment in English ")
          .append("to help the judge orient themselves before scoring on their own.\n\n")
          .append("IMPORTANT:\n")
          .append("- Scoring is anonymous: do NOT guess or invent team names, member names, or schools.\n")
          .append("- Do NOT decide the final score; only suggest a reference score range.\n")
          .append("- If information is missing, state clearly that there is not enough data instead of making things up.\n\n");

        sb.append("SUBMISSION INFO\n");
        sb.append("Round: ").append(safe(s.getRound().getName())).append("\n");
        sb.append("Project description: ").append(isBlank(s.getDescription()) ? "(none)" : s.getDescription().trim()).append("\n");
        sb.append("Repository: ").append(isBlank(s.getRepoUrl()) ? "(none)" : s.getRepoUrl()).append("\n");
        sb.append("Demo: ").append(isBlank(s.getDemoUrl()) ? "(none)" : s.getDemoUrl()).append("\n");
        sb.append("Slides/Report: ").append(isBlank(s.getSlideUrl()) ? "(none)" : s.getSlideUrl()).append("\n\n");

        sb.append("SCORING CRITERIA FOR THIS ROUND\n");
        if (criteria.isEmpty()) {
            sb.append("(No criteria configured for this round — skip the per-criteria suggestions.)\n");
        } else {
            for (ScoringCriteria c : criteria) {
                sb.append("- ").append(c.getName())
                  .append(" (max score ").append(c.getMaxScore())
                  .append(", weight ").append(c.getWeight()).append("): ")
                  .append(isBlank(c.getDescription()) ? "" : c.getDescription().trim())
                  .append("\n");
            }
        }

        sb.append("\nRETURN ONLY a single JSON object with exactly this structure (no text outside the JSON):\n")
          .append("{\n")
          .append("  \"summary\": \"2-3 neutral sentences summarizing the project\",\n")
          .append("  \"strengths\": [\"strength 1\", \"strength 2\"],\n")
          .append("  \"concerns\": [\"a concern or a question to ask the team 1\", \"...\"],\n")
          .append("  \"criteriaInsights\": [\n")
          .append("    {\"criteriaName\": \"criteria name\", \"assessment\": \"short assessment for this criteria\", \"suggestedScoreRange\": \"e.g. 7-8 / 10\"}\n")
          .append("  ]\n")
          .append("}\n")
          .append("Each criteria above must have exactly one entry in criteriaInsights. ")
          .append("suggestedScoreRange must be within 0 to that criteria's max score. ")
          .append("Write all text values in English.");

        return sb.toString();
    }

    // ── Gemini call ─────────────────────────────────────────────────────

    private String callGemini(String prompt) {
        String url = baseUrl + "/models/" + model + ":generateContent?key=" + apiKey;

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of(
                        "temperature", 0.4,
                        "responseMimeType", "application/json"));

        // gemini-2.5-flash occasionally returns 503 (overloaded) or a transient
        // 429 under load. These usually clear in a second or two, so retry a few
        // times with a short backoff before giving up.
        String response = null;
        RestClientResponseException lastError = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                response = RestClient.create()
                        .post()
                        .uri(url)
                        .header("Content-Type", "application/json")
                        .body(body)
                        .retrieve()
                        .body(String.class);
                break; // success
            } catch (RestClientResponseException e) {
                int status = e.getStatusCode().value();
                if ((status == 503 || status == 429) && attempt < MAX_ATTEMPTS) {
                    sleepQuietly(attempt * 1500L);
                    lastError = e;
                    continue;
                }
                // Non-retryable, or out of attempts: surface a short, clear message.
                throw new BadRequestException(describeGeminiError(e));
            } catch (Exception e) {
                throw new BadRequestException("Could not reach the AI service (Gemini): " + e.getMessage());
            }
        }
        if (response == null) {
            // Exhausted retries on a transient error.
            throw new BadRequestException(describeGeminiError(lastError));
        }

        try {
            JsonNode root = objectMapper.readTree(response);
            JsonNode text = root.path("candidates").path(0)
                    .path("content").path("parts").path(0).path("text");
            if (text.isMissingNode() || text.asText().isBlank()) {
                throw new BadRequestException("The AI returned no content. Please try again.");
            }
            return text.asText();
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("The AI returned an unreadable response. Please try again.");
        }
    }

    /** Turn a Gemini HTTP error into a short, user-facing hint. */
    private String describeGeminiError(RestClientResponseException e) {
        int status = e.getStatusCode().value();
        String apiMsg = null;
        try {
            JsonNode err = objectMapper.readTree(e.getResponseBodyAsString()).path("error");
            if (err.hasNonNull("message")) {
                apiMsg = err.path("message").asText();
            }
        } catch (Exception ignore) {
            // body wasn't JSON — fall through to the status-based message
        }

        return switch (status) {
            case 503 -> "Model \"" + model + "\" is overloaded (503). Please click AI ASSIST again in a few seconds, "
                    + "or change GEMINI_MODEL in .env (e.g. gemini-flash-latest).";
            case 429 -> "Gemini quota exceeded (429) for model \"" + model + "\". "
                    + "Change GEMINI_MODEL in .env (e.g. gemini-2.5-flash) or enable billing for the project.";
            case 404 -> "Model \"" + model + "\" is not available for this key (404). "
                    + "Change GEMINI_MODEL in .env to another model (e.g. gemini-2.5-flash).";
            case 400, 401, 403 -> (apiMsg != null && apiMsg.toLowerCase().contains("api key"))
                    ? "Invalid Gemini API key. Check GEMINI_API_KEY in .env."
                    : "Gemini rejected the request (" + status + "): " + shorten(apiMsg, 200);
            default -> "Gemini error (" + status + "): " + shorten(apiMsg, 200);
        };
    }

    private static String shorten(String s, int max) {
        if (s == null || s.isBlank()) return "no details";
        String oneLine = s.replaceAll("\\s+", " ").trim();
        return oneLine.length() <= max ? oneLine : oneLine.substring(0, max) + "…";
    }

    private AiInsightResponse parseInsight(String json) {
        try {
            return objectMapper.readValue(json, AiInsightResponse.class);
        } catch (Exception e) {
            throw new BadRequestException("The AI returned invalid data. Please try again.");
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static String safe(String s) {
        return s == null ? "" : s;
    }

    private static void sleepQuietly(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
