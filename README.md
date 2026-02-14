# 📚 Attendance Tracker v2

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14.2.35-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-12.8.0-FFCA28?style=for-the-badge&logo=firebase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-38B2AC?style=for-the-badge&logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-0.1.0-blue?style=for-the-badge)

A modern, offline-first attendance tracking system built with Next.js, Firebase, and Dexie for educational institutions.

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Deployment](#-deployment) • [Support](#-support)

</div>

---

## ✨ Features

### 🎯 Core Functionality
- **📋 Attendance Management** — Mark attendance by subject and date with smart record loading
- **👥 Student Management** — Add, edit, delete, and bulk import students via CSV/Excel with AI format detection
- **📚 Subject Management** — Organize subjects with full CRUD operations and archival support
- **📊 Data Export** — Export attendance records as CSV, Excel (XLSX), or PDF with formatted reports
- **🔄 Auto-Sync** — Seamless synchronization between local IndexedDB and Firebase Firestore with 15-second polling
- **📱 PWA Support** — Progressive Web App manifest for app-like experience on mobile devices

### 🔐 Security & Performance
- **🔒 Role-Based Access** — Firebase authentication with email/password, data isolated by user (`ownerId`)
- **⚡ Smart Bundle Splitting** — Dynamic imports for heavy libraries (xlsx, jspdf) reduce initial load by 62% on export page
- **📵 Offline-First Architecture** — Full functionality without internet using IndexedDB + sync queue
- **🚀 Zero ESLint Warnings** — Production-ready code with comprehensive type safety
- **🛡️ Security Headers** — X-Frame-Options, X-Content-Type-Options, Referrer-Policy configured
- **🌐 CORS & CSP** — Proper Firebase integration with secure headers

### 🎨 User Experience
- **🌙 Dark Mode** — Full theme provider with light/dark mode support
- **📱 Responsive Design** — Mobile-first UI with Tailwind CSS and Radix components
- **⌨️ Keyboard Shortcuts** — Power user shortcuts for efficient workflows
- **🎯 Smart Column Detection** — Automatically identify Roll/Name columns when importing Excel files
- **✅ Input Validation** — Real-time validation for all forms with helpful error messages
- **🔔 Toast Notifications** — Non-blocking feedback system with memory leak prevention

### 📈 Data Management
- **🗑️ Soft Deletes** — Archive students/subjects without losing historical data
- **📊 Bulk Operations** — Import multiple students in one action
- **🎓 AI Format Dialog** — Copy-paste student data with smart parsing
- **📥 Multiple Import Formats** — CSV, Excel (.xlsx, .xls), and manual entry support

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js | 14.2.35 |
| **React** | React + Hooks | 18 |
| **Language** | TypeScript | 5 |
| **Styling** | Tailwind CSS | 3.4.1 |
| **UI Components** | Radix UI | Latest |
| **State Management** | Zustand | 5.0.11 |
| **Local DB** | Dexie (IndexedDB) | 4.3.0 |
| **Backend** | Firebase | 12.8.0 |
| **Data Query** | React Query | 5.90.20 |
| **Export** | xlsx, jsPDF | 0.18.5, 4.0.0 |
| **CSV Parse** | PapaParse | 5.5.3 |
| **Animations** | Framer Motion | 12.29.2 |
| **Icons** | Lucide React | 0.563.0 |

### Project Structure

```
src/
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Auth routes (login, register, forgot-password)
│   ├── (dashboard)/                  # Protected dashboard routes
│   │   ├── attendance/               # Attendance marking page
│   │   ├── students/                 # Student management (461KB reduced to 321KB)
│   │   ├── subjects/                 # Subject management
│   │   ├── export/                   # Data export (447KB reduced to 172KB)
│   │   ├── settings/                 # User preferences
│   │   ├── sync/                     # Sync status page
│   │   └── error.tsx                 # Error boundary
│   ├── error.tsx                     # Global error handler
│   ├── not-found.tsx                 # 404 page
│   └── layout.tsx                    # Root layout
├── components/
│   ├── layout/                       # Header, sidebar, mobile nav
│   ├── providers/                    # Auth, theme, query, sync providers
│   ├── shared/                       # Reusable components
│   ├── students/                     # Student-specific components
│   └── ui/                           # Base UI components (Button, Card, Dialog, etc.)
├── hooks/
│   ├── use-sync.ts                   # Sync management (15s polling)
│   ├── use-online.ts                 # Online status detection
│   ├── use-toast.ts                  # Toast notifications
│   ├── use-debounce.ts               # Debounced values
│   ├── use-keyboard-shortcut.ts      # Keyboard handler
│   └── use-media-query.ts            # Responsive queries
├── lib/
│   ├── db/                           # Dexie schemas (students, subjects, attendance, sync)
│   ├── firebase/                     # Firebase config and auth
│   ├── stores/                       # Zustand state (auth, students, subjects, etc.)
│   ├── types/                        # TypeScript interfaces
│   └── utils/                        # Helpers (validation, date, cn)
└── styles/
    └── design-tokens.css             # Tailwind design system
```

### Data Flow

```
Firebase Firestore (Cloud)
        ↓ ↑
    [Auto-Sync]
    (15s polling)
        ↓ ↑
  Dexie IndexedDB
   (Local-First)
        ↓
   Zustand Store
   (React State)
        ↓
   React Components
     (UI Layer)
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (or 20+)
- **pnpm** 8+ (or npm/yarn)
- **Firebase Account** with Firestore database
- Modern browser with IndexedDB support

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd att-tracker-v2
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure Firebase**
   
   Create a `.env.local` file in the project root:
   ```bash
   cp .env.example .env.local
   ```

   Update with your Firebase credentials:
   ```env
   # Firebase Configuration
   # Get these from Firebase Console > Project Settings > General
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX  # Optional
   ```

4. **Configure Firestore Database**
   
   In Firebase Console, create collections with this structure:
   ```
   users/
   └── {userId}/
       ├── students/
       │   └── {studentId} (roll, name, section, department, isDeleted, etc.)
       ├── subjects/
       │   └── {subjectId} (name, code, isArchived, etc.)
       └── attendance/
           └── {sessionId} (subjectId, date, records[], etc.)
   ```

5. **Run development server**
   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📖 Usage

### First-Time Setup

1. **Register Account**
   - Navigate to registration page
   - Create account with email and password
   - Email verification (optional, depends on Firebase config)

2. **Import Students**
   - Go to **Students** page
   - Click **Upload** and select CSV/Excel file
   - System automatically detects Roll/Name columns
   - Review and confirm import

3. **Create Subjects**
   - Go to **Subjects** page
   - Click **Add Subject**
   - Enter name, code, and other details

4. **Mark Attendance**
   - Go to **Attendance** page
   - Select subject and date
   - Toggle student status (Present/Absent)
   - Click **Save**

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Quick search |
| `Ctrl/Cmd + S` | Save current form |
| `Escape` | Close dialog/modal |

### Bulk Import Format

#### CSV Format
```csv
Roll Number,Student Name,Section,Department
101,John Doe,A,CS
102,Jane Smith,A,CS
103,Bob Johnson,B,IT
```

#### Excel Format
Same columns as CSV. The system automatically detects headers.

#### Manual Entry
Use the **AI Format Dialog** to paste student data:
```
101 John Doe Section A
102 Jane Smith Section A
103 Bob Johnson Section B
```

---

## 🔄 Offline & Sync

### How It Works

1. **Offline Mode** — All data stored locally in IndexedDB
2. **Sync Queue** — Actions queued when offline
3. **Auto-Sync** — Every 15 seconds when online, syncs changes to Firebase
4. **Conflict Resolution** — Latest write wins; manual re-sync available

### Sync Indicator

- 🟢 **Green** — Synced and online
- 🟡 **Yellow** — Syncing in progress
- 🔴 **Red** — Offline or sync failed
- ⏱️ **Last synced** — Timestamp shown in status

---

## 📦 Export Data

### Formats Supported

| Format | Use Case | Features |
|--------|----------|----------|
| **CSV** | Spreadsheets | Lightweight, universal |
| **Excel (XLSX)** | Formatted reports | Styled, multi-sheet |
| **PDF** | Printing | Print-optimized, auto-table |
| **WhatsApp** | Quick sharing | Plain text format |

### Performance

Bundle sizes after optimization:
- Export page: **447 KB → 172 KB** (62% reduction)
- Students page: **461 KB → 321 KB** (30% reduction)

Dynamic imports ensure heavy libraries only load when needed.

---

## 🧪 Testing & Quality

### Build & Lint

```bash
# Production build
pnpm build

# Run linter
pnpm lint

# Development with fast refresh
pnpm dev
```

### Build Results

```
✅ Compiled successfully
✓ Linting (0 warnings, 0 errors)
✓ Type checking passed
✓ Static page generation (14 routes)

Route                 Size      First Load JS
├─ /                  5.99 kB   149 kB
├─ /attendance        13 kB     265 kB
├─ /export            8.42 kB   172 kB  (was 447 kB)
├─ /students          38.5 kB   321 kB  (was 461 kB)
├─ /subjects          5.24 kB   284 kB
└─ /sync              4.63 kB   265 kB
```

---

## 🚀 Deployment

### Vercel (Recommended)

1. **Push code to git**
   ```bash
   git add .
   git commit -m "Ready for production"
   git push
   ```

2. **Deploy via Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import project from git
   - Add environment variables (`.env.local` contents)
   - Deploy

3. **Configure Firebase**
   - Add Vercel domain to Firebase authorized domains
   - Enable necessary Firebase services

### Environment Variables (Vercel)

In Vercel dashboard, set these environment variables:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### Performance Checklist

- ✅ Zero ESLint warnings
- ✅ Type-safe TypeScript build
- ✅ Security headers configured
- ✅ Dynamic imports for heavy libraries
- ✅ Strict Mode enabled (catches bugs in development)
- ✅ Console stripped in production
- ✅ Error boundaries for graceful degradation
- ✅ PWA manifest for installability

---

## 🔐 Security

### Authentication
- Firebase Authentication with email/password
- JWT tokens managed by Firebase
- Secure session management with providers

### Data Isolation
- All data queries filtered by `ownerId` (current user)
- Firestore security rules enforce user ownership
- No cross-user data leakage

### Headers & Policies
- `X-Content-Type-Options: nosniff` — Prevent MIME sniffing
- `X-Frame-Options: SAMEORIGIN` — Prevent clickjacking
- `Referrer-Policy: strict-origin-when-cross-origin` — Privacy
- Content Security Policy ready

### Best Practices
- Environment variables for sensitive data
- No credentials in version control
- HTTPS enforced in production
- Firebase Firestore security rules configured

---

## 🐛 Troubleshooting

### Common Issues

**Q: Data not syncing to Firebase**
- ✓ Check `.env.local` has correct Firebase credentials
- ✓ Verify internet connection
- ✓ Check Firestore security rules allow your user
- ✓ View sync status page for detailed info

**Q: Import fails with "No valid data found"**
- ✓ Ensure CSV/Excel has Roll and Name columns
- ✓ Check data format matches requirements
- ✓ Try manual entry or AI format dialog

**Q: Offline mode not working**
- ✓ Browser must support IndexedDB
- ✓ Check browser privacy/incognito mode
- ✓ Verify Dexie initialization in console

**Q: Slow performance on students page**
- ✓ Use search to filter large lists
- ✓ Check browser dev tools for slow scripts
- ✓ Consider archiving/deleting old students

---

## 📚 Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs) — Framework guide
- [Firebase Docs](https://firebase.google.com/docs) — Backend setup
- [Tailwind CSS](https://tailwindcss.com/docs) — Styling system
- [Radix UI](https://www.radix-ui.com/docs/primitives/overview) — Component library
- [Zustand](https://github.com/pmndrs/zustand) — State management
- [Dexie](https://dexie.org/) — IndexedDB wrapper

### Tools & Services
- [Vercel](https://vercel.com) — Hosting
- [Firebase Console](https://console.firebase.google.com) — Backend management
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/) — Debugging

---

## 📝 License

This project is licensed under the **MIT License** — feel free to use, modify, and distribute.

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit changes** (`git commit -m 'Add amazing feature'`)
4. **Push to branch** (`git push origin feature/amazing-feature`)
5. **Open a pull request**

### Development Guidelines

- Follow TypeScript best practices
- Use existing UI components from `/components/ui`
- Test offline functionality in DevTools
- Run `pnpm build` before submitting PR
- Update README if adding features
- No ESLint warnings in final code

---

## 🙋 Support

### Getting Help

- 📖 Check [Troubleshooting](#-troubleshooting) section
- 🐛 Report bugs via issue tracker
- 💬 Discuss features in discussions
- 📧 Contact maintainers directly

### Feedback

Your feedback helps improve this project:
- Feature requests
- Bug reports
- Performance suggestions
- UI/UX improvements

---

## 🎯 Roadmap

- [ ] Multi-school support
- [ ] Advanced analytics dashboard
- [ ] Batch auto-sync scheduling
- [ ] Mobile app (React Native)
- [ ] SMS/Email notifications
- [ ] Parent portal access
- [ ] Attendance reports with graphs
- [ ] Integration with other educational platforms

---

<div align="center">

**Built with ❤️ for educators and students**

Made with [Next.js](https://nextjs.org) • [Firebase](https://firebase.google.com) • [Tailwind CSS](https://tailwindcss.com)

---

*Last updated: February 14, 2026*

</div>
