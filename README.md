<div align="center">

# 📦 Tim & Lobo Inventory Manager

**A modern, local-first inventory management dashboard.**

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![IndexedDB](https://img.shields.io/badge/IndexedDB-Local_First-success?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

<p align="center">
  Designed to be <strong>offline-first</strong>. <br>
  Stores all data locally in the browser's IndexedDB while offering "Cloud Sync" capabilities via the File System Access API.
</p>
</div>

## 🚀 Key Features

* **Multi-Organization Support:** Manage multiple distinct entities (e.g., Tim vs. Lobo) from a single deployment with custom themes for each.
* **Unlimited Local Storage:** Uses **IndexedDB** (via `idb-keyval`) to support thousands of SKUs and high-resolution images, bypassing standard browser storage limits.
* **Visual Sales Analytics:** New interactive **Sales Trend Report** graphs daily sales rates over time (3m, 6m, 1y) to identify seasonality and velocity changes.
* **Reorder Planner:** Automatically calculates sales rates, lead times, and "Days Until Stockout" to suggest exactly when and what to reorder.
* **Purchase Order (PO) Tracking:** Complete lifecycle management for POs (Placed -> Received), including partial receiving logic and vendor tracking.
* **Lead Time & Variance Analysis:** Tracks "Actual vs. Planned" lead times and grades ETA accuracy to help you manage vendor performance.
* **Smart Cloud Sync:**
    * Links to a local file (e.g., inside your Google Drive/Dropbox folder) to sync data across devices.
    * **Sync Safety:** Prevents closing the tab while data is syncing to avoid corruption.
* **Snapshot Sharing:** Generate instant, read-only URL links of your current dashboard state to share with others. Includes built-in support for link shortening.

## ⚙️ Configuration

To customize the application, create a `.env` file in the project root:

### 1. Define Organizations
You can override the default organizations by providing a JSON string in `VITE_ORG_CONFIG`.

| Field         | Description                                                 |
| ------------- | ----------------------------------------------------------- |
| `id`          | Unique internal ID for the database                         |
| `name`        | Display name                                                |
| `description` | Subtitle text on the login card                             |
| `themeColor`  | Hex code for the dashboard accent color                     |
| `features`    | Array of enabled features (see below)                       |
| `poComponent` | Which PO view to use: `"POView"` or `"PurchaseOrderSystem"` |

**Available Features:**
| Feature          | Description                     |
| ---------------- | ------------------------------- |
| `inventoryLog`   | Inventory Log tab               |
| `purchaseOrders` | Purchase Orders tab             |
| `reorderPlanner` | Reorder Planner tab             |
| `reports`        | Reports tab (inventory section) |
| `outgoingOrders` | Outgoing Orders section & tab   |
| `internalOrders` | Internal Orders tab             |
| `websiteOrders`  | Website Orders tab              |

**Example Configuration:**
```env
VITE_ORG_CONFIG='[
  {
    "id": "lobo",
    "name": "Lobo Tool Co.",
    "description": "Full inventory management",
    "themeColor": "#3b82f6",
    "features": ["inventoryLog", "purchaseOrders", "reorderPlanner", "reports", "outgoingOrders", "internalOrders", "websiteOrders"],
    "poComponent": "POView"
  },
  {
    "id": "timothy",
    "name": "Timothy Corp",
    "description": "PO tracking only",
    "themeColor": "#10b981",
    "features": ["purchaseOrders"],
    "poComponent": "PurchaseOrderSystem"
  }
]'
```

## 🛠 Tech Stack

* **Frontend:** React (Vite)
* **Styling:** Tailwind CSS + Lucide React (Icons)
* **Storage:** IndexedDB (via `idb-keyval`)
* **File System:** File System Access API (native browser file picker)
* **Exporting:** XLSX (SheetJS/ExcelJS) for comprehensive reporting
* **Sharing:** lz-string (URL compression)

## 💾 Data & Storage Guide

### 1. Where is my data?
Your data lives in **IndexedDB** inside your specific browser instance.
* **Pros:** Fast, private, works offline.
* **Cons:** If your computer dies or you clear site data, it is gone. **You must use Cloud Sync.**

### 2. How to set up Cloud Sync
To back up your data or share it between a laptop and desktop:
1.  Go to the **Settings** tab.
2.  Click **"Link to Database File"**.
3.  Create or select a `.json` file inside a synced folder (like Dropbox, OneDrive, or Google Drive).
4.  The app will now auto-save to that file every time you make a change.

> **Note:** Cloud Sync requires a Chromium-based browser (Chrome, Edge, Opera, Brave). Firefox and Safari do not currently support the File System Access API.

### 3. Maintenance Tools
* **Manual Backup:** You can download a full JSON dump of your database (including images) from the Settings tab at any time.

## ⚠️ Important Notes

* **Browser Compatibility:** For the best experience (especially image uploading and Cloud Sync), use **Google Chrome** or **Microsoft Edge**.
