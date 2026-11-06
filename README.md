# 🎒 GS Portal - Kid-Friendly Educational File & Resource Hub

An engaging, cheerful, and gamified Educational File & Resource Portal built with **Next.js 14 (App Router, TypeScript)**, **Tailwind CSS**, **Lucide React**, and **Supabase (PostgreSQL, Supabase Auth, Storage Buckets, and Row-Level Security)**.

Designed specifically for young learners and educators, the portal pairs a vibrant, gamified UI with a teacher content manager, cascading curriculum categorization, sandboxed interactive game launcher, kid-safe media viewers, and a real-time student activity tracker.

---

## 🌟 Core Features & Architecture

### 1. Cheerful, Gamified Kid-Friendly Aesthetic
- **Playful Design System**: Rounded buttons (`btn-bouncy`), pastel & bright palette (sky blue, sunshine yellow, bubblegum pink, mint green), friendly animal avatars, and accessible big typography (Nunito & Fredoka).
- **Offline Web Audio Sound Effects**: Playful pops, star chimes, and celebration fanfare synthesized on the fly via the Web Audio API (with a one-click mute/unmute toggle in the navbar).
- **Gamified Rewards**: Student explorer stars (⭐) increment whenever materials are opened, worksheets completed, or interactive simulations played, complemented by celebratory confetti bursts!
- **Strict "Zero Dummy Content" Principle**: The database and file storage are initialized with zero mock resources or fake logs. Empty states display fun, encouraging illustrations (e.g., *"Nothing here yet! Your teacher hasn't added files to this unit."*).

---

### 2. User Roles & Authentication

#### 👩‍🏫 Teacher Role
- **Secure Authentication**: Supabase Auth (or built-in auth) with encrypted credentials and signed JWT session management via `@supabase/ssr`.
- **Seeded Default Account**: `teacher@school.edu` / `teacher123` (created via `npm run seed` or `npm run seed:supabase`).
- **Dedicated Dual-Tab Dashboard**:
  - **Tab 1: Content Manager**: Class, subject, unit, and file upload & management.
  - **Tab 2: Student Analytics**: Real-time activity tracking, roster engagement, and topic popularity.

#### 🎒 Student Role
- **Simplified Kid-Friendly Check-In**:
  1. **Select Classroom**: Colorful cards with grade icons (e.g. 🎒 *1st Grade - Space Explorers*).
  2. **Select Student**: Visual animal avatars (🦊 Toby, 🐼 Mia, 🦁 Leo, 🚀 Sam).
  3. **Enter 4-Digit PIN**: Big number keypad or 1-click classroom library entry.
- **Direct Class Routing**: Students are routed directly to their assigned classroom library without seeing other classes' materials.

---

### 3. Hierarchical Cascading Categorization & Upload Flow

Teachers organize every uploaded resource using cascading hierarchy:
$$\text{Class (Grade)} \longrightarrow \text{Subject (e.g., Science, Math)} \longrightarrow \text{Unit / Chapter (e.g., Solar System)}$$

- **File Picker**: Drag-and-drop zone and click-to-browse.
- **Automatic File-Type Detection**:
  - 📄 **PDFs**: `.pdf`
  - 🎮 **HTML5 Interactive Packages & Simulations**: `.html`, `.htm`, `.zip` (automatically unzips and locates `index.html`)
  - 🖼️ **Images**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.svg`, `.webp`
  - 🎵 **Audio Stories**: `.mp3`, `.wav`, `.ogg`, `.m4a`
  - 🎬 **Video Lessons**: `.mp4`, `.webm`, `.mov`
  - 📝 **Documents / Worksheets**: `.docx`, `.pptx`, `.xlsx`, `.txt`, `.csv`
- **File Management**: Edit title, update teacher notes, replace file, delete, or test kid view with **Live Preview**.
- **Supabase Storage**: Automatically uploads files to the Supabase Storage bucket `class-resources` with RLS policies.

---

### 4. Student Portal Experience (Class-Wise Access)

- **Class Library View**: Automatically filters materials to the student's assigned classroom.
- **Subject Cards**: Large, bouncy colorful cards with custom subject colors and icons.
- **Collapsible Unit Accordions**: Organized by chapter/topic with resource counters.
- **Dynamic File Viewers**:
  - **PDF Reader**: Embedded kid-safe viewer with zoom in/out, page scrolling, and download button.
  - **HTML5 Game Launcher**: Sandboxed `<iframe>` environment with restart, full-screen mode, and cheer confetti.
  - **Media Player**: Custom player for audio and video with visual dancing mascot, timeline scrub, speed control (0.8x story mode, 1.0x normal, 1.25x), and volume.
  - **Image Lightbox**: Responsive photo gallery with zoom and 90° rotation.
  - **Worksheet Card**: Big format badges and 1-click download button.

---

### 5. Teacher Analytics & Real-Time Student Activity Tracking

- **Real-Time Student Activity Logger**:
  Every click, view, game launch, or download triggers an event record in `access_logs` with:
  - `student_id` & `student_name`
  - `class_name`
  - `resource_id` & `resource_title`
  - `subject_name` & `unit_name` (topic)
  - `action_type` (`view`, `download`, `interact`, `complete`)
  - `accessed_at` (ISO timestamp)
- **Analytics Dashboard UI**:
  - **Class Filter**: Inspect analytics across all classrooms or class-by-class.
  - **Key Metrics Overview**: Total active students, total materials accessed, views & downloads this week, and most popular topic.
  - **Student Roster Breakdown**: Interactive cards showing materials accessed count, last active timestamp, and expandable history of exact files referenced.
  - **Topic Engagement Ranking**: Comparative distribution showing highest to lowest student engagement by unit.
  - **Live Activity Stream**: Real-time stream with automatic background synchronization.

---

## 🗄️ Supabase Database Schema & Row-Level Security (RLS)

The complete SQL migration script is located in [`supabase/schema.sql`](file:///d:/GS_PORTAL/supabase/schema.sql).

### Table Specifications & RLS Rules

1. **`profiles`**
   - Columns: `id` (references `auth.users.id` on delete cascade), `name` (text), `email` (text), `role` (`'teacher' | 'student'`), `class_id` (uuid, nullable for teachers), `avatar` (text), `stars` (int), `pin` (text), `created_at` (timestamptz).
   - **RLS Policies**:
     - Users can read their own profile.
     - Teachers can read and manage profiles of all students assigned to their classes (`is_teacher(auth.uid()) = true`).

2. **`classes`**
   - Columns: `id` (uuid default `gen_random_uuid()`), `name` (text), `grade_level` (text), `icon` (text), `color` (text), `created_by` (uuid references profiles.id), `created_at` (timestamptz).
   - **RLS Policies**:
     - Teachers can create, read, update, delete classes.
     - Students can read their assigned class (`id = get_user_class_id(auth.uid())`).

3. **`subjects`**
   - Columns: `id` (uuid), `class_id` (uuid references classes.id on delete cascade), `name` (text), `color_code` (text), `icon` (text), `created_at` (timestamptz).
   - **RLS Policies**:
     - Teachers can manage subjects.
     - Students can read subjects for their class.

4. **`units`**
   - Columns: `id` (uuid), `subject_id` (uuid references subjects.id on delete cascade), `name` (text), `description` (text), `order_index` (int), `created_at` (timestamptz).
   - **RLS Policies**:
     - Teachers can manage units.
     - Students can read units belonging to their class subjects.

5. **`resources`**
   - Columns: `id` (uuid), `unit_id` (uuid references units.id on delete cascade), `title` (text), `description` (text), `file_url` (text), `file_name` (text), `file_type` (text check in `'pdf', 'html', 'image', 'audio', 'video', 'document', 'other'`), `file_size` (bigint), `mime_type` (text), `download_count` (int), `view_count` (int), `created_by` (uuid), `created_at` (timestamptz).
   - **RLS Policies**:
     - Teachers can manage resources.
     - Students can view resources belonging to their class units.

6. **`access_logs`**
   - Columns: `id` (uuid), `student_id` (uuid references profiles.id on delete cascade), `student_name` (text), `resource_id` (uuid references resources.id on delete cascade), `resource_title` (text), `class_name` (text), `subject_name` (text), `unit_name` (text), `action_type` (text check in `'view', 'download', 'interact', 'complete'`), `accessed_at` (timestamptz).
   - **RLS Policies**:
     - Students can insert logs of their own access (`student_id = auth.uid()`).
     - Students can view their own activity logs.
     - Teachers can view all activity logs for their classes and students.

7. **Storage Bucket: `class-resources`**
   - Automatic bucket initialization with 100MB file limit.
   - Public/Signed read access for students and teachers.
   - Insert, Update, and Delete restricted to teachers via Storage RLS.

---

## 🚀 Quickstart & Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 3. Run the Supabase SQL Migration
1. Go to your [Supabase Dashboard](https://app.supabase.com) $\rightarrow$ **SQL Editor**.
2. Open [`supabase/schema.sql`](file:///d:/GS_PORTAL/supabase/schema.sql) and paste the entire script.
3. Click **Run** to set up tables, RLS policies, security definer functions, and the `class-resources` storage bucket.

### 4. Seed Default Teacher Account
Run the seed script:
```bash
npm run seed
# Or for cloud Supabase user provisioning:
npm run seed:supabase
```

Default credentials:
- **Email**: `teacher@school.edu`
- **Password**: `teacher123`

### 5. Start the Application
```bash
npm run dev
```

Visit **`http://localhost:3000`** in your browser.
