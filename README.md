## Inventory Management Dashboard v2.0

A comprehensive, local-first inventory management application built with React, Vite, and Tailwind CSS v4.

## 🚀 Features

#### Core Functionality
- Centralized Dashboard: Get a high-level view of inventory health, reorder suggestions, and daily sales rates.
- Inventory Log: Track physical counts, calculate sales velocity automatically, and view historical data.
- Purchase Orders (POs): Create and manage POs, track vendor details, and monitor delivery performance (early/late/on-time status).
- Reorder Planner: Automated logic calculates reorder quantities based on lead time, safety stock (min days), and desired inventory targets (months on hand).
- Vendor Management: Maintain a database of suppliers with contact details for easy PO creation.

#### Data & Security
- Local-First Architecture: All data is stored securely in your browser's localStorage by default.
- Cloud Sync (Optional): Link to a JSON file in your Google Drive or Dropbox (via the File System Access API) for live auto-saving and backups.
- Export/Import: Full support for exporting data to Excel (.xlsx) reports or JSON backups.

#### UI/UX
- Native Dark Mode: Fully responsive interface with a toggleable dark/light theme.
- Multi-Org Support: Manage multiple distinct inventory datasets (e.g., "Lobo Tool Company" vs "Timothy's Toolbox") within the same app.

## 🛠️ Technical Stack
- Framework: React + Vite
- Styling: Tailwind CSS v4 (using CSS-first configuration)
- Icons: Lucide React
- Data Handling: Custom hooks (useDashboardMetrics) for business logic separation and memoized calculations.
- Exporting: exceljs and file-saver for generating reports.

## 📦 Installation & Setup

1. Clone the repository
```
git clone [https://github.com/your-username/inventory-dashboard.git](https://github.com/your-username/inventory-dashboard.git)
cd inventory-dashboard
 ```


2. Install dependencies
```
npm install
```


3. Run development server
```
npm run dev
```


4. Build for production
```
npm run build
```


5. To preview the production build locally:
```
npm run preview
```

📂 Project Structure

```src/
├── components/        # Reusable UI components (TooltipHeader, VendorCell, etc.)
├── constants/         # Initial seed data (LOBO_ and TIMOTHY_ defaults)
├── hooks/             # Custom hooks (useDashboardMetrics for logic)
├── utils/             # Helper functions (date formatting, export logic)
├── views/             # Main page views (Dashboard, Planner, POView, etc.)
├── App.jsx            # Main entry point & routing logic
└── index.css          # Tailwind v4 configuration & global styles
```
