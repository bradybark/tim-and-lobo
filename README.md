# Tim & Lobo Inventory Manager

A modern, local-first inventory management dashboard.

This application is designed to be **offline-first**, storing all data locally in the browser's IndexedDB while offering "Cloud Sync" capabilities via the File System Access API.

## 🚀 Key Features

* **Unlimited Local Storage:** Uses **IndexedDB** (via `idb-keyval`) instead of `localStorage`, supporting thousands of SKUs and high-resolution images without the 5MB limit.
* **Reorder Planner:** Automatically calculates sales rates, lead times, and "Days Until Stockout" to suggest exactly when and what to reorder.
* **Purchase Order (PO) Tracking:** extensive lifecycle management for POs (Placed -> Receieved), including partial receiving logic.
* **Smart Cloud Sync:**
    * Links to a local file (e.g., inside your Google Drive/Dropbox folder) to sync data across devices.
    * **Sync Safety:** Prevents closing the tab while data is syncing to avoid corruption.
    * **Debounced Saves:** Writes to disk intelligently to prevent performance locking.
* **Image Management:** Stores product images as efficient binary Blobs (not Base64 strings) to save space.
* **Excel Reporting:** One-click export of Reorder Planners, Full Workbooks, and Lead Time Analysis reports.
* **Lead Time Analysis:** Tracks actual vs. ETA delivery times to grade vendor performance.

## 🛠 Tech Stack

* **Frontend:** React (Vite)
* **Styling:** Tailwind CSS + Lucide React (Icons)
* **Storage:** IndexedDB (via `idb-keyval`)
* **File System:** File System Access API (native browser file picker)
* **Exporting:** XLSX (SheetJS)


## 💾 Data & Storage Guide

### 1. Where is my data?
Your data lives in **IndexedDB** inside your specific browser instance.
* **Pros:** Fast, private, works offline, holds hundreds of MBs.
* **Cons:** If your computer dies or you clear site data, it is gone. **You must use Cloud Sync.**

### 2. How to set up Cloud Sync
To back up your data or share it between a laptop and desktop:
1.  Go to the **Settings** tab.
2.  Click **"Link to Database File"**.
3.  Create or select a `.json` file inside a synced folder (like Dropbox, OneDrive, or Google Drive).
4.  The app will now auto-save to that file every time you make a change.

> **Note:** Cloud Sync requires a Chromium-based browser (Chrome, Edge, Opera, Brave). Firefox and Safari do not currently support the File System Access API.

### 3. Migrating from Old Version
If you are updating from the old `localStorage` version:
* The app will **automatically detect** your old data on the first load and migrate it to the new IndexedDB database.
* You will see a console log: `Migrated [key] from LocalStorage to IndexedDB`.

## ⚠️ Important Notes

* **Browser Compatibility:** For the best experience (especially image uploading and Cloud Sync), use **Google Chrome** or **Microsoft Edge**.
* **Images:** Images are now stored as Blobs. If you export a manual JSON backup, they are converted to Base64 strings automatically so they can be saved in a text file.
