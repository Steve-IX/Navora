import React, { useState } from 'react';
import { shareService, ShareableLocation, ShareableRoute } from '@/services/share.service';

interface ShareButtonProps {
  location?: ShareableLocation;
  route?: ShareableRoute;
  className?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ location, route, className = '' }) => {
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);
    setShareSuccess(false);

    try {
      let success = false;
      if (location) {
        success = await shareService.shareLocation(location);
      } else if (route) {
        success = await shareService.shareRoute(route);
      }

      if (success) {
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      }
    } catch (error) {
      console.error('Share failed:', error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={isSharing}
      className={`flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      aria-label="Share"
    >
      {shareSuccess ? (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          <span>{isSharing ? 'Sharing...' : 'Share'}</span>
        </>
      )}
    </button>
  );
};

