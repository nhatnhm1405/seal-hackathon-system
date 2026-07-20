# Bao cao doi chieu Business Rules va ma nguon SEAL

**Ngay ra soat:** 15/07/2026  
**Nguon Business Rules:** Tep dinh kem do nhom cung cap, gom BR-1 den BR-45.  
**Pham vi kiem tra:** Backend Spring Boot, schema SQL, controller/service/repository lien quan va danh sach unit test hien co. Frontend chi duoc tham chieu khi no anh huong truc tiep den hanh vi da kiem tra truoc do; day khong phai la bao cao UAT giao dien.

## 1. Muc dich va phuong phap

Bao cao nay dung de doi chieu tung Business Rule voi ma nguon hien tai, phuc vu viet SRS/bao cao mon hoc. Ket luan duoc dua ra tu ma nguon, khong suy dien tu ten API hay giao dien.

| Trang thai | Y nghia |
|---|---|
| **Dat** | Ma nguon hien tai co rang buoc truc tiep, phu hop noi dung Business Rule. |
| **Mot phan** | Chuc nang cot loi co, nhung con thieu mot dieu kien, pham vi, hoac can lam ro trong tai lieu. |
| **Lech** | Ma nguon thuc thi trai voi quy tac. Can sua code hoac sua Business Rule co chu truong. |
| **Mau thuan BR** | Chinh bo Business Rules co hai quy tac mau thuan nhau; khong the ket luan code dung/sai truoc khi chot nghiep vu. |

**Tong ket:** 33/45 quy tac dat, 7/45 mot phan, 4/45 lech va 1/45 mau thuan trong dac ta.

### Luu y ve tai lieu hien co

`docs/documents/SRS_Section3_System_Features_UseCase_Spec.md` hien dung mot catalog BR-1 den BR-21 cu. Nhieu so BR trung voi tep dinh kem, nhung noi dung khong con tuong ung. Vi vay, khong nen chen hoac doi so tung phan trong SRS cu; can thay the bang catalog BR-1 den BR-45 nay sau khi chot cac diem mau thuan o Muc 3.

## 2. Ma tran truy vet va ket qua doi chieu

### 2.1 Tai khoan va xac thuc

| ID | Trang thai | Bang chung ma nguon | Ket luan de viet bao cao |
|---|---|---|---|
| BR-1 | **Mot phan** | `AuthService.register` kiem tra email va student ID; schema co unique email. | Dung ve nghiep vu thong thuong. Tuy nhien `student_id` khong co rang buoc `UNIQUE` trong database, nen van co race condition; email duoc normalize khi luu nhung kiem tra ban dau dung input goc. Nen bo sung unique index cho `student_id` va normalize truoc khi kiem tra. |
| BR-2 | **Dat** | `AuthService.register` kiem tra `FPT_STUDENT`, `EXTERNAL_STUDENT`, `STAFF`; FPT bat buoc student ID, external bat buoc student ID va university. | Dung quy tac phan loai nguoi dung khi dang ky local. |
| BR-3 | **Mot phan** | Dang ky local tao `isApproved=false` va chua gan role. `OAuth2LoginSuccessHandler` cap JWT tam thoi cho `PENDING_PROFILE` de hoan thien profile. | Luong local dat. Ngoai le OAuth can duoc ghi ro trong BR: tai khoan chua hoan thien profile duoc cap token chi de hoan thien profile, truoc khi duoc coordinator duyet. |
| BR-4 | **Mot phan** | `AuthService.login` tra chung loi cho email/password sai, kiem tra `isApproved`, va chi chan `isActive=false` voi non-student. | Logic chan dung, nhung tai khoan chua duyet nhan thong diep cu the "pending approval", khong phai generic error nhu BR yeu cau. Can chon uu tien UX hay chong enumeration va sua BR/code nhat quan. |
| BR-5 | **Dat** | DTO/`AuthService.updateOwnProfile` khong cho sua email, userType; thay doi student ID bi tu choi. | Dat day du rang buoc self-service. |
| BR-6 | **Dat** | `changePassword` yeu cau provider LOCAL, dung mat khau cu, va mat khau moi khac; `updateAvatar` bat buoc file khong rong, toi da 5 MB. | Dat. |
| BR-7 | **Dat** | `PasswordResetService` vo hieu hoa OTP cu, gioi han 10 lan thu, kiem tra het han, can verify truoc reset va reset token chi dung mot lan. | Dat. |
| BR-8 | **Dat** | `AdminController` yeu cau `SYSTEM_ADMIN`; `AdminService.createUser` tao `isApproved=true`, `isActive=true`, khong tu gan role; grant/revoke nam trong AdminService. | Dat. Event Coordinator khong co endpoint quan tri account/role tuong ung. |
| BR-9 | **Dat** | `ParticipationAccessRequestService` chi nhan sinh vien da approved va inactive; approve/reject nam duoi `/api/coordinator/**`; approve dat `isActive=true`. | Dat. |
| BR-10 | **Dat** | `InactiveParticipantWriteFilter` cho phep GET/HEAD/OPTIONS va chi mo cac write exception dung nhu BR. | Dat. |

### 2.2 Su kien, round, track va de bai

| ID | Trang thai | Bang chung ma nguon | Ket luan de viet bao cao |
|---|---|---|---|
| BR-11 | **Dat** | `HackathonEventService` co tap status va transition map; generic update khong xu ly COMPLETE/reopen; `completeEvent` va `reopenEvent` tach rieng. | Dat theo wording hien tai. Luu y: API tao event cho phep chon bat ky status hop le thay vi bat buoc DRAFT; neu nghiep vu muon event moi luon bat dau DRAFT thi can them BR. |
| BR-12 | **Dat** | `HackathonEventController` chi cho System Admin create/complete/reopen; update cho Event Coordinator hoac System Admin. | Dat, dong thoi la co so de ket luan BR-23 dang mau thuan. |
| BR-13 | **Dat** | `HackathonEventService` kiem tra mot event active moi season/year, khong overlap, thu tu moc thoi gian, calendar theo season va ngay trong qua khu. | Dat. |
| BR-14 | **Mot phan** | Vao SETUP kiem tra team pending, track va tinh capacity; vao IN_PROGRESS kiem tra moi track >=2 team va khong con team chua gan track. `recomputeSetupTrackCapacities` van co the tinh lai capacity trong SETUP. | Dieu kien vao SETUP/IN_PROGRESS dat, nhung capacity chua thuc su "freeze" ngay khi vao SETUP. Can khoa capacity sau transition hoac sua BR de cho phep recompute khi SETUP. |
| BR-15 | **Mot phan** | `completeEvent` deactivate sinh vien/guest judge; nhung bo qua sinh vien con membership o event chua completed khac. `reopenEvent` reactivate lai. | Code an toan hon cho nguoi tham gia nhieu event, nhung khong dung chu "every" cua BR. Nen sua BR thanh "deactivate neu khong con tham gia event dang hoat dong khac" hoac sua code theo BR. |
| BR-16 | **Dat** | `RoundService` kiem tra order khi create; schema co unique `(event_id, order_number)`; delete chan FINALIZED/submission va xoa results/criteria. | Dat. Update trung order duoc DB chan, tuy nhien nen them validation service de tra loi 4xx ro rang hon. |
| BR-17 | **Lech** | `TrackService` chi cho create o DRAFT/OPEN, nhung cho update/delete o DRAFT, OPEN **va** SETUP. | BR chi cho update/delete trong SETUP, code rong hon. Can sua code de chi SETUP, hoac sua BR thanh DRAFT/OPEN/SETUP. |
| BR-18 | **Dat** | `RoundTimerService` tach CONTEST/JUDGING, minimum 30 giay va kiem tra contest dung/het han, criteria, submission, judge cover truoc khi start judging. | Dat. |
| BR-19 | **Dat** | `AssignmentService` va `RoundTimerService.assertJudgeAssignmentsMutable` chan add/remove sau khi judging da bat dau; replace bi chan khi judging dang chay va khi da co final score. | Dat. |
| BR-20 | **Dat** | `TrackProblemService` gioi han upload/replace/remove o SETUP/IN_PROGRESS, release chi IN_PROGRESS va an problem chua release voi participant. | Dat. |
| BR-21 | **Dat** | `TrackProblemService.downloadProblem` kiem tra membership APPROVED va dung track truoc khi download. | Dat. |
| BR-22 | **Dat** | `ScoringService.deleteCriteria` tu choi neu criterion da co score. | Dat. |
| BR-23 | **Mau thuan BR** | `ScoringController`, round/track/timer/problem management yeu cau EVENT_COORDINATOR; rieng event update duoc `EVENT_COORDINATOR` **hoac** `SYSTEM_ADMIN` theo BR-12 va code. | BR-12 va BR-23 mau thuan: BR-12 cho System Admin update event, BR-23 gioi han moi event management cho Event Coordinator. De xuat giu BR-12, va sua BR-23 thanh "... restricted to EVENT_COORDINATOR, except event actions explicitly assigned to SYSTEM_ADMIN or both roles in BR-12." |

### 2.3 Team, loi moi va grouping

| ID | Trang thai | Bang chung ma nguon | Ket luan de viet bao cao |
|---|---|---|---|
| BR-24 | **Dat** | `TeamService.createTeam` kiem tra account approved/active, event OPEN, ten unique, mot membership/event; tao PENDING, chua co track, creator la LEADER. | Dat. |
| BR-25 | **Dat** | `TeamService`, invite, join request va grouping deu ap dung hard maximum 5; nhom duoi 3 van co the duoc xu ly bang grouping/manual. | Dat. |
| BR-26 | **Dat** | `TeamService` dung `requireLeader`, chan manage team REJECTED/DISQUALIFIED, khong cho leader tu remove, leader duy nhat leave se xoa team. | Dat. |
| BR-27 | **Dat** | `TeamService` chi approve/reject tu PENDING, disqualify tu APPROVED; request reject/disqualify co reason tuy chon. | Dat. |
| BR-28 | **Lech** | `TeamService` cho self-select trong SETUP va enforce capacity; coordinator manual khong enforce capacity; nhung random draw goi `computeTrackCapacities` va enforce capacity. | BR noi random draw khong enforce capacity, code lai enforce. Nen giu code de tranh qua tai track va sua BR; neu muon dung BR thi phai bo capacity gate o random draw. |
| BR-29 | **Dat** | `TeamInviteService` chi leader gui invite, chi OPEN/SETUP, chan REJECTED/DISQUALIFIED, user duoc moi phai approved/active/student/chua o team; accept tu choi invite pending khac trong event. | Dat. |
| BR-30 | **Lech** | `JoinRequestService` co leader accept/decline, unique pending va auto-decline; nhung `validateTeamCanAcceptRequest` chi cho event OPEN. | BR noi join request mirror invitation (OPEN hoac SETUP), trong khi code khong cho SETUP. Can sua validation sang OPEN/SETUP hoac sua BR de join request chi duoc o OPEN. |
| BR-31 | **Dat** | `LeftoverGroupingService` chi chay o SETUP; manual chi duoc lay free agent/nguoi trong team <3 va luon ap dung max 5. | Dat. |

### 2.4 Submission, cham diem, ranking va AI

| ID | Trang thai | Bang chung ma nguon | Ket luan de viet bao cao |
|---|---|---|---|
| BR-32 | **Dat** | `SubmissionService` kiem tra leader cua APPROVED team, round ACTIVE/OPEN, contest timer chay va eligibility theo ket qua round truoc/top-N. | Dat. |
| BR-33 | **Dat** | Service/schema gioi han mot submission/team/round; repo URL bat buoc, cac URL khac optional nhung validate; deadline la gate doc lap. | Dat. |
| BR-34 | **Dat** | `AssignmentService` gioi han mentor mot track/event, phan biet non-final co track va final khong co track; guest judge duoc tao approved va scoped nhu judge thuong. | Dat. |
| BR-35 | **Dat** | Replace judge bi tu choi neu judge cu da co final score trong scope; chi cho replace khi JUDGING khong actively running. | Dat. |
| BR-36 | **Dat** | `ScoringController` yeu cau JUDGE; `ScoringService` kiem tra assignment va JUDGING timer running. | Dat. |
| BR-37 | **Dat** | `ScoringService` chan sua sau FINAL, kiem tra criterion dung mot lan va du tat ca criterion khi final; draft duoc mien completeness check. | Dat. |
| BR-38 | **Dat** | `JudgeScoringCompletenessService` va `RoundResultService.finalizeRound` kiem tra submission, final score day du tren moi criterion/assignment va chan finalized lan hai. | Dat. |
| BR-39 | **Dat** | `RoundResultService` dung weighted normalized percentage, average theo judge; non-final rank theo track, final rank global. | Dat. |
| BR-40 | **Dat** | Ranking sap theo score, timestamp nop som hon, null timestamp sau; `advanced` chi true khi co `topNAdvance` va rank nam trong top N. | Dat. |
| BR-41 | **Dat** | `finalizeRound` xoa/recompute result, tao unpublished; `publishResults` tach rieng va gui notification cho team duoc rank. | Dat. Luu y ky thuat: luong publish hien co nguy co gui notification trung lap, nhung khong lam sai BR. |
| BR-42 | **Lech** | `AiJudgeAssistantService` gioi han Judge theo assignment va JUDGING timer, output chi advisory; nhung `AiController` con cho EVENT_COORDINATOR phan tich submission, khong cung gate assignment/timer. | Neu BR la nguon chuan, can bo quyen coordinator khoi AI endpoint hoac ap dung cung rang buoc. Neu coordinator can duoc phep dung AI, phai bo sung ngoai le trong BR. |

### 2.5 Prize, audit va notification

| ID | Trang thai | Bang chung ma nguon | Ket luan de viet bao cao |
|---|---|---|---|
| BR-43 | **Dat** | `PrizeService` enforce rank unique/event, khoa update/delete khi announced, auto-generation can final finalized/co ranked result va chan khi da co prize announced. | Dat. |
| BR-44 | **Mot phan** | `PrizeService.announcePrizes` kiem tra tat ca prize co winning team va public list chi tra announced. | Goi announce lap lai sau khi da announce khong bi tu choi ro rang; code co the tra thanh cong voi danh sach moi empty. Neu "only once" la hard rule thi can throw conflict khi event da announced. |
| BR-45 | **Mot phan** | `AuditLogController` chi cho EVENT_COORDINATOR/SYSTEM_ADMIN; `AdminController` bao ve system logs bang SYSTEM_ADMIN; `EmailService` chi gui email cho account approval, rejection, password reset. | RBAC tong quat va email scope dat. Tuy nhien audit endpoint khong kiem tra coordinator co thuoc event dang xem, va query chi lay audit co `target_type=EVENT`, khong phai toan bo business action lien quan event. Can bo sung event-scope authorization va thiet ke query audit lien ket event. |

## 3. Cac diem can chot truoc khi nop SRS

1. **Giai quyet mau thuan BR-12 va BR-23.** De xuat giu quyen System Admin nhu BR-12; sua BR-23 de ap dung cho round/track/timer/problem va cac event action khong duoc BR-12 giao cho System Admin.
2. **Chot policy OAuth truoc approval.** Hien tai token tam thoi cho `PENDING_PROFILE` la can thiet de complete profile, nhung phai duoc gioi han endpoint va mo ta minh bach trong BR-3. Neu khong can OAuth profile completion, bo cap JWT truoc duyet.
3. **Chot policy security cho BR-4.** Dung mot generic message cho email/password/approval se giam lo thong tin trang thai tai khoan; thong diep "pending approval" hien tai tot hon ve UX nhung khong dung BR.
4. **Chot lifecycle track va join request.** Code hien tai cho track update/delete o DRAFT/OPEN/SETUP, va join request chi OPEN. Hoac sua BR-17/BR-30 theo code, hoac sua code de dung BR.
5. **Giu capacity gate trong random draw.** Day la rang buoc an toan, nen de xuat sua BR-28 thay vi bo kiem tra trong code.

## 4. De xuat sua code theo muc do uu tien

| Uu tien | De xuat | BR anh huong |
|---|---|---|
| Cao | Them unique constraint/index cho `User.student_id`; normalize email truoc khi `existsByEmail`. | BR-1 |
| Cao | Gioi han JWT cua `PENDING_PROFILE` chi duoc goi endpoint complete-profile, hoac khong cap JWT truoc approval. | BR-3 |
| Cao | Kiem tra Event Coordinator co quyen tren `eventId` truoc khi xem audit log; mo rong truy vet audit theo event cho TEAM/ROUND/SUBMISSION neu bao cao nghiep vu can day du. | BR-45 |
| Trung binh | Khoa/reject thao tac announce lan thu hai. | BR-44 |
| Trung binh | Quyet dinh va can chinh code cho Track lifecycle va join request SETUP. | BR-17, BR-30 |
| Trung binh | Khoa capacity sau khi vao SETUP, hoac doi wording "freeze" trong BR. | BR-14 |
| Trung binh | Quyet dinh quyen AI cua Event Coordinator va cap nhat endpoint/BR nhat quan. | BR-42 |
| Thap | Validate duplicate round order o service khi update de tra loi loi domain ro rang thay vi phu thuoc DB constraint. | BR-16 |

## 5. Pham vi chua the khang dinh

- Chua chay Maven build hoac unit/integration test trong dot ra soat nay; ket luan la static code review, khong phai ket qua runtime/UAT.
- Da xac nhan co unit test cho Auth, Password Reset, Team, Team Invite, Track, Round Timer, Submission, Scoring va Judge Scoring Completeness. Chua kiem tra muc phu branch cua tung BR va chua thay test chuyen biet cho tat ca cac lech neu tren.
- Database collation/cau hinh migration thuc te chua duoc chay xac minh; nhan dinh BR-1 ve race condition dua tren schema hien co khong co unique constraint cho `student_id`.

## 6. Ket luan co the dua vao report mon hoc

He thong hien thuc day du phan lon quy tac nghiep vu cot loi cua quy trinh hackathon: dang ky/xac thuc, lifecycle event, team, submission, scoring, ranking va prize. Cac khoang cach chinh khong nam o thieu module, ma nam o viec can dong bo lai dac ta voi hanh vi da code: OAuth truoc approval, lifecycle track, join request o SETUP, capacity random draw, quyen AI cua coordinator va pham vi audit log. Truoc khi dong bang SRS, nhom can chot cac diem nay, cap nhat Business Rules va bo sung test am cho tung truong hop lech.

## Phu luc A. Cac tep nguon da doi chieu

- `back-end/src/seal-api/src/main/java/com/seal/hackathon/service/AuthService.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/service/PasswordResetService.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/service/AdminService.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/service/ParticipationAccessRequestService.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/security/InactiveParticipantWriteFilter.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/security/JwtAuthenticationFilter.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/security/oauth2/OAuth2LoginSuccessHandler.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/service/HackathonEventService.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/service/RoundService.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/service/RoundTimerService.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/service/TrackService.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/service/TrackProblemService.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/service/TeamService.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/service/TeamInviteService.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/service/JoinRequestService.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/service/LeftoverGroupingService.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/service/AssignmentService.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/service/SubmissionService.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/service/ScoringService.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/service/JudgeScoringCompletenessService.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/service/RoundResultService.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/service/AiJudgeAssistantService.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/service/PrizeService.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/service/AuditLogService.java`
- `back-end/src/seal-api/src/main/java/com/seal/hackathon/controller/*Controller.java` cua cac module tuong ung, `SecurityConfig.java`, `EmailService.java`, `database scripts/seal_schema.sql`, va cac unit test service da liet ke o Muc 5.
