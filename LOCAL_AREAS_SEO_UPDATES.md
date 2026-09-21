# Local Area SEO & Updates Documentation

This document outlines all edits, updates, and newly introduced features created specifically for **Local Areas** across the website and administration portals.

---

## 1. Summary of Local Area Features

1. **Local Area SEO Management**:
   - Admins can now write and optimize complete SEO metadata for individual Local Areas (meta title, description, primary keyword, popular searches, content blocks, FAQs, and publishing status).
   - Supports dual modes: **Same Content as City (Inherit)** and **Individual Custom SEO**.

2. **Parent-Child Dynamic SEO Architecture**:
   - **Inherit Mode ("Same Content as City")**: When chosen, the local area dynamically adopts the parent city's SEO title, description, content blocks, and FAQs, automatically contextualized for the neighborhood (e.g. `{Local Area}, {City}`).
   - **Individual Mode ("Custom SEO")**: The local area uses its own dedicated custom title, description, content blocks, and FAQs written by the admin.
   - **"Copy from Parent City" Utility**: With a single click in the SEO editor, admins can copy and auto-adapt all parent city SEO content into the local area editor to quickly bootstrap custom content.

3. **Green Dot (`🟢`) Visual Indicator**:
   - Any City containing one or more local areas with individual custom SEO displays an active green dot indicator in the admin portals (`/admin/dynamic-seo`, `/admin/city`, and `/admin/city-seo`).
   - Allows administrators to identify at a glance which cities have customized local neighborhood SEO.

4. **Consistent `{Local Area Name}, {City Name}` Formatting**:
   - In all administration tables, dropdowns, local area lists, and public directory headers, local areas consistently display their parent city name (e.g. `Andheri West, Mumbai` or `Connaught Place, Delhi`).

5. **Dedicated "Dynamic SEO" Admin Management**:
   - Added `/admin/dynamic-seo` accessible directly below "City SEO" in the admin sidebar.
   - Provides accordion views grouped by city, batch mode selectors, quick "Set All Inherit" / "Set All Individual" controls, and direct links to Edit SEO and View live pages.

---

## 2. Updated Website Files (Local Area Specific)

| Component / Layer | File Path | Nature of Update |
| :--- | :--- | :--- |
| **Data Models** | [`src/lib/models/local-area-seo.ts`](file:///c:/Users/Suraj/Desktop/New%20folder/RKB/src/lib/models/local-area-seo.ts) | Created dedicated model for local area SEO, parent-child inheritance resolution (`getEffectiveLocalAreaSeo`), batch updates, and custom tracking. |
| **Data Models** | [`src/lib/models/localArea.ts`](file:///c:/Users/Suraj/Desktop/New%20folder/RKB/src/lib/models/localArea.ts) | Added state name resolution from `cityPlaces`, default area deletion tracking via `deletedLocalAreas`, and batch deletion support. |
| **Store Schema** | [`src/lib/persist.ts`](file:///c:/Users/Suraj/Desktop/New%20folder/RKB/src/lib/persist.ts) | Added `localAreaSeo` and `deletedLocalAreas` to `StoreData` schema and defaults. |
| **API Endpoints** | [`src/app/api/admin/local-area-seo/route.ts`](file:///c:/Users/Suraj/Desktop/New%20folder/RKB/src/app/api/admin/local-area-seo/route.ts) | New GET & POST endpoints for local area SEO, batch mode configuration, and real-time cache revalidation. |
| **API Endpoints** | [`src/app/api/admin/local-areas/route.ts`](file:///c:/Users/Suraj/Desktop/New%20folder/RKB/src/app/api/admin/local-areas/route.ts) | Added batch deletion (`ids: string[]`) and instant cache revalidation across `/places` and admin routes. |
| **Admin Navigation** | [`src/components/admin/admin-sidebar.tsx`](file:///c:/Users/Suraj/Desktop/New%20folder/RKB/src/components/admin/admin-sidebar.tsx) | Added **Dynamic SEO** navigation item positioned directly below **City SEO**. |
| **Admin Permissions** | [`src/lib/admin-access.ts`](file:///c:/Users/Suraj/Desktop/New%20folder/RKB/src/lib/admin-access.ts) | Added `dynamic-seo` section to `ADMIN_SECTIONS` and inherited access for city/city-seo subadmins. |
| **Admin Dynamic SEO** | [`src/app/admin/dynamic-seo/page.tsx`](file:///c:/Users/Suraj/Desktop/New%20folder/RKB/src/app/admin/dynamic-seo/page.tsx) | New dashboard displaying all cities and local areas, green dot indicators, mode toggles, and batch actions. |
| **Admin City SEO** | [`src/app/admin/city-seo/page.tsx`](file:///c:/Users/Suraj/Desktop/New%20folder/RKB/src/app/admin/city-seo/page.tsx) | Added Local Area SEO editing support (`?city={city}&area={area}`), mode toggle, "Copy from Parent City" button, and a Local Areas card grid with "Edit SEO" buttons. |
| **Admin City List** | [`src/app/admin/city/page.tsx`](file:///c:/Users/Suraj/Desktop/New%20folder/RKB/src/app/admin/city/page.tsx) | Added **Edit SEO** button to every local area row, green dot indicator next to cities with custom local SEO, and `{Area}, {City}` formatting. |
| **Public Places Page** | [`src/app/(site)/places/[location]/[id]/page.tsx`](file:///c:/Users/Suraj/Desktop/New%20folder/RKB/src/app/(site)/places/[location]/[id]/page.tsx) | Wired up `getEffectiveLocalAreaSeo` for dynamic SEO meta title, description, content blocks, and FAQs. |

---

## 3. How to Use Local Area SEO

### A. Managing Modes Globally via `/admin/dynamic-seo`
1. Navigate to **Dynamic SEO** in the admin sidebar.
2. Expand any city card to view all its local areas.
3. Cities with custom local area SEO will display an active **🟢 green dot**.
4. Use the mode toggle on any local area:
   - **Same as City (Inherit)**: Automatically uses the parent city's SEO content adapted for the neighborhood.
   - **Individual SEO**: Allows writing custom SEO for that neighborhood.
5. Click **Save Configuration** on the floating save bar to persist changes.
6. Click **Edit SEO** on any local area to customize its content directly.

### B. Editing Local Area SEO via `/admin/city-seo`
1. Either:
   - Click **Edit SEO** next to any local area in `/admin/city` or `/admin/dynamic-seo`.
   - Open a city in `/admin/city-seo` and scroll down to the **Local Areas** section, then click **Edit SEO** next to the desired area.
2. In the editor:
   - Use the **Copy Content from Parent City** button to prefill all fields adapted for the local area.
   - Edit the Title, Meta Description, Primary Keyword, Content Blocks, and FAQs.
   - Click **Publish** or **Save Draft**.
   - Click **Preview** to inspect the live local area page (`/places/{city}/{area}`).

---

## 4. Cache & Real-Time Sync

All Local Area creations, deletions, and SEO updates trigger immediate cache revalidation across:
- `/places` (Unified places directory)
- `/places/[city]` (City portals)
- `/places/[city]/[area]` (Local area pages)
- `/admin/city` (Admin locations directory)
- `/admin/dynamic-seo` (Dynamic SEO manager)
- `/admin/city-seo` (SEO editor)

Changes are served immediately without stale cache delays.
