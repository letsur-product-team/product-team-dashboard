import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

// Initialize Notion client
const notion = new Client({ auth: process.env.NOTION_TOKEN });

const SOT_DATABASES = {
    PITCH: '26fa0be0969d80a19173f39596399beb',       // Shape-up
    PROBLEMS: '2a7a0be0969d80169503f6d966cf2f47',    // 실험
    ROADMAP: '2b5a0be0969d80f08836000ba6a10ba2',     // IS팀
    GLOBAL_PROBLEMS: '2d9a0be0969d81be9c23ec5f26afd586', // etc/Global
};

// --- Helper: Map Notion User IDs to Names strictly based on dashboard UI members (16 core) ---
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

export async function POST() {
    if (!process.env.NOTION_TOKEN) {
        return NextResponse.json({ error: 'NOTION_TOKEN missing' }, { status: 500 });
    }

    try {
        // 1. Fetch Shape-up Pitches
        const pitchResponse = await (notion.databases as any).query({
            database_id: SOT_DATABASES.PITCH,
            filter: {
                property: '6-pagers',
                relation: { is_not_empty: true }
            }
        });

        const pitchTasks = pitchResponse.results.map((page: any) => {
            const props = page.properties;
            return {
                id: page.id,
                title: props['이름']?.title[0]?.plain_text || 'Untitled Pitch',
                discoveryOwners: props['제안자']?.people?.map((p: any) => USER_MAP[p.id]).filter(Boolean) || [],
                deliveryOwners: props['실행자']?.people?.map((p: any) => USER_MAP[p.id]).filter(Boolean) || [],
                category: 'Shape-up'
            };
        });

        // 2. Fetch Experiments (실험)
        const probResponse = await (notion.databases as any).query({
            database_id: SOT_DATABASES.PROBLEMS,
        });

        const experimentTasks = probResponse.results.map((page: any) => {
            const props = page.properties;
            const lead = props['Lead']?.people?.map((p: any) => USER_MAP[p.id]).filter(Boolean) || [];
            const members = props['Members']?.people?.map((p: any) => USER_MAP[p.id]).filter(Boolean) || [];
            const status = props['Status']?.select?.name || '';

            // Robust discovery mapping including 'Backlog'
            const isDiscovery = ['Problem Definition', 'Hypothesis Framing', 'Backlog'].includes(status);

            return {
                id: page.id,
                title: props['Name']?.title[0]?.plain_text || 'Untitled Problem',
                discoveryOwners: isDiscovery ? lead : [],
                deliveryOwners: !isDiscovery ? [...lead, ...members] : [],
                category: '실험'
            };
        });

        // 3. Fetch IS Roadmap
        const roadmapResponse = await (notion.databases as any).query({
            database_id: SOT_DATABASES.ROADMAP,
        });

        const roadmapTasks = roadmapResponse.results.map((page: any) => {
            const props = page.properties;
            const assignees = props['담당자']?.people?.map((p: any) => USER_MAP[p.id]).filter(Boolean) || [];
            const status = props['상태']?.select?.name || '';
            const isDiscovery = ['시작 전', 'Backlog'].includes(status);

            return {
                id: page.id,
                title: props['이름']?.title[0]?.plain_text || 'Untitled Roadmap',
                discoveryOwners: isDiscovery ? assignees : [],
                deliveryOwners: !isDiscovery ? assignees : [],
                category: 'IS팀'
            };
        });

        // 4. Fetch Global Problems (etc)
        const globalResponse = await (notion.databases as any).query({
            database_id: SOT_DATABASES.GLOBAL_PROBLEMS,
        });

        const globalTasks = globalResponse.results.map((page: any) => {
            const props = page.properties;
            const lead = props['Lead']?.people?.map((p: any) => USER_MAP[p.id]).filter(Boolean) || [];
            const members = props['Members']?.people?.map((p: any) => USER_MAP[p.id]).filter(Boolean) || [];
            const status = props['Status']?.select?.name || '';
            const isDiscovery = ['Problem Definition', 'Hypothesis Framing', 'Backlog'].includes(status);

            return {
                id: page.id,
                title: props['Name']?.title[0]?.plain_text || 'Untitled etc',
                discoveryOwners: isDiscovery ? lead : [],
                deliveryOwners: !isDiscovery ? [...lead, ...members] : [],
                category: 'etc'
            };
        });

        return NextResponse.json({
            success: true,
            tasks: [...pitchTasks, ...experimentTasks, ...roadmapTasks, ...globalTasks]
        });
    } catch (error) {
        console.error('Notion Sync Error:', error);
        return NextResponse.json({ error: 'Failed to sync with Notion' }, { status: 500 });
    }
}
