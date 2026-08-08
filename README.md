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
- Search and filter products by category

### Sales & Point of Sale
- Fast grid-based product selection
- Search products by name or barcode
- Category filters for quick browsing
- Automatic stock deduction
- Accept Cash or MoMo payments
- Optional customer phone for loyalty tracking

### Staff Management
- Create staff accounts with PINs
- Assign roles (Owner, Manager, Cashier, Inventory)
- Track who made each sale
- Enable/disable staff access

### Role-Based Access Control
Each staff role has specific permissions:

| Area | Owner | Manager | Cashier |
|---|---|---|---|
| Manage products (create/edit/delete) | ✅ | ✅ | ❌ |
| Process sales | ✅ | ✅ | ✅ |
| View reports | ✅ | ✅ | ✅ |
| Manage staff | ✅ | ✅ | ❌ |
| Edit business settings | ✅ | ❌ | ❌ |
| Export data | ✅ | ✅ | ❌ |

Tabs that contain no accessible actions (e.g., the Staff tab for Cashiers) are hidden from the tab bar. All other tabs remain visible with action buttons hidden based on the user's role.

### Reports & Analytics
- See daily, weekly, or monthly revenue
- View top-selling products
- Track staff performance
- Understand cash vs MoMo payments

### Receipts
- Generate professional receipts
- Print or share as PDF
- Shows tax if configured
- Includes customer phone if provided

### Data & Backup
- Export all your data as CSV (spreadsheet format)
- Includes products, staff, sales, customers, and more
- Works completely offline
- No cloud subscription needed

---

## Getting Started

### Quick Setup

1. **Download and install**
   - Clone this repository or download the app
   - Run `npm install` to install dependencies
   - Run `npm start` to start the app

2. **First-time setup**
   - Enter your business name
   - Choose your business type
   - Set your currency (default: Ghana Cedis)

3. **Start selling**
   - Add your products to inventory
   - Add staff members with PINs
   - Begin making sales!

> **Note:** Available screens and actions depend on your staff role. See [Role-Based Access Control](#role-based-access-control) below.

### Using the App

| Screen | What you do there |
|--------|-------------------|
| Dashboard | See today's sales, revenue, and alerts |
| Inventory | Browse, add, edit, or delete products |
| Sales | Make sales and serve customers |
| Staff | Manage your team (Owner/Manager only) |
| Reports | View analytics and trends (hidden for Inventory role) |
| Settings | Update business details and export data |

---

## For Developers

### Tech Stack

- **Framework:** Expo SDK 54 / React Native 0.81
- **Language:** TypeScript
- **Database:** SQLite (works offline)
- **Navigation:** Expo Router
- **Charts:** react-native-chart-kit
- **Charts library:** react-native-svg

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
│   │   ├── inventory.tsx  # Inventory
│   │   ├── sales.tsx       # POS/Sales
│   │   ├── staff.tsx       # Staff management
│   │   └── reports.tsx     # Analytics
│   ├── login.tsx           # PIN login
│   ├── settings.tsx         # Business settings
│   ├── scan.tsx            # Barcode scanner
│   └── receipt/[id].tsx    # Receipt view
│
├── src/                    # Source code
│   ├── auth/               # Authentication & permissions
│   ├── db/                 # Database functions
│   ├── lib/                # Utilities
│   └── ui/                 # Shared components
│
├── ios/                    # iOS native project
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


