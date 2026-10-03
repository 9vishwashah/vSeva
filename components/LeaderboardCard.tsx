import React, { useState } from 'react';
import { Trophy, Medal, Download } from 'lucide-react';
import { BRAND } from '@brand';
import { toLocalDateKey } from '../services/dateUtils';
import { deliverPdf } from '../services/pdfDelivery';

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
    orgCity?: string;
    captainName?: string;
    viceCaptainName?: string;
    vyLabel?: string;
}

const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
    title, icon, items, colorClass, bgClass, loading, orgName, orgCity, captainName, viceCaptainName, vyLabel
}) => {
    const [busy, setBusy] = useState(false);

    // Same PDF structure/styling as the main Vihar export (Dashboard's
    // downloadPDF): dual-logo header, saffron autoTable, watermark, total row,
    // Hindi/Gujarati name support — kept consistent across every export in the app.
    const handleDownload = async () => {
        if (busy || !items.length) return;
        setBusy(true);
        try {
            const [
                { default: jsPDF },
                { default: autoTable },
                { NotoSansDevanagariBase64 },
                { NotoSansGujaratiBase64 },
            ] = await Promise.all([
                import('jspdf'),
                import('jspdf-autotable'),
                import('../assets/NotoSansDevanagari-Regular'),
                import('../assets/NotoSansGujarati-Regular'),
            ]);

            const doc = new jsPDF();

            doc.addFileToVFS('NotoSansDevanagari-Regular.ttf', NotoSansDevanagariBase64);
            doc.addFont('NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari', 'normal');
            doc.addFileToVFS('NotoSansGujarati-Regular.ttf', NotoSansGujaratiBase64);
            doc.addFont('NotoSansGujarati-Regular.ttf', 'NotoSansGujarati', 'normal');

            const pageWidth = doc.internal.pageSize.getWidth();

            doc.addImage(BRAND.logo, 'PNG', 14, 10, 15, 15);
            if (BRAND.partnerLogo) doc.addImage(BRAND.partnerLogo, 'JPEG', pageWidth - 14 - 15, 10, 15, 15);

            // Title/subtitle — org identity first, same as the main Vihar export.
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(18);
            doc.setTextColor(234, 88, 12); // Saffron
            const orgLine = orgName ? `${orgName}${orgCity ? `, ${orgCity}` : ''}` : 'Organization';
            doc.text(orgLine, 35, 18);

            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text(BRAND.byline, 35, 24);

            // Top-centered report-type badge — Sevak/Sevika, derived from this
            // card's own title so no extra prop is needed for it.
            const isSevikaReport = title.toLowerCase().includes('sevika');
            const reportLabel = isSevikaReport ? 'Sevika Report (Female)' : 'Sevak Report (Male)';
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            const badgeW = doc.getTextWidth(reportLabel) + 12;
            const badgeX = (pageWidth - badgeW) / 2;
            doc.setFillColor(234, 88, 12);
            doc.roundedRect(badgeX, 27, badgeW, 7, 3.5, 3.5, 'F');
            doc.setTextColor(255, 255, 255);
            doc.text(reportLabel, pageWidth / 2, 31.7, { align: 'center' });

            // Left column: Captain / Vice Captain / Vihar Year Period.
            // Right column: Generated on — same layout as the main Vihar export.
            const blockStartY = 38;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(100);
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
            const generatedAt = `${now.toLocaleDateString('en-GB')} ${timeString}`;
            doc.text(`Generated on: ${generatedAt}`, pageWidth - 14, blockStartY, { align: 'right' });

            let leftY = blockStartY;
            doc.setTextColor(234, 88, 12); // Saffron
            if (captainName) {
                doc.text(`Captain: ${captainName}`, 14, leftY);
                leftY += 6;
            }
            if (viceCaptainName) {
                doc.text(`Vice Captain: ${viceCaptainName}`, 14, leftY);
                leftY += 6;
            }
            if (vyLabel) {
                doc.setFont('helvetica', 'bold');
                doc.text(`Vihar Year Period: ${vyLabel}`, 14, leftY);
                doc.setFont('helvetica', 'normal');
                leftY += 6;
            }

            const drawWatermark = () => {
                const pageW = doc.internal.pageSize.getWidth();
                const pageH = doc.internal.pageSize.getHeight();
                const wmSize = 100; // mm
                const wmX = (pageW - wmSize) / 2;
                const wmY = (pageH - wmSize) / 2;
                (doc as any).saveGraphicsState();
                (doc as any).setGState(new (doc as any).GState({ opacity: 0.12 }));
                doc.addImage(BRAND.logo, 'PNG', wmX, wmY, wmSize, wmSize);
                (doc as any).restoreGraphicsState();
            };

            // No total row — just each Sevak/Sevika's own values, per request.
            const bodyData = items.map(item => {
                const rankText = item.rank === 1 ? '1st' : item.rank === 2 ? '2nd' : item.rank === 3 ? '3rd' : `#${item.rank}`;
                return [rankText, item.name, item.count, item.km];
            });

            autoTable(doc, {
                startY: Math.max(leftY, blockStartY) + 3,
                head: [['Rank', 'Name', 'Vihars', 'Km']],
                body: bodyData,
                styles: {
                    fontSize: 9,
                    lineColor: [200, 200, 200],
                    lineWidth: 0.2,
                    textColor: [30, 30, 30]
                },
                headStyles: { fillColor: [234, 88, 12], textColor: 255 },
                alternateRowStyles: { fillColor: [255, 250, 245] },
                didParseCell: (hookData) => {
                    const text = hookData.cell.raw != null ? String(hookData.cell.raw) : '';
                    const hasHindi = /[ऀ-ॿ]/.test(text);
                    const hasGujarati = /[઀-૿]/.test(text);
                    if (hasGujarati) {
                        hookData.cell.styles.font = 'NotoSansGujarati';
                    } else if (hasHindi) {
                        hookData.cell.styles.font = 'NotoSansDevanagari';
                    }

                    if (hookData.section === 'body' && hookData.column.index === 0 && hookData.row.index < 3) {
                        // Top-3 rank cell — gold/silver/bronze
                        const medalColors: [number, number, number][] = [[202, 138, 4], [107, 114, 128], [180, 83, 9]];
                        hookData.cell.styles.textColor = medalColors[hookData.row.index];
                        hookData.cell.styles.fontStyle = 'bold';
                    }
                },
                didDrawPage: () => drawWatermark(),
            });

            const safeName = title.replace(/\s+/g, '_');
            const dateTag = toLocalDateKey(new Date());
            await deliverPdf(doc, `${safeName}_${dateTag}.pdf`);
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
                <img src={BRAND.logo} alt={BRAND.name} className="h-8 w-8 object-contain opacity-80 mr-1" />
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
