import React, { useState, useEffect, useRef } from 'react';
import { RiviumChatClient, RiviumChatConfig } from '@rivium/react-native-chat';
import RiviumPush from 'rivium-push-react-native';
import { DemoUser, Order, MockOrders } from './src/models/types';
import { LoginScreen } from './src/screens/LoginScreen';
import { OrdersScreen } from './src/screens/OrdersScreen';
import { OrderChatScreen } from './src/screens/OrderChatScreen';

type Screen =
  | { name: 'Login' }
  | { name: 'Orders' }
  | { name: 'OrderChat'; orderId: string };

export default function App() {
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [riviumChatClient, setRiviumChatClient] = useState<RiviumChatClient | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'Login' });
  const pushInitialized = useRef(false);

  // Initialize RiviumPush SDK once on app start
  useEffect(() => {
    if (pushInitialized.current) return;
    pushInitialized.current = true;

    RiviumPush.init({
      apiKey: 'rv_live_your_api_key_here',
    }).then(() => {
      console.log('[RiviumPush] SDK initialized');

      RiviumPush.onMessage((message) => {
        console.log('[RiviumPush] Message received:', message.title, message.body);
      });

      RiviumPush.onConnectionState((connected) => {
        console.log('[RiviumPush] Connection state:', connected ? 'connected' : 'disconnected');
      });

      RiviumPush.onError((error) => {
        console.error('[RiviumPush] Error:', error);
      });
    }).catch((error) => {
      console.error('[RiviumPush] Init failed:', error);
    });

    return () => {
      RiviumPush.removeAllListeners();
    };
  }, []);

  const handleLogin = (user: DemoUser) => {
    setCurrentUser(user);

    // Initialize RiviumChat client
    const config: RiviumChatConfig = {
      apiKey: 'rv_live_your_api_key_here',
      userId: user.id,
      userInfo: {
        displayName: user.name,
        role: user.role,
      },
    };

    const client = new RiviumChatClient(config);
    client.connect();
    setRiviumChatClient(client);
    setScreen({ name: 'Orders' });

    // Register device for push notifications with the logged-in user
    RiviumPush.register({ userId: user.id }).then(() => {
      console.log('[RiviumPush] Registered for user:', user.id);
    }).catch((error) => {
      console.error('[RiviumPush] Registration failed:', error);
    });
  };

  const handleLogout = () => {
    // Unregister from push notifications
    RiviumPush.unregister().then(() => {
      console.log('[RiviumPush] Unregistered');
    }).catch((error) => {
      console.error('[RiviumPush] Unregister failed:', error);
    });

    riviumChatClient?.disconnect();
    setRiviumChatClient(null);
    setCurrentUser(null);
    setScreen({ name: 'Login' });
  };

  if (!currentUser || !riviumChatClient || screen.name === 'Login') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (screen.name === 'OrderChat') {
    const order = MockOrders.find((o) => o.id === screen.orderId);

    if (!order) {
      setScreen({ name: 'Orders' });
      return null;
    }

    return (
      <OrderChatScreen
        order={order}
        currentUser={currentUser}
        client={riviumChatClient}
        onBack={() => setScreen({ name: 'Orders' })}
      />
    );
  }

  return (
    <OrdersScreen
      currentUser={currentUser}
      client={riviumChatClient}
      onOrderTap={(order: Order) => {
        setScreen({ name: 'OrderChat', orderId: order.id });
      }}
      onLogout={handleLogout}
    />
  );
}
