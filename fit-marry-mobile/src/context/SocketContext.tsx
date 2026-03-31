import React, { createContext, useContext, useEffect, useState } from "react";
import io, { Socket } from "socket.io-client";
import { getItem } from "../utils/storage";
import { useAuth } from "./AuthContext";

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000';
const SOCKET_URL = `${API_URL}/calls`;

interface SocketContextProps {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextProps>({
  socket: null,
  isConnected: false,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (user?.id) {
      let newSocket: Socket;

      const connectSocket = async () => {
        const token = await getItem('token');

        newSocket = io(SOCKET_URL, {
          auth: { token },
          transports: ["websocket"],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        });

        newSocket.on("connect", () => {
          console.log("Calls socket connected:", newSocket.id);
          setIsConnected(true);
        });

        newSocket.on("disconnect", () => {
          console.log("Calls socket disconnected");
          setIsConnected(false);
        });

        newSocket.on("connect_error", (err) => {
          console.log("Calls socket error:", err.message);
        });

        setSocket(newSocket);
      };

      connectSocket();

      return () => {
        if (newSocket) {
          newSocket.close();
        }
      };
    } else if (socket) {
      socket.close();
      setSocket(null);
      setIsConnected(false);
    }
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
