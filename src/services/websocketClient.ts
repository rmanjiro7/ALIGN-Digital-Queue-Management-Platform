import { Client } from '@stomp/stompjs';
import { apiClient } from './apiClient';

export class WebsocketClient {
  private client: Client | null = null;
  private currentSubscriptionId: string | null = null;

  public connect(
    onConnect: () => void,
    onDisconnect: () => void,
    onStompError: (frame: any) => void
  ) {
    // We no longer abort here if no token, because beforeConnect handles it for every attempt.

    // Determine correct WebSocket URL based on current protocol
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws-align`;

    this.client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.beforeConnect = async () => {
      let token = apiClient.getAccessToken();
      
      if (!token) {
        console.log('[STOMP] No access token found, attempting refresh before connect...');
        const refreshed = await apiClient.refresh();
        if (refreshed) {
          token = apiClient.getAccessToken();
        }
      }

      if (!token) {
        console.warn('[STOMP] Cannot obtain access token. Aborting this connection attempt.');
        throw new Error('Authentication required for STOMP');
      }

      // Update headers for the upcoming connection attempt
      this.client!.connectHeaders = {
        Authorization: `Bearer ${token}`
      };
    };

    this.client.onConnect = () => {
      console.log('[STOMP] Connected');
      onConnect();
    };

    this.client.onStompError = (frame) => {
      console.error('[STOMP] Broker reported error.');
      // Never log the raw frame/headers to avoid JWT leakage.
      onStompError(frame);
    };

    this.client.onWebSocketClose = () => {
      console.log('[STOMP] WebSocket Closed');
      onDisconnect();
    };

    this.client.activate();
  }

  public subscribeToLocation(locationId: string, onMessage: (msg: any) => void) {
    if (!this.client || !this.client.connected) {
      console.error('[STOMP] Cannot subscribe - client not connected');
      return;
    }

    // Prevent duplicate subscriptions
    this.unsubscribe();

    const destination = `/topic/location.${locationId}`;
    console.log(`[STOMP] Subscribing to ${destination}`);

    const subscription = this.client.subscribe(destination, (message) => {
      if (message.body) {
        try {
          const parsed = JSON.parse(message.body);
          onMessage(parsed);
        } catch (e) {
          console.error('[STOMP] Failed to parse message body', e);
        }
      }
    });

    this.currentSubscriptionId = subscription.id;
  }

  public unsubscribe() {
    if (this.client && this.currentSubscriptionId) {
      this.client.unsubscribe(this.currentSubscriptionId);
      this.currentSubscriptionId = null;
      console.log('[STOMP] Unsubscribed from previous location');
    }
  }

  public disconnect() {
    this.unsubscribe();
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
  }
}

export const wsClient = new WebsocketClient();
