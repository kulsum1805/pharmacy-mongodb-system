# CareStock — Pharmacy Management System (MongoDB)

A college-ready full-stack demo built with MongoDB, Express, Node.js, Mongoose, HTML, CSS and vanilla JavaScript.

## Features

- Dashboard: inventory counts, low stock, expiring/expired medicine counts, today's sales and stock valuation.
- Medicine CRUD, text-like regex search, low-stock and expired filters.
- Suppliers collection and supplier references in medicine documents.
- Sales and billing with embedded sale line-items and stock decrement.
- MongoDB aggregation reports: category stock valuation and top-selling medicines.
- Mongoose validation, indexes, timestamps, and `.env` configuration.

> This is an educational demo, not a production pharmacy/dispensing system. It has no authentication, prescription verification, tax compliance, or audited transaction workflow. Do not use it to dispense real medicines. The sale endpoint compensates stock changes if a later step fails, but production-grade sales should use a MongoDB transaction on a replica set and robust retry/audit logic.

## Requirements

- Node.js 18+ (LTS recommended)
- npm
- MongoDB Community running locally, OR a MongoDB Atlas cluster
- VS Code (recommended)

## 1. Install

Extract the ZIP and open the `pharmacy-mongodb-system` folder in VS Code. Open the terminal in that folder:

```bash
npm install
```

## 2. Configure MongoDB

Copy `.env.example` to `.env`.

### Local MongoDB

Make sure MongoDB Community Server is installed and running. Use:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/pharmacy_management
```

### MongoDB Atlas

Create a free cluster in MongoDB Atlas, create a database user, allow your current IP address in Network Access, then select **Connect > Drivers** and copy the connection string into `.env`. Replace the password placeholder and add the database name before any query options, for example:

```env
PORT=3000
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/pharmacy_management
```

Do not share `.env` or commit it to GitHub. URL-encode special characters in your database password.

## 3. Add demo data (optional)

```bash
npm run seed
```

WARNING: `seed.js` clears the existing `medicines`, `suppliers`, and `sales` collections before adding sample records. Only run this on a disposable project database.

## 4. Start the app

```bash
npm run dev
```

Open http://localhost:3000. For normal start use `npm start`.

## Project structure

```text
pharmacy-mongodb-system/
├── public/
│   ├── index.html          # Dashboard and forms
│   ├── styles.css          # Responsive UI
│   └── app.js              # Browser logic and API calls
├── src/
│   ├── models/
│   │   ├── Medicine.js     # Medicine schema and indexes
│   │   ├── Supplier.js     # Supplier schema
│   │   └── Sale.js         # Sales with embedded line items
│   └── routes/
│       ├── medicines.js    # Medicine CRUD/search
│       ├── suppliers.js    # Supplier endpoints
│       └── sales.js        # Billing and stock updates
├── .env.example
├── .gitignore
├── package.json
├── seed.js
├── server.js
└── README.md
```

## Main API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check API and database status |
| GET | `/api/dashboard` | Dashboard counts and aggregates |
| GET | `/api/medicines` | List/search/filter medicines |
| POST | `/api/medicines` | Add medicine |
| PUT | `/api/medicines/:id` | Update medicine |
| DELETE | `/api/medicines/:id` | Delete medicine |
| GET | `/api/suppliers` | List suppliers |
| POST | `/api/suppliers` | Add supplier |
| GET | `/api/sales` | List recent sales |
| POST | `/api/sales` | Create a sale and decrement stock |
| GET | `/api/reports/category-stock` | Aggregation: stock by category |
| GET | `/api/reports/top-selling` | Aggregation: top-selling medicines |

## MongoDB design

Database: `pharmacy_management`

### `medicines`

Each document stores a medicine's name, generic name, batch, category, manufacturer, supplier ObjectId, purchase/selling prices, quantity, reorder level, expiry date and prescription flag.

### `suppliers`

Stores supplier name and optional contact information. Medicines refer to suppliers using a MongoDB ObjectId; the API uses Mongoose `populate()` to show supplier details.

### `sales`

Stores bill metadata and an **embedded `items` array**. Each sale item keeps a snapshot of medicine name, batch, quantity, unit price and line total. This means historical bills remain readable even if a medicine's display name later changes.

## MongoDB features to explain in your viva

1. **Document model:** medicines and sales are BSON documents, not rows in relational tables.
2. **References:** `Medicine.supplier` refers to a supplier document; Mongoose `populate()` resolves it.
3. **Embedding:** sale line items are embedded inside each sale to keep bill details together.
4. **CRUD:** create, read, update, delete medicines.
5. **Query operators:** `$or`, `$regex`, `$lte`, `$gte`, `$lt`.
6. **Aggregation:** `$match`, `$group`, `$sum`, `$multiply`, `$unwind`, `$sort`, `$limit`.
7. **Indexes:** text index on medicine name/generic name/batch; compound index on expiry date and quantity; index on sales date.
8. **Atomic stock update:** `findOneAndUpdate()` checks that sufficient quantity exists and decrements stock in a single-document atomic operation.

## Test checklist

- Add a medicine with all required fields.
- Search by medicine name and batch number.
- Edit quantity and selling price.
- Filter low stock and expired medicines.
- Try a sale that exceeds available quantity; it should be rejected.
- Complete a valid sale and confirm stock decreases.
- Check dashboard counts and both MongoDB reports.
- Refresh the browser; data should persist because it is stored in MongoDB.

## Common errors

- **MongoNetworkError / ECONNREFUSED:** start the local MongoDB service or verify Atlas connection settings.
- **Atlas connection fails:** check Network Access, database username/password, URI, and password URL encoding.
- **`npm` not recognized:** install Node.js LTS and restart the terminal.
- **Port 3000 is busy:** set `PORT=3001` in `.env`, restart, and open `http://localhost:3001`.
- **Dashboard cannot load:** ensure the terminal says `Connected to MongoDB` and check `/api/health`.

## Suggested presentation outline

1. Problem statement and objectives
2. System architecture
3. MongoDB document design and collections
4. CRUD and medicine inventory demo
5. Sales workflow and stock update
6. Aggregation reports and indexes
7. Testing, limitations and future enhancements
