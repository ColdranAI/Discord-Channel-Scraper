# Discord Channel Export - Go Backend

A WebSocket-based Discord channel export server built with Go.

## Features

- Real-time WebSocket communication
- Discord channel message scraping
- Live progress updates
- Server-side file downloads
- CORS support for web frontends

## Setup

1. Install dependencies:
```bash
go mod tidy
```

2. Create a `.env` file (optional):
```env
PORT=8001
```

3. Run the server:
```bash
go run main.go
```

## API Endpoints

### Local Development
- WebSocket: `ws://localhost:8001/ws`
- Download: `http://localhost:8001/download/{id}`

### Production (HTTPS)
- WebSocket: `wss://discord.nermalcat69.dev/ws`
- Download: `https://discord.nermalcat69.dev/download/{id}`

## CORS Configuration

The server allows requests from:
- `http://localhost:3000` (local development)
- `https://localhost:3000` (local development with HTTPS)
- `https://discord.nermalcat69.dev` (production)
- `http://discord.nermalcat69.dev` (production fallback)

## WebSocket Messages

### Client → Server
```json
{
  "action": "export",
  "channelId": "123456789",
  "discordToken": "your-token",
  "maxMessages": 500
}
```

### Server → Client
```json
{
  "type": "log|progress|complete|error",
  "message": "Status message",
  "data": {
    "set": 1,
    "messagesFound": 50,
    "totalMessages": 50,
    "newContent": ["message1", "message2"]
  }
}
```

## Download Endpoint

Downloads scraped content as a text file:
- **Method**: GET
- **Path**: `/download/{id}`
- **Response**: Text file with Discord messages
- **Headers**: 
  - `Content-Type: text/plain; charset=utf-8`
  - `Content-Disposition: attachment; filename="discord-channel-{channelId}-{date}.txt"`

## Deployment

For production deployment at `discord.nermalcat69.dev`:

1. Set environment variables:
```bash
export PORT=8001
```

2. Configure reverse proxy (nginx/apache) to:
   - Forward WebSocket connections to `ws://localhost:8001/ws`
   - Forward HTTP requests to `http://localhost:8001`
   - Add SSL/TLS certificates for HTTPS

3. Update firewall rules to allow connections on port 8001

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8001` | 