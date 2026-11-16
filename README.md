# myERP - Simple ERP & POS for Ghanaian Small Businesses

> Helping small businesses in Ghana go digital, one shop at a time.

---

## What is myERP?

myERP is a simple, affordable Point of Sale (POS) and business management app designed specifically for small businesses in Ghana. Whether you run a provision shop, pharmacy, kiosk, or small supermarket, myERP helps you manage your inventory, track sales, and serve customers faster - all from your phone.

### Why myERP?

Ghanaian small businesses face unique challenges:
- **Limited internet?** No problem - myERP works completely offline
- **Expensive software?** Free and open source
- **Complex setup?** Takes less than 5 minutes to start
- **Need MoMo tracking?** Record MoMo payments alongside cash

---

## Features

### Inventory Management
- Add products with name, price, and barcode
- Track stock levels automatically
- Get alerts when items run low
- Search and filter products by name, barcode, or category
- Log every stock movement with the staff member and a reason

### Stock Auditing (Owner)
- See stock value, units on hand, and products needing a recount at a glance
- Follow a plain-language three-step guide: count the shelf, enter the count, explain and confirm
- Compare system count with physical count and see the cost-value impact before saving
- Record why stock differs: damaged, missing, found extra, short delivery, earlier miscount, or other
- Review every count before confirming, including verifications with no change
- Review the full movement ledger by reason: sale, restock, adjustment, void, or audit
- Tap any movement to see a plain-language explanation, the staff member, the reason, and the note

### Sales & Point of Sale
- Fast grid-based product selection
- Search products by name or barcode
- Category filters for quick browsing
- Automatic stock deduction
- Accept Cash or MoMo payments
- Optional customer phone for loyalty tracking

### Staff Management
- Create staff accounts with PINs
- Assign roles: Owner, Manager, or Cashier
- Track who made each sale and each stock adjustment
- Enable/disable staff access

### Role-Based Access Control
Each staff role has specific permissions:

| Area | Owner | Manager | Cashier |
|---|---|---|---|
| Process sales | Yes | Yes | Yes |
| Manage products and stock | Yes | Yes | Read only |
| View customers | Yes | Yes | No |
| Manage staff | Yes | Yes | No |
| Export data | Yes | Yes | No |
| Edit business settings | Yes | No | No |
| View reports and financial analytics | Yes | No | No |
| Run stock audits | Yes | No | No |

Navigation adapts to the signed-in role. Screens a role cannot use are left out of the tab bar and the More menu, and direct links redirect home. Financial totals on the dashboard are owner-only; managers and cashiers see operational counts instead.

### Reports & Analytics (Owner)
- See daily, weekly, or monthly revenue
- View top-selling products
- Track staff performance
- Understand cash vs MoMo payments
- Compare growth against the previous period

### Receipts
- Generate professional receipts
- Print or share as PDF
- Shows tax, address, and receipt footer when configured
- Includes the serving staff member and customer phone if provided

### Data & Backup
- Export all your data as CSV (spreadsheet format)
- Includes products, staff, sales, customers, and more
- Works completely offline
- No cloud subscription needed

### App Updates
- See the installed version and check for a newer release from inside the app
- Read release notes before updating
- Download the Android APK directly, or open the release page for iOS and web builds
- Shop data stays on the device and carries over after an update

---

## Getting Started

### Quick Setup

1. **Download and install**
   - **Android:** [Download the latest APK](https://github.com/joey727/myERP/releases/latest/download/myerp.apk)
   - **iOS:** [Open the latest release](https://github.com/joey727/myERP/releases/latest) for TestFlight/App Store builds. Simulator builds are attached for development.
   - **Web:** [Open myERP in your browser](https://joey727.github.io/myERP/app/)
   - **Source:** Clone this repository, run `npm install`, then `npm start`
   - **Updates:** Signed-in users can open **More → App updates** to check for and download a newer version

2. **First-time setup**
   - Enter your business name and business type
   - Add contact details: phone, optional email, address, tax ID, and receipt footer
   - Set your currency (default: Ghana Cedis)
   - Create the owner account with a name and PIN

3. **Start selling**
   - Add your products to inventory
   - Add staff members with PINs
   - Begin making sales!

> **Note:** Available screens and actions depend on your staff role. See [Role-Based Access Control](#role-based-access-control) below.

### Using the App

| Screen | What you do there |
|--------|-------------------|
| Home | See today's sales, low stock alerts, and team summary |
| Sell | Make sales, pick products, and serve customers |
| Stock | Browse, add, edit, or delete products |
| Customers | Search customers and review purchase history |
| Reports | View analytics and trends (owner only) |
| Staff | Manage your team (owner and manager) |
| Stock audit | Count stock and review movement history (owner only) |
| Sales history | Review, search, and reopen past receipts |
| Settings | Update business details, receipt details, and formatting |
| App updates | Check for a newer version and download it |
| Backup & export | Export all data as CSV (owner and manager) |

---

## For Developers

### Tech Stack

- **Framework:** Expo SDK 54 / React Native 0.81
- **Language:** TypeScript
- **Database:** SQLite (works offline)
- **Navigation:** Expo Router
- **Charts:** react-native-svg

### Running Locally

```bash
# Install dependencies
npm install

# Generate native iOS project (for iOS build)
npx expo prebuild --platform ios

# Run on iOS Simulator
npx expo run:ios

# Or run with Metro bundler
npm start
```

### Project Structure

```
myERP/
├── app/                    # App screens (Expo Router)
│   ├── (tabs)/            # Bottom tab screens
│   │   ├── index.tsx      # Dashboard
│   │   ├── sales.tsx      # POS/Sell
│   │   ├── inventory.tsx  # Stock
│   │   ├── customers.tsx  # Customers
│   │   ├── reports.tsx    # Analytics (owner only)
│   │   ├── staff.tsx      # Staff management
│   │   └── more.tsx       # Role-aware menu
│   ├── audit.tsx          # Stock audit (owner only)
│   ├── history.tsx        # Sales history
│   ├── login.tsx          # PIN login
│   ├── settings.tsx       # Business settings
│   ├── backup.tsx         # CSV export
│   ├── updates.tsx        # In-app update check and download
│   ├── scan.tsx           # Barcode scanner
│   └── receipt/[id].tsx   # Receipt view
│
├── src/                    # Source code
│   ├── auth/              # Authentication and permissions
│   ├── db/                # Database queries and migrations
│   ├── lib/               # Utilities
│   └── ui/                # Shared components, tokens, and navigation
│
├── public/index.html      # Web HTML shell and base styles
├── ios/                   # iOS native project
└── android/               # Android native project
```

---

## Why This Matters for Ghana

Many small businesses in Ghana still use:
- Manual record keeping
- Spreadsheets
- Mental calculations

This leads to:
- Lost sales from stockouts
- Money mistakes from manual math
- No visibility into business performance
- Inability to compete with bigger shops

myERP solves these problems with a simple, affordable tool that works offline and requires no technical knowledge.

---

## Support & Contributing

Found a bug or have a feature request?
- Open an issue on GitHub
- Submit a pull request

License: MIT


