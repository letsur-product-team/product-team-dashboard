
export interface SheetRow {
    Category: string;
    Title: string;
    Status: string;
    Discoverer: string;
    Deliverer: string;
    URL?: string;
    Raw: any;
}

export async function fetchGoogleSheetData(): Promise<SheetRow[]> {
    const csvUrl = process.env.GOOGLE_SHEET_CSV_URL;
    if (!csvUrl) {
        throw new Error('GOOGLE_SHEET_CSV_URL is not defined in .env');
    }

    const response = await fetch(csvUrl, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Failed to fetch Google Sheet CSV: ${response.statusText}`);
    }

    const csvText = await response.text();
    return parseCSV(csvText);
}

function parseCSV(text: string): SheetRow[] {
    const rows = text.split('\n').filter(r => r.trim() !== '');
    if (rows.length < 2) return []; // Header only or empty

    // Basic CSV parser that handles quotes
    // Regex to match fields: "quoted value" OR non-comma-value
    // Note: This matches simple CSVs. Complex nested quotes might need a lib, but Sheets export is standard.
    const parseLine = (line: string) => {
        const regex = /(?:^|,)(?:"([^"]*)"|([^",]*))/g;
        const values: string[] = [];
        let match;
        while ((match = regex.exec(line)) !== null) {
            // match[1] is quoted content, match[2] is unquoted
            // We need to decode double quotes in quoted content if any ("" -> ")
            let val = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
            values.push(val?.trim() || '');
        }
        // Remove the empty match at the end if regex overmatches
        if (line.endsWith(',')) values.push('');
        return values;
    };

    // Headers: Category, Title, Status, Discoverer, Deliverer, URL
    // We assume specific order OR we map by Header name. Mapping is safer.
    const headerLine = rows[0];
    const headers = parseLine(headerLine).map(h => h.toLowerCase());

    const idxMap = {
        category: headers.indexOf('category'),
        title: headers.indexOf('title'),
        status: headers.indexOf('status'),
        discoverer: headers.indexOf('discoverer'),
        deliverer: headers.indexOf('deliverer'),
        url: headers.indexOf('url'),
    };

    const results: SheetRow[] = [];

    for (let i = 1; i < rows.length; i++) {
        const cols = parseLine(rows[i]);
        if (cols.length < 3) continue; // Skip malformed rows

        // Helper to get safe value
        const getVal = (idx: number) => (idx >= 0 && idx < cols.length) ? cols[idx] : "";

        results.push({
            Category: getVal(idxMap.category),
            Title: getVal(idxMap.title),
            Status: getVal(idxMap.status),
            Discoverer: getVal(idxMap.discoverer),
            Deliverer: getVal(idxMap.deliverer),
            URL: getVal(idxMap.url),
            Raw: cols
        });
    }

    return results;
}
