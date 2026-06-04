# Apin Dashboard

> A beautiful, fast, and fully customizable New Tab page for Google Chrome.

Replace Chrome's default new tab with your own personal dashboard — quick links, bookmark groups, live clock, search, and deep theme control. Everything is saved locally on your device. No account, no tracking, no cloud.

---

## Preview

> _Coming soon — screenshots will be added here_

---

## Features at a Glance

| | |
|---|---|
| ⚡ **Quick Links** | Large icon tiles for your top sites. Drag to reorder, click × to remove |
| 📁 **Bookmark Groups** | Card-style widgets to organize links by topic. Drag bookmarks between groups |
| 🕐 **Live Clock** | Always-visible time and date in the top-left corner |
| 🔍 **Search Bar** | Google, Bing, DuckDuckGo, Brave, or any custom search URL |
| 🎨 **Themes** | Dark, Light, or fully Custom colors. Adjust widget opacity to taste |
| 🖼️ **Background Image** | Paste an image URL or upload from your computer |
| 💾 **Backup & Restore** | Export all your settings to a JSON file. Import on any device |
| 🔒 **100% Private** | Nothing leaves your browser. Only the `storage` permission is used |

---

## Installation

Chrome Web Store listing is coming. Until then, install directly from source — it takes about 1 minute:

**Step 1 — Download the extension**

Click the green **Code** button on this page → **Download ZIP**, then unzip the file.  
Or clone with git:
```
git clone https://github.com/YOUR_USERNAME/apin-dashboard.git
```

**Step 2 — Open Chrome Extensions**

Type `chrome://extensions` in your address bar and press Enter.

**Step 3 — Enable Developer Mode**

Toggle the **Developer mode** switch in the top-right corner of the Extensions page.

**Step 4 — Load the extension**

Click **Load unpacked** and select the `velvet-v2` folder (the one that contains `manifest.json`).

**Step 5 — Done!**

Open a new tab. Apin Dashboard is now your home page. 🎉

---

## How to Use

### Quick Links

The icon row at the top gives you instant access to your most-used sites.

- **Add a link** — click the **＋** tile at the end of the row, enter a title and URL
- **Remove a link** — hover over a tile and click the **×** button that appears
- **Reorder** — drag any tile left or right

### Bookmark Groups

Groups are card widgets below the quick links. Each group holds as many bookmarks as you like.

- **Create a group** — click **New Group** in the top-right corner, give it a name and pick an accent color
- **Add a bookmark** — click the **＋** icon inside a group header, fill in the title and URL, press **Add** or hit Enter
- **Delete a bookmark** — hover over a bookmark and click the **×** that appears on the right
- **Delete a group** — click the trash icon in the group header (this removes all bookmarks inside too)
- **Rename a group** — click directly on the group title, type a new name, press Enter to save or Escape to cancel
- **Reorder groups** — grab the ⠿ handle on the left side of any group header and drag it
- **Move a bookmark between groups** — drag a bookmark row from one group and drop it into another

### Search

The search bar in the center of the top bar uses Google by default.  
To change the search engine: open **Settings → Search Engine** and pick from the list or enter a custom URL.

### Themes & Appearance

Click the **⚙ gear icon** in the top-right corner to open the Settings panel.

| Option | What it does |
|---|---|
| Background Image | Paste a URL or upload a file from your computer |
| Widget Opacity | Slide to make cards more transparent or solid |
| Color Scheme | Choose Dark, Light, or Custom |
| Custom Colors | Pick your own background, widget, accent, and text colors |
| Logo Widget | Show a custom text label or upload your own image as a logo |

### Backup & Restore

Your data is stored locally in Chrome. To keep a backup or move your setup to another device:

1. Open Settings → **Backup & Restore**
2. Click **Export JSON** — a file named `apin-backup-YYYY-MM-DD.json` will be saved to your Downloads
3. On another device (or after reinstalling): click **Import JSON** and select that file

> Background and logo images uploaded as files are not included in the export — they are re-uploaded separately after restoring.

---

## Privacy

Apin Dashboard requests only one Chrome permission: **`storage`** — used to save your settings and bookmarks locally on your device. No data is ever sent anywhere.

---

## License

MIT — free to use, modify, and share.
