import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { StatSummary } from '../types';
import { Share2, Download, CheckCircle } from 'lucide-react';

interface StatCardProps {
  stats: StatSummary;
  userName: string;
  orgName: string;
}

const StatCard: React.FC<StatCardProps> = ({ stats, userName, orgName }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleShare = async () => {
    if (!cardRef.current) return;
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
    } catch (err) {
      console.error("Failed to generate image", err);
      alert("Could not generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      
      {/* The Actual Card (Rendered but scaled down visually in UI if needed, or hidden until capture) */}
      <div className="relative group">
        <div 
            ref={cardRef}
            className="w-[350px] h-[450px] bg-gradient-to-br from-saffron-500 to-saffron-700 text-white p-6 flex flex-col justify-between rounded-xl shadow-2xl relative overflow-hidden"
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
                        <h1 className="text-2xl font-serif font-bold mt-1">{userName}</h1>
                    </div>
                    <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                        <span className="text-2xl">👣</span>
                    </div>
                </div>
            </div>

            {/* Main Stats */}
            <div className="z-10 grid grid-cols-2 gap-4 my-4">
                <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
                    <p className="text-xs uppercase opacity-80">Total Distance</p>
                    <p className="text-3xl font-bold">{stats.totalKm}<span className="text-lg font-normal ml-1">km</span></p>
                </div>
                <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
                    <p className="text-xs uppercase opacity-80">Total Vihars</p>
                    <p className="text-3xl font-bold">{stats.totalVihars}</p>
                </div>
            </div>

            {/* Secondary Stats */}
            <div className="z-10 flex justify-between items-end border-t border-white/20 pt-4">
                <div>
                    <p className="text-xs opacity-80 mb-1">Longest Vihar</p>
                    <p className="text-xl font-semibold">{stats.longestVihar} km</p>
                </div>
                <div className="text-right">
                    <p className="text-xs opacity-80 mb-1">Gurus Served</p>
                    <p className="text-xl font-semibold">{stats.totalSadhu + stats.totalSadhvi}</p>
                </div>
            </div>

            {/* Footer */}
            <div className="z-10 mt-6 text-center">
                <p className="text-xs opacity-70 italic font-serif">"Seva is the highest form of devotion"</p>
                <div className="mt-2 text-[10px] opacity-60 uppercase tracking-widest">vSeva App</div>
            </div>
        </div>
      </div>

      <button 
        onClick={handleShare}
        disabled={isGenerating}
        className="flex items-center space-x-2 bg-saffron-600 hover:bg-saffron-700 text-white px-6 py-3 rounded-full font-medium shadow-lg transition-transform active:scale-95"
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