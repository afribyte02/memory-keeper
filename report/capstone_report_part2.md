# Memory Keeper — Capstone Report
## Part 2: Realistic Constraints & System Design

---

# CHAPTER 3: REALISTIC CONSTRAINTS

Engineering projects are always bounded by real-world constraints. This chapter identifies and analyzes the key constraints that shaped design decisions in Memory Keeper.

## 3.1 Technical Constraints

### 3.1.1 Firebase Free Tier Limits
Firebase Authentication on the Spark (free) plan supports unlimited authenticated users for email/password sign-in, and up to 10 OAuth requests per day for Google and GitHub providers in development mode. For production, the project must be upgraded to the Blaze (pay-as-you-go) plan.

**Mitigation**: The system's authentication layer is abstracted through the `firebase.js` module and the `verifyToken` middleware. Switching from Firebase to Auth0 or a custom JWT system requires changes only in these two files, not throughout the application.

### 3.1.2 Cloudinary Storage Limits
The Cloudinary free tier offers 25 GB of storage and 25 GB of monthly bandwidth with a maximum file size of 100 MB per upload. Large video files may consume this quota rapidly.

**Mitigation**: 
- File size is validated on both client (via `react-dropzone` `maxSize`) and server (via Multer's `limits.fileSize`).
- The system stores only Cloudinary URLs in MongoDB — no binary data enters the database.
- Unused media can be deleted via the `/api/upload/:publicId` DELETE endpoint.

### 3.1.3 MongoDB Atlas Free Tier
MongoDB Atlas M0 (free) clusters provide 512 MB of storage, shared vCPU, and shared RAM. This limits the number of memories and media records that can be stored before an upgrade is required.

**Mitigation**: The Memory schema uses efficient data types. Text indexes are created selectively on `title`, `description`, and `tags` fields only. Soft-deletion (`isDeleted` flag) avoids permanent data loss while keeping the document count manageable.

### 3.1.4 Cross-Origin Resource Sharing (CORS)
The frontend (React, port 3000) and backend (Express, port 5000) run on different origins during development. Browsers enforce CORS policies that block cross-origin requests by default.

**Mitigation**: Express is configured with the `cors` package, allowing requests only from `process.env.CLIENT_URL`. In production, both frontend and backend are deployed under the same domain or with explicit allowed origins.

### 3.1.5 Token Expiry and Refresh
Firebase ID tokens expire after 60 minutes. If a user performs a long editing session, their token may expire mid-request, causing 401 errors.

**Mitigation**: The `AuthContext.js` component schedules a proactive token refresh using `getIdToken(forceRefresh=true)` every 50 minutes via `setInterval`. The Axios request interceptor also calls `getIdToken(false)` before each API request to ensure freshness.

## 3.2 Security Constraints

### 3.2.1 Server-Side Token Verification
Client-side Firebase Authentication alone is insufficient for API security. A malicious actor could forge requests to the backend.

**Mitigation**: Every protected API route passes through the `verifyToken` middleware, which uses the Firebase Admin SDK to cryptographically verify the ID token. The `req.user.uid` extracted from the verified token is used in all MongoDB queries, ensuring users can only access their own data.

### 3.2.2 Rate Limiting
Without rate limiting, the API is vulnerable to brute-force attacks and denial-of-service attempts.

**Mitigation**: `express-rate-limit` is applied globally to `/api/*` routes — 100 requests per 15-minute window per IP address. Upload endpoints have stricter limits enforced by Multer (max 5 files, 100 MB each).

### 3.2.3 Input Validation
Unsanitized user input can lead to NoSQL injection or script injection attacks.

**Mitigation**: Mongoose schema validators enforce field types and length constraints. The `express-validator` package is available for route-level validation. MongoDB's typed schema system prevents arbitrary operator injection in query parameters.

### 3.2.4 Helmet.js Security Headers
HTTP security headers (Content-Security-Policy, X-Frame-Options, HSTS, etc.) protect against XSS, clickjacking, and MIME-type sniffing attacks.

**Mitigation**: `helmet()` middleware is applied as the first middleware in the Express stack.

## 3.3 Usability Constraints

### 3.3.1 Media Upload User Experience
Large file uploads can take significant time, especially on slow connections. Without progress feedback, users may perceive the application as frozen.

**Mitigation**: The `MediaUploader` component shows a real-time per-file progress bar using Axios's `onUploadProgress` callback. Files are uploaded individually so progress is tracked accurately.

### 3.3.2 Mobile Responsiveness
Mobile users represent a significant portion of web traffic. Touch targets, font sizes, and grid layouts must adapt to small screens.

**Mitigation**: All components are designed with responsive CSS using `clamp()` for fluid typography, CSS Grid with `auto-fill` for adaptive columns, and dedicated media queries at 480px, 768px, and 900px breakpoints. The Navbar collapses to a hamburger menu on mobile.

### 3.3.3 Accessibility
Users with disabilities require keyboard navigation support and proper ARIA attributes.

**Mitigation**: Interactive elements use `role="button"`, `aria-label`, `aria-pressed`, `aria-expanded`, and `tabIndex={0}` attributes. Focus-visible styles are defined in CSS. Form labels are explicitly associated with inputs via `htmlFor` / `id` pairs.

## 3.4 Economic Constraints

The project is built entirely on free-tier cloud services, making it zero-cost to deploy for development and low-traffic production use:

| Service | Free Tier | Cost to Scale |
|---|---|---|
| Firebase Auth | Unlimited users | Blaze plan (pay per use) |
| Cloudinary | 25 GB storage, 25 GB bandwidth | From $89/month |
| MongoDB Atlas | 512 MB storage | From $57/month (M10) |
| Render / Railway | 750 hours/month free | From $7/month |
| Vercel (React) | Unlimited deployments | Free (hobby) |

## 3.5 Time Constraints

This project was developed within a single academic semester. The following features were deprioritized for future work due to time constraints:
- AI-powered memory captioning
- Memory sharing between users
- Push notifications for "On This Day"
- Native mobile apps (Flutter)

---

# CHAPTER 4: SYSTEM DESIGN AND METHODS

## 4.1 System Architecture Overview

Memory Keeper follows a **three-tier client-server architecture** with an external authentication provider and two cloud storage/database services:

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (React.js)                        │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Auth     │  │Dashboard  │  │Upload    │  │ Search   │   │
│  │ Pages    │  │Page       │  │Memory    │  │ Page     │   │
│  └──────────┘  └───────────┘  └──────────┘  └──────────┘   │
│                   React Context + Axios API Layer            │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS (Bearer Token)
┌──────────────────────────▼──────────────────────────────────┐
│               BACKEND (Node.js + Express.js)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ /api/        │  │ /api/        │  │ /api/            │   │
│  │ memories     │  │ search       │  │ upload           │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│              │                                │              │
│  ┌───────────▼───────────┐    ┌───────────────▼──────────┐  │
│  │  Firebase Admin SDK   │    │  Multer + Cloudinary SDK  │  │
│  │  (Token Verification) │    │  (Media Upload Stream)    │  │
│  └───────────────────────┘    └──────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│   MongoDB    │  │   Firebase   │  │   Cloudinary     │
│   Atlas      │  │   Auth       │  │   CDN            │
│ (Memories DB)│  │ (Identity)   │  │ (Media Storage)  │
└──────────────┘  └──────────────┘  └──────────────────┘
```

## 4.2 Data Flow

### 4.2.1 Authentication Flow

```
1. User enters credentials (email/password or clicks OAuth)
2. Firebase SDK authenticates user → returns Firebase User object
3. React AuthContext stores user + calls getIdToken()
4. Firebase returns signed JWT (ID Token, 1-hour expiry)
5. Axios interceptor attaches: Authorization: Bearer <token>
6. Express receives request → verifyToken middleware extracts token
7. Firebase Admin SDK verifies token cryptographically
8. Decoded uid attached to req.user
9. MongoDB queries scoped to req.user.uid
10. Response returned to client
```

### 4.2.2 Memory Creation Flow

```
1. User fills UploadMemory form (title, description, mood, date, tags)
2. User drops media files into MediaUploader component
3. For each file: POST /api/upload/single with multipart/form-data
4. Multer streams file to Cloudinary → returns {url, publicId, type}
5. MediaUploader stores returned media objects in React state
6. User clicks "Save Memory" → POST /api/memories
7. Backend validates token → creates Memory document in MongoDB
8. MongoDB returns saved document with _id
9. React navigates to /memory/:id (MemoryDetail page)
```

### 4.2.3 Search Flow

```
1. User types in SearchBar → debounced autocomplete (350ms)
2. GET /api/search/suggestions?q=<partial> → returns title matches
3. User submits full search with optional mood/date/tag filters
4. GET /api/search?q=<keyword>&mood=<mood>&startDate=&endDate=
5. MongoDB executes $text search query with relevance scoring
6. Results sorted by textScore (relevance) if keyword present, else by date
7. Paginated results returned → displayed in memory grid
```

### 4.2.4 On This Day Flow

```
1. User navigates to /on-this-day
2. GET /api/memories/on-this-day
3. MongoDB Aggregation Pipeline:
   a. $match: userId
   b. $addFields: extract memMonth, memDay, memYear from date field
   c. $match: memMonth == today.month AND memDay == today.day
              AND memYear < currentYear
   d. $addFields: yearsAgo = currentYear - memYear
   e. $sort: date DESC
4. Returns memories from same calendar day in past years
5. React renders timeline grouped by year with "N years ago" label
```

## 4.3 Database Schema Design

### 4.3.1 Memory Document Schema

```javascript
{
  _id:         ObjectId,          // MongoDB auto-generated ID
  userId:      String,            // Firebase UID (indexed)
  title:       String,            // required, max 200 chars
  description: String,            // optional, max 5000 chars
  mood:        String (enum),     // 9 mood options
  date:        Date,              // user-specified event date (indexed)
  media: [{                       // array of up to 10 attachments
    url:        String,           // Cloudinary CDN URL
    publicId:   String,           // Cloudinary public ID for deletion
    type:       String (enum),    // 'image' | 'video' | 'audio'
    filename:   String,
    size:       Number,           // bytes
  }],
  tags:        [String],          // lowercase, deduplicated on save
  location: {
    name:       String,
    coordinates: { lat, lng }
  },
  isPrivate:   Boolean,           // default: true
  isDeleted:   Boolean,           // soft-delete flag
  viewCount:   Number,
  createdAt:   Date,              // auto (timestamps: true)
  updatedAt:   Date,              // auto (timestamps: true)
}
```

### 4.3.2 Indexes

| Index | Fields | Purpose |
|---|---|---|
| Text Index | title, description, tags | Full-text keyword search |
| Compound | userId, date | "On This Day" + date-sorted queries |
| Compound | userId, mood | Mood-filtered dashboard queries |
| Single | isDeleted | Soft-delete filter in pre-find hook |

## 4.4 API Design

### 4.4.1 Memories Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/memories | ✅ | List memories (paginated, filterable) |
| GET | /api/memories/stats | ✅ | Mood stats, year breakdown, media count |
| GET | /api/memories/on-this-day | ✅ | Same day in previous years |
| GET | /api/memories/:id | ✅ | Single memory detail |
| POST | /api/memories | ✅ | Create new memory |
| PUT | /api/memories/:id | ✅ | Update memory |
| DELETE | /api/memories/:id | ✅ | Soft-delete memory |

### 4.4.2 Search Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/search | ✅ | Full search (keyword + mood + date + tags) |
| GET | /api/search/suggestions | ✅ | Autocomplete title suggestions |
| GET | /api/search/tags | ✅ | All unique tags for the user |

### 4.4.3 Upload Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/upload/single | ✅ | Upload one media file |
| POST | /api/upload/multiple | ✅ | Upload up to 5 files |
| DELETE | /api/upload/:publicId | ✅ | Remove from Cloudinary |

## 4.5 Frontend Component Architecture

```
src/
├── firebase.js              ← Firebase SDK initialization & helpers
├── context/
│   └── AuthContext.js       ← Global auth state (currentUser, token, logout)
├── api/
│   └── memoryApi.js         ← Axios client + all API endpoint functions
├── components/
│   ├── Navbar.js/css        ← Navigation, avatar dropdown, mobile menu
│   ├── MemoryCard.js/css    ← Memory grid item with actions
│   ├── MediaUploader.js/css ← Drag-drop upload with per-file progress
│   ├── SearchBar.js/css     ← Keyword + mood + date filter UI
│   └── LoadingSpinner.js/css← Multi-color spinner variants
└── pages/
    ├── Login.js/Auth.css    ← Email + OAuth login, password reset
    ├── Register.js          ← Registration with password strength
    ├── Dashboard.js/css     ← Memory grid, stats, filters
    ├── UploadMemory.js/css  ← Create/edit memory form
    ├── MemoryDetail.js/css  ← Full memory view with lightbox gallery
    ├── OnThisDay.js/css     ← Timeline of past memories on this date
    └── SearchPage.js/css    ← Search results with tag sidebar
```

## 4.6 Security Design

### 4.6.1 Defense-in-Depth Strategy

```
Layer 1 (Network):   CORS policy restricts origins
Layer 2 (Transport): HTTPS enforced in production
Layer 3 (Headers):   Helmet.js sets security headers
Layer 4 (Rate):      express-rate-limit (100 req/15 min)
Layer 5 (Auth):      Firebase token verification on all protected routes
Layer 6 (Data):      All MongoDB queries scoped to req.user.uid
Layer 7 (Validation):Mongoose schema validators + input sanitization
```

### 4.6.2 Data Isolation
Every MongoDB query includes `userId: req.user.uid` as a mandatory filter. This ensures complete data isolation — users can never access, modify, or delete another user's memories, even if they guess a valid MongoDB ObjectId.

## 4.7 UI/UX Design Principles

The Memory Keeper interface follows these design principles:

1. **Dark Mode First**: Deep navy/indigo background (`#0d0d1a`) reduces eye strain for nighttime reflection.
2. **Glassmorphism**: Cards use `backdrop-filter: blur()` with semi-transparent backgrounds for a modern, layered aesthetic.
3. **Mood Color System**: Each of the 9 moods has a distinct, harmonious color assigned — from warm amber for "happy" to cool blue for "sad."
4. **Micro-animations**: Hover effects (`translateY(-6px)`), floating icons, shimmer skeletons, and staggered grid reveal create a responsive, alive feel.
5. **Progressive Disclosure**: Advanced search filters are hidden behind a toggle to reduce cognitive load.
6. **Sticky Submit Bar**: The UploadMemory form footer stays visible during scroll, preventing the need to scroll to submit.
