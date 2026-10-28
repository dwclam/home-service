---
name: backend-api-doc-generator
description: Sinh tài liệu API phía backend để bàn giao cho frontend. Dùng khi user yêu cầu viết/cập nhật tài liệu API, API spec, handoff cho FE, mô tả endpoint/request/response/luồng xử lý từ source code backend (Spring Boot, Node/Express, NestJS, FastAPI, Django...). Agent PHẢI đọc tài liệu dự án và code thật trước khi viết, không được đoán.
---

# Backend API Doc Generator

Mục tiêu: tạo tài liệu API **chính xác, đủ để dev frontend tích hợp mà không cần hỏi lại backend**. Mọi thông tin trong tài liệu phải truy ngược được về code hoặc tài liệu dự án.

## Nguyên tắc bắt buộc

1. **Đọc trước, viết sau.** Không viết dòng tài liệu nào trước khi hoàn thành Phase 1–3.
2. **Code là nguồn sự thật.** Tài liệu cũ (README, Swagger cũ, SRS) có thể lỗi thời. Nếu code và tài liệu mâu thuẫn → theo code, và ghi vào mục "Điểm cần xác nhận".
3. **Không bịa.** Không suy đoán field, kiểu dữ liệu, mã lỗi, rule validate. Không chắc → ghi `⚠️ Cần xác nhận` kèm file/dòng liên quan.
4. **Mỗi endpoint phải có dẫn chứng** (đường dẫn file + tên hàm controller/handler) để người review kiểm tra nhanh.
5. **Viết cho người dùng API (FE)**, không phải mô tả cài đặt nội bộ. Chỉ nhắc logic nội bộ khi nó ảnh hưởng đến cách FE gọi hoặc xử lý kết quả.
6. **Ví dụ phải thật**: lấy từ DTO/entity/test/seed data; JSON ví dụ phải khớp đúng schema đã mô tả.

## Phase 1 — Đọc tài liệu dự án

Đọc kỹ (nếu tồn tại): `README*`, `docs/`, SRS/BRD, use case, sơ đồ ERD/sequence, file Swagger/OpenAPI, Postman collection, `CHANGELOG`, `.env.example`, `application.yml/properties`.

Rút ra và ghi nhớ:
- Mục đích hệ thống, các actor/role (admin, user, guest...)
- Thuật ngữ nghiệp vụ (để đặt tên và giải thích đúng)
- Business rule quan trọng (trạng thái, vòng đời, ràng buộc)
- Base URL, version API, môi trường (dev/staging/prod)
- Cơ chế auth, CORS, rate limit nếu có

## Phase 2 — Khảo sát code backend

1. Xác định tech stack và framework (đọc `pom.xml` / `package.json` / `requirements.txt`).
2. Liệt kê **toàn bộ** điểm vào API:
   - Spring: `@RestController`, `@RequestMapping`, `@GetMapping`...
   - Express/Nest: `router.*`, `@Controller`, `@Get/@Post`...
   - FastAPI/Django: `@app.get`, `urls.py`, ViewSet
   Dùng Grep quét toàn repo, **không bỏ sót** controller nằm ở module khác.
3. Đọc cấu hình toàn cục: prefix đường dẫn (`context-path`, `app.use('/api')`), security filter/middleware, interceptor, global exception handler, CORS, response wrapper chung.
4. Ghi lại danh sách endpoint thô: `METHOD | PATH | handler | file`.

## Phase 3 — Phân tích sâu từng endpoint

Với mỗi endpoint, đọc theo chuỗi: **Controller → Service → Repository/Entity** và các DTO liên quan. Trích xuất:

| Hạng mục | Cần lấy gì |
|---|---|
| Request | path param, query param, header, body; kiểu dữ liệu; bắt buộc/tùy chọn; default; format (date ISO, enum); ràng buộc validate (`@NotBlank`, `@Size`, `@Min`, regex, Joi/Zod/class-validator...) |
| Auth | public hay cần token; role/permission yêu cầu; cách truyền token |
| Response | cấu trúc thành công (kèm wrapper chung nếu có); từng field: kiểu, nullable, ý nghĩa; phân trang (page/size/sort/total) |
| Lỗi | HTTP status + error code/message mà code thực sự ném ra (exception, `ResponseEntity`, `throw new HttpException`); điều kiện gây lỗi |
| Luồng xử lý | các bước logic chính, điều kiện rẽ nhánh, thay đổi trạng thái dữ liệu, side effect (gửi mail, publish event, gọi service ngoài, upload file) |
| Ràng buộc nghiệp vụ | thứ tự gọi API, điều kiện tiên quyết, idempotency, giới hạn |

Lưu ý đặc biệt:
- Field bị `@JsonIgnore`/ẩn/đổi tên (`@JsonProperty`, `snake_case` vs `camelCase`) → ghi đúng tên **xuất ra JSON**, không phải tên trong entity.
- Enum: liệt kê đầy đủ giá trị và ý nghĩa.
- Upload file: `multipart/form-data`, tên field, giới hạn dung lượng/định dạng.
- WebSocket/SSE/webhook nếu có: tài liệu hóa riêng (event name, payload).

## Phase 4 — Xác minh chéo

- Đối chiếu danh sách endpoint Phase 2 với tài liệu sắp viết: không thiếu, không thừa.
- Nếu có test (unit/integration) hoặc Swagger/Postman → so sánh với kết quả phân tích; chênh lệch thì ghi chú.
- Kiểm tra mọi JSON ví dụ khớp schema.
- Gom các điểm không chắc vào mục "Điểm cần xác nhận".

## Phase 5 — Viết tài liệu

Ngôn ngữ: theo ngôn ngữ user (mặc định tiếng Việt), giữ nguyên tên kỹ thuật tiếng Anh (field, endpoint, status code). Định dạng Markdown. Tên file mặc định: `API_DOCUMENTATION.md` (hoặc theo yêu cầu user). Với tài liệu dài, viết theo từng phần (mục lục → tổng quan → từng nhóm endpoint).

### Cấu trúc tài liệu

```
# <Tên dự án> — API Documentation
Phiên bản · Ngày cập nhật · Người/agent tạo

## 1. Tổng quan
- Mục đích hệ thống, đối tượng sử dụng
- Base URL theo môi trường
- Định dạng dữ liệu (Content-Type, charset, kiểu ngày giờ, timezone)

## 2. Xác thực & phân quyền
- Cơ chế (JWT/OAuth/session/API key), cách lấy & gửi token
- Thời hạn token, refresh flow
- Bảng role × quyền truy cập theo nhóm endpoint

## 3. Quy ước chung
- Cấu trúc response chuẩn (success/error)
- Cấu trúc phân trang, sắp xếp, lọc
- Bảng mã lỗi chung (HTTP status + error code + ý nghĩa + FE nên xử lý thế nào)
- Header bắt buộc, CORS, rate limit

## 4. Danh sách API (theo module)
Bảng tổng hợp: Method | Path | Mô tả | Auth/Role
Sau đó chi tiết từng endpoint (mẫu bên dưới)

## 5. Luồng nghiệp vụ liên API
Các flow FE cần gọi nhiều API theo thứ tự (đăng nhập → lấy profile; tạo đơn → thanh toán...)
Mô tả bằng danh sách bước hoặc sơ đồ Mermaid sequence.

## 6. Data models / Enum
Schema dùng chung, bảng enum và ý nghĩa, quan hệ giữa các object

## 7. Lưu ý tích hợp cho Frontend
Gợi ý: xử lý token hết hạn, retry, debounce, upload, các bẫy thường gặp

## 8. Điểm cần xác nhận
Danh sách mục chưa chắc chắn, mâu thuẫn code ↔ tài liệu, kèm file/dòng

## 9. Changelog
```

### Mẫu chi tiết một endpoint

```
### 4.x.y <Tên hành động>  `METHOD /path/{id}`

**Mô tả:** 1–2 câu: API làm gì, dùng ở màn hình/use case nào.
**Auth:** Public | Bearer token — role: ADMIN, USER
**Nguồn:** `src/.../XController.java` → `createX()`

**Path params**
| Tên | Kiểu | Bắt buộc | Mô tả |

**Query params**
| Tên | Kiểu | Bắt buộc | Mặc định | Mô tả |

**Headers** (nếu ngoài chuẩn)

**Request body** (`application/json`)
| Field | Kiểu | Bắt buộc | Ràng buộc | Mô tả |
Ví dụ:
​```json
{ ... }
​```

**Response thành công** — `201 Created`
| Field | Kiểu | Nullable | Mô tả |
Ví dụ:
​```json
{ ... }
​```

**Response lỗi**
| HTTP | Error code | Khi nào xảy ra | FE nên làm gì |

**Luồng xử lý**
1. Validate ...
2. Kiểm tra quyền/điều kiện ...
3. Ghi DB / gọi service ...
4. Side effect (mail, event) ...

**Lưu ý cho FE:** thứ tự gọi, điều kiện tiên quyết, hành vi đặc biệt
**Ví dụ cURL:**
​```bash
curl -X POST ...
​```
```

## Checklist trước khi giao

- [ ] Mọi endpoint trong code đều có trong tài liệu (và ngược lại)
- [ ] Mỗi endpoint có: mô tả, auth, request, response, lỗi, luồng xử lý, ví dụ
- [ ] Tên field khớp JSON thực tế (không phải tên entity)
- [ ] Enum, format ngày giờ, phân trang được mô tả rõ
- [ ] Có mục luồng nghiệp vụ liên API
- [ ] Không có thông tin suy đoán chưa gắn cờ `⚠️ Cần xác nhận`
- [ ] Không lộ secret (key, mật khẩu, connection string thật)

## Báo cáo cuối cho user

Tóm tắt ngắn gọn: số module/endpoint đã tài liệu hóa, đường dẫn file output, và danh sách "Điểm cần xác nhận" nổi bật. Không kể lại từng bước đã làm.
