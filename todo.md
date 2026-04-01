# TRASHit - Project TODO

## Design System & Global Setup
- [x] Nunito font via Google Fonts in index.html
- [x] TailwindCSS custom theme: #4CAF50 primary, #81C784 accent, #F9FAFB bg, #1F2937 text
- [x] Global CSS variables and border-radius: 16px
- [x] PWA manifest.json with icons and theme color
- [x] Smooth fade/slide page transition animations

## Language System
- [x] LanguageContext with Bulgarian (default) and English
- [x] Full translation map (BG/EN) for all UI strings
- [x] Language switcher button in header (БГ/EN)
- [x] Persist language preference in localStorage

## Database Schema
- [x] Extend users table with: role (client/worker/admin), credits, phone
- [x] Settings table for admin-editable contact info (phone, email)
- [x] Run migration via webdev_execute_sql

## Authentication & Roles
- [x] Client self-registration flow
- [x] Worker account creation by admin only
- [x] Admin login with username/password (separate from OAuth)
- [x] Role-based route guards

## Home Page
- [x] Header: TRASHit logo + language switcher (БГ/EN)
- [x] Account section: show name + credits if logged in, or login/register prompt
- [x] Main menu cards: 🗑️ Изхвърляне на отпадъци, 🧹 Почистване
- [x] Fixed footer: worker icon (left), admin icon (right), contact info (center)
- [x] Footer contact: trashit.bg@gmail.com + editable phone

## Service Pages (Placeholder)
- [x] Waste Disposal page (placeholder structure)
- [x] Cleaning page (placeholder structure)

## Auth Pages
- [x] Client Login/Register page
- [x] Admin Login page (username + password)

## Worker Portal
- [x] Worker portal page (accessible via footer icon)
- [x] Worker login page

## Admin Portal
- [x] Admin portal page (accessible via footer icon)
- [x] Contact info editor (phone number)
- [x] Worker account creation form

## Tests
- [x] Vitest tests for language context
- [x] Vitest tests for role-based auth procedures

## Auth System (Prompt 2)

### Database Schema Extensions
- [x] Extend users table: phone, address fields (квартал, блок, вход, етаж, апартамент), credits_standard, credits_recycling, is_first_login
- [x] Create workers table: uid, name, username, password_hash, active_districts, device_tokens, created_by_admin, must_change_password, is_active
- [x] Create admin_config table: username, password_hash, default_blocked
- [x] Run migration

### Server Procedures
- [x] Client register with email/password (+ 2 bonus credits)
- [x] Client login with email/password
- [x] Social login stubs (Google, Facebook) via OAuth redirect
- [x] Worker login with username/password
- [x] Worker first-login password change (forced)
- [x] Worker device token management (max 4 devices)
- [x] Admin login with username/password
- [x] Admin change credentials (auto-block default admin/admin)
- [x] Get/update user profile (address, phone)

### Client Auth UI
- [x] Login/Register page with tabs: Google, Facebook, Email, Phone
- [x] Email registration form with validation
- [x] Phone registration form with validation
- [x] Show bonus 2 credits on first registration
- [x] Form validation with Bulgarian error messages

### Worker Auth UI
- [x] Worker login page (from footer left icon)
- [x] First-login forced password change form
- [x] Worker dashboard access after login

### Admin Auth UI
- [x] Admin login page (from footer right icon) — small, discreet
- [x] Admin credential change form (username + password)
- [x] Auto-block default admin/admin after credential change

### User Profile
- [x] Profile page with name, email, phone, address
- [x] Address fields: квартал, блок, вход, етаж, апартамент
- [x] Credits display (standard + recycling)
- [x] Edit profile with save button
- [x] Address edit with dedicated "Смени" button

### Translations
- [x] Add all new auth strings to BG/EN translations

## Waste Disposal Feature (Prompt 3)

### Database Schema
- [x] requests table: id, type, status, userId, description, district, blok, vhod, etaj, apartament, phone, email, gpsLat, gpsLng, imageUrl, estimatedVolume, creditsUsed, createdAt, completedAt, workerId
- [x] districts table: id, name, isActive (admin-managed)
- [x] Run migration

### Server Procedures
- [x] requests.create — create new waste disposal request, deduct credits
- [x] requests.myList — list current user's requests
- [x] requests.listGrouped — grouped by district→blok→vhod→apartament (worker/admin)
- [x] requests.complete — mark single request as completed (worker)
- [x] requests.completeByEntrance — complete all requests from same entrance (worker)
- [x] requests.listAll — admin view all requests
- [x] districts.list — public list of active districts
- [x] districts.manage — admin CRUD for districts
- [x] waste.estimateVolume — placeholder LLM vision volume estimation

### Waste Disposal UI
- [x] Waste type selection screen (4 types with icons and descriptions)
- [x] Standard waste form: warning message, 1 credit deduction
- [x] Recycling waste form: 3 bags = 1 recycling credit
- [x] Non-standard waste form: image upload + volume estimation placeholder
- [x] Construction waste form: image upload + volume estimation placeholder
- [x] Request form: auto-fill from user profile (address, phone/email)
- [x] District dropdown (admin-approved only)
- [x] GPS location button (optional, shows coords to worker/admin only)
- [x] Phone OR email validation (at least one required)
- [x] Confirmation dialog with credit cost warning
- [x] My requests list page

### Worker/Admin View
- [x] Grouped requests view: district → blok → vhod → apartament
- [x] Complete single request button
- [x] Complete entire entrance button (completes all in same entrance)
- [x] GPS navigation links (Google Maps / Waze / Apple Maps)
- [x] Show image and estimated volume for non-standard/construction waste

### Translations
- [x] Add all waste disposal strings to BG/EN translations

## Cleaning Feature + Credits System (Prompt 4)

### Database Schema
- [ ] cleaning_requests table: id, type (entrances/residence/other), userId, status, floors, aptsPerFloor, rooms, sqm, residenceType, requirements, description, imageUrl, proposedPrice, estimatedVolume, createdAt
- [ ] transactions table: id, userId, type (purchase/transfer_in/transfer_out/deduction), creditType, amount, bonusAmount, totalAmount, stripeSessionId, transferToUserId, note, createdAt
- [ ] Run migration

### Server Procedures
- [ ] cleaning.create — create cleaning inquiry (no credits deducted)
- [ ] cleaning.myList — list user's cleaning requests
- [ ] cleaning.listAll — admin view all cleaning requests
- [ ] credits.packages — return credit package definitions
- [ ] credits.createCheckout — create Stripe Checkout session
- [ ] credits.webhook — handle Stripe webhook, add credits on success
- [ ] credits.transfer — transfer credits to another user by email
- [ ] credits.history — return user's transaction history

### Cleaning UI
- [ ] Cleaning page: 3-option selector (entrances/residence/other)
- [ ] Entrances form: floors count, apartments per floor
- [ ] Residence form: rooms, sqm, type (apartment/house), requirements
- [ ] Other form: free description, image upload, proposed price
- [ ] Success confirmation after inquiry submitted

### Credits UI
- [ ] Credits page accessible from user profile/home
- [ ] Standard credits package cards (1/10+2/20+5) with "save X" badges
- [ ] Recycling credits package cards (1/10+1/20+3) with "save X" badges
- [ ] Stripe Checkout redirect on purchase
- [ ] Success/cancel return pages after Stripe payment
- [ ] Credit transfer form: amount + search by email
- [ ] Transfer confirmation dialog
- [ ] Transaction history list

### Admin Panel Updates
- [ ] Admin: add/deduct credits for specific user (manual)
- [ ] Admin: view cleaning requests in new tab
- [ ] Admin: view all transactions

### Stripe Integration
- [ ] webdev_add_feature stripe setup
- [ ] Stripe Checkout session creation procedure
- [ ] Stripe webhook handler for payment success
- [ ] Auto-add credits on successful payment with bonus calculation

### Tests
- [ ] Tests for cleaning.create procedure
- [ ] Tests for credits.transfer validation
- [ ] Tests for credit package calculations

## Admin Panel (Prompt 5)

### Database
- [ ] worker_problems table: id, workerId, workerName, requestId, imageUrl, description, status, adminNotes, createdAt
- [ ] Add accessStatus field to requests table (none/pending/granted)
- [ ] Seed all Sofia districts (full list of neighborhoods)
- [ ] Run migration

### Server Procedures
- [ ] workers.listWithStats: list workers with completed request counts
- [ ] workers.deactivate: admin deactivate worker
- [ ] workers.delete: admin delete worker
- [ ] problems.report: worker reports problem with image + description
- [ ] problems.list: admin lists all problem reports
- [ ] problems.resolve: admin marks problem as resolved
- [ ] problems.forwardToClient: admin forwards problem to client
- [ ] requests.updateAccess: admin updates access status for block/entrance
- [ ] admin.changeCredentials: change admin username + password

### Admin Panel UI (Full Rebuild)
- [ ] Tab 1: Workers — create, deactivate, delete, view stats per worker
- [ ] Tab 2: Districts — all Sofia districts, green/red toggle, one-click approve
- [ ] Tab 3: Blocks/Access — list blocks from active requests, red if no access, contact client
- [ ] Tab 4: Credits — add/remove credits per user, full transaction history
- [ ] Tab 5: Requests — grouped active requests (district→block→entrance), completed requests
- [ ] Tab 6: Content — edit credit package descriptions/prices, edit contact phone
- [ ] Tab 7: Problems — list worker problem reports with images, resolve, forward to client
- [ ] Admin credential change form (username + password)
- [ ] Notifications badge for new unresolved problems

### Worker Portal Updates
- [ ] Problem reporting form: image upload + description
- [ ] Show problem submission confirmation

### Translations
- [ ] Add all new admin panel strings to BG/EN translations

## Worker Panel + Notifications + PWA (Prompt 6)

### Database
- [x] worker_districts table: workerId, districtId (worker district preferences)
- [x] Run migration

### Server Procedures
- [x] workers.setDistricts — worker saves preferred districts
- [x] workers.getMyDistricts — get worker's preferred districts
- [x] requests.listForWorker — filtered by worker's selected districts
- [x] requests.completeWithGps — complete request with GPS coordinates (100m radius check)
- [x] notifications via notifyOwner on complete/problem/new request

### Worker Login Page (/worker/login)
- [x] Full worker login form with username + password
- [x] First-login forced password change
- [x] Device session stored in localStorage
- [x] Redirect to /worker after login

### Worker Panel (/worker)
- [x] District selector: checkboxes for active districts, save preferences
- [x] Grouped requests filtered by worker's districts
- [x] Each request card: type badge, address, image, volume, contact info
- [x] Navigation links (Google Maps / Waze) per request
- [x] GPS-based complete button (100m radius check)
- [x] Complete all from entrance (GPS check)
- [x] Problem report button per request (inline form)
- [x] Real-time polling every 30s

### PWA Configuration
- [x] manifest.json: name, short_name, theme_color #4CAF50, standalone display
- [x] Service worker (sw.js): cache shell for offline
- [x] Install prompt component (mobile, shows after delay)
- [x] iOS meta tags: apple-mobile-web-app-capable, apple-touch-icon
- [x] Android meta tags: theme-color, mobile-web-app-capable
- [x] Offline fallback page

### Final Polish
- [x] All pages responsive on mobile (375px+)
- [x] All buttons border-radius 16px verified
- [x] Smooth page transitions working
- [x] Bulgarian default, English toggle working
- [x] Footer worker (left) / admin (right) icons correct

### Tests
- [x] Tests for worker district selection
- [x] Tests for GPS-based completion validation
- [x] Tests for notification triggers

## Minor UI Fixes
- [x] Add back button (top-left) on /waste-disposal page linking to home

## Bug Fixes
- [x] Fix admin login: redirect to /admin after successful login (currently stays on same page)
- [x] Fix admin token localStorage key mismatch (trashit_admin_token vs admin_session)
- [x] Fix OAuth triggered after admin login: isolate /admin routes from Manus OAuth flow
- [x] Run database migration to create all missing tables (workers, districts, requests, etc.)
- [x] Add autocomplete=off to all login forms (worker and admin) to prevent browser auto-fill
- [x] Fix worker first-login flow: mustChangePassword step not shown after login
- [x] Add 2 bonus credits on user registration
- [x] Show credit count with coin icon instead of BGN amount
- [x] Create custom SVG coin icons for standard and recycling credits
- [x] Fix 'Подай заявка' button stays disabled even when all required fields are filled
- [x] Generate PWA icons (192x192, 512x512) with green coin + white trash bin
- [x] Update manifest.json with CDN icon URLs and correct PWA settings
- [x] Verify PWA install banner works on mobile
- [x] Fix 11 failing tests: adminProcedure cookie check in test contexts

## Push Notifications — Firebase Cloud Messaging (FCM)

- [ ] Add FCM token columns to DB: users.fcmToken, workers.fcmToken, admin_config.fcmToken
- [ ] Run DB migration for FCM token columns
- [ ] Add server helper: sendFcmNotification(token, title, body, data?)
- [ ] Add tRPC procedure: notifications.registerToken (save FCM token for current user/worker/admin)
- [ ] Wire FCM trigger on requests.create: notify workers in same district + notify admin
- [ ] Wire FCM trigger on requests.complete / completeWithGps: notify client + notify admin
- [ ] Wire FCM trigger on problems.report: notify admin
- [ ] Client-side: firebase-messaging service worker (firebase-messaging-sw.js in public/)
- [ ] Client-side: request notification permission + get FCM token on login
- [ ] Client-side: call registerToken procedure after obtaining FCM token
- [ ] Write vitest tests for FCM notification triggers
- [x] Fix 'Подай заявка' button disabled even when all fields filled (regression after previous fix)
- [x] Fix 'No values to set' DB error when submitting waste disposal request
- [x] Show floor (Ет. X) next to apartment (Ап. Y) in worker portal active requests
- [x] Fix credits input in AdminPortal to only allow whole numbers (min=1, step=1)
- [x] Fix 'Too small' error on deduct credits — add balance check, show Bulgarian error if insufficient credits
- [x] Show both standard and recycling credits in header (🗑️ X стандартни ♻️ Y рециклиращи)
- [x] Sort entrances by Bulgarian alphabet order in worker portal
- [x] Auto-convert numeric entrance input to Bulgarian letter (1→А, 2→Б, etc.) in waste disposal form
- [x] Show reported problems in Admin panel Problems tab (description, photo, address)
- [x] Mark problem requests in red in WorkerPortal, WorkerRequests, and AdminPortal
- [x] Show problem notification in client My Requests page
- [x] Fix email/password login: page doesn't change after successful login (no session cookie set, no auth state refresh)
- [x] Add logout button for client accounts (in header near username)
- [x] Improve credit icons in header: larger, clearer — green coin with bin for standard, dark-green coin with T for recycling
- [x] Rearrange header right side: logout button on top, both credits side-by-side below (stacked vertically)
- [x] Firebase FCM: store secrets as env vars
- [x] Firebase FCM: install firebase package, set up service worker
- [x] Firebase FCM: add fcm_token column to users table
- [x] Firebase FCM: backend helper to send push notification via FCM Admin SDK
- [x] Firebase FCM: trigger notification on request complete and problem
- [x] Firebase FCM: notification permission prompt in client UI (FCMProvider + useFCMNotifications hook)
- [x] Fix FCM: service worker not registering correctly, permission dialog not shown
- [x] Save address dialog after request submission (Да/Не)
- [x] Auto-fill address from profile on next request
- [x] Address view/edit section in UserProfile page (already existed, improved with districts dropdown)
- [x] Fix FCM: VITE_FIREBASE_PROJECT_ID and other env vars missing at runtime (getMessaging fails)
- [x] Refund credit when client cancels/deletes a request
- [x] Fix FCM: notification permission dialog not shown on first login (added Bell button in header)
- [x] Generate new high-res PWA icon (512x512) with narrower centered trash bin
- [x] Update manifest.json with new 192x192 and 512x512 icons
- [x] Fix PWA icon: copy icons to public/ folder so they work after reinstall
- [x] Fix FCM push notifications: added denied-state UI with instructions to unblock in browser settings
- [x] Service Worker auto-update: reload app automatically when new version is deployed
- [x] SW update banner: show 'Налична е нова версия' toast with 'Обнови' button
- [x] usePWA: expose updateAvailable state and triggerUpdate function
- [x] Verify: icon-192.png and icon-512.png physically present in client/public/
- [x] Verify: notification button (ИЗВЕСТИЯ/БЛОКИРАНИ) present in Home.tsx header
- [x] Verify: UpdateBanner component present and wired in App.tsx
- [ ] Fix SW: clear old caches on activate, SKIP_WAITING on Обнови click, bump cache version to v3

## Service Worker Cache Fix

- [x] Bump SW cache version from trashit-v2 to trashit-v3
- [x] Switch from cache-first to network-first strategy for all assets
- [x] Delete ALL caches (not just old ones) on SW activate event
- [x] Verify SKIP_WAITING handler exists and usePWA triggerUpdate sends it correctly

## Admin Dashboard Tab

- [x] Add admin.getDashboardStats tRPC procedure (active today, completed today, total, revenue, top districts, users, workers)
- [x] Build AdminDashboard.tsx component with stat cards
- [x] Add Dashboard as first tab in AdminPortal.tsx
- [x] Write vitest test for getDashboardStats procedure

## Bug Fixes (Session 4)

- [x] Fix UpdateBanner: show ONLY when real waiting SW exists, hide after "Обнови" click
- [x] Fix notification button: hide when granted, show with instructions when denied
- [x] Fix footer: Admin/Worker icons always visible even when banner is shown
