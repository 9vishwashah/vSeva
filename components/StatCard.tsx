import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { StatSummary } from '../types';
import { Share2, MapPin, Users, Handshake, Medal, Trophy, Sparkles, Instagram, Download, Footprints } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import vSevaLogo from '../assets/vseva-logo-removebg-preview.png';
import vsgLogo from '../assets/vsg.jpg';

interface StatCardProps {
  stats: StatSummary;
  userName: string;
  orgName: string;
  orgCity?: string;
  loading?: boolean;
  isAdmin?: boolean;
  topSevak?: { name: string; km: number; count: number } | null;
  topSevika?: { name: string; km: number; count: number } | null;
}

const StatCard: React.FC<StatCardProps> = ({ stats, userName, orgName, orgCity, loading = false, isAdmin = false, topSevak = null, topSevika = null }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleShare = async (platform: 'whatsapp' | 'instagram' | 'download') => {
    if (!cardRef.current || loading || isGenerating) return;
    setIsGenerating(platform);

    try {
      // Small delay to ensure styles render and fonts load
      await new Promise(r => setTimeout(r, 100));

      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // High resolution for clear text
        useCORS: true,
        backgroundColor: null, // Transparent to capture rounded corners if needed, though card has its own bg
        logging: false
      });

      const dataUrl = canvas.toDataURL("image/png", 1.0);
      const fileName = `vSeva_Card_${userName.replace(/\s+/g, '_')}.png`;

      // Handle Download
      if (platform === 'download') {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = fileName;
        link.click();
        showToast("Card downloaded successfully!", "success");
        setIsGenerating(null);
        return;
      }

      // Handle Mobile Share (WhatsApp / Instagram)
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: isAdmin ? 'Your Vihar Group Summary' : 'My vSeva Impact',
          text: `Check out my Seva contribution on ${orgName}! #vSeva`
        });
      } else {
        // Fallback Logic
        if (platform === 'whatsapp' || platform === 'instagram') {
          // On Desktop or unsupported browsers, we can't share images directly to WA
          // So we download it and guide the user
          const link = document.createElement("a");
          link.href = dataUrl;
          link.download = fileName;
          link.click();
          showToast(`Image downloaded! Please attach it on ${platform === 'whatsapp' ? 'WhatsApp' : 'Instagram'}.`, "success");
        }
      }

    } catch (err) {
      console.error("Share failed", err);
      showToast("Sharing failed. Try downloading instead.", "error");
    } finally {
      setIsGenerating(null);
    }
  };

  const SkeletonValue = ({ width = "w-16" }: { width?: string }) => (
    <div className={`h-6 ${width} bg-white/20 animate-pulse rounded mt-1`}></div>
  );

  const getInitials = (name: string) => {
    if (!name) return 'VS';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col items-center space-y-6">

      {/* The Actual Card - 9:16 Aspect Ratio (360x640) */}
      <div className="relative group perspective-1000">
        <div
          ref={cardRef}
          className={`w-[360px] h-[640px] flex flex-col relative overflow-hidden shadow-2xl rounded-[28px] border ${isAdmin ? 'bg-gradient-to-br from-[#FFF9F0] via-[#FFFAF5] to-[#FFE8D6] text-gray-800 border-orange-100' : 'bg-gradient-to-br from-[#FFF8E1] via-white to-orange-50 text-gray-800 border-orange-100'}`}
        >
          {/* Background Texture: Subtle Sacred Pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: isAdmin
                ? 'radial-gradient(circle at 1px 1px, rgba(234, 88, 12, 0.1) 1px, transparent 0)'
                : 'radial-gradient(circle at 1px 1px, rgba(234, 88, 12, 0.2) 1px, transparent 0)',
              backgroundSize: '24px 24px'
            }}>
          </div>

          {/* Soft Glow Orbs */}
          {isAdmin ? (
            <>
              <div className="absolute top-[-20%] left-[-20%] w-[300px] h-[300px] bg-orange-200/20 rounded-full blur-[80px]"></div>
              <div className="absolute bottom-[-10%] right-[-10%] w-[250px] h-[250px] bg-yellow-200/20 rounded-full blur-[60px]"></div>
            </>
          ) : (
            <>
              <div className="absolute top-[-20%] left-[-20%] w-[300px] h-[300px] bg-orange-200/30 rounded-full blur-[80px]"></div>
              <div className="absolute bottom-[-10%] right-[-10%] w-[250px] h-[250px] bg-yellow-200/30 rounded-full blur-[60px]"></div>
            </>
          )}

          {/* Content Container */}
          <div className="flex-1 flex flex-col p-5 z-10 relative h-full">

            {/* 1. Header (Identity) */}
            <div className="flex flex-col items-center text-center mt-1 mb-3 relative z-20">
              
              {/* Central Logo / Initials */}
              <div className="relative mb-3">
                {isAdmin ? (
                  <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg border border-white bg-white p-0.5 overflow-hidden z-20 relative">
                     <img src={vSevaLogo} alt="vSeva Logo" className="w-full h-full object-cover rounded-full" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full flex items-center justify-center font-serif text-2xl font-bold shadow-lg border-2 bg-white text-saffron-600 border-saffron-100 relative z-20">
                    {getInitials(userName)}
                  </div>
                )}
                {/* Glowing Ring */}
                <div className={`absolute inset-0 rounded-full border scale-125 animate-pulse-slow ${isAdmin ? 'border-orange-200/50' : 'border-saffron-200'}`}></div>
              </div>

              {isAdmin ? (
                <>
                  <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase text-orange-700 mb-1">Overall Summary of</h2>
                  <h1 className="text-2xl font-serif font-bold text-gray-900 tracking-wide leading-tight drop-shadow-sm mb-1">
                    {orgName}
                  </h1>
                  {orgCity && (
                     <div className="mt-1 mb-1.5 inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-saffron-500 to-orange-500 shadow-md rounded-full border border-orange-400">
                       <span className="text-[11px] font-bold text-white tracking-wider uppercase drop-shadow-sm">{orgCity}</span>
                     </div>
                  )}
                  <p className="text-[11px] font-bold text-orange-800/90 tracking-widest uppercase mt-0.5">Captain {userName}</p>
                </>
              ) : (
                <>
                  <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-1">{orgName}</h2>
                  <h1 className="text-3xl font-serif font-bold text-gray-900 tracking-wide leading-tight drop-shadow-sm">
                    {userName}
                  </h1>
                </>
              )}
            </div>

            {/* 2. Achievement Highlights (Hero Section) */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {/* Stat Tile 1 */}
              <div className="rounded-2xl p-3 flex flex-col items-center justify-center relative overflow-hidden bg-white/80 backdrop-blur-md border border-orange-200 shadow-[0_4px_12px_-2px_rgba(234,88,12,0.15)]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center mb-1.5 shadow-inner border border-orange-200/50">
                  <MapPin size={16} className="stroke-[2.5] text-orange-500 drop-shadow-sm" />
                </div>
                {loading ? <SkeletonValue width="w-12" /> : <span className="text-xl font-black font-sans text-gray-800 tracking-tight leading-none">{stats.totalKm} <span className="text-[10px] font-bold text-gray-500 uppercase">km</span></span>}
                <span className="text-[8px] font-bold uppercase tracking-widest mt-1 text-gray-800">Total Distance</span>
              </div>

              {/* Stat Tile 2 */}
              <div className="rounded-2xl p-3 flex flex-col items-center justify-center relative overflow-hidden bg-white/80 backdrop-blur-md border border-blue-200 shadow-[0_4px_12px_-2px_rgba(59,130,246,0.15)]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center mb-1.5 shadow-inner border border-blue-200/50">
                  <Footprints size={16} className="stroke-[2.5] text-blue-500 drop-shadow-sm" />
                </div>
                {loading ? <SkeletonValue width="w-8" /> : <span className="text-xl font-black font-sans text-gray-800 tracking-tight leading-none">{stats.totalVihars}</span>}
                <span className="text-[8px] font-bold uppercase tracking-widest mt-1 text-gray-800">Total Vihars</span>
              </div>

              {/* Stat Tile 3 */}
              <div className="rounded-2xl p-3 flex flex-col items-center justify-center relative overflow-hidden bg-white/80 backdrop-blur-md border border-red-200 shadow-[0_4px_12px_-2px_rgba(239,68,68,0.15)]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center mb-1.5 shadow-inner border border-red-200/50">
                  <Users size={16} className="stroke-[2.5] text-red-500 drop-shadow-sm" />
                </div>
                {loading ? <SkeletonValue width="w-8" /> : <span className="text-xl font-black font-sans text-gray-800 tracking-tight leading-none">{stats.totalSadhu}</span>}
                <span className="text-[8px] font-bold uppercase tracking-widest mt-1 text-gray-800">Sadhubhagwant</span>
              </div>

              {/* Stat Tile 4 */}
              <div className="rounded-2xl p-3 flex flex-col items-center justify-center relative overflow-hidden bg-white/80 backdrop-blur-md border border-pink-200 shadow-[0_4px_12px_-2px_rgba(236,72,153,0.15)]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-100 to-pink-50 flex items-center justify-center mb-1.5 shadow-inner border border-pink-200/50">
                  <Users size={16} className="stroke-[2.5] text-pink-500 drop-shadow-sm" />
                </div>
                {loading ? <SkeletonValue width="w-8" /> : <span className="text-xl font-black font-sans text-gray-800 tracking-tight leading-none">{stats.totalSadhvi}</span>}
                <span className="text-[8px] font-bold uppercase tracking-widest mt-1 text-gray-800">Sadhvijibhagwant</span>
              </div>
            </div>

            {/* 3. Recognition Section */}
            <div className={`backdrop-blur-md rounded-2xl p-3 mb-auto border shadow-sm ${isAdmin ? 'bg-white/80 border-gray-100' : 'bg-white/80 border-gray-100'}`}>
              {isAdmin ? (
                /* Admin: Show top hero sevak and sevika */
                <div className="flex flex-col gap-3">
                  {/* Top Sevak */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                        <Trophy size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Top Sevak</span>
                        {loading ? <SkeletonValue width="w-24" /> : topSevak ? (
                          <span className="text-sm font-bold text-gray-800 leading-tight truncate max-w-[110px]">{topSevak.name}</span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">N/A</span>
                        )}
                      </div>
                    </div>
                    {topSevak && (
                      <div className="flex items-center gap-2 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100">
                        <div className="flex flex-col items-center">
                           <span className="text-xs font-bold text-gray-800 leading-none">{topSevak.count}</span>
                           <span className="text-[7px] text-gray-400 uppercase font-bold mt-0.5">Vihars</span>
                        </div>
                        <div className="h-5 w-[1px] bg-gray-200"></div>
                        <div className="flex flex-col items-center min-w-[32px]">
                           <span className="text-xs font-bold text-gray-800 leading-none">{topSevak.km}</span>
                           <span className="text-[7px] text-gray-400 uppercase font-bold mt-0.5">Km</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="h-[1px] w-full bg-gray-100"></div>

                  {/* Top Sevika */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center shrink-0">
                        <Trophy size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Top Sevika</span>
                        {loading ? <SkeletonValue width="w-24" /> : topSevika ? (
                          <span className="text-sm font-bold text-gray-800 leading-tight truncate max-w-[110px]">{topSevika.name}</span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">N/A</span>
                        )}
                      </div>
                    </div>
                    {topSevika && (
                      <div className="flex items-center gap-2 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100">
                        <div className="flex flex-col items-center">
                           <span className="text-xs font-bold text-gray-800 leading-none">{topSevika.count}</span>
                           <span className="text-[7px] text-gray-400 uppercase font-bold mt-0.5">Vihars</span>
                        </div>
                        <div className="h-5 w-[1px] bg-gray-200"></div>
                        <div className="flex flex-col items-center min-w-[32px]">
                           <span className="text-xs font-bold text-gray-800 leading-none">{topSevika.km}</span>
                           <span className="text-[7px] text-gray-400 uppercase font-bold mt-0.5">Km</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Sevak: Show vSynergy + vRank */
                <div className="flex justify-between items-center gap-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Handshake size={14} className="text-saffron-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-saffron-600">VSynergy</span>
                    </div>
                    {loading ? <SkeletonValue width="w-24" /> : (
                      <div className="text-sm font-medium text-gray-800">
                        {stats.vSynergy && stats.vSynergy !== "N/A" ? (
                          <span className="flex items-center gap-1">
                            <span>Top:</span>
                            <span className="font-bold">{stats.vSynergy.split(',')[0].trim().split(' ')[0]}</span>
                          </span>
                        ) : (
                          <span className="opacity-60 italic text-gray-500">Find a partner</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="h-8 w-[1px] bg-gray-200"></div>

                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Medal size={14} className="text-yellow-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-600">vRank</span>
                    </div>
                    {loading ? <SkeletonValue width="w-8" /> : (
                      <div className="flex items-baseline gap-1 relative">
                        <span className="text-xl font-bold font-sans text-gray-800 relative z-10">#{stats.vRank}</span>
                        <span className="text-[9px] text-gray-400 relative z-10">Org</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Inspirational Footer & Bottom Logos */}
            <div className={`mt-auto text-center pb-1 relative z-20`}>
              <div className={`w-8 h-[1px] mx-auto mb-2 ${isAdmin ? 'bg-white/20' : 'bg-gray-200'}`}></div>

              <div className="flex flex-col items-center justify-center gap-1 mt-2 pb-1 relative">
                
                {/* Bottom-Left vSeva Logo */}
                <div className="absolute -bottom-2 -left-3 z-20 opacity-90">
                  <img src={vSevaLogo} alt="vSeva Logo" className="h-[70px] w-[70px] object-contain drop-shadow-sm" />
                </div>

                <div className="flex items-center gap-2">
                  <Footprints size={14} className={isAdmin ? 'text-saffron-600' : 'text-saffron-500'} />
                  <span className="text-sm font-bold tracking-[0.15em] drop-shadow-sm text-gray-800">vSeva</span>
                  <Footprints size={14} className={isAdmin ? 'text-saffron-600' : 'text-saffron-500'} />
                </div>
                <p className="text-[10px] font-medium mt-1 text-gray-500 ml-6">by VJAS</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-[360px]">
        {/* Social Buttons Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* WhatsApp */}
          <button
            onClick={() => handleShare('whatsapp')}
            disabled={!!isGenerating || loading}
            className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 rounded-xl font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-50"
          >
            {isGenerating === 'whatsapp' ? (
              <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span>WhatsApp</span>
              </>
            )}
          </button>

          {/* Instagram */}
          <button
            onClick={() => handleShare('instagram')}
            disabled={!!isGenerating || loading}
            className="flex items-center justify-center gap-2 bg-gradient-to-tr from-[#FFDC80] via-[#FD1D1D] to-[#E1306C] text-white py-3 rounded-xl font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-50"
          >
            {isGenerating === 'instagram' ? (
              <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>
            ) : (
              <>
                <Instagram size={20} />
                <span>Instagram</span>
              </>
            )}
          </button>
        </div>

        {/* Download Button */}
        <button
          onClick={() => handleShare('download')}
          disabled={!!isGenerating || loading}
          className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 py-3 rounded-xl font-medium shadow-sm transition-transform active:scale-95 disabled:opacity-50"
        >
          {isGenerating === 'download' ? (
            <span className="animate-spin w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full"></span>
          ) : (
            <>
              <Download size={20} />
              <span>Download Image</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default StatCard;