import { io, Socket } from 'socket.io-client';
import { Coordinates } from '@shared/types/geocoding';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type LocationUpdateCallback = (data: { userId: string; coordinates: Coordinates; timestamp: Date }) => void;
type LocationRequestCallback = (data: { requesterId: string; timestamp: Date }) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private locationUpdateCallbacks: Set<LocationUpdateCallback> = new Set();
  private locationRequestCallbacks: Set<LocationRequestCallback> = new Set();

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(API_BASE_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnect attempts reached');
      }
    });

    // Listen for location updates from friends
    this.socket.on('location:shared:update', (data: { userId: string; coordinates: Coordinates; timestamp: Date }) => {
      this.locationUpdateCallbacks.forEach((callback) => callback(data));
    });

    // Listen for location requests
    this.socket.on('friend:location:request', (data: { requesterId: string; timestamp: Date }) => {
      this.locationRequestCallbacks.forEach((callback) => callback(data));
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  sendLocationUpdate(coordinates: Coordinates): void {
    if (this.socket?.connected) {
      this.socket.emit('location:update', { coordinates });
    }
  }

  startLocationSharing(options?: { sharedWithId?: string; isPublic?: boolean }): void {
    if (this.socket?.connected) {
      this.socket.emit('location:share:start', options || {});
    }
  }

  stopLocationSharing(): void {
    if (this.socket?.connected) {
      this.socket.emit('location:share:stop');
    }
  }

  requestFriendLocation(friendId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('friend:location:request', { friendId });
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  onLocationUpdate(callback: LocationUpdateCallback): () => void {
    this.locationUpdateCallbacks.add(callback);
    return () => this.locationUpdateCallbacks.delete(callback);
  }

  onLocationRequest(callback: LocationRequestCallback): () => void {
    this.locationRequestCallbacks.add(callback);
    return () => this.locationRequestCallbacks.delete(callback);
  }
}

export const websocketService = new WebSocketService();

