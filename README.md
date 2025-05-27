# StudyBase - The Global Learning Engine

StudyBase is an AI-powered learning platform that helps college students access, share, and create study materials efficiently. It combines the power of AI with collaborative learning to create a comprehensive knowledge base for students worldwide.

## Features

- 🔍 **Smart Search**: Find answers to specific course questions instantly
- 🤖 **AI-Powered Learning**: GPT-4 integration for generating and explaining answers
- 📚 **Document Processing**: Upload and process PDFs, slides, and notes
- 🎯 **Flashcard Generation**: Automatic creation of study materials
- 👥 **Community Learning**: Share and discover study materials from peers
- 🔄 **Knowledge Persistence**: Once a question is answered, it's available for everyone

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk
- **AI Integration**: OpenAI GPT-4, LangChain
- **File Processing**: PDF-parse, custom document processors
- **State Management**: React Query
- **UI Components**: Headless UI, Heroicons
- **Animations**: Framer Motion

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
4. Set up the database:
   ```bash
   npx prisma db push
   ```
5. Run the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# OpenAI
OPENAI_API_KEY=

# Other
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Project Structure

```
studybase/
├── src/
│   ├── app/                 # Next.js app directory
│   ├── components/          # React components
│   ├── lib/                 # Utility functions and shared logic
│   ├── prisma/             # Database schema and migrations
│   └── types/              # TypeScript type definitions
├── public/                 # Static assets
└── ...config files
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details
