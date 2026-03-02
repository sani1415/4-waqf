# Waqf Task Manager - Next.js Version

This is the Next.js migration of the Waqf Task Management System.

## Getting Started

1. **Install dependencies** (if not done):
   ```bash
   cd next-app
   npm install
   ```

2. **Run development server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**: http://localhost:3000

## Project Structure

```
next-app/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Landing page (/)
│   │   ├── layout.tsx         # Root layout
│   │   ├── teacher/           # Teacher routes
│   │   │   ├── dashboard/     # /teacher/dashboard
│   │   │   ├── messages/      # /teacher/messages
│   │   │   └── exams/         # /teacher/exams
│   │   ├── student/           # Student routes
│   │   │   ├── dashboard/     # /student/dashboard
│   │   │   └── chat/          # /student/chat
│   │   └── task-sheet/        # /task-sheet
│   ├── components/            # Reusable components
│   │   ├── teacher/           # Teacher-specific components
│   │   ├── student/           # Student-specific components
│   │   └── shared/            # Shared components
│   ├── hooks/                 # Custom React hooks
│   │   ├── useFirestore.ts    # Firebase data hooks
│   │   └── useTranslation.ts  # i18n hook
│   ├── lib/                   # Utilities and configurations
│   │   ├── firebase.ts        # Firebase initialization
│   │   ├── auth-context.tsx   # Authentication context
│   │   └── types.ts           # TypeScript types
│   ├── messages/              # Translation files
│   │   ├── en.json
│   │   └── bn.json
│   └── styles/                # CSS files (copied from original)
├── package.json
├── tsconfig.json
└── next.config.js
```

## Features Migrated

- [x] Landing page with role selection
- [x] Teacher login & authentication
- [x] Student login & authentication  
- [x] Teacher Dashboard with stats
- [x] Student Dashboard with tasks
- [x] Teacher Messages (chat with students)
- [x] Student Chat (chat with teacher)
- [x] Task Sheet (quick task marking)
- [x] Bilingual support (English/Bengali)
- [x] Firebase Firestore integration
- [x] Real-time data sync

## Key Improvements

1. **Component-based architecture**: Each UI element is a reusable component
2. **Type safety**: Full TypeScript support
3. **Cleaner state management**: React hooks instead of global variables
4. **Better code organization**: Clear separation of concerns
5. **Faster development**: Hot reload, better error messages

## Testing Credentials

- **Teacher**: ID: `teacher`, PIN: `1234`
- **Student**: Use any student ID from your database with their PIN

## Deployment

For static export (Firebase Hosting):
```bash
npm run build
```

The output will be in the `out/` directory.
