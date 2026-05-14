import { useState, useEffect, useRef } from 'react'
import { useSocket } from '../context/SocketContext'

function ChatPanel({ roomId, userName, isOpen, onToggle }) {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const messagesEndRef = useRef(null)
  const socket = useSocket()

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return

    socket.on('receive-message', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        user: data.user,
        text: data.text,
        timestamp: data.timestamp,
        isMine: false
      }])
    })

    return () => {
      socket.off('receive-message')
    }
  }, [socket])

  // Send a message
  const sendMessage = (e) => {
    e.preventDefault()
    
    if (!inputMessage.trim()) return

    const messageData = {
      user: userName,
      text: inputMessage.trim(),
      timestamp: new Date()
    }

    // Add to my messages
    setMessages(prev => [...prev, {
      ...messageData,
      id: Date.now(),
      isMine: true
    }])

    // Send to others via server
    socket.emit('send-message', roomId, inputMessage.trim())
    
    setInputMessage('')
  }

  if (!isOpen) return null

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-white font-medium">Chat</h3>
        <button 
          onClick={onToggle}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-gray-500 text-sm text-center mt-8">
            No messages yet. Say hello!
          </p>
        )}
        
        {messages.map(msg => (
          <div 
            key={msg.id} 
            className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] ${msg.isMine ? 'order-1' : 'order-1'}`}>
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-xs text-gray-400">{msg.user}</span>
              </div>
              <div className={`px-3 py-2 rounded-lg text-sm ${
                msg.isMine 
                  ? 'bg-blue-600 text-white rounded-br-sm' 
                  : 'bg-gray-700 text-gray-200 rounded-bl-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-3 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}

export default ChatPanel