# MarketFlow

Admin and consumer platform for the South Bend Farmers Market.

**Group:** Kathryn Cruz, Dan Huss, Christian Dunne

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- npm (comes with Node.js)
- A [Back4App](https://www.back4app.com/) account with the MarketFlow app configured

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
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
src/
├── components/
│   ├── admin/        # Admin-only components (event modal, vendor table, map editor)
│   ├── consumer/     # Consumer-facing components (market map, vendor cards)
│   └── Icons.tsx     # Shared icon components
├── context/
│   └── AuthContext.tsx
├── hooks/            # Data fetching hooks (useAuth, useVendors, useMarketEvents, etc.)
├── lib/
│   └── parse.ts      # Parse/Back4App initialization
├── pages/
│   ├── admin/        # Admin pages (events, vendors, approvals, analytics)
│   ├── auth/         # Login and signup pages
│   ├── consumer/     # Consumer pages (market map, vendor directory)
│   └── owner/        # Owner pages (user management)
├── App.tsx           # Routes
└── styles.css        # Global styles
```

## User Roles

| Role | Access |
|---|---|
| `owner` | Full access including user management |
| `admin` | Manage events, vendors, and approvals |
| `customer` | Browse market, view vendors and events |
| `vendor` | Reserved role — vendor self-service UI coming in a future sprint |

Roles are managed in Back4App under the `Role` class.

## Back4App Setup

The app uses the following Parse classes:

- `Vendor` — vendor roster (`isActive: true` required to appear in app)
- `MarketEvent` — market event dates and booth maps
- `Review` — customer reviews per vendor
- `Order` — customer orders
- `MenuItem` — vendor menu items

Make sure Public Read access is enabled on `Vendor` and `MarketEvent` for unauthenticated browsing.