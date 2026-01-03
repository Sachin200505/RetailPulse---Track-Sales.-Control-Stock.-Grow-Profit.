# RetailPulse — Track Sales. Control Stock. Grow Profit.

💡 A smart POS & inventory intelligence system for modern retail. GST-accurate billing, tight stock control, loyalty, refunds, and auditability—all secured with role-based access and idle logout.

---

## 📋 Table of Contents
- Overview
- Highlights
- Tech Stack
- Design System
- Project Structure
- Getting Started
- Roles & Permissions
- Data Model (high level)
- Workflow
- Security
- Testing Tips

---

## 🎯 Overview
RetailPulse is a full-stack POS and inventory suite for retail teams. It delivers GST-accurate billing, inventory controls, loyalty, refunds, audit trails, and owner-grade governance.

---

## ✨ Highlights
1) Auth & Access
- Email/password with JWT, role-guarded routes (Owner, Admin, Cashier)
- 5-minute idle auto-logout + cross-tab logout sync

2) Products & Inventory
- Product CRUD with GST rates
- Stock decrements on sales; low-stock/expiry jobs

3) Billing / POS
- Fast carting and invoicing
- Per-line GST, subtotal/discount/total with GST
- Receipt view/print, CSV export

4) Transaction History
- Search, date/payment filters, pagination
- Receipt reprint/view
- Owner-only delete selected transactions

5) Refunds
- Role-gated refunds (cashier allowed)
- Audit logging for traceability

6) Audit Logs
- Action trail for logins, billing, refunds, admin actions
- CSV export; owner-only reset

7) Alerts & Jobs
- Low-stock checks (cron) and SMS hook readiness

---

## 🛠 Tech Stack
- Frontend: React (Vite), TypeScript, Tailwind CSS, ShadCN UI, lucide-react, date-fns, sonner
- Backend: Node.js, Express, TypeScript, Mongoose (MongoDB)
- Auth: JWT + role middleware
- Scheduled jobs: node-cron
- SMS ready: Twilio hook

---

## 🎨 Design System
- Styling: Tailwind + ShadCN primitives (button/input/card/badge/select)
- Icons: lucide-react
- Typography: Tailwind/ShadCN default stack (configurable)
- Theme: Light with primary/accent gradients; compact, border-soft components

---

## 📁 Project Structure (key)
- frontend/
	- src/
		- pages/: Billing, TransactionHistory, AuditLogs, Refunds, etc.
		- components/: BillReceipt, Layout, shared UI
		- context/: AuthContext (auth + idle/logout)
		- services/: billingService, product/customer APIs, api client
		- integrations/: supabase stub for audit log fetch
		- lib/: api utilities, helpers
	- config: vite.config.ts, tailwind.config.ts, tsconfig*.json, eslint.config.js
	- public/: static assets
- backend/
	- src/
		- server.ts, app.ts
		- routes/: auth, transactions, refunds, admin, alerts, sms
		- models/: Transaction (GST fields), Refund, Product, Customer, AuditLog, User
		- middlewares/: auth, role guard
		- services/: audit logging, stock, sms
		- jobs/: expired products, low stock
		- config/: db, env
	- scripts/: seedOwner.js
- Root: package.json (workspace), README.md

---

## 🚀 Getting Started
Prereqs: Node.js 18+, npm, MongoDB available.

Backend
- cd backend
- Copy .env.example (if present) to .env; set MONGODB_URI, JWT_SECRET, PORT=5000
- Install: npm install
- Dev: npm start (or npm run dev)
- Runs at http://localhost:5000

Frontend
- cd frontend
- Copy .env.example (if present) to .env; set VITE_API_URL=http://localhost:5000
- Install: npm install
- Dev: npm run dev
- Runs at http://localhost:5173

Production
- Backend: npm run build && npm start (from backend/)
- Frontend: npm run build && npm run preview (or serve dist/)

---

## 👥 Roles & Permissions
- Owner: full access; can clear audit logs; can delete transactions
- Admin: management; destructive clear/delete limited by routes
- Cashier: billing, refunds (as allowed)

---

## 🗄 Data Model (high level)
- Users: name, email, role, isActive
- Products: name, sku, stock, pricing, gstRate
- Transactions: invoiceNumber, items (qty, price, gstRate/Amount), totals, payment info, customer link, createdBy
- Refunds: link to transaction, reason, amounts
- AuditLogs: action, user, entityType/entityId, old/new values, notes, timestamp

---

## 🔄 Workflow (happy path)
1) Owner/admin set up products/customers; seed owner if needed
2) Cashier bills: add items, per-line GST, take payment (cash/UPI/card), generate receipt
3) Stock decrements; low-stock job can alert
4) Transaction history: search/filter/export; receipts reprint; owner can delete selected
5) Refunds: process refund; audit log recorded
6) Audit logs: view/filter/export; owner can reset
7) Security: 5-minute idle logout; cross-tab logout sync

---

## 🔒 Security
- JWT auth with role middleware
- Idle timeout (5 minutes) with cross-tab broadcast
- Owner-only destructive actions (reset audit logs, delete transactions)

---

## ✅ Testing Tips
- Idle logout: stay inactive >5 minutes; confirm logout + cross-tab sync
- GST: bill items with GST; verify receipts/history show GST%/amount
- Audit reset: login as owner; reset logs; confirm list clears and repopulates on new actions
- Transaction delete: select rows as owner; delete; ensure removal
