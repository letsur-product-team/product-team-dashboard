# Google Sheets Data Pipeline Setup (Final - UUID Fallback)

이름 파싱이 안 된다면 **User UUID(아이디)**라도 나오게 설정했습니다.
`openai.ts`에 이미 UUID 매핑이 있으니, 아이디만 넘어가면 대시보드에서 처리할 수도 있습니다.
(물론 시트에서는 아이디로 보이겠지만, 데이터가 비어있는 것보단 낫습니다!)

## 1. Apps Script 작성
기존 코드를 모두 지우고 아래 코드로 교체합니다.

```javascript
/*
 * Notion to Google Sheets Sync (UUID Fallback Version)
 */

const CONFIG = {
  TOKEN_V2: "여기에_token_v2_값을_붙여넣으세요", 
  DATABASES: [
    { category: 'Shape-up', url: "https://www.notion.so/..." },
    { category: '실험', url: "https://www.notion.so/..." },
    { category: 'IS팀', url: "https://www.notion.so/..." },
    { category: 'etc', url: "https://www.notion.so/..." }
  ]
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Notion Sync')
    .addItem('Sync Now', 'syncNotionFinal')
    .addToUi();
}

function syncNotionFinal() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data');
  if (!sheet) {
    SpreadsheetApp.getUi().alert("'Data' 시트가 없습니다.");
    return;
  }

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).clearContent();
  }

  let allData = [];
  let logs = [];

  CONFIG.DATABASES.forEach(db => {
    try {
      const pageId = extractIdFromUrl(db.url);
      const meta = getCollectionIds(pageId);
      
      if (!meta) {
        logs.push(`[${db.category}] 실패: DB 없음`);
        return;
      }

      const result = fetchCollectionRows(meta.collectionId, meta.collectionViewId, db.category);
      if (result.rows.length === 0) {
         logs.push(`[${db.category}] 0개`);
      } else {
         allData = allData.concat(result.rows);
         logs.push(`[${db.category}] ${result.rows.length}개 로드`);
      }
      
    } catch (e) {
      logs.push(`[${db.category}] 에러: ${e.message}`);
    }
  });

  if (allData.length > 0) {
    sheet.getRange(2, 1, allData.length, 6).setValues(allData);
    SpreadsheetApp.getUi().alert(`완료!\n\n${logs.join('\n')}`);
  } else {
    SpreadsheetApp.getUi().alert(`실패.\n\n${logs.join('\n')}`);
  }
}

// --- Logic ---

function getCollectionIds(pageId) {
  const url = "https://www.notion.so/api/v3/loadPageChunk";
  const payload = {
    "pageId": formatUuid(pageId),
    "limit": 50,
    "cursor": { "stack": [] },
    "chunkNumber": 0,
    "verticalColumns": false
  };

  const data = notionApiRequest(url, payload);
  const blocks = data.recordMap?.block;
  if (!blocks) throw new Error("블록 정보 없음");

  let targetKey = Object.keys(blocks).find(k => k.replace(/-/g, '') === pageId.replace(/-/g, ''));
  let block = blocks[targetKey]?.value;

  if (block && block.collection_id && block.view_ids?.length > 0) {
    return { collectionId: block.collection_id, collectionViewId: block.view_ids[0] };
  }

  const foundKey = Object.keys(blocks).find(k => {
    const b = blocks[k].value;
    return b && b.collection_id && b.view_ids && b.view_ids.length > 0;
  });

  if (foundKey) {
    block = blocks[foundKey].value;
    return { collectionId: block.collection_id, collectionViewId: block.view_ids[0] };
  }
  return null;
}

function fetchCollectionRows(collectionId, collectionViewId, category) {
  const url = "https://www.notion.so/api/v3/queryCollection";
  const payload = {
    "collection": { "id": collectionId },
    "collectionView": { "id": collectionViewId },
    "loader": {
      "type": "reducer",
      "reducers": {
        "collection_group_results": { "type": "results", "limit": 100 }
      },
      "searchQuery": "",
      "userTimeZone": "Asia/Seoul",
      "userLocale": "ko"
    }
  };

  const data = notionApiRequest(url, payload);
  const recordMap = data.recordMap;
  const resultReducer = data.result?.reducerResults?.collection_group_results;
  const blockIds = resultReducer?.blockIds || [];
  
  const collectionStub = recordMap.collection?.[collectionId]?.value;
  const schema = collectionStub?.schema;
  const notionUsers = recordMap.notion_user || {};

  if (!schema) return { rows: [] };

  const rows = [];
  blockIds.forEach(bid => {
    const block = recordMap.block?.[bid]?.value;
    if (block && block.properties) {
       rows.push(parseProps(block.properties, schema, category, block.id, notionUsers));
    }
  });
  
  return { rows: rows };
}

function parseProps(props, schema, category, blockId, notionUsers) {
  let title = "-";
  let status = "";
  let discoverer = "";
  let deliverer = "";

  // Helper to find property by multiple names
  const findPropKey = (candidates) => {
    return Object.keys(schema).find(key => {
       const name = schema[key].name;
       return candidates.includes(name);
    });
  };

  // 1. Status Extraction (Priority: Phase > Stage > Status)
  // 'Status' often holds 'Must/Should' (Priority), so we look for 'Phase' or 'Stage' first.
  const statusKey = findPropKey(['Phase', 'Stage', 'Step', '진행 단계', 'Current Status', 'Status', '상태']);
  if (statusKey) {
     const valArr = props[statusKey];
     if (valArr) status = valArr.map(v => v[0]).join("");
  }

  // 2. Title Extraction
  const titleKey = Object.keys(schema).find(key => schema[key].type === 'title');
  if (titleKey && props[titleKey]) {
     title = props[titleKey].map(v => v[0]).join("");
  }

  // 3. Person Parsing Helper
  const extractPeople = (keyNames) => {
      const key = findPropKey(keyNames);
      if (!key) return "";
      const valArr = props[key];
      if (!valArr) return "";

      const people = [];
      valArr.forEach(chunk => {
          // chunk example: ["‣", [["u", "user_id"]]]
          if (chunk[1]) {
              chunk[1].forEach(attr => {
                  if (attr[0] === 'u') {
                      const userId = attr[1];
                      const userObj = notionUsers[userId]?.value;
                      if (userObj) {
                          const name = userObj.given_name ? `${userObj.family_name}${userObj.given_name}` : userObj.name;
                          people.push(name || userId);
                      } else {
                          people.push(userId);
                      }
                  }
              });
          }
      });
      return people.join(', '); // Join with comma for multiple owners
  };

  // 4. Discoverer & Deliverer
  // Shape-up specific: Search for specific role names
  discoverer = extractPeople(['제안자', 'Discoverer', 'Owner', '담당자']);
  deliverer = extractPeople(['실행자', 'Deliverer', 'Assign', '담당자']);

  // Log detected properties for debugging (only if title is valid to avoid noise)
  // if (title !== '-') Logger.log(`[${category}] ${title} -> StatusProp: ${statusKey} (${status})`);

  // Fallback Logic
  if (category !== 'Shape-up') {
    if (deliverer && !discoverer) discoverer = deliverer;
  }
  
  const url = ""; 

  return [category, title, status, discoverer, deliverer, url];
}

function notionApiRequest(url, payload) {
  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "Cookie": `token_v2=${CONFIG.TOKEN_V2}`,
      "x-notion-active-user-header": "",
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const res = UrlFetchApp.fetch(url, options);
  if (res.getResponseCode() !== 200) throw new Error(`API Error: ${res.getResponseCode()}`);
  return JSON.parse(res.getContentText());
}

function extractIdFromUrl(url) {
  const match = url.match(/([a-f0-9]{32})/);
  if (!match) throw new Error("ID Not Found");
  return match[1];
}

function formatUuid(id) {
  return id.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
}
```
