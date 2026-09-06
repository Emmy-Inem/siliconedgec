# SiliconEdgeConsulting

To build a comprehensive version of the Silicon Edge Consulting platform on Lovable, you need to look beyond the surface level. This breakdown covers the site architecture, functional requirements, and the data schema you will likely need to implement in your Supabase backend.

1. Information Architecture (The Sitemap)

To replicate this, your Lovable project should include the following routes and layouts:

 * Public Landing Page:

   * Hero Section: High-impact value proposition with a "Typewriter" effect for tech niches (AI, Cloud, DevOps).

   * Trust Bar: Logo carousel of partner companies or "Tools you will learn."

   * Value Propositions: Three-column layout focusing on "Instructor-Led," "Job Ready," and "Completion Focused."

   * Category Filter: Tabbed or button-based filtering for the course grid.

 * Course Catalog (/courses):

   * Grid view with cards showing: Thumbnail, Title, Duration, Difficulty Level, Rating, and Instructor Name.

 * Individual Course Page (/courses/:id):

   * Sticky "Enroll Now" sidebar.

   * Course syllabus (accordion style).

   * Instructor bio section.

   * "What you'll learn" checklist.

 * Student Dashboard (Protected):

   * "My Courses" view with progress bars.

   * Certificates tab for viewing/downloading PDFs.

   * Community access links (WhatsApp/Discord).

 * Business/Enterprise Page (/for-businesses):

   * Lead generation form for corporate training.

2. Functional Requirements (The "Logic")

When prompting Lovable, you will need to describe these specific behaviors:

 * Authentication Flow:

   * Email/Password and Google OAuth integration.

   * Redirect logic: If a user is logged in, the "Sign Up" button on the hero should change to "Go to Dashboard."

 * Course Enrollment System:

   * A shopping cart for multiple course purchases.

   * Payment gateway integration (e.g., Paystack for Nigerian users or Stripe for international).

   * "Enrollment" state: Use a database table to check if user_id has access to course_id.

 * Instructor-Led Coordination:

   * Integration with Zoom or Google Meet API (or simply a "Join Live Class" button that pulls a link from the database for active cohorts).

 * LMS Progress Tracking:

   * Logic to mark lessons as complete and calculate the percentage of the course finished.

   * Automatic triggering of a "Certificate Issued" state once progress reaches 100%.

3. Database Schema (Supabase/PostgreSQL)

You will need at least these four tables to make the app dynamic:

 * Profiles Table: id, full_name, avatar_url, bio, role (student/instructor).

 * Courses Table: id, title, description, category, price, difficulty, duration_hours, thumbnail_url, instructor_id.

 * Modules/Lessons Table: id, course_id, title, content_type (video/link), content_url, order_index.

 * Enrollments Table: id, user_id, course_id, payment_status, progress_percentage, is_completed.

4. UI/UX Component Details

 * Sticky Header: Must transition from transparent to a solid color on scroll.

 * Testimonial Slider: A "Marquee" or "Carousel" component. On the reference site, testimonials include a photo, name, role, and a star rating.

 * Floating Action Button (FAB): A permanent WhatsApp icon in the bottom right corner for immediate customer support.

 * Course Card Hover Effects: Subtle scaling or shadow increase when a user hovers over a course to indicate interactivity.

5. Content Strategy for the Builder

The tone of Silicon Edge is "Professional yet Accessible."

 * Keywords to use in your UI: "Job-Ready," "Live Online," "Practical Application," "Industry Veterans."

 * Course Meta-Data: Ensure every course has a specific "Beginner/Intermediate/Expert" tag, as this is a core navigation element on their site.

6. Recommended Tech Stack for the Lovable Version

 * Frontend: React (Vite) + Tailwind CSS + shadcn/ui (for the accordions and cards).

 * Backend: Supabase (Auth, Database, and Edge Functions for payment processing).

 * State Management: TanStack Query (React Query) for fetching and caching course data.

 * Icons: Lucide-React or FontAwesome (for the "SE icons" style).

If you are using Lovable's "AI Edit" feature, you can literally copy this breakdown into the prompt: "Create a multi-page EdTech platform with a Supabase backend. I need a hero section with a typewriter effect, a course catalog with filtering by 'Category' and 'Level', and a student dashboard that tracks enrollment progress."

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://siliconedgec.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/39a05b61-2976-479d-954e-83ee91469ade).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
