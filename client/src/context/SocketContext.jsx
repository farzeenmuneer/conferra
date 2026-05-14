import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext(null)

export const useSocket = () => {
  const socket = useContext(SocketContext)
  if (!socket) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return socket
}

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    // Use environment variable for production, fallback to localhost for development
    const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'
    
    console.log('Connecting to server:', SERVER_URL)
    
    const newSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],  // Try WebSocket first, fallback to polling
    })

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id)
    })

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message)
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [])

  // Don't render children until socket is connected
  if (!socket) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Connecting to server...</p>
        </div>
      </div>
    )
  }

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  )
}