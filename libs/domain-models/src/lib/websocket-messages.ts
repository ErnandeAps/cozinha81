/**
 * Shared WebSocket message types for Cozinha81 (AD-12)
 */

export interface WebSocketMessage<T = any> {
  event: string;
  data: T;
}

export interface StatusCommandPayload {
  kitchenId: string;
  status: 'online' | 'offline' | 'busy';
  timestamp: string;
}

export interface AckPayload {
  messageId: string;
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface ConflictSignalPayload {
  resourceId: string;
  conflictType: string;
  resolved: boolean;
  timestamp: string;
}

export type StatusCommandMessage = WebSocketMessage<StatusCommandPayload>;
export type AckMessage = WebSocketMessage<AckPayload>;
export type ConflictSignalMessage = WebSocketMessage<ConflictSignalPayload>;

export interface NewOrderPayload {
  orderId: string;
  origin: string;
  number: string;
  items: number;
  time: string;
  status?: string;
}

export interface OrderStatusChangedPayload {
  orderId: string;
  status: string;
  causeKey: string;
}

export type NewOrderMessage = WebSocketMessage<NewOrderPayload>;
export type OrderStatusChangedMessage = WebSocketMessage<OrderStatusChangedPayload>;
