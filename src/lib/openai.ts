import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing in environment variables');
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || 'https://gateway.letsur.ai/v1',
});

// Map of Notion User IDs to Names strictly based on dashboard UI members
const USER_MAP: Record<string, string> = {
    // PO
    '09b1da0a-a26a-45c4-b4f9-61c9d7e448db': '조원우',
    '1dcd872b-594c-8197-90b6-0002bd50f936': '송지호',
    '24cd872b-594c-8148-8d50-00021dc967e9': '정현규',
    // UX
    'c759e490-e737-40d6-bca7-27b01c6a675d': '고태경',
    'b67c77d2-6f90-4fc3-b813-2a7213519939': '고태경',
    '5d99c9b2-70d1-4c7b-9d18-319f6e7caf3c': '이석주',
    // Engineering
    '27dd872b-594c-812e-8727-00021bd40c54': '기근영',
    '26cd872b-594c-81f5-b368-0002b9265280': '김동건',
    '25ed872b-594c-815c-9b62-000280ca5965': '김원현',
    'd07f59fa-e0cc-4b05-a6a9-25f53e6fc70a': '서승덕',
    'f5e53087-a674-42db-afd1-00c68cd6f62c': '노상기',
    '0950454a-47da-4357-9908-a778799133e5': '전지원',
    '7f2b5701-8394-4c53-8fbb-0212a54bd61c': '오제욱',
    '996009a9-0312-4bae-9ceb-5a62ba456e9d': '송재현',
    '1afd872b-594c-81ee-a022-000238606991': '이정원',
    // R&D
    '5eeb2f67-d4e2-48e6-a2e2-8b8ad6b15f76': '고동휘',
    '1cbd872b-594c-8164-8b2a-0002736498a4': '최진우',
};


export type StructuredTask = {
    id: string;
    title: string;
    category: 'Shape-up' | '실험' | 'IS팀' | 'etc' | 'Unknown';
    discoveryOwners: string[];
    deliveryOwners: string[];
    debug_log?: string;
};

export async function structureTask(taskId: string, source: string, properties: any): Promise<StructuredTask> {
    const prompt = `
  You are a Product Data Analyst Helper.
  Analyze the following Notion Task Properties JSON and extract strict structure.
  
  CONTEXT:
  - Source DB: "${source}"
  - Current known Users Map: ${JSON.stringify(USER_MAP)}

  RULES:
  1. **Input Handling**:
     - You will receive either structured JSON properties OR a 'raw_scraped_text' blob (string) containing an entire Notion row.
     - IF 'raw_scraped_text' is provided, intelligently parse it.
     - **CRITICAL**: The 'Status' is often just a word in the text like "Delivering", "In Progress", "기획 중", "완료".
     - **Scan Priority**:
       1. Look for explicit "Status: Value" or "상태: Value".
       2. Look for known keywords in the text: ['Delivering', 'Betting 승인', '기획 중', 'Pitch', '완료', 'Delivered', 'In Progress', 'Archive', 'Experiment Ready', 'Idea'].
       3. If found, use that as the Status.

  2. **Category**:
     - If Source is "Shape-up", category is "Shape-up".
     - If Source is "Experiments" or "Problems", category is "실험".
     - If Source is "Global Problems", category is "etc".
     - **Exception**: If Title contains "Pitch 0", force category to "Shape-up".
     - **Constraint**: If Source implies "IS Team" (Roadmap) or User implies IS Engineering task, classify as "IS팀". However, default to mapping based on Source.

  2. **Title**: Extract the raw text title exactly (look for 'Name', 'Title', '이름'). No modification.

  3. **Phase & Owners (STRICT LOGIC)**:
     - **Discovery Phase Completed? (Visible in Discovery Column)**
       - Shape-up: Status is 'Betting 승인', 'Delivering', 'Delivered', '완료'. (Excludes '기획 중', 'Pitch', 'Backlog')
       - 실험: Status is 'Experiment Ready', 'In Progress', 'Archive', '완료'. (Excludes 'Idea', 'Backlog', 'Problem Definition', 'Hypothesis Framing' unless specific user override implies otherwise, but user said "Experiment ~ Archive" is Discovery Completed)
       - etc/IS팀: Status is 'In Progress', 'Archive', '진행 중', '완료'. (Excludes 'Backlog', '시작 전', '보통', '낮음', '높음')

     - **Delivery Phase Completed? (Visible in Delivery Column)**
       - Shape-up: Status is 'Delivered', '완료'. (**STRICTLY EXCLUDE** 'Delivering')
       - 실험: Status is 'Archive', '완료'. (**STRICTLY EXCLUDE** 'In Progress')
       - etc/IS팀: Status is 'Archive', '완료'. (**STRICTLY EXCLUDE** 'In Progress', '진행 중')
     
     - **Owner Assignment**:
       - IF Discovery Phase Condition Met -> Extract 'Lead' / '제안자' / 'Proposer' as discoveryOwners.
       - IF Delivery Phase Condition Met -> Extract 'Members' / '실행자' / 'Assignees' / '담당자' as deliveryOwners.
       - **CRITICAL**: If a phase condition is NOT met, return an empty array [] for that owner list.
       - Map User IDs to Names using the provided User Map. If ID not found, ignore.
  
  4. **Output Format**: JSON only.
  {
    "title": "Raw Title",
    "category": "Category String",
    "discoveryOwners": ["Name1", "Name2"],
    "deliveryOwners": ["Name1", "Name2"]
  }
  `;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: JSON.stringify(properties) }
            ],
            response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        if (!content) throw new Error("Empty AI response");

        const result = JSON.parse(content);

        return {
            id: taskId,
            title: result.title || "Untitled",
            category: result.category || "Unknown",
            discoveryOwners: result.discoveryOwners || [],
            deliveryOwners: result.deliveryOwners || [],
            debug_log: `Source: ${source}, Status: ${properties['Status'] || properties['상태']}`
        };


    } catch (error) {
        console.error(`AI Structure Error for ${taskId}: `, error);
        // Fallback? Or just return minimal
        return {
            id: taskId,
            title: "AI Parsing Failed",
            category: "Unknown",
            discoveryOwners: [],
            deliveryOwners: []
        }
    }
}
