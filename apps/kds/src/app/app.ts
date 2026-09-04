import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderCardComponent } from './order-card.component';
import { NewOrderPayload, OrderStatusChangedPayload } from '@cozinha81/domain-models';
import { io, Socket } from 'socket.io-client';
import { OfflineQueueService } from './offline-queue.service';

@Component({
  imports: [CommonModule, OrderCardComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  orders: NewOrderPayload[] = [];
  socket!: Socket;
  isMuted = false;
  isOnline = navigator.onLine;
  pendingCount = 0;

  constructor(private readonly offlineQueue: OfflineQueueService) {}

  async ngOnInit() {
    this.isMuted = localStorage.getItem('kds_muted') === 'true';
    this.socket = io('http://localhost:3000');
    
    this.socket.on('newOrder', (order: NewOrderPayload, callback: (ack: boolean) => void) => {
      if (!order.status) order.status = 'aceitar';
      this.orders.push(order);
      this.playSound();
      if (callback) callback(true);
    });

    this.socket.on('orderStatusChanged', (payload: OrderStatusChangedPayload) => {
      const order = this.orders.find(o => o.orderId === payload.orderId);
      if (order) {
        order.status = payload.status;
      }
    });

    window.addEventListener('online', () => this.handleConnectionChange(true));
    window.addEventListener('offline', () => this.handleConnectionChange(false));
    
    // Initial sync check
    this.updatePendingCount();
    if (this.isOnline) {
      this.drainQueue();
    }
  }

  handleConnectionChange(online: boolean) {
    this.isOnline = online;
    if (online) {
      this.drainQueue();
    }
  }

  async updatePendingCount() {
    const q = await this.offlineQueue.getQueue();
    this.pendingCount = q.length;
  }

  async drainQueue() {
    const queue = await this.offlineQueue.getQueue();
    for (const cmd of queue) {
      if (!this.isOnline) break; // parou no meio do drain

      try {
        const response = await fetch(`http://localhost:3000/api/pedidos/${cmd.orderId}/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
          },
          body: JSON.stringify({ status: cmd.status, cause_key: cmd.id })
        });

        if (response.ok || response.status === 409) {
          // 409 conflito -> resolvemos a favor da origem, apenas removemos da fila
          if (response.status === 409) {
            console.warn(`Conflito resolvido a favor da origem para o pedido ${cmd.orderId}`);
          }
          await this.offlineQueue.removeFromQueue(cmd.id);
        }
      } catch (e) {
        console.error('Error draining queue', e);
        // network error, stops draining
        break;
      }
    }
    this.updatePendingCount();
  }

  playSound() {
    if (!this.isMuted) {
      const audio = new Audio('assets/notification.mp3');
      audio.play().catch(e => console.log('Audio play prevented by browser', e));
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('kds_muted', String(this.isMuted));
  }

  async advanceOrder(orderId: string) {
    const order = this.orders.find(o => o.orderId === orderId);
    if (!order) return;

    let nextStatus = '';
    if (order.status === 'aceitar' || !order.status) nextStatus = 'preparo';
    else if (order.status === 'preparo') nextStatus = 'pronto';
    else if (order.status === 'pronto') nextStatus = 'despachado';
    
    if (!nextStatus) return;

    // Otimista
    const prevStatus = order.status;
    order.status = nextStatus;

    const causeKey = crypto.randomUUID();

    if (!this.isOnline) {
      await this.offlineQueue.enqueue({
        id: causeKey,
        orderId,
        status: nextStatus,
        timestamp: Date.now()
      });
      this.updatePendingCount();
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/pedidos/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({ status: nextStatus, cause_key: causeKey })
      });
      if (!response.ok) {
        if (response.status === 409) {
           console.warn('Conflito detectado, revertendo status na UI');
           order.status = prevStatus;
        } else {
           console.error('Failed to update status', await response.text());
           order.status = prevStatus;
        }
      }
    } catch (err) {
      console.error('Error updating status, will enqueue', err);
      // Fallback para fila caso de erro de rede inesperado
      await this.offlineQueue.enqueue({
        id: causeKey,
        orderId,
        status: nextStatus,
        timestamp: Date.now()
      });
      this.updatePendingCount();
    }
  }

  getOrdersByStatus(status: string) {
    return this.orders.filter(o => (o.status || 'aceitar') === status);
  }

  async lancarPedidoManual() {
    try {
      const response = await fetch('http://localhost:3000/api/pedidos/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token') // assuming token is needed
        },
        body: JSON.stringify({
          itens: [
            { id: crypto.randomUUID(), quantidade: 1, nome: 'Hambúrguer Clássico' }
          ]
        })
      });
      
      if (!response.ok) {
        console.error('Failed to create manual order', await response.text());
      }
    } catch (e) {
      console.error('Error creating manual order', e);
    }
  }
}
