

| Type | Dùng khi |
|------|----------|
| `feat` | Thêm tính năng mới |
| `fix` | Sửa bug |
| `docs` | Thay đổi tài liệu (README, comment…) |
| `style` | Format code, thiếu dấu chấm phẩy… (không đổi logic) |
| `refactor` | Tái cấu trúc code, không thêm feature hay fix bug |
| `test` | Thêm hoặc sửa test |
| `chore` | Cập nhật build tool, dependency, config… |
| `perf` | Cải thiện hiệu năng |
| `ci` | Thay đổi CI/CD pipeline |
| `revert` | Revert commit trước |
| `build` | Thay đổi build system hoặc external dependency |


## Ví dụ 

```bash
feat(auth): add JWT refresh token endpoint

fix(judge-dashboard): fix score submission not saving to DB

docs(readme): update setup instructions for local dev

refactor(user): extract UserEventRole logic to service layer

test(scoring): add unit tests for ScoreCalculatorService

chore(deps): upgrade Spring Boot to 3.3.1

ci(github-actions): add SonarQube scan step
```

---

## Quy tắc

- **Không** viết hoa chữ đầu
- **Không** có dấu chấm ở cuối
- Dùng **imperative mood** — `add feature` thay vì `added feature`
- Tối đa **72 ký tự**


## Hotfix

Thêm `!` sau type hoặc ghi vào footer:

```bash
feat(api)!: change response format for /events endpoint

HOTFIX: field `eventDate` renamed to `startDate`
```
