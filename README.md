# MarketFlow

Role-based web platform for the South Bend Farmers Market.  
MarketFlow supports customers, vendors, admins, and owners with event planning, booth mapping, ordering, reviews, and user management.

**Group:** Kathryn Cruz, Dan Huss, Christian Dunne

## User Stories

- As an admin, I want a `draft -> review -> publish` workflow with validation checks, so I can avoid publishing incomplete events/maps.
- As an admin, I want suggested booth assignments based on vendor category and past layout, so I can build maps faster with fewer manual edits.
- As a customer, I want event filters by date/category and map search by vendor name/booth, so I can quickly find who I need on market day.
- As a vendor, I want to be notified when I'm assigned or reassigned to a booth or event, so I can prepare inventory and staffing early.

## What The App Does

### Customer experience

- Browse upcoming market events and a visual market map
- Filter events by date window and vendor category
- Search maps by vendor name/slug and booth ID
- View vendor profiles, tags, menus, and reviews
- Place pre-orders with inventory-aware checkout
- Track order history and status
- Manage personal profile details

### Vendor experience

- Access vendor dashboard tabs for orders, menu, earnings, and events
- Manage menu items and inventory counts
- View assigned booth/event schedule
- Receive event assignment, booth assignment, reassignment, and removal notifications in dashboard
- Edit vendor profile and business details

### Admin experience

- Create and edit market events
- Use event publishing workflow with validation gates:
  - `draft -> review -> published`
  - publish is only available after an event is sent to review
  - publish blocks for missing core details, no booth map, map overlaps, or unknown assigned vendors
  - selected vendors do **not** all need booth assignments to publish
- Build booth layouts with the advanced map editor:
  - draw/select modes
  - multi-select and box-select
  - drag, resize handles, duplicate, rotate
  - quick vendor assignment (`/` shortcut)
  - smart assignment suggestions (vendor category + prior event layout)
  - supports vendors assigned to multiple booths
  - overlap warnings
  - undo/redo
  - zoom/fit/full-screen and mini navigator
  - local draft autosave while editing
- Manage vendors and vendor-to-user linking
- Review and process vendor applications
- Moderate reviews
- View analytics dashboard

### Owner experience

- Manage all users and roles
- Delete users (with protections for owner account safety)

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- npm (comes with Node.js)
- A [Back4App](https://www.back4app.com/) account with the MarketFlow app configured

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/kcruz3/MarketFlow
cd MarketFlow
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root of the project (same folder as `package.json`):

```
REACT_APP_B4A_APP_ID=your_back4app_app_id
REACT_APP_B4A_JS_KEY=your_back4app_js_key
```

> **Note:** The `.env` file is not committed to the repository — it's in `.gitignore` to keep the Back4App keys private. Each team member needs to create their own `.env` locally. To get the keys, reach out to Kathryn who has Back4App admin access. **Never commit the `.env` file to GitHub.**

### 4. Start the development server

```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Command | Description |
|---|---|
| `npm start` | Runs the app in development mode |
| `npm run build` | Builds the app for production |
| `npm test` | Runs the test suite |

## Project Structure

```
cloud/
└── main.js           # Parse Cloud Functions

src/
├── components/
│   ├── admin/        # Admin tools (event modal, vendor table, advanced map editor)
│   ├── consumer/     # Customer components (market map, checkout, reviews)
│   └── Icons.tsx     # Shared icon components
├── context/
│   └── AuthContext.tsx
├── hooks/            # Parse-backed data hooks
├── lib/
│   ├── parse.ts      # Parse/Back4App initialization
│   └── marketEvents.ts
├── pages/
│   ├── admin/        # Admin pages (events, vendors, approvals, analytics, reviews)
│   ├── auth/         # Login and signup pages
│   ├── consumer/     # Map, vendors, vendor detail, order history
│   ├── vendor/       # Vendor dashboard/profile/apply
│   ├── owner/        # Owner user management
│   ├── account/      # Profile page
│   └── public/       # Welcome/landing page
├── App.tsx           # Routes
└── styles.css        # Global styles
```

## User Roles

| Role | Access |
|---|---|
| `owner` | Owner-only user management + inherited admin access |
| `admin` | Manage events, booth maps, vendors, applications, analytics, reviews |
| `vendor` | Vendor dashboard, menu/inventory management, profile management, assignments |
| `customer` | Browse events/vendors, place orders, leave reviews, manage profile |

Roles are managed in Back4App under the `Role` class.

## Routes (High-Level)

- Public/Auth: `/welcome`, `/login`, `/signup`, `/vendor/apply`
- Customer: `/`, `/vendors`, `/vendors/:slug`, `/orders`, `/profile`
- Vendor: `/vendor/dashboard`, `/vendor/profile`
- Admin: `/admin`, `/admin/vendors`, `/admin/events`, `/admin/applications`, `/admin/analytics`, `/admin/reviews`
- Owner: `/owner/users`

## Parse Data Model

The app uses the following Parse classes:

- `Vendor` — vendor roster (`isActive: true` required to appear in app)
- `MarketEvent` — market event dates and booth maps
- `VendorNotification` — vendor assignment/reassignment notifications
- `Review` — customer reviews per vendor
- `Order` — customer orders
- `MenuItem` — vendor menu items

Make sure Public Read access is enabled on `Vendor` and `MarketEvent` for unauthenticated browsing.

## Cloud Functions (`cloud/main.js`)

Implemented functions:

- `deleteReviewAsAdmin`
- `getAllUsers`
- `deleteUserAsOwner`
- `getUsersForVendorLinking`
- `createVendorAsAdmin`
- `linkVendorToUser`
- `updateMyProfile`
- `createOrderWithInventory`
- `updateEventWorkflowStatus`
- `notifyVendorAssignmentChanges`

Key reason for Cloud Code:

- Enforce role checks and secure owner/admin workflows
- Enforce the event workflow sequence server-side
- Reserve and decrement inventory server-side at checkout
- Create vendor event/booth assignment notifications with per-vendor ACLs
- Keep sensitive operations out of client-only logic

To deploy it to Back4App:

1. Install the Back4App CLI:

```bash
npm install -g b4a-cli
```

2. Log in and link this folder to your Back4App app:

```bash
b4a configure accountkey
b4a new
```

3. Deploy the `cloud/` folder:

```bash
b4a deploy
```

Back4App’s docs say `b4a deploy` uploads your `cloud/` and `public/` folders, and Cloud Functions belong in `cloud/main.js`. Sources: [Back4App CLI docs](https://www.back4app.com/docs/platform/command-line-interface), [Back4App migration guide](https://www.back4app.com/parse-migration).
