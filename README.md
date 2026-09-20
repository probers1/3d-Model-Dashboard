# PrintVault - 3D Model Management Site for 3D Printing

A fast, lightweight self-hosted 3D model manager (Thingiverse / MakerWorld clone) built with Node.js, SQLite, and Three.js. Designed strictly around YAGNI principles: minimal code, zero premature abstractions, no complex ORMs, no Docker required, and targeted directly for bare-metal Linux and Proxmox LXC containers.

---

## Features

- **Multi-File & Archive Uploads**: Upload multiple `.stl` and `.obj` files simultaneously, or drop in a `.zip` archive to automatically extract all 3D files into a single unified model entry.
- **Server-Side 3D Thumbnail Previews**: Automatically renders a static, standardized isometric thumbnail upon model creation using a headless browser (Puppeteer) and Three.js canvas snapshot.
- **Interactive Three.js 3D Viewer**: Orbit, pan, zoom, wireframe toggle, filament color presets, and multi-file switching directly from the browser.
- **Full Model & File CRUD**:
  - Delete entire model or delete individual files within a model.
  - Download individual files or download the entire model as a generated `.zip`.
  - Edit model metadata (title, tags, description) with instant search filtering.
- **YAGNI Session Authentication**:
  - Session-based authentication stored directly in SQLite.
  - Password hashing with Node's native `crypto.scryptSync`.
  - Auto-seeds initial admin account on first launch via environment variables.
  - Admin-only user management modal to invite or create additional users.
- **LXC Bind-Mount Ready**: All data (database, models, files, thumbnails) lives in a single directory configurable via `DATA_DIR` (default `./data`), perfect for Proxmox bind mounts (`pct set <vmid> -mp0 ...`).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | **Node.js** (v22+ LTS or v24) |
| Database | **`node:sqlite`** (Node built-in `DatabaseSync` — zero C++ build dependencies) |
| Server / API | **Express.js**, **Multer**, **AdmZip**, **Cookie-Parser** |
| 3D Thumbnail Gen | **Puppeteer** (headless Chromium rendering Three.js snapshot) |
| Client 3D Viewer | **Three.js** (WebGL, OrbitControls, STLLoader, OBJLoader) |
| Deployment | **systemd** service on Debian / Ubuntu / Proxmox LXC |

---

## Local Development (Windows / Linux / macOS)

### 1. Prerequisites
- Node.js >= 22.0.0 (`node -v`)

### 2. Setup & Run
```bash
# Clone or enter directory
cd Anti-3d-model-dashboard

# Install dependencies
npm install

# (Optional) Configure environment
cp .env.example .env

# Start server
npm start
```

Open your browser at **`http://localhost:3005`**.

### Default Admin Credentials
- **Username:** `admin`
- **Password:** `adminpassword`
*(Configurable via `ADMIN_USER` and `ADMIN_PASSWORD` in your `.env`)*

---

## Bare-Metal & Proxmox LXC Deployment

Targeted for Debian 12 (Bookworm) or Ubuntu 22.04 / 24.04 inside a standard Proxmox LXC container (unprivileged or privileged).

### Step 1: Create Container in Proxmox
Create an LXC container with:
- **OS**: Debian 12 or Ubuntu 24.04
- **Cores**: 2+
- **RAM**: 2048 MB (Puppeteer headless browser needs ~300-500MB during rendering)
- **Disk**: 8-16 GB (or bind mount host storage for models)

### Step 2: Bind-Mount Host Storage (Recommended)
To keep model files and the SQLite database on your host filesystem or ZFS dataset (outside the container):

On your **Proxmox VE host shell**:
```bash
# Example: bind-mount host directory /mnt/storage/3d-models to /opt/3d-models/data in container ID 105
pct set 105 -mp0 /mnt/storage/3d-models,mp=/opt/3d-models/data
```

### Step 3: Run Automated Setup Script
Inside the LXC container:
```bash
# Clone or copy project into container
git clone <your-repo-url> /opt/3d-models
cd /opt/3d-models

# Make setup script executable and run
chmod +x setup.sh
./setup.sh
```

The script automatically:
1. Installs Node.js v22 LTS and required headless Chromium packages (`libnss3`, `libgbm1`, etc.).
2. Creates `/opt/3d-models/data`.
3. Runs `npm install --omit=dev`.
4. Installs and starts the `app.service` systemd unit.

### Step 4: Service Management
```bash
# Check service status
systemctl status app.service

# View live application logs
journalctl -u app.service -f

# Restart service
systemctl restart app.service
```

---

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3005` | Port the web server listens on |
| `DATA_DIR` | `./data` | Directory for SQLite database, uploaded files, and thumbnails |
| `SESSION_SECRET` | `anti-3d-model-secret-key-default` | Secret used to sign session cookies |
| `ADMIN_USER` | `admin` | Initial admin username auto-seeded if database is empty |
| `ADMIN_PASSWORD` | `adminpassword` | Initial admin password auto-seeded if database is empty |

---

## File Structure

```
.
├── server.js               # Core backend: REST API, SQLite schema, auth, model upload & CRUD
├── thumbnail.js            # Headless Puppeteer 3D snapshot renderer
├── package.json            # Minimal dependencies
├── app.service             # systemd unit definition for production
├── setup.sh                # Automated setup script for bare-metal / Proxmox LXC
├── .env.example            # Environment variables template
├── public/
│   ├── index.html          # Dashboard, 3D viewer modal, upload dropzone, admin modal
│   ├── app.js              # Client state, API caller, modal controller
│   ├── viewer.js           # Three.js client viewer (OrbitControls, materials, wireframe)
│   ├── render-worker.html  # Headless Three.js page used by Puppeteer for thumbnails
│   ├── style.css           # Clean dark-mode 3D printing dashboard theme
│   └── vendor/             # Bundled Three.js, STLLoader, OBJLoader, OrbitControls (offline ready)
└── data/                   # Dedicated storage directory for LXC bind mounts
    ├── database.sqlite     # SQLite database
    └── models/             # Stored 3D models and generated thumbnails
        └── {model_id}/
            ├── thumbnail.png
            └── files/
                └── {file.stl}
```
