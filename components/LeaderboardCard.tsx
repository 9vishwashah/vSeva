import React, { useState } from 'react';
import { Trophy, Medal, Download } from 'lucide-react';
import vSevaLogo from '../assets/vseva-logo-removebg-preview.png';

interface LeaderboardItem {
    rank: number;
    name: string;
    count: number;
    km: number;
    username: string;
}

interface LeaderboardCardProps {
    title: string;
    icon: React.ReactNode;
    items: LeaderboardItem[];
    colorClass: string;
    bgClass: string;
    loading?: boolean;
    orgName?: string;
    captainName?: string;
}

// Convert local image URL → base64 data URI
async function imgToBase64(src: string): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.naturalWidth || 128;
            c.height = img.naturalHeight || 128;
            c.getContext('2d')?.drawImage(img, 0, 0);
            resolve(c.toDataURL('image/png'));
        };
        img.onerror = () => resolve('');
        img.src = src;
    });
}

// ── A4 constants (mm) ─────────────────────────────────────────────────────────
const PW = 210;          // page width
const PH = 297;          // page height
const ML = 12;           // left margin
const MR = 12;           // right margin
const MT = 12;           // top margin
const MB = 12;           // bottom margin
const CW = PW - ML - MR; // content width  = 186mm

// Vertical zones
const HEADER_H = 38;     // header band height (mm from MT)
const COL_HDR_H = 10;    // column header row height
const ROW_H = 11;        // each data row height
const FOOTER_H = 12;     // footer band height
const ROWS_PER_PAGE = 15;

// ── Colour palette (orange) ──────────────────────────────────────────────────
const C = {
    orange:   [234, 88,  12]  as [number,number,number],  // #ea580c
    amber:    [251, 146, 60]  as [number,number,number],  // #fb923c
    cream:    [255, 247, 237] as [number,number,number],  // #fff7ed
    white:    [255, 255, 255] as [number,number,number],
    dark:     [30,  30,  30]  as [number,number,number],
    mid:      [80,  80,  80]  as [number,number,number],
    soft:     [130, 130, 130] as [number,number,number],
    rowEven:  [255, 252, 248] as [number,number,number],
    rowOdd:   [255, 255, 255] as [number,number,number],
    divider:  [240, 232, 220] as [number,number,number],
    gold:     [202, 138, 4]   as [number,number,number],
    silver:   [107, 114, 128] as [number,number,number],
    bronze:   [180, 83,  9]   as [number,number,number],
};

const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
    title, icon, items, colorClass, bgClass, loading, orgName, captainName
}) => {
    const [busy, setBusy] = useState(false);

    const handleDownload = async () => {
        if (busy || !items.length) return;
        setBusy(true);
        try {
            const { jsPDF } = await import('jspdf');
            const logoB64 = await imgToBase64(vSevaLogo);

            const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
            const totalPages = Math.ceil(items.length / ROWS_PER_PAGE);

            // Pre-calculate fixed Y positions on every page
            const headerTopY   = MT;                           // 12
            const colHdrY      = headerTopY + HEADER_H;        // 50 — top of col header band
            const firstRowY    = colHdrY + COL_HDR_H;          // 60 — top of first data row
            const lastRowBottom = firstRowY + ROWS_PER_PAGE * ROW_H; // 225
            const footerY      = PH - MB - FOOTER_H;           // 273 — top of footer band

            const drawOuter = () => {
                // thin orange outer border
                doc.setDrawColor(...C.orange);
                doc.setLineWidth(0.6);
                doc.rect(ML - 3, MT - 3, CW + 6, PH - MT - MB + 6);
                // inner hairline
                doc.setDrawColor(...C.divider);
                doc.setLineWidth(0.2);
                doc.rect(ML - 1, MT - 1, CW + 2, PH - MT - MB + 2);
            };

            const drawHeader = (page: number) => {
                // Orange gradient band (top)
                doc.setFillColor(...C.orange);
                doc.rect(ML - 3, MT - 3, CW + 6, HEADER_H, 'F');

                // Logo
                if (logoB64) {
                    doc.addImage(logoB64, 'PNG', ML + 1, MT + 3, 20, 20);
                }

                // Title
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(17);
                doc.setTextColor(...C.white);
                doc.text(title, ML + 26, MT + 12);

                // Org name
                if (orgName) {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9);
                    doc.setTextColor(255, 220, 180);
                    doc.text(orgName, ML + 26, MT + 20);
                }

                // Captain name
                if (captainName) {
                    doc.setFont('helvetica', 'italic');
                    doc.setFontSize(8);
                    doc.setTextColor(255, 220, 180);
                    doc.text(`Captain: ${captainName}`, ML + 26, MT + 27);
                }

                // Right side: date + page
                const dateStr = new Date().toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric'
                });
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(255, 220, 180);
                doc.text(dateStr, PW - MR - 2, MT + 10, { align: 'right' });
                if (totalPages > 1) {
                    doc.text(`Page ${page} / ${totalPages}`, PW - MR - 2, MT + 16, { align: 'right' });
                }
                // "vSeva" badge top-right
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(...C.white);
                doc.text('vSeva', PW - MR - 2, MT + 24, { align: 'right' });

                // Orange accent separator line (bottom of header)
                doc.setDrawColor(...C.amber);
                doc.setLineWidth(0.8);
                doc.line(ML - 3, headerTopY + HEADER_H - 0.5, PW - MR + 3, headerTopY + HEADER_H - 0.5);
            };

            const drawColHeader = () => {
                // bg
                doc.setFillColor(...C.cream);
                doc.rect(ML - 3, colHdrY, CW + 6, COL_HDR_H, 'F');
                // bottom rule
                doc.setDrawColor(...C.orange);
                doc.setLineWidth(0.4);
                doc.line(ML - 3, colHdrY + COL_HDR_H, PW - MR + 3, colHdrY + COL_HDR_H);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.5);
                doc.setTextColor(...C.orange);
                const textY = colHdrY + 6.5;
                doc.text('RANK',   ML + 6,           textY);
                doc.text('NAME',   ML + 24,           textY);
                doc.text('KM',     PW - MR - 28,     textY);
                doc.text('VIHARS', PW - MR - 2,      textY, { align: 'right' });
            };

            const drawFooter = () => {
                // Cream footer band
                doc.setFillColor(...C.cream);
                doc.rect(ML - 3, footerY, CW + 6, FOOTER_H, 'F');

                // top line of footer
                doc.setDrawColor(...C.orange);
                doc.setLineWidth(0.35);
                doc.line(ML - 3, footerY, PW - MR + 3, footerY);

                // Logo small
                if (logoB64) {
                    doc.addImage(logoB64, 'PNG', ML + 1, footerY + 2, 7, 7);
                }
                // Brand text
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(...C.orange);
                doc.text('vSeva', ML + 10, footerY + 7.5);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.setTextColor(...C.soft);
                doc.text('· Every Step Counts  ·  vseva.vjas.in  ·  Powered by VJAS', ML + 22, footerY + 7.5);
            };

            const drawRow = (item: LeaderboardItem, rowIndex: number) => {
                const y = firstRowY + rowIndex * ROW_H;

                // Alternating bg
                doc.setFillColor(...(rowIndex % 2 === 0 ? C.rowEven : C.rowOdd));
                doc.rect(ML - 3, y, CW + 6, ROW_H, 'F');

                // Row bottom divider
                doc.setDrawColor(...C.divider);
                doc.setLineWidth(0.15);
                doc.line(ML - 3, y + ROW_H, PW - MR + 3, y + ROW_H);

                const textY = y + 7.5;

                // Rank
                const isTop3 = item.rank <= 3;
                const rankLabel = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`;
                const rankColor: [number,number,number] =
                    item.rank === 1 ? C.gold :
                    item.rank === 2 ? C.silver :
                    item.rank === 3 ? C.bronze : C.soft;

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(isTop3 ? 8.5 : 8);
                doc.setTextColor(...rankColor);
                // Use plain text for non-emoji fallback
                const rankText = item.rank === 1 ? '1st' : item.rank === 2 ? '2nd' : item.rank === 3 ? '3rd' : `#${item.rank}`;
                doc.text(rankText, ML + 6, textY);

                // Name
                doc.setFont('helvetica', item.rank <= 3 ? 'bold' : 'normal');
                doc.setFontSize(9);
                doc.setTextColor(...C.dark);
                const maxNameLen = 32;
                const nameStr = item.name.length > maxNameLen ? item.name.slice(0, maxNameLen - 1) + '…' : item.name;
                doc.text(nameStr, ML + 24, textY);

                // KM
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(...C.mid);
                doc.text(`${item.km} km`, PW - MR - 28, textY);

                // Vihar count — orange badge style
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(...C.orange);
                doc.text(String(item.count), PW - MR - 2, textY, { align: 'right' });

                // Top-3 left accent strip
                if (item.rank <= 3) {
                    doc.setFillColor(...rankColor);
                    doc.rect(ML - 3, y, 2.5, ROW_H, 'F');
                }
            };

            // ── Render pages ──────────────────────────────────────────────────
            for (let p = 0; p < totalPages; p++) {
                if (p > 0) doc.addPage();

                drawOuter();
                drawHeader(p + 1);
                drawColHeader();

                const pageItems = items.slice(p * ROWS_PER_PAGE, (p + 1) * ROWS_PER_PAGE);
                pageItems.forEach((item, i) => drawRow(item, i));

                // draw empty rows to fill remaining space (visual grid)
                for (let i = pageItems.length; i < ROWS_PER_PAGE; i++) {
                    const y = firstRowY + i * ROW_H;
                    doc.setFillColor(...(i % 2 === 0 ? C.rowEven : C.rowOdd));
                    doc.rect(ML - 3, y, CW + 6, ROW_H, 'F');
                    doc.setDrawColor(...C.divider);
                    doc.setLineWidth(0.15);
                    doc.line(ML - 3, y + ROW_H, PW - MR + 3, y + ROW_H);
                }

                // Bottom border of table area
                doc.setDrawColor(...C.orange);
                doc.setLineWidth(0.35);
                doc.line(ML - 3, lastRowBottom, PW - MR + 3, lastRowBottom);

                // Summary line between table and footer
                if (p === totalPages - 1) {
                    const totalKm = items.reduce((s, x) => s + x.km, 0).toFixed(1);
                    const totalVihars = items.reduce((s, x) => s + x.count, 0);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(...C.orange);
                    const summaryY = lastRowBottom + 8;
                    doc.text(`Total: ${items.length} Sevaks   ·   ${totalVihars} Vihars   ·   ${totalKm} km combined`, ML + 2, summaryY);
                }

                drawFooter();
            }

            const safeName = title.replace(/\s+/g, '_');
            const dateTag = new Date().toISOString().split('T')[0];
            doc.save(`${safeName}_${dateTag}.pdf`);
        } catch (err) {
            console.error('PDF failed:', err);
            alert('Could not generate PDF. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className={`p-4 border-b border-gray-100 flex items-center gap-2 ${bgClass}`}>
                <div className={colorClass}>{icon}</div>
                <h3 className="font-bold text-gray-800 flex-1">{title}</h3>
                <img src={vSevaLogo} alt="vSeva" className="h-8 w-8 object-contain opacity-80 mr-1" />
                <button
                    onClick={handleDownload}
                    disabled={busy || !!loading || items.length === 0}
                    title="Download as PDF"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/70 hover:bg-white text-gray-600 hover:text-orange-600 border border-white/50 transition-all active:scale-90 disabled:opacity-40 text-xs font-semibold shadow-sm"
                >
                    {busy
                        ? <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin block" />
                        : <Download size={13} />
                    }
                    <span className="hidden sm:inline">PDF</span>
                </button>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto max-h-[295px]">
                {loading ? (
                    <div className="p-4 space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">No active sevaks found.</div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {items.map((item, index) => (
                            <div key={index} className="flex items-center p-3 hover:bg-gray-50 transition-colors">
                                <div className={`flex-shrink-0 w-8 flex justify-center text-sm font-bold ${
                                    item.rank === 1 ? 'text-yellow-500' :
                                    item.rank === 2 ? 'text-gray-400'   :
                                    item.rank === 3 ? 'text-orange-500' : 'text-gray-400'
                                }`}>
                                    {item.rank <= 3 ? <Medal size={18} /> : `#${item.rank}`}
                                </div>
                                <div className="flex-1 min-w-0 ml-3">
                                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                                    <p className="text-xs text-gray-500">{item.km} km</p>
                                </div>
                                <div className="mr-2 text-right">
                                    <span className="block text-lg font-bold text-gray-800 leading-none">{item.count}</span>
                                    <span className="text-[10px] text-gray-400 uppercase">Vihars</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeaderboardCard;
