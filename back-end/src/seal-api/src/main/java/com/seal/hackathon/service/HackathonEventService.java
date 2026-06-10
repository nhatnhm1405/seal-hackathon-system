package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.CreateEventRequest;
import com.seal.hackathon.dto.request.UpdateEventRequest;
import com.seal.hackathon.dto.response.HackathonEventResponse;
import com.seal.hackathon.entity.HackathonEvent;
import com.seal.hackathon.entity.User;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.HackathonEventRepository;
import com.seal.hackathon.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Business-logic layer for HackathonEvent operations.
 */
@Service
@RequiredArgsConstructor
public class HackathonEventService {

    private final HackathonEventRepository hackathonEventRepository;
    private final UserRepository userRepository;

    /**
     * Returns every HackathonEvent in the database, sorted by createdAt descending
     * (newest first).
     */
    @Transactional(readOnly = true)
    public List<HackathonEventResponse> getAllHackathonEvents() {
        List<HackathonEvent> events = hackathonEventRepository
                .findAll(Sort.by(Sort.Direction.DESC, "createdAt"));

        return events.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Returns a specific HackathonEvent by its ID.
     */
    @Transactional(readOnly = true)
    public HackathonEventResponse getHackathonEventById(Integer eventId) {
        HackathonEvent event = hackathonEventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Hackathon Event not found with id: " + eventId));
        return mapToResponse(event);
    }

    /**
     * Creates a new HackathonEvent.
     */
    @Transactional
    public HackathonEventResponse createHackathonEvent(CreateEventRequest request, Integer createdByUserId) {
        User creator = userRepository.findById(createdByUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + createdByUserId));
        HackathonEvent event = HackathonEvent.builder()
                .name(request.getName())
                .season(request.getSeason())
                .year(request.getYear())
                .description(request.getDescription())
                .registrationStart(request.getRegistrationStart())
                .registrationEnd(request.getRegistrationEnd())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .status("DRAFT")
                .createdBy(creator)
                .build();
        // Check past date cho CẢ 4 mốc thời gian khi tạo mới
        validateEventRules(event, true, true, true, true);
        event = hackathonEventRepository.save(event);
        return mapToResponse(event);
    }

    /**
     * Maps a HackathonEvent entity to the HackathonEventResponse DTO.
     */
    private HackathonEventResponse mapToResponse(HackathonEvent event) {
        return HackathonEventResponse.builder()
                .eventId(event.getEventId())
                .name(event.getName())
                .season(event.getSeason())
                .year(event.getYear())
                .description(event.getDescription())
                .registrationStart(event.getRegistrationStart())
                .registrationEnd(event.getRegistrationEnd())
                .startDate(event.getStartDate())
                .endDate(event.getEndDate())
                .status(event.getStatus())
                .createdBy(event.getCreatedBy() != null ? event.getCreatedBy().getUserId() : null)
                .createdByName(event.getCreatedBy() != null ? event.getCreatedBy().getFullName() : null)
                .createdAt(event.getCreatedAt())
                .build();
    }

    private void validateEventRules(HackathonEvent event, boolean checkPastRegStart, boolean checkPastRegEnd,
            boolean checkPastStartDate, boolean checkPastEndDate) {

        // validate cac ngay
        if (!event.getRegistrationEnd().isAfter(event.getRegistrationStart())) {
            throw new BadRequestException("Registration end date must be after registration start date.");
        }
        if (!event.getStartDate().isAfter(event.getRegistrationEnd())) {
            throw new BadRequestException("Start date must be after registration end date");
        }
        if (!event.getEndDate().isAfter(event.getStartDate())) {
            throw new BadRequestException("End date must be after start date");
        }

        // 2. Validate tất cả ngảy phải nằm trong cùng 1 năm của sự kiện
        int eventYear = event.getYear();
        if (event.getRegistrationStart().getYear() != eventYear)
            throw new BadRequestException("Registration start date must be in year " + eventYear);
        if (event.getRegistrationEnd().getYear() != eventYear)
            throw new BadRequestException("Registration end date must be in year " + eventYear);
        if (event.getStartDate().getYear() != eventYear)
            throw new BadRequestException("Start date must be in year" + eventYear);
        if (event.getEndDate().getYear() != eventYear)
            throw new BadRequestException("End date must be in year " + eventYear);

        // 3. Validate realtime/past date

        LocalDateTime now = LocalDateTime.now();
        String pastDateErrorMsg = "Events date must not be in the past";

        if (checkPastRegStart && event.getRegistrationStart().isBefore(now))
            throw new BadRequestException(pastDateErrorMsg);
        if (checkPastRegEnd && event.getRegistrationEnd().isBefore(now))
            throw new BadRequestException(pastDateErrorMsg);
        if (checkPastStartDate && event.getStartDate().isBefore(now))
            throw new BadRequestException(pastDateErrorMsg);
        if (checkPastEndDate && event.getEndDate().isBefore(now))
            throw new BadRequestException(pastDateErrorMsg);

        // 4. Validate and normalize season
        if (event.getSeason() != null) {
            String normalizedSeason = event.getSeason().toUpperCase();
            if (!normalizedSeason.equals("SPRING") && !normalizedSeason.equals("FALL")
                    && !normalizedSeason.equals("SUMMER")) {
                throw new BadRequestException("Invalid season. Allowed values are SPRING, SUMMER and FALL.");
            }
            event.setSeason(normalizedSeason);

            // Kiem tra thang cua start date co nam trong season khong
            int startMonth = event.getStartDate().getMonthValue();
            boolean isMatch = false;
            if ("SPRING".equals(normalizedSeason) && startMonth >= 1 && startMonth <= 4)
                isMatch = true;
            else if ("SUMMER".equals(normalizedSeason) && startMonth >= 5 && startMonth <= 8)
                isMatch = true;
            else if ("FALL".equals(normalizedSeason) && startMonth >= 9 && startMonth <= 12)
                isMatch = true;

            if (!isMatch) {
                throw new BadRequestException("Start date does not match the selected season");
            }
        }

        // 5. Validate & Normalize Status
        if (event.getStatus() != null) {
            String normalizedStatus = event.getStatus().toUpperCase();
            List<String> allowedStatuses = List.of("DRAFT", "PUBLISHED", "ONGOING", "COMPLETED", "CANCELLED");
            if (!allowedStatuses.contains(normalizedStatus)) {
                throw new BadRequestException(
                        "Invalid status. Allowed values are DRAFT, PUBLISHED, ONGOING, COMPLETED and CANCELLED");
            }
            event.setStatus(normalizedStatus);
        }

    }

    /**
     * Cập nhật sự kiện bằng PATCH (Partial Update)
     */
    @Transactional
    public HackathonEventResponse updateHackathonEvent(Integer eventId, UpdateEventRequest request) {
        HackathonEvent event = hackathonEventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Hackathon Event not found with id: " + eventId));
        if (request.isEmpty()) {
            throw new BadRequestException("At least one field must be provided for update");
        }
        // Validate đổi Year: Không cho đổi nếu đang ở trạng thái khác DRAFT
        if (request.getYear() != null && !request.getYear().equals(event.getYear())) {
            if (!"DRAFT".equalsIgnoreCase(event.getStatus())) {
                throw new BadRequestException("Year cannot be changed after event is published");
            }
        }
        // Xác định xem mốc thời gian nào thực sự được cập nhật từ FE để lát nữa check
        // Past Date
        boolean checkPastRegStart = request.getRegistrationStart() != null;
        boolean checkPastRegEnd = request.getRegistrationEnd() != null;
        boolean checkPastStartDate = request.getStartDate() != null;
        boolean checkPastEndDate = request.getEndDate() != null;
        // Merge dữ liệu mới vào entity cũ (Giữ nguyên cũ nếu FE không gửi)
        if (request.getName() != null)
            event.setName(request.getName());
        if (request.getSeason() != null)
            event.setSeason(request.getSeason());
        if (request.getYear() != null)
            event.setYear(request.getYear());
        if (request.getDescription() != null)
            event.setDescription(request.getDescription());
        if (request.getRegistrationStart() != null)
            event.setRegistrationStart(request.getRegistrationStart());
        if (request.getRegistrationEnd() != null)
            event.setRegistrationEnd(request.getRegistrationEnd());
        if (request.getStartDate() != null)
            event.setStartDate(request.getStartDate());
        if (request.getEndDate() != null)
            event.setEndDate(request.getEndDate());
        if (request.getStatus() != null)
            event.setStatus(request.getStatus());
        // Validate toàn bộ logic SAU KHI đã merge
        validateEventRules(event, checkPastRegStart, checkPastRegEnd, checkPastStartDate, checkPastEndDate);
        event = hackathonEventRepository.save(event);
        return mapToResponse(event);
    }
}
