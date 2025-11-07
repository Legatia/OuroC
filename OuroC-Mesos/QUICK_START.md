# OuroC-Mesos Quick Start Guide

Get the full OuroC-Mesos application running in 5 minutes!

## Prerequisites

- Node.js v18+ installed
- npm or yarn installed
- Two terminal windows

## Setup

### 1. Backend Setup (Terminal 1)

```bash
# Navigate to backend directory
cd backend

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

**Expected output:**
```
✅ Aleph account initialized: 0xf39...
✅ Aleph account ready

🚀 OuroC-Mesos Backend Server Running
📡 Port: 3001
✅ Ready to accept requests!
```

**Troubleshooting:**
- Error about `ETHEREUM_PRIVATE_KEY`? The `.env` file should already exist with a test key
- Port 3001 in use? Run: `lsof -ti:3001 | xargs kill -9`

### 2. Frontend Setup (Terminal 2)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

**Expected output:**
```
VITE v5.4.19  ready in 112 ms

➜  Local:   http://localhost:8085/
➜  Network: http://10.0.0.88:8085/
```

## Access the Application

Open your browser to: **http://localhost:8085**

## Test the Full Flow

### 1. Connect Wallet
- Click "Connect Wallet" in top right
- Select your Solana wallet (Phantom, Solflare, etc.)
- Approve connection

### 2. Create Content
- Click your profile icon → "My Content" tab
- Click "Create Content"
- Fill in the form:
  - Title: "My First Course"
  - Description: "Testing the platform"
  - Category: Programming
  - Price: $10/month
- Click "Create Content"

**Expected behavior:**
- Loading indicator appears
- Success toast: "Content created successfully! 🎉"
- Redirects to profile page
- Console shows: `✅ Content stored on Aleph: QmXyZ...`

### 3. View in Community Hub
- Navigate to "Community Hub"
- Your content should appear in the grid
- Click on it to see details

### 4. Create a Guild (Optional)
- Navigate to "Guild Hub"
- Click "Create Guild"
- Fill in guild details
- Submit

## Architecture Overview

```
┌─────────────────┐
│   Frontend      │ http://localhost:8085
│   (React)       │
└────────┬────────┘
         │ HTTP POST
┌────────▼────────┐
│   Backend API   │ http://localhost:3001
│   (Express)     │
└────────┬────────┘
         │ Aleph SDK
┌────────▼────────┐
│   Aleph.im      │ Decentralized Storage
│   Network       │
└─────────────────┘
```

## Key Features Working

- ✅ Content creation with metadata
- ✅ Content display in Community Hub
- ✅ Guild creation with multisig
- ✅ Guild display in Guild Hub
- ✅ Persistent storage on Aleph.im
- ✅ Fallback to localStorage if backend down
- ✅ Wallet integration
- ✅ Recurring payment subscriptions (via ICP Timer)

## Stopping the Servers

**Backend:**
- Press `Ctrl+C` in Terminal 1

**Frontend:**
- Press `Ctrl+C` in Terminal 2

## Common Issues

### "Backend not available"
**Symptom:** Content creation shows warning about localStorage

**Fix:** Ensure backend is running in Terminal 1

**Verify:**
```bash
curl http://localhost:3001/health
```

Should return:
```json
{"status":"healthy","timestamp":"...","alephAccount":"0x..."}
```

### "Port already in use"
**Backend (3001):**
```bash
lsof -ti:3001 | xargs kill -9
npm run dev
```

**Frontend (8085):**
```bash
lsof -ti:8085 | xargs kill -9
npm run dev
```

### Changes not reflecting
**Fix:** Restart the server where you made changes
- Backend changes: Restart backend (auto-reloads with tsx watch)
- Frontend changes: Usually auto-reloads via Vite HMR

## Environment Variables

### Backend (`backend/.env`)
```bash
PORT=3001
NODE_ENV=development
ALEPH_API_URL=https://api2.aleph.im
ALEPH_CHANNEL=OuroC-Mesos
ETHEREUM_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
FRONTEND_URL=http://localhost:8085
```

### Frontend (`frontend/.env.local`)
```bash
VITE_BACKEND_URL=http://localhost:3001
```

**Note:** These files should already exist. If not, copy from `.env.example`

## Next Steps

- **Deploy Backend:** See `backend/README.md` for deployment options
- **Deploy Frontend:** Deploy to Vercel, Netlify, or similar
- **Generate Production Key:** `npx ethers@5 --account create`
- **Read Documentation:**
  - `doc/BACKEND_API_COMPLETE.md` - Backend architecture
  - `doc/BACKEND_ARCHITECTURE.md` - Architecture decisions
  - `backend/README.md` - Backend API reference

## Support

For detailed documentation:
- Backend API: `backend/README.md`
- Architecture: `doc/BACKEND_API_COMPLETE.md`
- Community Hub: `doc/COMMUNITY_HUB_COMPLETE.md`
- Guild System: `doc/SQUADS_INTEGRATION_GUIDE.md`

---

**Status:** ✅ System fully operational in development mode!

**Both servers running?**
- Backend: http://localhost:3001 ✅
- Frontend: http://localhost:8085 ✅
- Aleph.im: Connected ✅
- Ready to use! 🎉
