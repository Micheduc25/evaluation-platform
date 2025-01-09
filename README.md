# Student Evaluation Platform

A comprehensive web-based platform for creating, managing, and conducting student evaluations through quizzes and exams.

## Features

- Interactive quiz and exam creation
- Multiple question types support
- Real-time evaluation and grading
- Student performance tracking
- Detailed analytics and reports
- User roles (Admin, Teacher, Student)

## Tech Stack

- Next.js 14
- Next App Router
- React
- JavaScript
- Firebase Authentication
- Firebase Firestore
- Firebase Storage
- Firebase Cloud Functions
- Firebase Hosting

## Getting Started

1. Clone the repository
2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Set up Firebase:
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication, Firestore, and Storage
   - Install Firebase CLI: `npm install -g firebase-tools`
   - Login to Firebase: `firebase login`
   - Initialize Firebase: `firebase init`

4. Set up environment variables:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

5. Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Project Structure

```
/app
  /auth        - Authentication related components
  /dashboard   - Dashboard views
  /evaluation  - Quiz and exam components
  /api        - API routes
/firebase
  /functions   - Cloud Functions
  rules/       - Security Rules
```

## Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy to Firebase:
```bash
firebase deploy
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Project Wiki](../../wiki)

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT
