import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../context/SocketContext'

function Home() {
  const [roomIdInput, setRoomIdInput] = useState('')
  const [userName, setUserName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const navigate = useNavigate()
  const socket = useSocket()

    const createRoom = async () => {
    if (!userName.trim()) {
      setError('Please enter your name first')
      return
    }
    
    setIsLoading(true)
    setError('')
    
    try {
        const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'
        const response = await fetch(`${API_URL}/api/rooms`, {
            method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to create room')
      }
      
      const data = await response.json()
      
      // Navigate to the new room
      navigate(`/room/${data.roomId}`, {
        state: { userName: userName.trim(), isHost: true }
      })
    } catch (err) {
      setError('Could not create room. Is the server running?')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

    const joinRoom = async () => {
    if (!userName.trim()) {
      setError('Please enter your name first')
      return
    }
    
    if (!roomIdInput.trim()) {
      setError('Please enter a room code')
      return
    }
    
    setIsLoading(true)
    setError('')
    
    try {
      // First check if room exists
      const response = await fetch(`${API_URL}/api/rooms/${roomIdInput.trim()}`)
      const data = await response.json()
      
      if (!data.exists) {
        setError('Room not found. Please check the code.')
        setIsLoading(false)
        return
      }
      
      // Navigate to the room
      navigate(`/room/${roomIdInput.trim()}`, {
        state: { userName: userName.trim(), isHost: false }
      })
    } catch (err) {
      setError('Could not connect. Is the server running?')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }


    return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Conferra
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            Intelligent meetings, effortless outcomes
          </p>
        </div>

        {/* Name Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Your Name
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        {/* Room Code Input (for joining) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Room Code
          </label>
          <input
            type="text"
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value)}
            placeholder="Enter room code to join"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={createRoom}
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : 'Create New Room'}
          </button>
          
          <button
            onClick={joinRoom}
            disabled={isLoading}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg border border-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Joining...' : 'Join Room'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Home