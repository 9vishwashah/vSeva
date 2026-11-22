import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Download, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import { BRAND } from '@brand';
import { dataService } from '../services/dataService';
import { deliverFile } from '../services/pdfDelivery';
import { parseSevakFile, TEMPLATE_CSV, MAX_IMPORT_ROWS, type ImportRow } from '../services/sevakImport';

interface Props {
  open: boolean;
  onClose: () => void;
  orgId: string;
  /** called once at least one Sevak was created, so the list can refresh */
  onCreated: () => void;
}

interface Result { line: number; fullName: string; status: 'created' | 'exists' | 'failed'; username?: string; password?: string; message?: string }

// Captain uploads a CSV / Excel list of Sevaks; every valid row is created like a single "Add Sevak".
const BulkSevakImport: React.FC<Props> = ({ open, onClose, orgId, onCreated }) => {
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);

  const reset = () => { setRows(null); setFileName(''); setParseError(null); setResults(null); };
  const close = () => { if (running) return; reset(); onClose(); };

  const valid = rows?.filter(r => !r.error) ?? [];
  const invalid = rows?.filter(r => r.error) ?? [];

  const pick = async (file?: File) => {
    if (!file) return;
    setParsing(true);
    setParseError(null);
    setResults(null);
    try {
      const parsed = await parseSevakFile(file);
      if (parsed.length === 0) throw new Error('No Sevak rows found in the file.');
      setRows(parsed);
      setFileName(file.name);
    } catch (e: any) {
      setRows(null);
      setParseError(e?.message || 'Could not read that file. Please use the template.');
    } finally {
      setParsing(false);
    }
  };

  const run = async () => {
    if (!valid.length || running) return;
    setRunning(true);
    const out: Result[] = [];
    setResults([]);
    for (const r of valid) {
      try {
        const creds = await dataService.createSevak(orgId, {
          fullName: r.fullName, mobile: r.mobile, gender: r.gender, alias: r.alias,
          bloodGroup: undefined, emergencyNumber: '', address: '',
        });
        out.push({ line: r.line, fullName: r.fullName, status: 'created', username: creds.username, password: creds.password });
      } catch (e: any) {
        const message = e?.message || 'Could not create';
        out.push({ line: r.line, fullName: r.fullName, status: /already/i.test(message) ? 'exists' : 'failed', message });
      }
      setResults([...out]);
    }
    setRunning(false);
    if (out.some(o => o.status === 'created')) onCreated();
  };

  const downloadTemplate = () =>
    deliverFile(new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' }), `${BRAND.shortName}_sevak_upload_template.csv`);

  const downloadLogins = async () => {
    const created = (results || []).filter(r => r.status === 'created');
    if (!created.length) return;
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(created.map(r => ({ Name: r.fullName, Username: r.username, Password: r.password })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'New Sevaks');
    const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    await deliverFile(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${BRAND.shortName}_new_sevak_logins.xlsx`);
  };

  const done = results?.length ?? 0;
  const createdCount = results?.filter(r => r.status === 'created').length ?? 0;

  return (
    <Modal open={open} onClose={close} maxWidth="max-w-lg">
      <div className="px-5 py-4 border-b border-line flex justify-between items-center gap-3 bg-surface shrink-0">
        <h3 className="m-0 display text-[1.4rem] font-bold text-ink flex items-center gap-2.5"><span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 shrink-0"><Upload size={18} /></span> Bulk Add Sevaks</h3>
        <button type="button" onClick={close} disabled={running} aria-label="Close" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sunken text-ink hover:bg-line transition-colors shrink-0 disabled:opacity-40"><X size={18} /></button>
      </div>

      <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
        {!rows && (
          <>
            <div className="rounded-xl bg-surface p-4 text-sm text-ink space-y-1.5">
              <p className="m-0 font-bold">Upload a CSV or Excel file with these columns:</p>
              <p className="m-0"><b>Full Name</b>, <b>Mobile Number</b>, <b>Alias</b> (optional), <b>Gender</b> (Male / Female)</p>
              <p className="m-0 text-xs text-ink-2">Mobile numbers like +91 98765 43210 or 098765-43210 are fixed to 10 digits automatically. Up to {MAX_IMPORT_ROWS} Sevaks per file.</p>
            </div>
            <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:underline">
              <Download size={15} /> Download template
            </button>
            <label className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-brand-200 bg-saffron-50/40 py-8 cursor-pointer text-brand-700 ${parsing ? 'opacity-60 pointer-events-none' : ''}`}>
              {parsing ? <Loader2 size={26} className="animate-spin" /> : <FileSpreadsheet size={26} />}
              <span className="text-sm font-bold">{parsing ? 'Reading file…' : 'Choose CSV or Excel file'}</span>
              <input type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden"
                onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            {parseError && <p className="m-0 rounded-xl bg-err-soft border border-err-soft px-3 py-2 text-sm font-semibold text-err">{parseError}</p>}
          </>
        )}

        {rows && !results && (
          <>
            <p className="m-0 text-sm text-ink"><b>{fileName}</b>: <span className="text-ok font-bold">{valid.length} ready</span>{invalid.length > 0 && <>, <span className="text-err font-bold">{invalid.length} need fixing</span></>}</p>
            {invalid.length > 0 && (
              <div className="rounded-xl border border-err-soft bg-red-50/60 p-3 space-y-1 max-h-44 overflow-y-auto">
                {invalid.map(r => (
                  <p key={r.line} className="m-0 text-xs text-err"><b>Row {r.line}</b>{r.fullName ? ` (${r.fullName})` : ''}: {r.error}</p>
                ))}
                <p className="m-0 pt-1 text-[11px] text-ink-2">These rows will be skipped. Fix them in the file and upload again later.</p>
              </div>
            )}
            {valid.length > 0 && (
              <div className="rounded-xl border border-line max-h-56 overflow-y-auto divide-y divide-line">
                {valid.map(r => (
                  <div key={r.line} className="px-3 py-2 flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-ink truncate">{r.fullName}{r.alias && <span className="font-normal text-ink-2"> ({r.alias})</span>}</span>
                    <span className="shrink-0 text-xs font-mono text-ink-2">{r.mobile} · {r.gender}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {results && (
          <>
            <div>
              <div className="flex items-center justify-between text-sm font-bold text-ink mb-1.5">
                <span>{running ? 'Creating Sevaks…' : 'Finished'}</span>
                <span>{done} / {valid.length}</span>
              </div>
              <div className="h-2 rounded-full bg-sunken overflow-hidden">
                <div className="h-full bg-brand transition-all" style={{ width: `${valid.length ? (done / valid.length) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="rounded-xl border border-line max-h-64 overflow-y-auto divide-y divide-line">
              {results.map(r => (
                <div key={r.line} className="px-3 py-2 flex items-start gap-2 text-sm">
                  {r.status === 'created' ? <CheckCircle2 size={16} className="text-ok shrink-0 mt-0.5" /> : <AlertTriangle size={16} className={`${r.status === 'exists' ? 'text-amber-500' : 'text-err'} shrink-0 mt-0.5`} />}
                  <div className="min-w-0">
                    <p className="m-0 font-semibold text-ink truncate">{r.fullName}</p>
                    <p className="m-0 text-xs text-ink-2 break-words">{r.status === 'created' ? `Username: ${r.username}` : r.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="px-5 py-3 border-t border-line flex gap-2 shrink-0">
        {rows && !results && (
          <>
            <button type="button" onClick={reset} className="flex-1 py-2.5 rounded-xl border border-line text-sm font-bold text-ink">Choose another file</button>
            <button type="button" onClick={run} disabled={!valid.length} className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-600 text-ink text-sm font-extrabold disabled:opacity-50">
              Create {valid.length} Sevak{valid.length === 1 ? '' : 's'}
            </button>
          </>
        )}
        {results && !running && (
          <>
            {createdCount > 0 && (
              <button type="button" onClick={downloadLogins} className="flex-1 py-2.5 rounded-xl border border-line text-sm font-bold text-ink inline-flex items-center justify-center gap-1.5">
                <Download size={15} /> Login details
              </button>
            )}
            <button type="button" onClick={close} className="flex-1 py-2.5 rounded-xl bg-brand text-ink text-sm font-extrabold">Done ({createdCount} added)</button>
          </>
        )}
        {!rows && <button type="button" onClick={close} className="flex-1 py-2.5 rounded-xl border border-line text-sm font-bold text-ink">Cancel</button>}
      </div>
    </Modal>
  );
};

export default BulkSevakImport;
