# Project Context: IPL Payment System (MVP)

Dokumen ini berfungsi sebagai panduan utama bagi Claude Code dalam mengimplementasikan aplikasi manajemen pembayaran IPL Perumahan.

## 1. Tech Stack (Core)
- **Frontend:** React/Next.js (Tailwind CSS)
- **Backend:** Node.js (Express) atau Laravel (Sesuai preferensi framework)
- **Database:** Supabase
- **Storage:** Local Storage (Development) / Cloudinary (Production) untuk Bukti Transfer.
- **Node Version:** run nvm use 22 for node version activate

## 2. Struktur Database (Schema)


[Image of an entity relationship diagram for a billing system]

### Entitas & Atribut:
- `users`: id, name, email, password, role (admin, user), is_first_login (default: true).
- `house_types`: id, type_name, price (decimal).
- `houses`: id, house_number, block, house_type_id (FK), user_id (FK).
- `payments`: id, user_id (FK), house_id (FK), amount_months, total_amount, proof_path, status (pending, approved, rejected), created_at.

## 3. Aturan Bisnis Penting (Crucial Rules)
1. **Perhitungan Harga:** Total bayar harus dihitung di backend berdasarkan `house_types.price` * `amount_months`. Jangan mengandalkan kalkulasi sisi client untuk keamanan.
2. **Autentikasi:** - Admin membuat user.
   - User pertama kali login wajib diarahkan ke `/change-password`.
   - Akses dashboard dibatasi berdasarkan `role`.
3. **Logika Pembayaran:**
   - User memilih jumlah bulan (1-12).
   - User mengunggah file gambar (JPG/PNG).
   - Admin memvalidasi secara manual. Status default transaksi adalah `pending`.

## 4. Prioritas Implementasi (Roadmap)
1. **Sprint 1: Auth & User Management**
   - Setup Database & Migrasi.
   - Fitur Admin: CRUD User & CRUD Rumah.
   - Fitur Login & Force Change Password.
2. **Sprint 2: Master Data & Transaction**
   - Setup CRUD Tipe Rumah & Harga.
   - User Dashboard: Form upload bukti transfer & pilih jumlah bulan.
3. **Sprint 3: Approval System**
   - Admin Dashboard: List transaksi pending.
   - Fitur Approval/Rejection.
   - History pembayaran bagi User.

## 5. Instruksi Khusus Claude Code
- Gunakan pendekatan **Modular Coding**. Pisahkan Controller, Route, dan Service.
- Pastikan setiap fungsi `upload` memiliki validasi tipe file dan ukuran (max 2MB).
- Gunakan Middleware untuk mengecek `is_first_login`. Jika `true`, blokir akses ke fitur lain kecuali ganti password.
- Sertakan penanganan error (error handling) yang jelas untuk setiap API response.
- Jangan menghapus data yang sudah ada jika melakukan fixing issue.
- Selalu gunakan node version 22, aktifkan melalui nvm command

---

# Mobile-First Dashboard System Design

**IMPORTANT:** This is the standard design system for ALL dashboard implementations in this project. Follow this design system for consistency across all user-facing interfaces.

## 1. Design Philosophy

### Mobile-First Approach
- **Primary Target:** Mobile devices (375px - 428px width)
- **Layout:** Centered container with `max-w-md` for desktop viewing
- **Navigation:** Bottom tab navigation (NOT sidebar)
- **Interactions:** Touch-optimized with proper tap targets (min 44px)

### Visual Design Principles
- **Clean & Modern:** Minimal clutter, generous spacing
- **Smooth Animations:** Framer-motion for delightful interactions
- **Status-Based Colors:** Clear visual feedback for different states
- **Consistent Shadows:** Subtle depth for cards and elevation

---

## 2. Layout Structure

### Container Layout
```tsx
<div className="min-h-screen w-full bg-slate-50 flex flex-col max-w-md mx-auto relative">
  {/* Status Bar Spacer */}
  <div className="h-12 bg-white flex-shrink-0" />

  {/* Header */}
  <header className="bg-white px-4 pb-3 flex-shrink-0">
    {/* Logo + User Avatar */}
  </header>

  {/* Content Area */}
  <main className="flex-1 overflow-y-auto pb-24">
    <AnimatePresence mode="wait">
      {children}
    </AnimatePresence>
  </main>

  {/* Bottom Tab Navigation */}
  <nav className="fixed bottom-0 ...">
    {/* 4 Tabs */}
  </nav>
</div>
```

### Header Design
```tsx
<header className="bg-white px-4 pb-3 flex-shrink-0">
  <div className="flex items-center justify-between">
    {/* Logo Section */}
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
        <HomeIcon className="w-4 h-4 text-white" />
      </div>
      <span className="text-sm font-bold text-slate-800">IPL Manager</span>
    </div>

    {/* User Avatar */}
    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
      <span className="text-xs font-bold text-blue-600">{initials}</span>
    </div>
  </div>
</header>
```

### Bottom Tab Navigation
**4 Tabs:** Home (Beranda), Payments (Bayar), Upload, Profile (Profil)

**Features:**
- Active tab indicator (blue line on top) with `layoutId` animation
- Scale animation (1.0 active, 0.9 inactive)
- Color transition (blue-600 active, slate-400 inactive)
- Safe area padding for notched devices

```tsx
<nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100">
  {tabs.map((tab) => (
    <Link href={tab.href}>
      {isActive && (
        <motion.div
          layoutId="tab-indicator"
          className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-full"
        />
      )}
      <motion.div animate={{ scale: isActive ? 1 : 0.9 }}>
        <Icon />
      </motion.div>
      <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>
        {tab.label}
      </span>
    </Link>
  ))}
</nav>
```

---

## 3. Design Tokens

### Colors
```css
/* Background */
--bg-page: #F8FAFC (slate-50)
--bg-card: #FFFFFF (white)

/* Primary */
--primary: #2563EB (blue-600)
--primary-hover: #1D4ED8 (blue-700)
--primary-light: #EFF6FF (blue-50)

/* Status Colors */
--success: #10B981 (emerald-500)
--success-bg: #ECFDF5 (emerald-50)
--success-text: #059669 (emerald-600)

--warning: #F59E0B (amber-500)
--warning-bg: #FEF3C7 (amber-50)
--warning-text: #D97706 (amber-600)

--danger: #EF4444 (red-500)
--danger-bg: #FEE2E2 (red-50)
--danger-text: #DC2626 (red-600)

/* Neutral */
--text-primary: #0F172A (slate-900)
--text-secondary: #64748B (slate-500)
--text-tertiary: #CBD5E1 (slate-300)
--text-disabled: #94A3B8 (slate-400)
```

### Typography
```css
/* Font Family */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Font Sizes */
--text-xs: 0.75rem (12px)      /* Small labels */
--text-sm: 0.875rem (14px)     /* Body text */
--text-base: 1rem (16px)       /* Default */
--text-lg: 1.125rem (18px)     /* Section headers */
--text-xl: 1.25rem (20px)      /* Page titles */
--text-2xl: 1.5rem (24px)      /* Hero text */

/* Special Sizes */
--text-tiny: 0.625rem (10px)   /* Tab labels, badges */
--text-mini: 0.6875rem (11px)  /* Subtitles, metadata */

/* Font Weights */
--font-normal: 400
--font-medium: 500
--font-semibold: 600
--font-bold: 700
```

### Spacing
```css
/* Page Padding */
--page-padding: px-4 pt-2 pb-4

/* Section Spacing */
--section-spacing: space-y-4

/* Card Padding */
--card-padding: p-4

/* Bottom Nav Clearance */
--bottom-clearance: pb-24
```

### Rounded Corners
```css
/* Cards & Containers */
--rounded-card: rounded-2xl (16px)

/* Buttons */
--rounded-button: rounded-2xl (16px)

/* Small Elements */
--rounded-badge: rounded-full
--rounded-icon: rounded-lg (8px)
--rounded-icon-lg: rounded-xl (12px)
```

### Shadows
```css
/* Card Shadow */
--shadow-card: shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]

/* Button Shadow */
--shadow-sm: shadow-[0_1px_2px_rgba(0,0,0,0.05)]
```

---

## 4. Component Patterns

### Card Component
```tsx
<div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
  {/* Card Header (Optional) */}
  <div className="flex items-center gap-2 mb-3">
    <Icon className="w-4 h-4 text-slate-400" />
    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
      Section Title
    </p>
  </div>

  {/* Card Content */}
  <div className="space-y-3">
    {/* Content here */}
  </div>
</div>
```

### Status Badge
```tsx
<span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${bg} ${color}`}>
  {label}
</span>

// Status Configurations
const statusConfig = {
  APPROVED: { label: 'Lunas', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  PENDING: { label: 'Menunggu', color: 'text-amber-600', bg: 'bg-amber-50' },
  REJECTED: { label: 'Ditolak', color: 'text-red-600', bg: 'bg-red-50' },
};
```

### Icon Container
```tsx
{/* Small Icon (9x9) */}
<div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
  <Icon className="w-4 h-4 text-slate-400" />
</div>

{/* Medium Icon (10x10) */}
<div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
  <Icon className="w-5 h-5 text-blue-600" />
</div>

{/* Large Icon (14x14) */}
<div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
  <Icon className="w-7 h-7 text-blue-500" />
</div>
```

### List Item
```tsx
<div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
      <Icon className="w-4 h-4 text-slate-400" />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-800">Title</p>
      <p className="text-[11px] text-slate-400 mt-0.5">Subtitle</p>
    </div>
  </div>
  <div className="text-right">
    <p className="text-sm font-semibold text-slate-800">Value</p>
    <StatusBadge />
  </div>
</div>
```

### Button Styles
```tsx
{/* Primary Button */}
<button className="w-full bg-blue-600 text-white rounded-2xl p-4 flex items-center justify-center gap-2.5 font-semibold text-sm active:scale-[0.98] transition-transform duration-150">
  <Icon className="w-4.5 h-4.5" />
  Button Text
</button>

{/* Secondary Button */}
<button className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-white rounded-lg px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
  <Icon className="w-3.5 h-3.5" />
  Button Text
</button>

{/* Disabled State */}
<button disabled className="bg-slate-100 text-slate-300 cursor-not-allowed">
  Button Text
</button>
```

---

## 5. Animation Patterns

### Page Transitions (framer-motion)
```tsx
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

<AnimatePresence mode="wait">
  <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
    {children}
  </motion.div>
</AnimatePresence>
```

### Stagger Children
```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

<motion.div variants={containerVariants} initial="hidden" animate="visible">
  <motion.div variants={itemVariants}>Card 1</motion.div>
  <motion.div variants={itemVariants}>Card 2</motion.div>
  <motion.div variants={itemVariants}>Card 3</motion.div>
</motion.div>
```

### Tab Indicator Animation
```tsx
{isActive && (
  <motion.div
    layoutId="tab-indicator"
    className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-full"
    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
  />
)}
```

### Button Press Effect
```tsx
<button className="active:scale-[0.98] transition-transform duration-150">
  Button
</button>
```

### Success Animation
```tsx
<AnimatePresence mode="wait">
  {isSuccess ? (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="bg-emerald-500 ..."
    >
      Success Message
    </motion.div>
  ) : (
    <motion.button key="button" ...>Submit</motion.button>
  )}
</AnimatePresence>
```

---

## 6. Screen Templates

### Home Screen Structure
```tsx
<motion.div className="px-4 pt-2 pb-4 space-y-4" variants={containerVariants}>
  {/* 1. Greeting Section */}
  <motion.div variants={itemVariants}>
    <p className="text-sm text-slate-500">{greeting} 👋</p>
    <h1 className="text-xl font-bold text-slate-900">{userName}</h1>
  </motion.div>

  {/* 2. Primary Info Card */}
  <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 shadow-...">
    {/* House info, status, etc. */}
  </motion.div>

  {/* 3. Status Card */}
  <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 shadow-...">
    {/* Payment status */}
  </motion.div>

  {/* 4. Summary Card (with chart) */}
  <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 shadow-...">
    {/* Financial summary + recharts */}
  </motion.div>

  {/* 5. Primary Action Button */}
  <motion.div variants={itemVariants}>
    <button className="w-full bg-blue-600 ...">Upload Bukti Bayar IPL</button>
  </motion.div>

  {/* 6. Recent Activity List */}
  <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 shadow-...">
    {/* List of recent items */}
  </motion.div>
</motion.div>
```

### List Screen Structure
```tsx
<motion.div className="px-4 pt-2 pb-4 space-y-4" variants={containerVariants}>
  {/* Header */}
  <motion.div variants={itemVariants}>
    <h1 className="text-xl font-bold text-slate-900">Page Title</h1>
    <p className="text-sm text-slate-400 mt-0.5">Subtitle</p>
  </motion.div>

  {/* Summary Card */}
  <motion.div variants={itemVariants} className="bg-blue-600 rounded-2xl p-4 text-white">
    {/* Highlighted summary */}
  </motion.div>

  {/* Filter Row (Optional) */}
  <motion.div variants={itemVariants} className="flex items-center gap-2">
    <button>Filter</button>
    <button>Download</button>
  </motion.div>

  {/* Data List */}
  <motion.div variants={itemVariants} className="bg-white rounded-2xl ...">
    {items.map((item, index) => (
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 + index * 0.04 }}
      >
        {/* List item */}
      </motion.div>
    ))}
  </motion.div>
</motion.div>
```

### Form Screen Structure
```tsx
<motion.div className="px-4 pt-2 pb-4 space-y-4" variants={containerVariants}>
  {/* Header */}
  <motion.div variants={itemVariants}>
    <h1 className="text-xl font-bold text-slate-900">Form Title</h1>
    <p className="text-sm text-slate-400 mt-0.5">Description</p>
  </motion.div>

  {/* Form Section 1 */}
  <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 shadow-...">
    {/* Form fields */}
  </motion.div>

  {/* Form Section 2 */}
  <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 shadow-...">
    {/* More form fields */}
  </motion.div>

  {/* Interactive Section (Upload, Select, etc.) */}
  <motion.div variants={itemVariants}>
    <AnimatePresence mode="wait">
      {/* Dynamic content */}
    </AnimatePresence>
  </motion.div>

  {/* Submit Button */}
  <motion.div variants={itemVariants}>
    <AnimatePresence mode="wait">
      {isSuccess ? <SuccessState /> : <SubmitButton />}
    </AnimatePresence>
  </motion.div>
</motion.div>
```

---

## 7. Data Visualization

### Bar Chart (recharts)
```tsx
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';

<div className="h-[120px] -mx-1">
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} barGap={2} barCategoryGap="20%">
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
      <XAxis
        dataKey="month"
        axisLine={false}
        tickLine={false}
        tick={{ fontSize: 10, fill: '#94A3B8' }}
        dy={4}
      />
      <YAxis hide />
      <Bar dataKey="income" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={14} />
      <Bar dataKey="expense" fill="#BFDBFE" radius={[4, 4, 0, 0]} maxBarSize={14} />
    </BarChart>
  </ResponsiveContainer>
</div>

{/* Legend */}
<div className="flex items-center justify-center gap-4 mt-2">
  <div className="flex items-center gap-1.5">
    <div className="w-2 h-2 rounded-full bg-blue-500" />
    <span className="text-[10px] text-slate-400">Pemasukan</span>
  </div>
  <div className="flex items-center gap-1.5">
    <div className="w-2 h-2 rounded-full bg-blue-200" />
    <span className="text-[10px] text-slate-400">Pengeluaran</span>
  </div>
</div>
```

---

## 8. Responsive Behavior

### Breakpoints
- **Mobile:** 375px - 428px (primary target)
- **Tablet:** 768px+ (centered max-w-md)
- **Desktop:** 1024px+ (centered max-w-md)

### Layout Adjustments
```tsx
{/* Mobile-first, desktop centered */}
<div className="max-w-md mx-auto">
  {/* Content constrained to mobile width on desktop */}
</div>

{/* Responsive grid */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
  {/* 2 cols on mobile, 4 on desktop */}
</div>

{/* Responsive padding */}
<div className="px-4 py-6 md:px-6 md:py-8">
  {/* Smaller padding on mobile */}
</div>
```

---

## 9. Implementation Checklist

When creating a new dashboard screen, ensure:

- [ ] Use mobile-first layout (max-w-md mx-auto)
- [ ] Implement bottom tab navigation (NOT sidebar)
- [ ] Apply consistent spacing (px-4 pt-2 pb-4 space-y-4)
- [ ] Use rounded-2xl for all cards
- [ ] Apply proper shadow (shadow-[0_1px_3px...])
- [ ] Implement framer-motion animations (container + item variants)
- [ ] Use status-based color coding (emerald/amber/red)
- [ ] Add active:scale-[0.98] to buttons
- [ ] Include AnimatePresence for conditional rendering
- [ ] Use proper icon sizes (w-4 h-4 for 9x9, w-5 h-5 for 10x10)
- [ ] Apply text sizing consistently (text-sm body, text-xl titles)
- [ ] Add loading states with proper skeletons
- [ ] Implement error handling with toast notifications
- [ ] Test on mobile viewport (375px - 428px)
- [ ] Ensure safe area padding for notched devices

---

## 10. Common Mistakes to Avoid

❌ **DON'T:**
- Use sidebar navigation on user dashboard
- Mix different rounded corner values
- Use arbitrary spacing (stick to space-y-4, gap-3, etc.)
- Forget AnimatePresence for conditional renders
- Use different shadow values
- Hardcode colors (use design tokens)
- Skip loading states
- Use non-mobile-first approach

✅ **DO:**
- Use bottom tab navigation consistently
- Apply rounded-2xl to all cards
- Use consistent spacing scale
- Wrap conditional renders with AnimatePresence
- Use the defined shadow tokens
- Reference design token colors
- Implement proper loading/error states
- Design for mobile first, enhance for desktop

---

This mobile-first design system ensures consistency, performance, and excellent UX across all dashboard screens. Follow these patterns for all future implementations.