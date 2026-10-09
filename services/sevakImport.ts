// Bulk "Add Sevaks" from a CSV / Excel file. Columns: Full Name, Mobile Number, Alias (optional), Gender
// (Male / Female). Headers are matched loosely; a file without a header row is read in that column order.
// Each valid row is then created exactly like a single Sevak (dataService.createSevak), so the same rules
// apply: same name AND same mobile = already exists; a name taken elsewhere gets a number added.

export interface ImportRow {
  line: number;        // row number as the Captain sees it in the sheet
  fullName: string;
  mobile: string;      // normalised to 10 digits when valid
  alias: string;
  gender: 'Male' | 'Female' | '';
  error?: string;      // why this row cannot be imported
}

export const TEMPLATE_CSV = 'Full Name,Mobile Number,Alias,Gender\nRahul Jain,9876543210,Rahul Paldi,Male\nPriya Shah,+91 98765 43211,,Female\n';
export const MAX_IMPORT_ROWS = 500;

// "+91 98765-43210", "098765 43210", 9876543210 (an Excel number), "9.87654321E9" -> "9876543210"
export function normalizeMobile(raw: unknown): string | null {
  let s = typeof raw === 'number' ? Math.round(raw).toString() : String(raw ?? '').trim();
  if (/^\d+(\.\d+)?e\+?\d+$/i.test(s)) s = Math.round(Number(s)).toString(); // scientific notation from Excel
  let digits = s.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 13 && digits.startsWith('091')) digits = digits.slice(3);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export function normalizeGender(raw: unknown): 'Male' | 'Female' | '' {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return '';
  if (['m', 'male', 'man', 'boy', 'gent', 'gents', 'purush', 'પુરુષ', 'पुरुष', 'bhai'].includes(s)) return 'Male';
  if (['f', 'female', 'woman', 'girl', 'lady', 'ladies', 'stri', 'mahila', 'સ્ત્રી', 'મહિલા', 'स्त्री', 'महिला', 'ben', 'bahen'].includes(s)) return 'Female';
  return '';
}

const cleanName = (raw: unknown) => String(raw ?? '').replace(/\s+/g, ' ').trim();

type Col = 'name' | 'mobile' | 'alias' | 'gender';
function headerColumns(cells: unknown[]): Partial<Record<Col, number>> | null {
  const map: Partial<Record<Col, number>> = {};
  cells.forEach((cell, i) => {
    const h = String(cell ?? '').toLowerCase().replace(/[^a-z]/g, '');
    if (!h) return;
    if (map.mobile === undefined && /(mobile|phone|contact|number|whatsapp)/.test(h)) map.mobile = i;
    else if (map.alias === undefined && /(alias|nick|reference|known)/.test(h)) map.alias = i;
    else if (map.gender === undefined && /(gender|sex)/.test(h)) map.gender = i;
    else if (map.name === undefined && /name/.test(h)) map.name = i;
  });
  return map.name !== undefined && map.mobile !== undefined ? map : null;
}

/** Reads a .csv / .xlsx / .xls file into rows, each already checked. */
export async function parseSevakFile(file: File): Promise<ImportRow[]> {
  const XLSX = await import('xlsx');
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array', raw: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error('The file has no sheet.');
  // raw values, so long mobile numbers are not turned into "9.88E+09" text
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: '' })
    .filter(r => r.some(c => String(c ?? '').trim() !== ''));
  if (grid.length === 0) throw new Error('The file is empty.');

  const header = headerColumns(grid[0]);
  const cols: Record<Col, number | undefined> = header
    ? { name: header.name, mobile: header.mobile, alias: header.alias, gender: header.gender }
    : { name: 0, mobile: 1, alias: 2, gender: 3 };
  const body = header ? grid.slice(1) : grid;
  if (body.length > MAX_IMPORT_ROWS) throw new Error(`Please upload at most ${MAX_IMPORT_ROWS} Sevaks at a time.`);

  const seen = new Set<string>();
  return body.map((r, i): ImportRow => {
    const line = i + (header ? 2 : 1);
    const at = (c: Col) => (cols[c] === undefined ? '' : r[cols[c] as number]);
    const fullName = cleanName(at('name'));
    const mobile = normalizeMobile(at('mobile'));
    const alias = cleanName(at('alias')).slice(0, 60);
    const gender = normalizeGender(at('gender'));
    const row: ImportRow = { line, fullName, mobile: mobile || String(at('mobile') ?? '').trim(), alias, gender };
    if (fullName.replace(/[^a-z0-9]/gi, '').length < 2) row.error = 'Full name is missing';
    else if (!mobile) row.error = 'Mobile number is not a valid 10-digit number';
    else if (!gender) row.error = 'Gender must be Male or Female';
    else {
      const key = `${fullName.toLowerCase().replace(/[^a-z0-9]/g, '')}|${mobile}`;
      if (seen.has(key)) row.error = 'Same name and mobile appears earlier in the file';
      seen.add(key);
    }
    return row;
  });
}
