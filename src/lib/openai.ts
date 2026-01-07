import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing in environment variables');
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || 'https://gateway.letsur.ai/v1',
});

import { USER_MAP } from './users';

// Map of Notion User IDs to Names strictly based on dashboard UI members
// (Moved to users.ts)


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
