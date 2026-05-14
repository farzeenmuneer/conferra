# Conferra


AI-powered video conferencing platform built with WebRTC, React, and Node.js.



## Features
- Real-time video/audio calls with WebRTC
- Peer-to-peer connections for low latency
- Room-based meetings with unique codes
- Mute/unmute and camera controls



## Tech Stack
| Layer     | Technology                      |
| :---      | :---                            |
| Frontend  | React, Vite, Tailwind CSS       |
| Backend   | Node.js, Express, Socket.io     |
| Real-time | WebRTC (Simple-Peer)            |
| AI        | Web Speech API (browser-native) |



## Getting Started



### Prerequisites
- Node.js 18+
- npm



### Installation


1. Clone the repository
```bash
git clone https://github.com/farzeenmuneer/conferra.git
cd conferra



Install server dependencies

cd server
npm install
cp .env.example .env


Install client dependencies

cd ../client
npm install



Start the backend server

cd server
npm run dev



Start the frontend (new terminal)

cd client
npm run dev



Open http://localhost:5173