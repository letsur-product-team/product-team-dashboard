
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

    // We use fixed indices because the Apps Script writes in a specific order:
    // [Category, Title, Status, Discoverer, Deliverer, URL]
    // 0: Category
    // 1: Title
    // 2: Status
    // 3: Discoverer
    // 4: Deliverer
    // 5: URL

    const results: SheetRow[] = [];

    // Start from row 1 (skipping header row 0)
    for (let i = 1; i < rows.length; i++) {
        const cols = parseLine(rows[i]);

        // Ensure we have enough columns, pad if necessary
        const getVal = (idx: number) => (cols[idx] || "").trim();

        results.push({
            Category: getVal(0),
            Title: getVal(1),
            Status: getVal(2),
            Discoverer: getVal(3),
            Deliverer: getVal(4),
            URL: getVal(5),
            Raw: cols
        });
    }

    return results;
}
