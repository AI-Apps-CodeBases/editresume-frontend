'use client'
import { useState } from 'react'

interface User {
  user_id: string
  name: string
  joined_at: string
}

interface Props {
  isConnected: boolean
  activeUsers: User[]
  roomId: string | null
  onCreateRoom: () => void
  onJoinRoom: (roomId: string) => void
  onLeaveRoom: () => void
}

const USER_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-yellow-500',
  'bg-red-500',
  'bg-indigo-500',
  'bg-teal-500'
]

export default function CollaborationPanel({ 
  isConnected, 
  activeUsers, 
  roomId, 
  onCreateRoom, 
  onJoinRoom,
  onLeaveRoom 
}: Props) {
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [joinRoomId, setJoinRoomId] = useState('')
  const [showShareLink, setShowShareLink] = useState(false)

  const shareLink = roomId ? `${window.location.origin}/editor?room=${roomId}` : ''

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink)
    setShowShareLink(false)
    alert('Link copied! Share it with collaborators.')
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-300 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🤝</span>
        <h3 className="text-sm font-bold text-gray-900">Real-time Collaboration</h3>
        {isConnected && (
          <div className="ml-auto flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-700 font-medium">Live</span>
          </div>
        )}
      </div>

      {!roomId ? (
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            Collaborate with others in real-time. Create or join a room.
          </p>
          
          <button
            onClick={onCreateRoom}
            className="w-full py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
          >
            🚀 Create Collaboration Room
          </button>
          
          <button
            onClick={() => setShowJoinDialog(true)}
            className="w-full py-2 bg-white border-2 border-green-300 text-green-700 rounded-lg text-sm font-semibold hover:bg-green-50 transition-all"
          >
            🔗 Join Existing Room
          </button>

          {showJoinDialog && (
            <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                <h3 className="text-lg font-bold mb-4">Join Collaboration Room</h3>
                <input
                  type="text"
                  placeholder="Enter room ID (e.g., abc123xyz)"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  className="w-full px-4 py-2 border-2 rounded-lg mb-4"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowJoinDialog(false)}
                    className="flex-1 py-2 bg-gray-200 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (joinRoomId.trim()) {
                        onJoinRoom(joinRoomId.trim())
                        setShowJoinDialog(false)
                        setJoinRoomId('')
                      }
                    }}
                    className="flex-1 py-2 bg-green-500 text-white rounded-lg font-semibold"
                  >
                    Join Room
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-white rounded-lg p-3 border-2 border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-700">Room ID:</span>
              <button
                onClick={() => setShowShareLink(true)}
                className="text-xs text-green-600 hover:text-green-800 font-medium"
              >
                📋 Share Link
              </button>
            </div>
            <div className="font-mono text-xs bg-gray-50 p-2 rounded border">
              {roomId}
            </div>
          </div>

          {showShareLink && (
            <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
                <h3 className="text-lg font-bold mb-4">Share Collaboration Link</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Anyone with this link can join and edit this resume in real-time.
                </p>
                <div className="bg-gray-50 p-3 rounded-lg border mb-4 break-all text-sm">
                  {shareLink}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowShareLink(false)}
                    className="flex-1 py-2 bg-gray-200 rounded-lg font-medium"
                  >
                    Close
                  </button>
                  <button
                    onClick={copyShareLink}
                    className="flex-1 py-2 bg-green-500 text-white rounded-lg font-semibold"
                  >
                    📋 Copy Link
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg p-3 border-2 border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-700">Active Users</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                {activeUsers.length}
              </span>
            </div>
            <div className="space-y-2">
              {activeUsers.map((user) => {
                // Generate consistent color based on user_id hash
                const hash = user.user_id.split('').reduce((a, b) => {
                  a = ((a << 5) - a) + b.charCodeAt(0)
                  return a & a
                }, 0)
                const colorIndex = Math.abs(hash) % USER_COLORS.length
                
                return (
                  <div key={user.user_id} className="flex items-center gap-2">
                    <div className={`w-8 h-8 ${USER_COLORS[colorIndex]} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-gray-800">{user.name}</div>
                      <div className="text-[10px] text-gray-500">Joined {new Date(user.joined_at).toLocaleTimeString()}</div>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                )
              })}
              {activeUsers.length === 0 && (
                <div className="text-xs text-gray-400 text-center py-2">
                  No other users yet
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onLeaveRoom}
            className="w-full py-2 bg-red-50 border-2 border-red-300 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100 transition-all"
          >
            🚪 Leave Room
          </button>
        </div>
      )}
    </div>
  )
}

