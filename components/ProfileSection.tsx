import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { dataService } from '../services/dataService';
import LeaderboardCard from './LeaderboardCard';
import { Trophy } from 'lucide-react';

interface ProfileSectionProps {
    user: UserProfile;
    orgName: string;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ user, orgName }) => {
    const [isLoading, setIsLoading] = useState(false);

    const getInitials = (name: string) => {
        if (!name) return 'VS';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center space-x-4 mb-6">
                    <div className="w-16 h-16 bg-saffron-100 rounded-full flex items-center justify-center text-2xl font-bold text-saffron-600">
                        {getInitials(user.full_name)}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{user.full_name}</h2>
                        <p className="text-gray-500 uppercase text-xs tracking-wider">{user.role}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm border-t border-gray-100 pt-6">
                    <div>
                        <p className="text-gray-500 mb-1">Mobile Number</p>
                        <p className="font-medium text-lg">{user.mobile}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 mb-1">Username</p>
                        <p className="font-medium text-lg">{user.username}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 mb-1">Organization</p>
                        <p className="font-medium text-lg">{orgName || user.organization_id}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 mb-1">Status</p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                        </span>
                    </div>
                </div>
                <div className="mt-8 border-t border-gray-100 pt-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">App Settings</h3>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-900">Push Notifications</p>
                            <p className="text-xs text-gray-500">Receive updates about new entries and approvals</p>
                        </div>
                        <button
                            onClick={() => {
                                import('../services/notificationService').then(({ notificationService }) => {
                                    notificationService.requestPermission().then(perm => {
                                        if (perm === 'granted') alert("Notifications enabled!");
                                        else alert("Notifications blocked. Please enable them in browser settings.");
                                    });
                                });
                            }}
                            className="px-4 py-2 bg-white border border-gray-200 shadow-sm text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 active:scale-95 transition-transform"
                        >
                            Enable
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileSection;
