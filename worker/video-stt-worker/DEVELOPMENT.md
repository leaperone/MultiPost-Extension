# Development Guide

## Project Structure

```
video-stt-worker/
├── src/
│   ├── api/
│   │   ├── handlers.ts      # API request handlers
│   │   └── router.ts        # HTTP router
│   ├── services/
│   │   ├── job.service.ts   # Job management
│   │   ├── stt.service.ts   # Speech-to-text service
│   │   └── video-extract.service.ts  # Video audio extraction
│   ├── utils/
│   │   ├── id.ts           # ID generation
│   │   └── logger.ts       # Logging utility
│   ├── config.ts           # Configuration loader
│   ├── main.ts             # Entry point
│   └── types.ts            # TypeScript types
├── .env.example            # Environment variables template
├── .gitignore             # Git ignore rules
├── API.md                 # API documentation
├── deno.json              # Deno configuration
└── README.md              # Project overview
```

## Getting Started

### Prerequisites

- [Deno](https://deno.land/) 2.0 or higher

### Installation

1. Clone the repository
2. Copy `.env.example` to `.env`
3. Fill in your API keys in `.env`

```bash
cp .env.example .env
```

### Running the Server

**Development mode (with auto-reload):**
```bash
deno task dev
```

**Production mode:**
```bash
deno task start
```

**Type checking:**
```bash
deno task check
```

### Code Quality

**Format code:**
```bash
deno task fmt
```

**Lint code:**
```bash
deno task lint
```

## Configuration

All configuration is done through environment variables. See `.env.example` for available options.

### Required Environment Variables

- `MULTIPOST_DATABASE_URL` - PostgreSQL database connection URL
- `VIDEO_EXTRACT_API_URL` - URL of the video extraction API
- `VIDEO_EXTRACT_API_KEY` - API key for video extraction
- `STT_API_URL` - URL of the STT API
- `STT_API_KEY` - API key for STT service

## Architecture

### Request Flow

```
Client Request
    ↓
Router (router.ts)
    ↓
Handler (handlers.ts)
    ↓
Job Service (job.service.ts) ← Creates job
    ↓
Video Extract Service ← Extracts audio
    ↓
STT Service ← Transcribes audio
    ↓
Job Service ← Updates result
    ↓
Client Response
```

### Services

**JobService**
- Manages job lifecycle
- Stores jobs in memory (Map)
- Handles job cleanup

**VideoExtractService**
- Calls external API to extract audio from video
- Validates video URL and format
- Returns audio URL and metadata

**STTService**
- Calls external API to transcribe audio
- Supports multiple languages
- Returns transcript with optional timestamps

## Adding New Features

### Adding a New API Endpoint

1. Add handler method in `src/api/handlers.ts`
2. Add route in `src/api/router.ts`
3. Update API documentation in `API.md`

### Adding a New Service

1. Create new service file in `src/services/`
2. Inject configuration in constructor
3. Import and use in handlers

## Testing

Currently, there are no automated tests. To test manually:

1. Start the server: `deno task dev`
2. Use `curl` or Postman to test endpoints

**Example:**
```bash
# Create a transcription job
curl -X POST http://localhost:8000/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{"videoUrl": "https://example.com/video.mp4"}'

# Get job result
curl http://localhost:8000/api/transcribe/job_abc123
```

## Deployment

### Docker (Coming Soon)

```bash
docker build -t video-stt-worker .
docker run -p 8000:8000 --env-file .env video-stt-worker
```

### Deno Deploy

1. Push code to GitHub
2. Connect repository to Deno Deploy
3. Set environment variables in dashboard
4. Deploy

## Troubleshooting

### "VIDEO_EXTRACT_API_URL is required" error

Make sure you have created a `.env` file and filled in all required environment variables.

### Jobs stuck in "processing" status

Check the logs for errors. The job will be marked as "failed" if an error occurs during processing.

### Server crashes on startup

1. Check Deno version: `deno --version`
2. Verify environment variables are set correctly
3. Check logs for detailed error messages

## Contributing

1. Create a feature branch
2. Make your changes
3. Format code: `deno task fmt`
4. Run type check: `deno task check`
5. Test manually
6. Submit pull request

## License

MIT
