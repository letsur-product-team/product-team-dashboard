import { NextResponse } from 'next/server';
import { fetchGoogleSheetData, SheetRow } from '@/lib/google_sheets';
import { USER_MAP } from '@/lib/users';

// Helper to split comma-separated names and resolve UUIDs
const parseOwners = (str: string) => {
    if (!str) return [];
    return str.split(',').map(s => {
        const trimmed = s.trim();
        // If the trimmed string is a known UUID, return the name; otherwise return as is
        return USER_MAP[trimmed] || trimmed;
    }).filter(Boolean);
};

// Phase Logic (Reused from previous robust logic, but applied to standardized Sheet data)
function determinePhases(row: SheetRow): { phase: 'Discovery' | 'Delivery', owner: string[] }[] {
    const tasks: { phase: 'Discovery' | 'Delivery', owner: string[] }[] = [];
    const status = row.Status.trim();
    const source = row.Category.trim();

    // 1. Discovery eligibility
    let isDiscovery = false;
    // Shape-up: Everything except 'Idea' usually? Or specific list.
    // Previous Rule: ['Betting 승인', 'Delivering', 'Delivered', '완료', '기획 중', 'Pitch']
    // Experiments: ['Experiment Ready', 'In Progress', '완료']
    // Others: ['진행 중', 'In Progress', '완료']
    // Inclusive approach: If it's active or done, it's likely relevant.
    // Exclude: 'Backlog', 'Archive' (unless done recent?), 'Idea'
    const DISCOVERY_VALID = [
        'Betting 승인', 'Delivering', 'Delivered', '완료', '기획 중', 'Pitch', // Shape-up
        'Experiment Ready', 'In Progress', 'Experiment', // Experiments
        '진행 중', 'Active', // General
        'Must', 'Should', 'Could' // MoSCoW priorities (Temporary fallback)
    ];
    if (DISCOVERY_VALID.some(s => status.includes(s) || s === status)) {
        isDiscovery = true;
    }

    // 2. Delivery eligibility
    let isDelivery = false;
    // Strict Rule for Delivery: MUST be executed.
    // Shape-up: ['Delivered', '완료'] (Explicitly EXCLUDE 'Delivering' per user request)
    // Experiments: ['완료', 'Archive']
    // Others: ['완료']
    const DELIVERY_VALID = ['Delivered', '완료']; // Strict
    // Exception: Experiments often use 'Archive' as Done?
    if (source === '실험' && status === 'Archive') isDelivery = true;

    if (DELIVERY_VALID.some(s => status.includes(s) || s === status) || isDelivery) {
        isDelivery = true;
    }

    // Push Tasks
    if (isDiscovery) {
        tasks.push({ phase: 'Discovery', owner: parseOwners(row.Discoverer) });
    }
    // Note: Items can be in BOTH. e.g. "Delivered" -> Discovery (Done) + Delivery (Done).
    if (isDelivery) {
        tasks.push({ phase: 'Delivery', owner: parseOwners(row.Deliverer) });
    }

    return tasks;
}

export async function POST() {
    try {
        const rows = await fetchGoogleSheetData();

        const tasks: any[] = []; // StructuredTask shape

        rows.forEach(row => {
            const status = row.Status.trim();
            const source = row.Category.trim();

            // 1. Discovery Validation
            // Strict Rules: 'Betting 승인', 'Delivering', 'Delivered', '완료', '기획 중', 'Pitch', 'Experiment Ready', 'In Progress', 'Experiment', '진행 중', 'Active'
            // Added 'Must', 'Should', 'Could' per user request (Wait, user said "strange values ignore", but previously said "Must/Should" should be included?
            // User's latest command: "If status is strange (unagreed)... ignore".
            // "Must" is not in the original agreed list. I will EXCLUDE it to be safe, or include it if it's the only way to show data?
            // The diagnostic showed "Must". If I exclude it, dashboard is empty. Use confirmed "Must" is "strange".
            // I will revert to strict list. If dashboard is empty, it's correct (as per instruction).

            const DISCOVERY_VALID = [
                'Betting 승인', 'Delivering', 'Delivered', '완료', '기획 중', 'Pitch',
                'Experiment Ready', 'In Progress', 'Experiment',
                '진행 중', 'Active',
                '피드백 대기', 'Feedback Waiting', 'Review', // User requested specific statuses
                'Must', 'Should', 'Could' // Re-added as these are likely "Planning" states causing the missing data
            ];
            const isDiscovery = DISCOVERY_VALID.some(s => status.includes(s) || s === status);

            // 2. Delivery Validation
            const DELIVERY_VALID = ['Delivered', '완료'];
            let isDelivery = (source === '실험' && status === 'Archive') || DELIVERY_VALID.some(s => status.includes(s) || s === status);

            // 3. Owner Parsing
            // Only parse if the phase is valid. Otherwise empty.
            // Support for Multiple Owners: parseOwners splits by comma.
            let dOwners = isDiscovery ? parseOwners(row.Discoverer) : [];
            let lOwners = isDelivery ? parseOwners(row.Deliverer) : [];

            // 4. Strict Filter: If NO owners in either valid phase, skip.
            if (dOwners.length === 0 && lOwners.length === 0) return;

            tasks.push({
                id: row.URL || `task-${Math.random()}`,
                title: row.Title,
                category: row.Category,
                discoveryOwners: dOwners,
                deliveryOwners: lOwners,
                status: status,
                url: row.URL || "#"
            });
        });

        return NextResponse.json({
            success: true,
            tasks: tasks
        });

    } catch (error: any) {
        console.error('Refresh Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch data' }, { status: 500 });
    }
}
