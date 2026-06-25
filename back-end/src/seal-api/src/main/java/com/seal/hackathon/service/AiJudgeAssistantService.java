package com.seal.hackathon.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.seal.hackathon.dto.RepoDigest;
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

import java.util.ArrayList;
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
    private final GitHubRepoService gitHubRepoService;
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
            "Nội dung do AI (Gemini) tạo ra dựa trên mô tả và liên kết của bài nộp. "
            + "Chỉ mang tính tham khảo, không thay thế đánh giá của giám khảo và không tự động chấm điểm.";

    @Transactional(readOnly = true)
    public AiInsightResponse analyzeSubmission(Integer submissionId) {
        if (apiKey == null || apiKey.isBlank() || apiKey.startsWith("your-")) {
            throw new BadRequestException(
                    "AI Judge Assistant chưa được cấu hình. Hãy đặt GEMINI_API_KEY trong file .env của backend.");
        }

        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));

        if (isBlank(submission.getDescription())
                && isBlank(submission.getRepoUrl())
                && isBlank(submission.getDemoUrl())
                && isBlank(submission.getSlideUrl())) {
            throw new BadRequestException(
                    "Bài nộp này không có mô tả hoặc liên kết nào để AI phân tích.");
        }

        List<ScoringCriteria> criteria = scoringCriteriaRepository
                .findAllByRound_RoundIdOrderByOrderNumber(submission.getRound().getRoundId());

        // Read the participant's GitHub repo (anonymized). Never throws: on any
        // problem the digest reports analyzed=false and we fall back to text-only.
        RepoDigest digest = gitHubRepoService.analyze(submission.getRepoUrl());

        String prompt = buildPrompt(submission, criteria, digest);
        String rawJson = callGemini(prompt);
        AiInsightResponse insight = parseInsight(rawJson);
        insight.setRepo(buildRepoAnalysis(digest));
        insight.setDisclaimer(DISCLAIMER);
        insight.setModel(model);
        return insight;
    }

    // ── Repo analysis block (deterministic, built from real GitHub data) ──

    /**
     * Turn the GitHub digest into the response's {@code repo} block. These are
     * facts read straight from GitHub (not the model), so a judge can trust the
     * tech stack / signals / red flags without worrying about hallucination.
     */
    // Static + package-private: pure mapping from digest → response block, unit-tested directly.
    static AiInsightResponse.RepoAnalysis buildRepoAnalysis(RepoDigest d) {
        if (d == null || !d.isAnalyzed()) {
            return AiInsightResponse.RepoAnalysis.builder()
                    .analyzed(false)
                    .note(d == null ? "Không phân tích được repository." : d.getNote())
                    .techStack(List.of())
                    .signals(List.of())
                    .redFlags(List.of())
                    .build();
        }

        List<String> signals = new ArrayList<>();
        if (d.isHasReadme()) signals.add("Có README");
        if (d.isHasTests()) signals.add("Có bộ test tự động");
        if (d.isHasCi()) signals.add("Có CI/CD (tự động build/kiểm thử)");
        if (d.isHasDocs()) signals.add("Có tài liệu (thư mục docs hoặc nhiều file .md)");
        if (d.getManifests() != null && !d.getManifests().isEmpty()) {
            signals.add("Quản lý dependency: " + String.join(", ", d.getManifests()));
        }
        if (d.getLicense() != null) signals.add("Giấy phép: " + d.getLicense());
        if (d.getCommitCount() != null) {
            signals.add(commitSignal(d));
        }
        if (d.getFileCount() > 0) signals.add(d.getFileCount() + " file trong repo");

        List<String> redFlags = new ArrayList<>();
        if (d.isFork()) {
            redFlags.add("Repo là một bản FORK — cần xác minh phần code do đội tự viết.");
        }
        if (d.isArchived()) {
            redFlags.add("Repo đã được ARCHIVE (đóng băng).");
        }
        if (d.getFileCount() <= 2 || d.getSizeKb() == 0) {
            redFlags.add("Repo gần như TRỐNG — rất ít nội dung mã nguồn.");
        }
        if (!d.isHasReadme()) {
            redFlags.add("Không có README mô tả dự án.");
        }
        if (d.getCommitCount() != null && d.getCommitCount() <= 2) {
            redFlags.add("Toàn bộ code dồn trong " + d.getCommitCount()
                    + " commit — có thể là upload một lần, không phản ánh quá trình làm việc.");
        } else if (d.getCommitCount() != null && d.getCommitCount() > 2
                && d.getFirstCommitDate() != null
                && d.getFirstCommitDate().equals(d.getLastCommitDate())) {
            redFlags.add("Tất cả commit nằm trong cùng một ngày (" + d.getLastCommitDate() + ").");
        }

        return AiInsightResponse.RepoAnalysis.builder()
                .analyzed(true)
                .note(null)
                .techStack(d.getLanguages() == null ? List.of() : d.getLanguages())
                .signals(signals)
                .redFlags(redFlags)
                .build();
    }

    private static String commitSignal(RepoDigest d) {
        StringBuilder sb = new StringBuilder(d.getCommitCount() + " commit");
        if (d.getFirstCommitDate() != null && d.getLastCommitDate() != null) {
            if (d.getFirstCommitDate().equals(d.getLastCommitDate())) {
                sb.append(" (").append(d.getLastCommitDate()).append(")");
            } else {
                sb.append(" (").append(d.getFirstCommitDate())
                  .append(" → ").append(d.getLastCommitDate()).append(")");
            }
        }
        return sb.toString();
    }

    // ── Prompt ──────────────────────────────────────────────────────────

    private String buildPrompt(Submission s, List<ScoringCriteria> criteria, RepoDigest digest) {
        StringBuilder sb = new StringBuilder();
        sb.append("Bạn là trợ lý chấm điểm cho một cuộc thi hackathon kỹ thuật phần mềm. ")
          .append("Hãy đọc bài nộp dưới đây — GỒM CẢ DỮ LIỆU MÃ NGUỒN TỪ REPOSITORY — và đưa ra nhận định ")
          .append("khách quan, ngắn gọn, bằng tiếng Việt, giúp giám khảo định hướng trước khi tự chấm điểm.\n\n")
          .append("QUAN TRỌNG:\n")
          .append("- Việc chấm điểm là ẩn danh: KHÔNG suy đoán hay bịa ra tên đội, tên thành viên, trường học. ")
          .append("Nếu README hay code có chứa tên người, TUYỆT ĐỐI không nhắc lại trong câu trả lời.\n")
          .append("- KHÔNG tự quyết định điểm cuối cùng; chỉ gợi ý khoảng điểm tham khảo.\n")
          .append("- Hãy bám vào DỮ LIỆU REPOSITORY thật được cung cấp (cấu trúc thư mục, tech stack, README). ")
          .append("Nếu mã nguồn có vẻ KHÔNG khớp với mô tả dự án, hãy nêu trong phần 'concerns'.\n")
          .append("- Nếu thông tin thiếu hoặc không đọc được repo, hãy nói rõ là chưa đủ dữ liệu thay vì bịa đặt.\n\n");

        sb.append("THÔNG TIN BÀI NỘP\n");
        sb.append("Vòng thi: ").append(safe(s.getRound().getName())).append("\n");
        sb.append("Mô tả dự án: ").append(isBlank(s.getDescription()) ? "(không có)" : s.getDescription().trim()).append("\n");
        sb.append("Repository: ").append(isBlank(s.getRepoUrl()) ? "(không có)" : s.getRepoUrl()).append("\n");
        sb.append("Demo: ").append(isBlank(s.getDemoUrl()) ? "(không có)" : s.getDemoUrl()).append("\n");
        sb.append("Slide/Báo cáo: ").append(isBlank(s.getSlideUrl()) ? "(không có)" : s.getSlideUrl()).append("\n\n");

        appendRepoSection(sb, digest);

        sb.append("TIÊU CHÍ CHẤM ĐIỂM CỦA VÒNG NÀY\n");
        if (criteria.isEmpty()) {
            sb.append("(Vòng này chưa cấu hình tiêu chí — bỏ qua phần gợi ý theo tiêu chí.)\n");
        } else {
            for (ScoringCriteria c : criteria) {
                sb.append("- ").append(c.getName())
                  .append(" (điểm tối đa ").append(c.getMaxScore())
                  .append(", trọng số ").append(c.getWeight()).append("): ")
                  .append(isBlank(c.getDescription()) ? "" : c.getDescription().trim())
                  .append("\n");
            }
        }

        sb.append("\nTRẢ VỀ DUY NHẤT một đối tượng JSON theo đúng cấu trúc sau (không kèm văn bản ngoài JSON):\n")
          .append("{\n")
          .append("  \"summary\": \"2-3 câu tóm tắt trung lập về dự án\",\n")
          .append("  \"strengths\": [\"điểm mạnh 1\", \"điểm mạnh 2\"],\n")
          .append("  \"concerns\": [\"điểm cần lưu ý hoặc câu hỏi nên hỏi đội 1\", \"...\"],\n")
          .append("  \"criteriaInsights\": [\n")
          .append("    {\"criteriaName\": \"tên tiêu chí\", \"assessment\": \"nhận định ngắn theo tiêu chí\", \"suggestedScoreRange\": \"vd: 7-8 / 10\"}\n")
          .append("  ]\n")
          .append("}\n")
          .append("Mỗi tiêu chí ở trên phải có đúng một mục trong criteriaInsights. ")
          .append("suggestedScoreRange phải nằm trong khoảng từ 0 đến điểm tối đa của tiêu chí đó.");

        return sb.toString();
    }

    /** Append the anonymized GitHub repo digest so the model grounds its reading in real code. */
    private void appendRepoSection(StringBuilder sb, RepoDigest d) {
        sb.append("DỮ LIỆU MÃ NGUỒN TỪ REPOSITORY (đã ẩn danh — không chứa tên tác giả)\n");
        if (d == null || !d.isAnalyzed()) {
            sb.append("(Không đọc được mã nguồn: ")
              .append(d == null || isBlank(d.getNote()) ? "không rõ lý do" : d.getNote())
              .append(". Chỉ phân tích dựa trên mô tả và liên kết.)\n\n");
            return;
        }

        if (!isBlank(d.getDescription())) {
            sb.append("Mô tả trên GitHub: ").append(d.getDescription().trim()).append("\n");
        }
        if (d.getLanguages() != null && !d.getLanguages().isEmpty()) {
            sb.append("Ngôn ngữ/tech stack: ").append(String.join(", ", d.getLanguages())).append("\n");
        }
        if (d.getManifests() != null && !d.getManifests().isEmpty()) {
            sb.append("Manifest dependency: ").append(String.join(", ", d.getManifests())).append("\n");
        }
        sb.append("Cấu trúc: ")
          .append(d.isHasTests() ? "có test, " : "không thấy test, ")
          .append(d.isHasCi() ? "có CI/CD, " : "không có CI/CD, ")
          .append(d.isHasDocs() ? "có docs, " : "ít/không có docs, ")
          .append(d.isHasReadme() ? "có README" : "không có README").append("\n");
        if (d.isFork()) sb.append("LƯU Ý: repo này là một bản FORK.\n");
        if (d.getCommitCount() != null) {
            sb.append("Số commit: ").append(d.getCommitCount());
            if (d.getFirstCommitDate() != null && d.getLastCommitDate() != null) {
                sb.append(" (từ ").append(d.getFirstCommitDate())
                  .append(" đến ").append(d.getLastCommitDate()).append(")");
            }
            sb.append("\n");
        }
        if (d.getTopLevelEntries() != null && !d.getTopLevelEntries().isEmpty()) {
            sb.append("Thư mục/file gốc: ").append(String.join(", ", d.getTopLevelEntries())).append("\n");
        }
        if (!isBlank(d.getReadmeExcerpt())) {
            sb.append("\n--- TRÍCH README ---\n").append(d.getReadmeExcerpt()).append("\n--- HẾT README ---\n");
        }
        sb.append("\n");
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
                // Only retry on 503 (transient overload). A 429 means the quota is
                // exhausted — retrying would just burn more quota without helping, so
                // fail fast and let the caller switch model / wait / enable billing.
                if (status == 503 && attempt < MAX_ATTEMPTS) {
                    sleepQuietly(attempt * 1500L);
                    lastError = e;
                    continue;
                }
                // Non-retryable, or out of attempts: surface a short, clear message.
                throw new BadRequestException(describeGeminiError(e));
            } catch (Exception e) {
                throw new BadRequestException("Không gọi được dịch vụ AI (Gemini): " + e.getMessage());
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
                throw new BadRequestException("AI không trả về nội dung. Vui lòng thử lại.");
            }
            return text.asText();
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("AI trả về phản hồi không đọc được. Vui lòng thử lại.");
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
            case 503 -> "Model \"" + model + "\" đang quá tải (503). Vui lòng bấm AI ASSIST lại sau ít giây, "
                    + "hoặc đổi GEMINI_MODEL trong .env (vd: gemini-flash-latest).";
            case 429 -> "Gemini đã hết hạn mức (429) cho model \"" + model + "\". "
                    + "Hãy đổi GEMINI_MODEL trong .env (vd: gemini-2.5-flash) hoặc bật billing cho project.";
            case 404 -> "Model \"" + model + "\" không khả dụng với key này (404). "
                    + "Đổi GEMINI_MODEL trong .env sang model khác (vd: gemini-2.5-flash).";
            case 400, 401, 403 -> (apiMsg != null && apiMsg.toLowerCase().contains("api key"))
                    ? "Gemini API key không hợp lệ. Kiểm tra lại GEMINI_API_KEY trong .env."
                    : "Gemini từ chối yêu cầu (" + status + "): " + shorten(apiMsg, 200);
            default -> "Gemini lỗi (" + status + "): " + shorten(apiMsg, 200);
        };
    }

    private static String shorten(String s, int max) {
        if (s == null || s.isBlank()) return "không rõ chi tiết";
        String oneLine = s.replaceAll("\\s+", " ").trim();
        return oneLine.length() <= max ? oneLine : oneLine.substring(0, max) + "…";
    }

    private AiInsightResponse parseInsight(String json) {
        try {
            return objectMapper.readValue(json, AiInsightResponse.class);
        } catch (Exception e) {
            throw new BadRequestException("AI trả về dữ liệu không hợp lệ. Vui lòng thử lại.");
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
