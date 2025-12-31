import React from 'react';
import { FriendLocation } from '@/stores/locationShareStore';

interface FriendLocationMarkerProps {
  location: FriendLocation;
  userName: string;
}

export const FriendLocationMarker: React.FC<FriendLocationMarkerProps> = ({ userName }) => {
  return (
    <div className="absolute transform -translate-x-1/2 -translate-y-1/2">
      <div className="relative">
        <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
        <div className="absolute top-0 left-0 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-ping opacity-75"></div>
      </div>
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg">
        {userName}
      </div>
    </div>
  );
};

