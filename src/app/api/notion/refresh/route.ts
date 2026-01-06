import { NextResponse } from 'next/server';
import { fetchGoogleSheetData, SheetRow } from '@/lib/google_sheets';

// Helper to split comma-separated names
const parseOwners = (str: string) => str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];

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
        '진행 중', 'Active' // General
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
            const phases = determinePhases(row);

            phases.forEach(p => {
                tasks.push({
                    id: `${row.URL || Math.random()}-${p.phase}`, // Unique ID per phase entry
                    title: row.Title,
                    status: row.Status,
                    category: row.Category,
                    phase: p.phase, // 'Discovery' | 'Delivery'
                    owner: p.owner,
                    url: row.URL || "#"
                });
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
