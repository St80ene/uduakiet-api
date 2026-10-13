import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { type DefaultEventsMap, type Namespace, type Socket } from 'socket.io';

import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { JwtPayload } from '../../auth/interfaces/jwt_payload.interface';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
import { Notifications } from '../../resources/notifications/entities/notification.entity';

type NotificationSocketData = {
  user?: AuthenticatedUser;
};

type NotificationSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  NotificationSocketData
>;

type NotificationNamespace = Namespace<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  NotificationSocketData
>;

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: NotificationNamespace;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly jwtStrategy: JwtStrategy,
  ) {}

  /**
   * Register Socket.IO middleware to authenticate connections
   * before they are accepted by the notifications namespace.
   */
  afterInit(): void {
    this.server.use((client, next) => {
      void this.authenticateSocket(client, next);
    });

    this.logger.log('Notifications gateway initialized');
  }

  /**
   * Handle a successfully authenticated socket connection.
   */
  async handleConnection(client: NotificationSocket): Promise<void> {
    console.log('connected client: => ', client);

    const user = client.data.user;

    // Disconnect if authentication middleware did not attach a user.
    if (!user) {
      client.disconnect(true);
      return;
    }

    // Join the room associated with this user.
    // Multiple connections belonging to the same user can join this room.
    await client.join(this.getUserRoom(user.id));

    this.logger.log(`User ${user.id} connected to notifications`);
  }

  /**
   * Handle socket disconnection.
   */
  handleDisconnect(client: NotificationSocket): void {
    const user = client.data.user;

    if (user) {
      this.logger.log(`User ${user.id} disconnected from notifications`);
    }
  }

  /**
   * Emit a persisted notification to all active connections
   * belonging to the intended recipient.
   *
   * Call this after the transaction that saves the notification commits.
   */
  emitToUser(recipientId: string, notification: Notifications): void {
    this.server
      .to(this.getUserRoom(recipientId))
      .emit('notification:new', notification);
  }

  /**
   * Verify the access token and attach the validated user to the socket.
   */
  private async authenticateSocket(
    client: NotificationSocket,
    next: (error?: Error) => void,
  ): Promise<void> {
    try {
      const token = this.extractToken(client);

      if (!token) {
        throw new Error('Missing access token');
      }

      // Verify the token signature and expiration using the access-token secret.
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });

      // Reuse the existing database-backed user validation.
      const user = await this.jwtStrategy.validate(payload);

      // Never trust a user identity supplied directly by the client.
      client.data.user = user;

      next();
    } catch {
      // Avoid exposing authentication details to the connecting client.
      next(new Error('Unauthorized'));
    }
  }

  /**
   * Extract the token from Socket.IO auth data or an Authorization header.
   *
   * Client example:
   * io('/notifications', {
   *   auth: { token: accessToken },
   * });
   */
  private extractToken(client: NotificationSocket): string | undefined {
    const authToken: unknown = client.handshake.auth?.token;

    if (typeof authToken === 'string' && authToken.trim().length > 0) {
      return authToken;
    }

    const authorization = client.handshake.headers.authorization;

    if (authorization?.startsWith('Bearer ')) {
      const token = authorization.slice('Bearer '.length).trim();

      if (token.length > 0) {
        return token;
      }
    }

    return undefined;
  }

  /**
   * Generate the private room name for a user.
   */
  private getUserRoom(userId: string): string {
    return `user:${userId}`;
  }
}
