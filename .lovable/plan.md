

# Plan: Premium Homepage Animations + Role-Based Admin Access Control

## Part 1: Premium Homepage Redesign with Dynamic Animations

### Current State
The homepage uses basic Framer Motion `fadeInUp` animations and simple hover effects. It looks functional but not "breathtaking."

### Changes

**A. Enhanced Animation System** (`src/pages/Index.tsx`)
- Add staggered children animations for card grids (cards cascade in with slight delays)
- Add parallax-style scroll effects on the hero section background gradients
- Add a subtle floating particle/gradient orb effect behind the hero text
- Add smooth `whileHover` 3D tilt/lift effects on course cards and instructor cards
- Add count-up number animations for stats (students, courses, etc.)
- Add a gradient border shimmer animation on the hero CTA button
- Add scroll-triggered section reveal animations with spring physics (not just linear fade)

**B. Premium Visual Polish** (`src/index.css`, `tailwind.config.ts`)
- Add glassmorphism effects (backdrop-blur + semi-transparent backgrounds) on feature cards
- Add subtle gradient mesh background sections
- Add smooth section transitions with overlapping curved dividers
- Add new keyframes: `shimmer`, `gradient-shift`, `float-slow`, `scale-bounce`
- Add a "shine" sweep animation on the CTA buttons

**C. Specific Section Upgrades**
- **Hero**: Animated gradient mesh background, larger typography with gradient text animations, floating tech logos with gentle bobbing, shimmer effect on CTA
- **Feature Cards**: Glass card effect with backdrop-blur, hover glow ring, icon pop animation on hover
- **Course Carousel**: Cards with 3D perspective tilt on hover, smoother scroll snap
- **Instructor Cards**: Hover reveals rating/stats with slide-up animation
- **Testimonials**: Smoother infinite marquee with pause-on-hover
- **CTA Section**: Animated background gradient shift, pulsing glow

**D. CourseCard Enhancement** (`src/components/CourseCard.tsx`)
- Add image zoom on hover
- Add gradient overlay on thumbnail
- Add smoother shadow transitions

---

## Part 2: Granular Role-Based Admin Access Control

### Current State
- 3 roles exist: `admin`, `moderator`, `user`
- `RequireAdmin` only checks `isAdmin` (binary)
- All admin users see all sidebar items and have full access
- Moderators exist in the DB but have no differentiated access

### Design

**Role Permissions Model:**

```text
Role         | Access
-------------|------------------------------------------
admin        | Full access to everything
moderator    | Courses, Students, Enrollments, Q&A,
             | Announcements, Quizzes, Testimonials
             | (NO access to: Users & Roles, Settings,
             | Marketing Analytics, Influencer Marketing,
             | Activity Log, Email Blasts, Pricing Plans)
user         | No admin access
```

### Changes

**A. Create Permission System** (`src/lib/admin-permissions.ts`)
- Define a `ROLE_PERMISSIONS` map that maps each role to a list of allowed admin route paths
- Export a `canAccessRoute(role, path)` helper
- Export a `getAccessibleSections(role)` to filter sidebar sections

**B. Update AuthContext** (`src/contexts/AuthContext.tsx`)
- Add `adminRole: 'admin' | 'moderator' | null` to context (instead of just boolean `isAdmin`)
- Fetch the actual role string from `user_roles` table
- Keep `isAdmin` for backward compatibility (true if role is admin OR moderator)

**C. Update RequireAdmin** (`src/components/RequireAdmin.tsx`)
- Accept optional `requiredRole?: 'admin' | 'moderator'` prop
- Add per-route permission checking using the permission map

**D. Update AdminSidebar** (`src/components/admin/AdminSidebar.tsx`)
- Filter sidebar sections based on `adminRole` using `getAccessibleSections()`
- Moderators only see their allowed sections

**E. Update AdminLayout** (`src/pages/admin/AdminLayout.tsx`)
- Check current route against user's permissions
- Redirect to admin overview if accessing unauthorized route

**F. Update App.tsx Routes**
- No route structure changes needed; permission enforcement happens in AdminLayout and RequireAdmin

### Technical Details
- No database changes needed (existing `app_role` enum already has `admin`, `moderator`, `user`)
- Permission checks are client-side for UI filtering, server-side RLS already protects data
- The `has_role` function already works for both admin and moderator roles

### Files to Create
- `src/lib/admin-permissions.ts`

### Files to Modify
- `src/pages/Index.tsx` -- premium animations
- `src/components/CourseCard.tsx` -- enhanced hover effects
- `src/index.css` -- new animation utilities
- `tailwind.config.ts` -- new keyframes
- `src/contexts/AuthContext.tsx` -- add `adminRole`
- `src/components/RequireAdmin.tsx` -- role-based check
- `src/components/admin/AdminSidebar.tsx` -- filtered sections
- `src/pages/admin/AdminLayout.tsx` -- route permission guard

