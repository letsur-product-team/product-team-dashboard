# Google Sheets Automation Guide (Notion Sync)

**Google Sheets**를 중간 데이터베이스로 활용하여 정합성을 완벽하게 제어할 수 있는 구성입니다.

## 1. Google Sheet 준비 (Schema Update)
1.  새 구글 스프레드시트 생성 & 시트 이름 **`Data`**로 변경.
2.  `A1:F1` 헤더 설정:
    `Category`, `Title`, `Status`, `Discoverer`, `Deliverer`, `URL`
    *(URL은 대시보드에서 클릭 이동을 위해 두는 것을 권장합니다)*

## 2. Apps Script 작성 (자동 분류 로직 포함)
메뉴: **확장 프로그램** > **Apps Script**

```javascript
// === 설정: Notion Token & DB IDs ===
const NOTION_TOKEN = 'secret_YOUR_TOKEN_HERE'; 

const DATABASE_IDS = [
  { category: 'Shape-up', id: '26fa0be0969d80a19173f39596399beb' },
  { category: '실험', id: '2a7a0be0969d80169503f6d966cf2f47' },
  { category: 'IS팀', id: '2b5a0be0969d80fd8fcde916aa29e045' },
  { category: 'Global Problems', id: '2d9a0be0969d81be9c23ec5f26afd586' }
];

function syncNotion() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data');
  // Clear old data (keep headers)
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).clearContent();

  let allRows = [];

  DATABASE_IDS.forEach(db => {
    let hasMore = true;
    let cursor = undefined;

    while (hasMore) {
      const url = `https://api.notion.com/v1/databases/${db.id}/query`;
      const payload = { page_size: 100 };
      if (cursor) payload.start_cursor = cursor;

      const options = {
        method: 'post',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      const data = JSON.parse(UrlFetchApp.fetch(url, options).getContentText());
      if (!data.results) break;

      data.results.forEach(page => {
        const props = page.properties;
        let p = page.properties; // shortcut

        // 1. Title
        let title = "Untitled";
        const titleKey = Object.keys(props).find(k => props[k].type === 'title');
        if (titleKey && props[titleKey].title.length > 0) title = props[titleKey].title[0].plain_text;

        // 2. Status
        let status = "";
        // Try common status keys
        const statusProp = p['Status'] || p['상태'] || p['State'];
        if (statusProp) {
           if (statusProp.type === 'select') status = statusProp.select?.name || "";
           else if (statusProp.type === 'status') status = statusProp.status?.name || "";
        }

        // 3. Owners (Discoverer vs Deliverer Logic)
        let discoverer = [];
        let deliverer = [];

        if (db.category === 'Shape-up') {
            // Shape-up: 제안자 -> Discoverer, 실행자 -> Deliverer
            if (p['제안자']?.people) discoverer = p['제안자'].people.map(u => u.name);
            if (p['실행자']?.people) deliverer = p['실행자'].people.map(u => u.name);
        } else {
            // Others: 담당자/People -> Both or conditional?
            // User Rule: Usually 'Assignee' covers everything. Map to BOTH for safety, or refine?
            // Simple approach: Map '담당자' to Deliverer.
            // Map 'Lead' or '제안자' to Discoverer if exists.
            let people = [];
            const pp = p['담당자'] || p['Person'] || p['People'] || p['Assignee'];
            if (pp?.people) people = pp.people.map(u => u.name);
            
            // Default: Same people for both roles in generic tasks, unless specialized
            discoverer = people;
            deliverer = people;
        }

        allRows.push([
          db.category,
          title,
          status,
          discoverer.join(', '),
          deliverer.join(', '),
          page.url // URL
        ]);
      });

      hasMore = data.has_more;
      cursor = data.next_cursor;
    }
  });

  if (allRows.length > 0) sheet.getRange(2, 1, allRows.length, 6).setValues(allRows);
}
```

## 3. 트리거 설정 (1시간마다 실행)
1.  Apps Script 좌측 **시계 아이콘** 클릭.
2.  **+ 트리거 추가**: `syncNotion` / 시간 기반 / 시간 단위 타이머 / 1시간마다.

## 4. CSV 연동
1.  **파일 > 공유 > 웹에 게시** -> `Data` 시트 -> `CSV` 선택.
2.  링크 복사하여 대시보드 `.env`에: `GOOGLE_SHEET_CSV_URL="링크"`
