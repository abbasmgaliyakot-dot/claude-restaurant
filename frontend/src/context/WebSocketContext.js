import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { WS_URL } from '../utils/api';

const WSContext = createContext(null);

export function WebSocketProvider({ children }) {
  const ws = useRef(null);
  const listeners = useRef([]);
  const [connected, setConnected] = useState(false);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(WS_URL);
      ws.current.onopen = () => setConnected(true);
      ws.current.onclose = () => {
        setConnected(false);
        reconnectTimer.current = setTimeout(connect, 3000);
      };
      ws.current.onerror = () => ws.current.close();
      ws.current.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          listeners.current.forEach(fn => fn(data));
        } catch {}
      };
    } catch {}
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback((fn) => {
    listeners.current.push(fn);
    return () => { listeners.current = listeners.current.filter(l => l !== fn); };
  }, []);

  return (
    <WSContext.Provider value={{ connected, subscribe }}>
      {children}
    </WSContext.Provider>
  );
}

export const useWebSocket = () => useContext(WSContext);
