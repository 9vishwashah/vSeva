import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { UserProfile } from '../types';
import vSevaLogo from '../assets/vseva-logo-removebg-preview.png';
import vsgLogo from '../assets/vsg.jpg';
import html2canvas from 'html2canvas';
import { Download, Printer } from 'lucide-react';

interface IDCardBadgeProps {
  user: UserProfile;
  orgName: string;
}

const IDCardBadge: React.FC<IDCardBadgeProps> = ({ user, orgName }) => {
  const baseUrl = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') 
    ? 'https://vseva.netlify.app' 
    : window.location.origin;
  const publicUrl = `${baseUrl}/verify/${encodeURIComponent(user.username)}`;
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPNG = async () => {
    if (!cardRef.current) return;
    try {
      setDownloading(true);
      await new Promise(r => setTimeout(r, 100)); 
      
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null
      });
      
      const image = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.href = image;
      link.download = `vSeva_ID_${user.full_name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download image", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Fixed size equivalent to CR80 ID Card scaled up for screen */}
      <div 
        ref={cardRef}
        className="print-card bg-white rounded-[16px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative flex flex-col items-center shrink-0 border-4 border-black overflow-hidden"
        style={{ width: '280px', height: '460px' }}
      >
        {/* Banner with VSG Logo top left */}
        <div className="w-full bg-gradient-to-br from-saffron-500 via-orange-500 to-amber-500 h-28 flex flex-col justify-start items-start relative shrink-0 p-4 shadow-inner border-b-2 border-black">
            <div className="w-14 h-14 bg-white rounded-lg p-1 shadow-sm border border-gray-100 flex items-center justify-center">
                <img src={vsgLogo} alt="VSG" className="w-full h-full object-contain rounded" />
            </div>
            
            {/* Center overlapping vSeva logo */}
            <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-white rounded-full p-2 shadow-lg border-[3px] border-black flex items-center justify-center">
                <img src={vSevaLogo} alt="vSeva" className="w-full h-full object-contain drop-shadow-sm" />
            </div>
        </div>
        
        <div className="mt-12 flex flex-col items-center w-full px-5 text-center shrink-0">
            <h2 className="text-2xl font-black text-gray-900 leading-tight tracking-tight">{user.full_name}</h2>
            <p className="text-[12px] font-black tracking-widest text-saffron-600 uppercase mt-2 bg-saffron-50 px-3 py-0.5 rounded-full border border-black shadow-sm">{user.role}</p>
            <p className="text-sm text-gray-700 font-bold leading-snug mt-3 flex-wrap break-words w-full">{orgName}</p>
        </div>

        <div className="flex flex-col flex-1 w-full justify-center items-center mt-2 mb-4 space-y-3">
            <div className="bg-white p-2.5 rounded-xl border-[3px] border-black shadow-sm transform hover:scale-105 transition-transform">
              <QRCodeSVG value={publicUrl} size={130} level="M" />
            </div>
            <p className="text-[10px] text-gray-600 font-black tracking-widest uppercase">Scan to Verify</p>
        </div>
        
        {/* Bottom edge color bar */}
        <div className="h-2.5 w-full bg-black mt-auto"></div>
      </div>
      
      <div className="flex gap-3 print:hidden mt-2">
        <button 
            onClick={handleDownloadPNG}
            disabled={downloading}
            className="flex items-center gap-2 px-6 py-3 bg-saffron-600 hover:bg-saffron-700 text-white rounded-xl shadow-[0_4px_14px_rgba(234,88,12,0.39)] font-bold text-sm transition-all disabled:opacity-70 active:scale-95"
        >
            <Download size={20} /> {downloading ? 'Saving Image...' : 'Download PNG'}
        </button>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-card, .print-card * {
            visibility: visible;
          }
          .print-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 53.98mm !important;
            height: 85.6mm !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            border-radius: 8px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
};

export default IDCardBadge;
