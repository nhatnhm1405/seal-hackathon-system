# Git Commit Convention (Conventional Commits)

## Cú pháp chuẩn

```
<type>(<scope>): <subject>

[body]

[footer]
```

---

## Các type phổ biến

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

---

## Ví dụ thực tế (SEAL project)

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

## Quy tắc viết subject

- **Không** viết hoa chữ đầu
- **Không** có dấu chấm ở cuối
- Dùng **imperative mood** — `add feature` thay vì `added feature`
- Tối đa **72 ký tự**

---

## Breaking change

Thêm `!` sau type hoặc ghi vào footer:

```bash
feat(api)!: change response format for /events endpoint

BREAKING CHANGE: field `eventDate` renamed to `startDate`
```

---

## Scope gợi ý cho SEAL

`auth` · `event` · `team` · `judge` · `mentor` · `submission` · `seed` · `frontend` · `db`