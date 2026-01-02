# Project Work Log: Product Team Dashboard

This document serves as a persistent context record for the development and data purification of the Product Team Dashboard, ensuring context is preserved across iterations.

## 🗓 Project Timeline (Late 12.2025 - Early 01.2026)

### Phase 1: Foundation & UI Design
- Initialized Next.js project with a focus on "Premium Aesthetics".
- Implemented glassmorphism UI, interactive member filtering, and category-based layout.
- Established the core `ALL_MEMBERS` list (16 core members: PO, UX, Eng, R&D).

### Phase 2: Notion Integration (API v1)
- Developed `/api/notion/refresh` endpoint to pull data from 4 different Notion databases.
- Implemented `USER_MAP` to translate Notion's UUIDs to friendly UI display names.
- Explicitly excluded non-product team members (박지원, 조성환) to ensure focus.

### Phase 3: Data Fidelity Audit & Purification
- **SOT Alignment**: Conducted a line-by-line audit against the definitive Notion SOT pages.
- **Critical Fixes**: 
    - Corrected `R&D Mode` proposer from 정현규 to **조원우**.
    - Corrected `Pitch 0` executor to **전지원**.
    - Added missing high-priority `Pitch 3` with its 5 verified executors.
- **IS Team Roadmap Fix**: Re-mapped the IS section to the definitive roadmap database identified in the team's dashboard SOT page.
- **Logic Refinement**: Improved assignment mapping to handle `Backlog` status as Discovery phase for consistency.

## 🔑 Key Decisions & Rules

- **Team Definition**: The "Product Team" for this dashboard is strictly defined as the 16 core members identified in the "조직 구성 및 R&R" document.
- **Data Precedence**: The `INITIAL_TASKS` in `page.tsx` serve as a verified snapshot, but the `/refresh` API is the dynamic source of truth.
- **Column Logic**:
    - **Discovery**: Focuses on "Problem Framing" and "Ideation".
    - **Delivery**: Focuses on "Active Implementation" and "Execution".

## 🛠 Operational Context for Future AI Assistants
- **Notion IDs**: The `USER_MAP` in `route.ts` contains the definitive mapping. Do not modify these IDs unless the team member's Notion profile changes.
- **Category Filter**: Tasks are grouped by the `category` field (`Shape-up`, `실험`, `IS팀`, `etc`).

---
*Last Updated: 2026-01-02*
