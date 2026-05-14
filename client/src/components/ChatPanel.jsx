import { useState, useEffect, useRef } from 'react'
import { useSocket } from '../context/SocketContext'

function ChatPanel({ roomId, userName, isOpen, onToggle, onNewMessage }) {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const messagesEndRef = useRef(null)
  const socket = useSocket()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!socket) return

    const handleMessage = (data) => {
      const newMsg = {
        user: data.user,
        text: data.text,
        timestamp: data.timestamp,
        id: Date.now() + Math.random(),
        isMine: data.user === userName
      }
      
      setMessages(prev => [...prev, newMsg])
      
      if (onNewMessage) {
        onNewMessage(data)
      }
    }

    socket.on('receive-message', handleMessage)

    return () => {
      socket.off('receive-message', handleMessage)
    }
  }, [socket, userName, onNewMessage])

  const sendMessage = (e) => {
    e.preventDefault()
    if (!inputMessage.trim()) return

    socket.emit('send-message', roomId, inputMessage.trim())
    setInputMessage('')
  }

  if (!isOpen) return null

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-white font-medium">Chat</h3>
        <button onClick={onToggle} className="text-gray-400 hover:text-white">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-gray-500 text-sm text-center mt-8">No messages yet. Say hello!</p>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%]">
              <span className="text-xs text-gray-400">{msg.user}</span>
              <div className={`px-3 py-2 rounded-lg text-sm mt-0.5 ${
                msg.isMine ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'
              }`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-3 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}

export default ChatPanel