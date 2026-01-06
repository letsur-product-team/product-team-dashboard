# QA Test Scenario: Product Team Dashboard Data Consistency

## 1. 개요 (Overview)
이 문서는 Product Team Dashboard의 Notion 데이터 정합성을 보장하기 위한 배포 전 QA 테스트 시나리오입니다. 대시보드가 Notion을 SOT(Source of Truth)로 하여 데이터를 정확하게 시각화하는지 검증합니다.

**문서 기준:** `work-log.md` (Phase 3: Data Fidelity Audit)

## 2. 테스트 환경 (Environment)
- **필수 권한**: Notion Integration Token (또는 MCP 접근 권한)
- **대상 데이터베이스**:
    - Shape-up Pitches
    - 실험 (Experiments)
    - IS팀 (Roadmap)
    - Global Problems (etc)

## 3. 정합성 체크리스트 (Audit Checklist)

### TC-01: Critical Data Fidelity (주요 데이터 검증)
`work-log.md`에 명시된 주요 데이터 수정 사항이 유지되고 있는지 확인합니다.

| ID | 항목 | 기대 결과 (Expected) | 검증 방법 | 확인 |
| :--- | :--- | :--- | :--- | :--- |
| **01-1** | **R&D Mode** | 제안자(Discovery Owner)가 **`조원우`**여야 함 | Notion Page 확인 | [ ] |
| **01-2** | **Pitch 0** | 실행자(Delivery Owner)가 **`전지원`**이어야 함 | Notion Page 확인 | [ ] |
| **01-3** | **Pitch 3** | 5명의 실행자(Executor)가 할당되어 있어야 함 | Notion Page 확인 | [ ] |

### TC-02: Status Logic Mapping (상태 로직)
Discovery(기획)와 Delivery(구현) 단계가 올바르게 매핑되는지 API 응답을 통해 확인합니다.

| ID | 카테고리 | Notion 상태(Status) | 기대 대시보드 단계 (Phase) | 확인 |
| :--- | :--- | :--- | :--- | :--- |
| **02-1** | 실험 / etc | **Backlog** | **Discovery** | [ ] |
| **02-2** | 실험 / etc | Problem Definition | Discovery | [ ] |
| **02-3** | 실험 / etc | In Progress | Delivery | [ ] |
| **02-4** | IS팀 | 시작 전 (Not Started) | Discovery | [ ] |
| **02-5** | IS팀 | 진행 중 (In Progress) | Delivery | [ ] |

### TC-03: Member Verification (멤버 매핑)
`src/app/api/notion/refresh/route.ts`의 `USER_MAP`에 정의된 16명의 핵심 멤버만 노출되어야 합니다.

| ID | 검증 내용 | 확인 |
| :--- | :--- | :--- |
| **03-1** | `박지원`, `조성환` 등 비(非) 제품팀 멤버가 필터링되는지 확인 | [ ] |
| **03-2** | UI 상에서 모든 멤버의 이름이 한글 실명으로 정확히 표시되는지 확인 | [ ] |

## 4. 실행 방법 (Procedure)

### Option A: 로컬 실행 (Recommended)
1. `npm run dev` 실행
2. 브라우저에서 `http://localhost:3000` 접속
3. 대시보드 화면에서 위 체크리스트 항목을 시각적으로 검증

### Option B: API 직접 호출
1. `POST /api/notion/refresh` 호출
2. JSON 응답(Tasks 배열)을 검토하여 `discoveryOwners`와 `deliveryOwners` 필드 검증

---
*Last Updated: 2026-01-06*
