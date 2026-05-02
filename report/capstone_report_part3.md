# Memory Keeper — Capstone Report
## Part 3: Implementation, Conclusion, & Future Work

---

# CHAPTER 5: IMPLEMENTATION

This chapter details the specific coding techniques, library choices, and implementation challenges encountered during the development of Memory Keeper.

## 5.1 Backend Implementation

### 5.1.1 Environment Configuration
The backend uses `dotenv` to load sensitive credentials. The main `server.js` file configures the Express application, applies global middleware (Helmet, CORS, JSON body parser), and registers route handlers.

### 5.1.2 Cloudinary Integration
Media handling is abstracted through `config/cloudinary.js`. The implementation uses `multer-storage-cloudinary` to create a direct streaming pipeline from the incoming HTTP request to Cloudinary's servers.

```javascript
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Determine resource type automatically
    let resource_type = 'auto';
    if (file.mimetype.startsWith('audio/')) resource_type = 'video'; // Cloudinary treats audio as video

    return {
      folder: 'memory-keeper',
      resource_type,
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`
    };
  },
});
```
This approach avoids saving temporary files on the Node.js server disk, which is crucial for deployments on serverless or ephemeral file system environments like Heroku or Vercel Serverless Functions.

### 5.1.3 MongoDB Aggregation Framework
The "On This Day" feature was one of the most complex queries to implement. Traditional `find()` operations cannot perform cross-year date matching efficiently. The solution utilizes MongoDB's Aggregation Pipeline:

```javascript
const pipeline = [
  { $match: { userId: req.user.uid, isDeleted: false } },
  {
    $addFields: {
      memMonth: { $month: "$date" },
      memDay:   { $dayOfMonth: "$date" },
      memYear:  { $year: "$date" }
    }
  },
  {
    $match: {
      memMonth: todayMonth,
      memDay: todayDay,
      memYear: { $lt: currentYear } // Only past years
    }
  },
  { $addFields: { yearsAgo: { $subtract: [currentYear, "$memYear"] } } },
  { $sort: { date: -1 } }
];
```
This pipeline dynamically extracts the month and day from every stored memory, compares them to today's date, and calculates exactly how many years ago the memory occurred.

### 5.1.4 Full-Text Search Implementation
A compound text index was created on the `Memory` schema:
`MemorySchema.index({ title: 'text', description: 'text', tags: 'text' });`

The search route combines this text search with standard field filters (mood, date range):
```javascript
let query = { userId: req.user.uid, isDeleted: false };

// 1. Text Search
if (q) {
  query.$text = { $search: q };
}

// 2. Exact Mood Filter
if (mood) query.mood = mood;

// 3. Date Range Filter
if (startDate || endDate) {
  query.date = {};
  if (startDate) query.date.$gte = new Date(startDate);
  if (endDate)   query.date.$lte = new Date(endDate);
}
```

## 5.2 Frontend Implementation

### 5.2.1 Global Authentication State
The `AuthContext.js` uses React Context and the `useEffect` hook to listen to Firebase authentication state changes via `onAuthStateChanged`. This eliminates the need for Redux while providing the necessary state (`currentUser`, `loading`) to all components.

To ensure the backend always receives valid tokens, the Context exposes a `getToken()` method that forces a token refresh if the current token is close to expiry.

### 5.2.2 Axios Interceptors
Instead of manually attaching the Bearer token to every API call, an Axios request interceptor automatically injects the token.

```javascript
apiClient.interceptors.request.use(async (config) => {
  const token = await auth.currentUser?.getIdToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```
This centralizes network security and ensures no protected route is accidentally called without authentication.

### 5.2.3 Custom CSS Design System
Instead of relying on heavy CSS frameworks like Bootstrap or Tailwind, the project uses a custom, Vanilla CSS design system based on CSS Variables (`var(--primary)`, `var(--space-4)`).

Key features of the design system:
1. **Glassmorphism**: Achieved using `background: rgba(...)` combined with `backdrop-filter: blur(12px)`.
2. **Fluid Typography**: Headings use `clamp()` to scale smoothly between mobile and desktop.
3. **Animations**: Custom `@keyframes` for `fade-in`, `scale-in`, and `pulse-glow` are applied via utility classes (e.g., `.animate-fade-in`).

### 5.2.4 Media Uploader Component
The `MediaUploader` component handles drag-and-drop file selection. The implementation challenge was tracking individual upload progress for multiple files simultaneously.

This was solved by updating a `progress` state array using Axios's `onUploadProgress`:
```javascript
const uploadFile = async (file) => {
  // ... formData setup ...
  const res = await axios.post('/api/upload/single', formData, {
    onUploadProgress: (evt) => {
      const pct = Math.round((evt.loaded * 100) / evt.total);
      updateFileProgress(file.name, pct);
    }
  });
};
```

## 5.3 Testing and Debugging

During implementation, several bugs were identified and resolved:
1. **Firebase Admin Initialization Crash**: If the `.env` private key was improperly formatted (missing newline replacements), the Node.js server crashed on startup. **Fix**: Replaced raw string newlines using `.replace(/\\n/g, '\n')` and wrapped initialization in a `try/catch` block.
2. **Cloudinary Audio Rejection**: Cloudinary expects audio files to be uploaded with `resource_type: 'video'` or `'raw'`, rejecting them if marked as `'auto'` or `'image'`. **Fix**: Added dynamic MIME-type checking in the Multer configuration to force `resource_type: 'video'` for audio files.

---

# CHAPTER 6: CONCLUSION AND FUTURE WORK

## 6.1 Conclusion

The Memory Keeper capstone project successfully demonstrates the design, architecture, and implementation of a modern, full-stack web application. By integrating React.js, Node.js, Express, MongoDB, Firebase, and Cloudinary, the system achieves a robust separation of concerns, high performance, and a secure, privacy-first user experience.

The application fulfills all original objectives:
1. Providing a secure, authenticated environment for users.
2. Permitting the upload of rich media (photos, videos, audio recordings).
3. Implementing advanced querying capabilities (Full-text search, mood filtering, date ranges).
4. Creating an engaging "On This Day" retrospective feature using complex MongoDB aggregations.
5. Delivering a responsive, aesthetically premium user interface.

Through overcoming realistic constraints — including free-tier storage limits, CORS policies, and token expirations — the project models best practices for modern cloud-native development.

## 6.2 Future Work

While the current implementation is fully functional, several extensions are proposed for future development:

1. **AI-Powered Capabilities**:
   - **Auto-Tagging**: Integrate a Vision AI API (e.g., Google Cloud Vision) to automatically generate tags based on uploaded image content.
   - **Memory Summarization**: Use Large Language Models (LLMs) to generate weekly or annual summaries of the user's emotional journey based on their descriptions and mood tags.

2. **Mobile Application**:
   - Develop a native mobile application using Flutter or React Native to enable offline caching, push notifications (e.g., "You have 3 memories to look back on today!"), and direct integration with the mobile device's camera.

3. **End-to-End Encryption (E2EE)**:
   - Enhance privacy by encrypting the `description` and `title` fields on the client side before sending them to the MongoDB database, ensuring that even database administrators cannot read personal entries.

4. **Social Sharing Options**:
   - Add the ability to generate secure, time-limited, read-only links to specific memories so they can be securely shared with close friends or family without making the memory entirely public.

---
*End of Report*
