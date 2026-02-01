import React from 'react';
import { Trophy, Medal, Award } from 'lucide-react';

interface LeaderboardItem {
    rank: number;
    name: string;
    count: number;
    km: number;
    username: string; // for avatar generation
}

interface LeaderboardCardProps {
    title: string;
    icon: React.ReactNode;
    items: LeaderboardItem[];
    colorClass: string; // e.g., "text-blue-600"
    bgClass: string; // e.g., "bg-blue-50"
    loading?: boolean;
}

const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ title, icon, items, colorClass, bgClass, loading }) => {

    const getInitials = (name: string) => {
        if (!name) return 'VS';
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
            <div className={`p-4 border-b border-gray-100 flex items-center gap-2 ${bgClass}`}>
                <div className={colorClass}>
                    {icon}
                </div>
                <h3 className="font-bold text-gray-800">{title}</h3>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px]">
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
                    <div className="p-8 text-center text-gray-400 text-sm">
                        No active sevaks found.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {items.map((item, index) => (
                            <div key={index} className="flex items-center p-3 hover:bg-gray-50 transition-colors">
                                {/* Rank */}
                                <div className={`flex-shrink-0 w-8 flex justify-center text-sm font-bold ${item.rank === 1 ? 'text-yellow-500' :
                                    item.rank === 2 ? 'text-gray-400' :
                                        item.rank === 3 ? 'text-orange-500' : 'text-gray-400'
                                    }`}>
                                    {item.rank <= 3 ? <Medal size={18} /> : `#${item.rank}`}
                                </div>

                                {/* Avatar Removed as per request */}
                                {/* <div className={`mx-3 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${bgClass} ${colorClass}`}>
                                    {getInitials(item.name)}
                                </div> */}

                                {/* Details */}
                                <div className="flex-1 min-w-0 ml-3">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {item.name}
                                    </p>
                                    <p className="text-xs text-gray-500 flex items-center gap-2">
                                        <span>{item.km} km</span>
                                    </p>
                                </div>

                                {/* Score */}
                                <div className="mr-2 text-right">
                                    <span className="block text-lg font-bold text-gray-800 leading-none">
                                        {item.count}
                                    </span>
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
