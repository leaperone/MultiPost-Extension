# Video STT Worker

Database-driven video transcription worker for Douyin/TikTok videos.

## Architecture

- Polls database for pending `VideoTranscription` tasks
- Extracts video info via TikHub API
- Transcribes audio via STT API
- Updates task status in database

## Requirements

- Deno 2.0+
- FFmpeg (for audio extraction)
- PostgreSQL database

## Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

## Usage

```bash
# Start worker
deno task start

# Development with watch
deno task dev
```

## Environment Variables

See `.env.example` for configuration options.
