import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LocationSharesService } from '../location-shares/location-shares.service';
import { FriendsService } from '../friends/friends.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('WebsocketGateway');
  private connectedClients: Map<string, Socket> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private locationSharesService: LocationSharesService,
    private friendsService: FriendsService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
      });

      client.userId = payload.sub;
      this.connectedClients.set(client.id, client);

      // Track user sockets
      if (!this.userSockets.has(client.userId)) {
        this.userSockets.set(client.userId, new Set());
      }
      this.userSockets.get(client.userId)!.add(client.id);

      this.logger.log(`Client ${client.id} connected for user ${client.userId}`);
    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);

    if (client.userId) {
      const sockets = this.userSockets.get(client.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(client.userId);
        }
      }
    }
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return client.handshake.auth?.token || null;
  }

  @SubscribeMessage('location:update')
  async handleLocationUpdate(
    @MessageBody() data: { coordinates: { longitude: number; latitude: number } },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    // Validate coordinates
    if (
      !data.coordinates ||
      typeof data.coordinates.latitude !== 'number' ||
      typeof data.coordinates.longitude !== 'number' ||
      isNaN(data.coordinates.latitude) ||
      isNaN(data.coordinates.longitude) ||
      data.coordinates.latitude < -90 ||
      data.coordinates.latitude > 90 ||
      data.coordinates.longitude < -180 ||
      data.coordinates.longitude > 180
    ) {
      return { error: 'Invalid coordinates' };
    }

    // Rate limiting: Check if user is sending too many updates
    const userUpdateKey = `location_update_${client.userId}`;
    const lastUpdate = (client as any)[userUpdateKey];
    const now = Date.now();
    if (lastUpdate && now - lastUpdate < 5000) {
      // Max 1 update per 5 seconds
      return { error: 'Rate limit exceeded' };
    }
    (client as any)[userUpdateKey] = now;

    // Save location share if user has sharing enabled
    try {
      await this.locationSharesService.createShare(client.userId, {
        coordinates: data.coordinates,
        isPublic: false, // Default to friends-only
      });
    } catch (error) {
      // Ignore errors if sharing is not enabled
    }

    // Broadcast to friends who are sharing with this user
    await this.broadcastToFriends(client.userId, 'location:shared:update', {
      userId: client.userId,
      coordinates: data.coordinates,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('location:share:start')
  async handleLocationShareStart(
    @MessageBody() data: { sharedWithId?: string; isPublic?: boolean; expiresInMinutes?: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    // Join appropriate rooms for targeted broadcasting
    if (data.sharedWithId) {
      client.join(`user:${data.sharedWithId}`);
    }
    if (data.isPublic) {
      client.join('public:location-shares');
    }

    return { success: true };
  }

  @SubscribeMessage('location:share:stop')
  async handleLocationShareStop(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    // Leave all location sharing rooms
    this.server.sockets.adapter.rooms.forEach((_, roomId) => {
      if (roomId.startsWith('user:') || roomId.startsWith('public:')) {
        client.leave(roomId);
      }
    });

    return { success: true };
  }

  @SubscribeMessage('friend:location:request')
  async handleLocationRequest(
    @MessageBody() data: { friendId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    // Check if users are friends
    const areFriends = await this.friendsService.areFriends(client.userId, data.friendId);
    if (!areFriends) {
      return { error: 'Not friends' };
    }

    // Send request to friend
    const friendSockets = this.userSockets.get(data.friendId);
    if (friendSockets) {
      friendSockets.forEach((socketId) => {
        const socket = this.connectedClients.get(socketId);
        if (socket) {
          socket.emit('friend:location:request', {
            requesterId: client.userId,
            timestamp: new Date(),
          });
        }
      });
    }

    return { success: true };
  }

  @SubscribeMessage('route:update')
  handleRouteUpdate(
    @MessageBody() data: { routeId: string; status: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast route update
    this.server.emit('route:updated', {
      routeId: data.routeId,
      status: data.status,
      timestamp: new Date(),
    });
  }

  private async broadcastToFriends(
    userId: string,
    event: string,
    data: any,
  ): Promise<void> {
    // Get all friends
    const friends = await this.friendsService.getFriends(userId);
    
    // Broadcast to each friend's sockets
    friends.forEach((friend) => {
      const friendSockets = this.userSockets.get(friend.friend.id);
      if (friendSockets) {
        friendSockets.forEach((socketId) => {
          const socket = this.connectedClients.get(socketId);
          if (socket) {
            socket.emit(event, data);
          }
        });
      }
    });
  }

  // Method to broadcast location updates to specific user
  broadcastLocationToUser(
    userId: string,
    coordinates: { longitude: number; latitude: number },
    sharerId: string,
  ): void {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.forEach((socketId) => {
        const socket = this.connectedClients.get(socketId);
        if (socket) {
          socket.emit('location:shared:update', {
            userId: sharerId,
            coordinates,
            timestamp: new Date(),
          });
        }
      });
    }
  }

  // Method to broadcast location updates to all clients
  broadcastLocationUpdate(userId: string, coordinates: { longitude: number; latitude: number }) {
    this.server.emit('location:updated', {
      userId,
      coordinates,
      timestamp: new Date(),
    });
  }
}
