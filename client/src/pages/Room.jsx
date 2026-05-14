import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import Peer from 'simple-peer'
import { useSocket } from '../context/SocketContext'
import ChatPanel from '../components/ChatPanel'
import MeetingSummary from '../components/MeetingSummary'

function Room() {
  const { roomId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { userName, isHost } = location.state || {}
  
  useEffect(() => {
    if (!userName) {
      navigate('/', { replace: true })
    }
  }, [userName, navigate])

  const [peers, setPeers] = useState({})
  const [stream, setStream] = useState(null)
  const [myVideoEnabled, setMyVideoEnabled] = useState(true)
  const [myAudioEnabled, setMyAudioEnabled] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  
  const myVideoRef = useRef(null)
  const peersRef = useRef({})
  const screenTrackRef = useRef(null)
  const hasJoinedRef = useRef(false)
  const socket = useSocket()

  // Handle new chat messages for AI summary
  const handleNewMessage = useCallback((data) => {
    setChatMessages(prev => [...prev, data])
  }, [])

  // Get user media (camera + mic)
  useEffect(() => {
    const getMedia = async () => {
      try {
        const userStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        })
        setStream(userStream)
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = userStream
        }
      } catch (err) {
        console.error('Failed to get media:', err)
        alert('Camera and microphone access are required.')
        navigate('/')
      }
    }
    
    if (!stream) {
      getMedia()
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream, navigate])

  // Create peer connection
  const createPeer = useCallback((userId, userName, initiator) => {
    if (peersRef.current[userId]) return
    
    const peer = new Peer({
      initiator,
      trickle: true,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      }
    })
    
    peer.on('signal', (data) => {
      if (data.type === 'offer') {
        socket.emit('offer', data, userId)
      } else if (data.type === 'answer') {
        socket.emit('answer', data, userId)
      } else if (data.type === 'candidate') {
        socket.emit('ice-candidate', data, userId)
      }
    })
    
    peer.on('stream', (remoteStream) => {
      setPeers(prev => ({
        ...prev,
        [userId]: {
          peerId: userId,
          userName,
          stream: remoteStream
        }
      }))
    })
    
    peer.on('close', () => {
      if (peersRef.current[userId]) {
        peer.destroy()
        delete peersRef.current[userId]
      }
      setPeers(prev => {
        const updated = { ...prev }
        delete updated[userId]
        return updated
      })
    })
    
    peer.on('error', (err) => {
      console.error('Peer error:', err)
    })
    
    peersRef.current[userId] = peer
  }, [stream, socket])

  // Socket event handlers
  useEffect(() => {
    if (!socket || !stream) return
    
    // Prevent duplicate join-room (React StrictMode fix)
    if (!hasJoinedRef.current) {
      socket.emit('join-room', roomId, userName)
      hasJoinedRef.current = true
    }
    
    socket.on('user-connected', (user) => {
      if (stream && !peersRef.current[user.id]) {
        createPeer(user.id, user.name, true)
      }
    })
    
    socket.on('existing-users', (users) => {
      users.forEach(user => {
        if (stream && !peersRef.current[user.id]) {
          createPeer(user.id, user.name, false)
        }
      })
    })
    
    socket.on('offer', (offer, fromUserId) => {
      const peer = peersRef.current[fromUserId]
      if (peer) peer.signal(offer)
    })
    
    socket.on('answer', (answer, fromUserId) => {
      const peer = peersRef.current[fromUserId]
      if (peer) peer.signal(answer)
    })
    
    socket.on('ice-candidate', (candidate, fromUserId) => {
      const peer = peersRef.current[fromUserId]
      if (peer) peer.signal(candidate)
    })
    
    socket.on('user-disconnected', (user) => {
      if (peersRef.current[user.id]) {
        peersRef.current[user.id].destroy()
        delete peersRef.current[user.id]
      }
      setPeers(prev => {
        const updated = { ...prev }
        delete updated[user.id]
        return updated
      })
    })
    
    return () => {
      socket.off('user-connected')
      socket.off('existing-users')
      socket.off('offer')
      socket.off('answer')
      socket.off('ice-candidate')
      socket.off('user-disconnected')
    }
  }, [socket, stream, roomId, userName, createPeer])

  // Screen Share
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      if (screenTrackRef.current) {
        screenTrackRef.current.stop()
        screenTrackRef.current = null
      }
      if (stream && myVideoRef.current) {
        const videoTrack = stream.getVideoTracks()[0]
        if (videoTrack) {
          videoTrack.enabled = true
          Object.values(peersRef.current).forEach(peer => {
            try {
              const senders = peer.getSenders?.() || []
              const videoSender = senders.find(s => s.track?.kind === 'video')
              if (videoSender) videoSender.replaceTrack(videoTrack)
            } catch (e) {}
          })
        }
        myVideoRef.current.srcObject = stream
      }
      setIsScreenSharing(false)
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        })
        const screenTrack = screenStream.getVideoTracks()[0]
        screenTrackRef.current = screenTrack
        
        Object.values(peersRef.current).forEach(peer => {
          try {
            const senders = peer.getSenders?.() || []
            const videoSender = senders.find(s => s.track?.kind === 'video')
            if (videoSender) videoSender.replaceTrack(screenTrack)
          } catch (e) {}
        })
        
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = screenStream
        }
        
        screenTrack.onended = () => {
          toggleScreenShare()
        }
        
        setIsScreenSharing(true)
      } catch (err) {
        console.error('Screen share failed:', err)
      }
    }
  }, [isScreenSharing, stream])

  // Controls
  const toggleAudio = useCallback(() => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setMyAudioEnabled(prev => !prev)
    }
  }, [stream])
  
  const toggleVideo = useCallback(() => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setMyVideoEnabled(prev => !prev)
    }
  }, [stream])
  
  const leaveRoom = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    if (screenTrackRef.current) {
      screenTrackRef.current.stop()
    }
    Object.values(peersRef.current).forEach(peer => peer.destroy())
    if (socket) socket.disconnect()
    navigate('/')
  }, [stream, socket, navigate])

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Top Bar */}
      <div className="bg-gray-800 px-6 py-3 flex items-center justify-between border-b border-gray-700">
        <div>
          <h1 className="text-lg font-semibold text-white">Conferra</h1>
          <p className="text-xs text-gray-400">Room: {roomId}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">{userName} (You)</span>
          <button
            onClick={() => setShowSummary(true)}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-full transition-colors"
          >
            🤖 AI Summary
          </button>
          <span className="px-2 py-1 bg-green-900 text-green-300 text-xs rounded-full">Connected</span>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Video Section */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
              
              {/* My Video */}
              {stream && (
                <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video">
                  <video ref={myVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                  <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-sm text-white">
                    {userName} (You) {isScreenSharing && '(Screen)'}
                  </div>
                  {!myVideoEnabled && !isScreenSharing && (
                    <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                      <span className="text-gray-400 text-lg">Camera Off</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Remote Videos */}
              {Object.values(peers).map(peer => (
                <div key={peer.peerId} className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video">
                  <video autoPlay playsInline className="w-full h-full object-cover"
                    ref={el => { if (el && peer.stream) el.srcObject = peer.stream }} />
                  <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-sm text-white">
                    {peer.userName}
                  </div>
                </div>
              ))}
              
              {/* Empty State */}
              {Object.keys(peers).length === 0 && (
                <div className="col-span-full flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700 flex items-center justify-center">
                      <span className="text-2xl">👤</span>
                    </div>
                    <p className="text-gray-400 text-lg">Waiting for others to join...</p>
                    <p className="text-gray-500 text-sm mt-1">
                      Share this room code: <span className="text-blue-400 font-mono">{roomId}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Bottom Controls */}
          <div className="bg-gray-800 px-6 py-4 border-t border-gray-700">
            <div className="flex items-center justify-center gap-4">
              <button onClick={toggleAudio}
                className={`p-4 rounded-full transition-colors ${myAudioEnabled ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}>
                {myAudioEnabled ? '🎤' : '🔇'}
              </button>
              <button onClick={toggleVideo}
                className={`p-4 rounded-full transition-colors ${myVideoEnabled ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}>
                {myVideoEnabled ? '📹' : '📷'}
              </button>
              <button onClick={toggleScreenShare}
                className={`p-4 rounded-full transition-colors ${isScreenSharing ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
                {isScreenSharing ? '💻' : '🖥️'}
              </button>
              <button onClick={() => setChatOpen(!chatOpen)}
                className={`p-4 rounded-full transition-colors ${chatOpen ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
                💬
              </button>
              <button onClick={leaveRoom}
                className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors">
                📞
              </button>
            </div>
          </div>
        </div>
        
        {/* Chat Panel */}
        <ChatPanel 
          roomId={roomId}
          userName={userName}
          isOpen={chatOpen}
          onToggle={() => setChatOpen(false)}
          onNewMessage={handleNewMessage}
        />
      </div>

      {/* AI Summary Modal */}
      {showSummary && (
        <MeetingSummary 
          messages={chatMessages}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  )
}

export default Room