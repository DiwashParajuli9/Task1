# AI Chat

A production-ready ChatGPT-style web application built with **Next.js**, **TypeScript**, **Tailwind CSS**, **Prisma**, **MongoDB Atlas**, and **OpenAI** (via Vercel AI SDK).

## Features

- Streaming AI responses with stop / regenerate
- Conversation sidebar with persistence
- Google & GitHub OAuth (NextAuth)
- Multi-model switching (GPT-4o, GPT-4.1, o3-mini, etc.)
- Markdown rendering with syntax highlighting & copy code
- System prompt & temperature settings
- File upload (PDF, text, images) with document context
- Voice input (browser Speech API)
- Dark / light theme
- Export chats as Markdown
- Rate limiting (Upstash Redis or in-memory fallback)

## Prerequisites

- Node.js 18+
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster (free tier works; must be a replica set)
- OpenAI API key
- Google and/or GitHub OAuth app credentials

> **Note:** This project uses **Prisma ORM v6** for MongoDB. Prisma 7 does not support MongoDB yet.

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `env.example` to `.env` and fill in your values:

```bash
# MongoDB Atlas — include the database name (e.g. ai_chat)
DATABASE_URL="mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/ai_chat?retryWrites=true&w=majority"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"   # openssl rand -base64 32

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_ID=""
GITHUB_SECRET=""

OPENAI_API_KEY="sk-..."
OPENAI_BASE_URL="https://api.openai.com/v1"
DEFAULT_MODEL="gpt-4o-mini"

# Optional rate limiting
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

#### MongoDB Atlas setup

1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. **Database Access** → create a database user with password.
3. **Network Access** → allow your IP (or `0.0.0.0/0` for development).
4. **Connect** → Drivers → copy the connection string.
5. Replace `<password>` and append the database name: `...mongodb.net/ai_chat?retryWrites=true&w=majority`

### 3. Set up the database

```bash
npm run db:push
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in, and start chatting.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Generate Prisma client & build for production |
| `npm run start` | Start production server |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Create & run migrations |
| `npm run db:studio` | Open Prisma Studio |

## Deploy to Vercel

1. Push the repo to GitHub and import in [Vercel](https://vercel.com).
2. Add all environment variables from `.env`.
3. Set `DATABASE_URL` to your MongoDB Atlas connection string (with database name).
4. Build command: `prisma generate && next build`
5. Run `npm run db:push` once against Atlas to create collections (or push from CI).

## Project structure

```
src/
├── app/
│   ├── (chat)/          # Main chat UI (sidebar + messages)
│   ├── api/             # REST & streaming API routes
│   └── login/           # OAuth sign-in page
├── components/          # UI components
├── hooks/               # Custom React hooks
├── lib/                 # Auth, Prisma, LLM, rate limiting
└── generated/prisma/    # Prisma client (generated)
prisma/schema.prisma     # Database schema
```

## OAuth setup

**Google:** [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → OAuth 2.0 Client. Add redirect URI: `http://localhost:3000/api/auth/callback/google`

**GitHub:** [GitHub Developer Settings](https://github.com/settings/developers) → OAuth App. Callback URL: `http://localhost:3000/api/auth/callback/github`

## License

MIT
