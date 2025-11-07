# OuroC-Mesos Backend API

Backend API server for OuroC-Mesos that handles Aleph.im write operations. This service provides a REST API for storing content, guilds, and proposals on the decentralized Aleph network.

## Architecture

```
Frontend (React)
    ↓ HTTP POST
Backend API (Express)
    ↓ Aleph SDK
Aleph.im Network (Decentralized Storage)
```

**Why we need a backend:**
- Aleph SDK has complex dependencies that conflict in browser environments
- Backend handles message signing with a dedicated Ethereum account
- Provides clean REST API for frontend
- Keeps private keys server-side (secure)

## Features

- ✅ Store content metadata on Aleph.im
- ✅ Store guild metadata on Aleph.im
- ✅ Store proposal metadata on Aleph.im
- ✅ Fetch data from Aleph REST API
- ✅ CORS-enabled for frontend access
- ✅ TypeScript with full type safety
- ✅ Hot reload in development

## Prerequisites

- Node.js v18 or higher
- npm or yarn
- An Ethereum private key (for signing Aleph messages)

## Installation

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Configure environment variables:**

Create a `.env` file in the `backend/` directory:

```bash
# Backend Server Configuration
PORT=3001
NODE_ENV=development

# Aleph.im Configuration
ALEPH_API_URL=https://api2.aleph.im
ALEPH_CHANNEL=OuroC-Mesos

# Ethereum Account for Aleph Signing
# IMPORTANT: Generate a new key for production!
# This account signs all Aleph messages
ETHEREUM_PRIVATE_KEY=your_private_key_here

# CORS Configuration
FRONTEND_URL=http://localhost:8085
```

**⚠️ Security Note:**
- DO NOT use your personal wallet's private key
- Generate a dedicated key for the backend: `npx ethers@5 --account create`
- Keep `.env` in `.gitignore` (already configured)
- Use environment variables in production deployment

3. **Generate a backend wallet (recommended):**

```bash
# Install ethers v5 CLI
npm install -g ethers@5

# Create new wallet
ethers --account create

# Copy the private key to .env file
```

## Development

Start the development server with hot reload:

```bash
npm run dev
```

The server will start on `http://localhost:3001`

You should see:

```
✅ Aleph account initialized: 0x...
✅ Aleph account ready

🚀 OuroC-Mesos Backend Server Running
📡 Port: 3001
🔑 Aleph Account: 0x...

📋 Available Endpoints:
  GET  /health
  POST /api/content
  GET  /api/content
  POST /api/guilds
  GET  /api/guilds
  POST /api/proposals
  GET  /api/proposals

✅ Ready to accept requests!
```

## Production

Build and run for production:

```bash
# Build TypeScript to JavaScript
npm run build

# Run production server
npm start
```

## API Endpoints

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-05T18:30:00.000Z",
  "alephAccount": "0x..."
}
```

---

### Content Endpoints

#### Store Content

```http
POST /api/content
Content-Type: application/json

{
  "id": "content_1234567890",
  "title": "Advanced React Patterns",
  "description": "Learn advanced React patterns...",
  "category": "Programming",
  "price": 29.99,
  "interval": "monthly",
  "creatorWallet": "0x...",
  "creatorName": "Creator Name",
  "thumbnailUrl": "https://...",
  "tags": ["react", "javascript"],
  "createdAt": 1699200000000
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "hash": "QmXyZ123..." // Aleph message hash
}
```

#### Get All Content

```http
GET /api/content
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "content_123",
      "title": "Course Title",
      ...
    }
  ]
}
```

---

### Guild Endpoints

#### Store Guild

```http
POST /api/guilds
Content-Type: application/json

{
  "id": "guild_1234567890",
  "name": "DevDAO",
  "description": "A guild for developers",
  "category": "Development",
  "treasuryAddress": "0x...",
  "subscriptionPrice": 10,
  "interval": "monthly",
  "threshold": 3,
  "members": ["0x123...", "0x456..."],
  "logoEmoji": "💻",
  "tags": ["dev", "dao"],
  "createdAt": 1699200000000
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "hash": "QmAbc456..."
}
```

#### Get All Guilds

```http
GET /api/guilds
```

---

### Proposal Endpoints

#### Store Proposal

```http
POST /api/proposals
Content-Type: application/json

{
  "id": "proposal_1234567890",
  "guildId": "guild_123",
  "title": "Proposal Title",
  "description": "Proposal description...",
  "recipient": "0x...",
  "amount": 100,
  "status": "pending",
  "votesFor": 0,
  "votesAgainst": 0,
  "createdAt": 1699200000000
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "hash": "QmDef789..."
}
```

#### Get All Proposals

```http
GET /api/proposals
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error

---

## Frontend Integration

The frontend connects to the backend via environment variables:

**`frontend/.env.local`:**
```bash
VITE_BACKEND_URL=http://localhost:3001
```

**Frontend code example:**
```typescript
import { storeContent } from '@/lib/alephSimple';

// Store content via backend API
const success = await storeContent({
  id: 'content_123',
  title: 'My Course',
  // ...
});

if (success) {
  console.log('✅ Content stored on Aleph!');
}
```

The `alephSimple.ts` service automatically:
1. Tries backend API first
2. Falls back to localStorage if backend is unavailable
3. Provides seamless experience for users

---

## Deployment

### Option 1: Traditional Hosting (Recommended for MVP)

Deploy to services like Heroku, Railway, Render, or DigitalOcean:

**Environment variables to set:**
```
PORT=3001
NODE_ENV=production
ALEPH_API_URL=https://api2.aleph.im
ALEPH_CHANNEL=OuroC-Mesos
ETHEREUM_PRIVATE_KEY=<your_production_key>
FRONTEND_URL=https://your-frontend-domain.com
```

**Deployment steps (Railway example):**
```bash
1. Push code to GitHub
2. Connect Railway to your repo
3. Add environment variables in Railway dashboard
4. Railway automatically builds and deploys
```

### Option 2: Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t ouroc-backend .
docker run -p 3001:3001 --env-file .env ouroc-backend
```

### Option 3: ICP Canister (Future Enhancement)

Convert this Express API to an ICP canister for full decentralization:

**Benefits:**
- Fully decentralized (no traditional server)
- Pay-as-you-go pricing with cycles
- Built-in HTTPS and authentication

**Migration path:**
1. Rewrite Express routes as canister update calls
2. Use ICP's Internet Identity for authentication
3. Store private key in stable memory
4. Deploy to ICP mainnet

---

## Troubleshooting

### Backend won't start

**Error: `ETHEREUM_PRIVATE_KEY not set`**

Solution: Create `.env` file with valid private key

**Error: `Port 3001 already in use`**

Solution: Change `PORT` in `.env` or kill existing process:
```bash
lsof -ti:3001 | xargs kill -9
```

### Frontend can't connect to backend

**Error: `CORS policy` or `Network error`**

Solutions:
1. Ensure backend is running (`npm run dev`)
2. Check `FRONTEND_URL` in backend `.env`
3. Verify `VITE_BACKEND_URL` in frontend `.env.local`
4. Restart both servers after .env changes

### Aleph write fails

**Error: `Failed to store on Aleph`**

Possible causes:
1. Invalid private key format
2. Network issues (check internet connection)
3. Aleph API is down (check status.aleph.im)
4. Message content validation failed

Debug:
```bash
# Check backend logs
npm run dev

# Test health endpoint
curl http://localhost:3001/health

# Check Aleph account balance (should have some ETH)
```

---

## Development Tips

### Hot Reload

The dev server uses `tsx watch` which automatically restarts on file changes.

### Type Checking

```bash
npm run type-check
```

### Testing APIs with curl

```bash
# Health check
curl http://localhost:3001/health

# Store content
curl -X POST http://localhost:3001/api/content \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test_123",
    "title": "Test Content",
    "description": "Test",
    "category": "Programming",
    "price": 10,
    "interval": "monthly",
    "creatorWallet": "0x123",
    "creatorName": "Test",
    "thumbnailUrl": "https://test.com/img.jpg",
    "createdAt": 1699200000000
  }'

# Get all content
curl http://localhost:3001/api/content
```

---

## Project Structure

```
backend/
├── src/
│   ├── server.ts       # Express server and routes
│   ├── aleph.ts        # Aleph SDK integration
│   └── types.ts        # TypeScript interfaces
├── dist/               # Compiled JavaScript (gitignored)
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── .env                # Environment variables (gitignored)
├── .env.example        # Example environment variables
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

---

## Security Best Practices

1. **Never commit `.env` file** - Already in `.gitignore`
2. **Use dedicated backend wallet** - Don't use personal wallet
3. **Rotate keys regularly** - Especially after team changes
4. **Enable CORS only for your frontend** - Already configured
5. **Use HTTPS in production** - Most hosting providers provide this
6. **Monitor Aleph account balance** - Ensure it has ETH for gas
7. **Rate limiting** - Consider adding rate limiting for production
8. **API authentication** - Consider adding API keys for production

---

## Future Enhancements

- [ ] Add rate limiting (express-rate-limit)
- [ ] Add API key authentication
- [ ] Add request logging (winston or pino)
- [ ] Add monitoring (Sentry, DataDog)
- [ ] Add caching layer (Redis)
- [ ] Migrate to ICP canister for full decentralization
- [ ] Add WebSocket support for real-time updates
- [ ] Add batch operations for multiple writes
- [ ] Add Aleph message encryption
- [ ] Add content moderation hooks

---

## Support

For issues or questions:
- Check the troubleshooting section above
- Review backend logs (`npm run dev`)
- Check Aleph.im documentation: https://docs.aleph.im
- Open an issue on GitHub

---

## License

MIT

---

**Status:** ✅ Production-ready backend API for OuroC-Mesos!
