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
import { Logger } from '@nestjs/common';

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

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('location:update')
  handleLocationUpdate(
    @MessageBody() data: { coordinates: { longitude: number; latitude: number }; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast location update to all clients except sender
    client.broadcast.emit('location:updated', {
      userId: data.userId,
      coordinates: data.coordinates,
      timestamp: new Date(),
    });
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

  // Method to broadcast location updates to all clients
  broadcastLocationUpdate(userId: string, coordinates: { longitude: number; latitude: number }) {
    this.server.emit('location:updated', {
      userId,
      coordinates,
      timestamp: new Date(),
    });
  }
}

