import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { StatSummary } from '../types';
import { Share2, Download, CheckCircle, Heart, Medal } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface StatCardProps {
  stats: StatSummary;
  userName: string;
  orgName: string;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ stats, userName, orgName, loading = false }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { showToast } = useToast();

  const handleShare = async () => {
    if (!cardRef.current || loading) return;
    setIsGenerating(true);
    
    try {
      // Small delay to ensure styles render
      await new Promise(r => setTimeout(r, 100));
      
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // High resolution
        useCORS: true,
        backgroundColor: null
      });

      const image = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.href = image;
      link.download = `Vihar_Stats_${userName.replace(/\s+/g, '_')}.png`;
      link.click();
      
      showToast("Stat card downloaded successfully!", "success");
    } catch (err) {
      console.error("Failed to generate image", err);
      showToast("Could not generate image. Please try again.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const SkeletonValue = ({ width = "w-16" }: { width?: string }) => (
    <div className={`h-8 ${width} bg-white/20 animate-pulse rounded mt-1`}></div>
  );

  return (
    <div className="flex flex-col items-center space-y-4">
      
      {/* The Actual Card */}
      <div className="relative group">
        <div 
            ref={cardRef}
            className="w-[350px] h-[500px] bg-gradient-to-br from-saffron-500 to-saffron-700 text-white p-6 flex flex-col justify-between rounded-xl shadow-2xl relative overflow-hidden"
        >
            {/* Background Pattern */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" 
                 style={{backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
            </div>

            {/* Header */}
            <div className="z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-sm font-medium opacity-90 uppercase tracking-widest">{orgName}</h2>
                        <h1 className="text-2xl font-serif font-bold mt-1 leading-tight">{userName}</h1>
                    </div>
                    <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                        <span className="text-2xl">👣</span>
                    </div>
                </div>
            </div>

            {/* Primary Stats */}
            <div className="z-10 grid grid-cols-2 gap-4 my-2">
                <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                    <p className="text-[10px] uppercase opacity-80">Total Distance</p>
                    {loading ? <SkeletonValue width="w-24" /> : (
                        <p className="text-3xl font-bold">{stats.totalKm}<span className="text-lg font-normal ml-1">km</span></p>
                    )}
                </div>
                <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                    <p className="text-[10px] uppercase opacity-80">Total Vihars</p>
                    {loading ? <SkeletonValue width="w-12" /> : (
                        <p className="text-3xl font-bold">{stats.totalVihars}</p>
                    )}
                </div>
            </div>

            {/* Guru Stats */}
            <div className="z-10 grid grid-cols-2 gap-4">
                 <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                     <p className="text-[9px] uppercase opacity-80 mb-1 tracking-wide">Sadhubhagwant</p>
                     {loading ? <SkeletonValue width="w-8" /> : (
                        <p className="text-2xl font-bold">{stats.totalSadhu}</p>
                     )}
                 </div>
                 <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                     <p className="text-[9px] uppercase opacity-80 mb-1 tracking-wide">Sadhvijibhagwant</p>
                     {loading ? <SkeletonValue width="w-8" /> : (
                        <p className="text-2xl font-bold">{stats.totalSadhvi}</p>
                     )}
                 </div>
            </div>

            {/* Social Stats (Synergy & Rank) */}
            <div className="z-10 flex justify-between items-end border-t border-white/20 pt-4 mt-2">
                <div>
                    <div className="flex items-center gap-1 mb-1 opacity-90">
                        <Heart size={12} className="fill-white" />
                        <p className="text-[10px] uppercase">VSynergy</p>
                    </div>
                    {loading ? <SkeletonValue width="w-20" /> : (
                         <div className="flex gap-1">
                             {stats.vSynergy && stats.vSynergy !== "N/A" ? (
                                stats.vSynergy.split(',').slice(0, 1).map((name, i) => (
                                    <span key={i} className="bg-white text-saffron-600 px-2 py-0.5 rounded-full text-xs font-bold capitalize">
                                        {name.trim().split(' ')[0]}
                                    </span>
                                ))
                             ) : (
                                <span className="text-sm font-medium opacity-80">-</span>
                             )}
                         </div>
                    )}
                </div>
                <div className="text-right flex flex-col items-end">
                    <div className="flex items-center gap-1 mb-1 opacity-90">
                        <Medal size={12} />
                        <p className="text-[10px] uppercase">vRank</p>
                    </div>
                    {loading ? <SkeletonValue width="w-8" /> : (
                        <p className="text-2xl font-bold">#{stats.vRank}</p>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="z-10 mt-4 text-center">
                <p className="text-[10px] opacity-70 italic font-serif">"Seva is the highest form of devotion"</p>
                <div className="mt-1 text-[8px] opacity-60 uppercase tracking-widest">vSeva App</div>
            </div>
        </div>
      </div>

      <button 
        onClick={handleShare}
        disabled={isGenerating || loading}
        className={`flex items-center space-x-2 bg-saffron-600 hover:bg-saffron-700 text-white px-6 py-3 rounded-full font-medium shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isGenerating ? (
            <span>Generating...</span>
        ) : (
            <>
                <Share2 size={20} />
                <span>Share Stats Card</span>
            </>
        )}
      </button>
    </div>
  );
};

export default StatCard;