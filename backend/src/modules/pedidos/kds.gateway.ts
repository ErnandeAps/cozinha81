import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { NewOrderPayload } from '@cozinha81/domain-models';

@WebSocketGateway({ cors: true })
export class KdsGateway {
  @WebSocketServer()
  server: Server;

  private pendingOrders: NewOrderPayload[] = [];

  getPendingOrders() {
    return this.pendingOrders;
  }

  sendOrderToKds(order: NewOrderPayload) {
    this.pendingOrders.push(order);
    this.server.emit('newOrder', order, (ack: boolean) => {
      if (ack) {
        this.pendingOrders = this.pendingOrders.filter(o => o.orderId !== order.orderId);
      }
    });
  }

  @SubscribeMessage('ackOrder')
  handleAck(@MessageBody() data: { orderId: string }) {
    this.pendingOrders = this.pendingOrders.filter(o => o.orderId !== data.orderId);
    return { success: true };
  }
}
