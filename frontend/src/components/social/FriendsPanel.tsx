import React, { useEffect, useState } from 'react';
import { useFriendsStore } from '@/stores/friendsStore';

export const FriendsPanel: React.FC = () => {
  const {
    friends,
    receivedRequests,
    sentRequests,
    isLoading,
    error,
    fetchFriends,
    fetchRequests,
    acceptRequest,
    declineRequest,
    removeFriend,
  } = useFriendsStore();

  const [activeTab, setActiveTab] = useState<'friends' | 'received' | 'sent'>('friends');

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, [fetchFriends, fetchRequests]);

  const handleAccept = async (requestId: string) => {
    try {
      await acceptRequest(requestId);
    } catch (err) {
      console.error('Failed to accept request:', err);
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      await declineRequest(requestId);
    } catch (err) {
      console.error('Failed to decline request:', err);
    }
  };

  const handleRemove = async (friendshipId: string) => {
    if (window.confirm('Are you sure you want to remove this friend?')) {
      try {
        await removeFriend(friendshipId);
      } catch (err) {
        console.error('Failed to remove friend:', err);
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-200 mb-4">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'friends'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'received'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Received ({receivedRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'sent'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sent ({sentRequests.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'friends' && (
          <div className="space-y-2">
            {friends.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No friends yet</div>
            ) : (
              friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">{friend.friend.email}</div>
                  </div>
                  <button
                    onClick={() => handleRemove(friend.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'received' && (
          <div className="space-y-2">
            {receivedRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No pending requests</div>
            ) : (
              receivedRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">{request.user.email}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAccept(request.id)}
                      className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecline(request.id)}
                      className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'sent' && (
          <div className="space-y-2">
            {sentRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No sent requests</div>
            ) : (
              sentRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">{request.user.email}</div>
                    <div className="text-xs text-gray-500">Pending</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

