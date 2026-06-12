package com.seal.hackathon.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private Integer notificationId;
    private String title;
    private String content;
    private String type;
    private Integer relatedEventId;
    private String relatedEventName;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
