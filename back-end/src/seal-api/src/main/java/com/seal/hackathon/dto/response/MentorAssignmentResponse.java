package com.seal.hackathon.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO cho Mentor xem danh sách team mình đang quản lý.
 *
 * Cấu trúc:
 * - mentorId, mentorName: thông tin mentor
 * - eventName: sự kiện hackathon
 * - teams: danh sách các team được gán cho mentor
 *   - mỗi team bao gồm: teamId, teamName, trackName, thành viên, thời gian gán
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MentorAssignmentResponse {

    private Integer mentorId;
    private String mentorName;
    private String eventName;
    private List<AssignedTeamInfo> teams;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssignedTeamInfo {
        private Integer teamId;
        private String teamName;
        private Integer trackId;
        private String trackName;
        private List<TeamMemberInfo> members;
        // Trạng thái nộp bài: số submission (không tính DRAFT) + thời điểm nộp gần nhất.
        private long submissionCount;
        private LocalDateTime lastSubmittedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamMemberInfo {
        private Integer userId;
        private String fullName;
        private String email;
        private String memberRole;  // LEADER hoặc MEMBER
    }
}
