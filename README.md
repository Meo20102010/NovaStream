# NovaStream Media Server

Professional, modern, ultra-fast, secure and scalable web-based media server.

## Tech Stack

**Backend:**
- Node.js + Fastify
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- JWT Auth

**Frontend:**
- Next.js 15
- React 19
- Tailwind CSS
- Framer Motion
- Zustand
- React Query

## Features

- Video upload with chunked upload support
- Video streaming with range requests
- Auto thumbnail & poster generation
- Modern glassmorphism dark UI
- Responsive design
- Admin dashboard with live stats
- Role-based access control (Admin, Moderator, Editor, Viewer)
- REST API with Swagger docs
- Rate limiting & security headers
- Docker support

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- FFmpeg

### Installation

```bash
# Install dependencies
npm run install:all

# Setup database
cd server
cp .env.example .env
# Edit .env with your database credentials
npx prisma migrate dev
npx tsx prisma/seed.ts

# Start development
cd ..
npm run dev
```

### Default Credentials

```
Admin:     admin@novastream.com / admin123
Moderator: mod@novastream.com / mod123
```

## URLs

- Frontend: http://localhost:3001
- API: http://localhost:3000
- Swagger Docs: http://localhost:3000/docs

## Docker

```bash
docker-compose up -d
```

## Project Structure

```
NovaStream/
├── server/          # Backend (Fastify + TypeScript)
│   ├── src/
│   │   ├── config/  # Configuration
│   │   ├── lib/     # Prisma, Redis
│   │   ├── middleware/ # Auth, Error handler
│   │   ├── routes/  # API routes
│   │   ├── services/ # Business logic
│   │   └── types/   # Type definitions
│   └── prisma/      # Database schema
├── client/          # Frontend (Next.js)
│   └── src/
│       ├── app/     # Next.js app router
│       ├── components/ # React components
│       ├── pages/   # Page components
│       ├── stores/  # Zustand stores
│       └── lib/     # Utilities, API client
├── storage/         # Video storage
├── config/          # Nginx config
└── docker-compose.yml
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user
- `POST /api/auth/change-password` - Change password

### Videos
- `GET /api/videos` - List videos
- `GET /api/videos/:id` - Get video
- `PATCH /api/videos/:id` - Update video
- `DELETE /api/videos/:id` - Delete video
- `GET /api/videos/:id/stream` - Stream video
- `GET /api/videos/popular` - Popular videos
- `GET /api/videos/recent` - Recent videos

### Uploads
- `POST /api/uploads/init` - Init chunked upload
- `POST /api/uploads/:id/chunk/:index` - Upload chunk
- `POST /api/uploads/:id/complete` - Complete upload
- `DELETE /api/uploads/:id` - Cancel upload

### Admin
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `GET /api/admin/logs` - Activity logs
- `GET /api/admin/api-keys` - API keys
- `POST /api/admin/api-keys` - Create API key

### Settings
- `GET /api/settings` - Get all settings
- `PUT /api/settings` - Update settings

## Environment Variables

See `server/.env.example` for all available configuration options.

## License

MIT
