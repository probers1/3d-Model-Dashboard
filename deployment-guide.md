# 🚀 PrintVault Deployment Guide (LXC / Bare-Metal)

This guide details how to deploy PrintVault into minimal containerized environments like Proxmox LXC, ensuring all dependencies and services are correctly configured for production.

## 🎯 Target Environment
This setup is targeted for Debian 12 (Bookworm) or Ubuntu 22.04 / 24.04 inside a standard Proxmox LXC container (unprivileged or private).

## 🛠 Prerequisites
1.  **Host OS:** Proxmox VE host shell access.
2.  **LXC Container:** A newly created LXC container configured with:
    *   **Cores:** 2+
    *   **RAM:** 2048 MB (Puppeteer headless browser needs ~300-500MB during rendering)
    *   **Disk:** 8-16 GB (or bind mount host storage for models)

## 💾 Step 1: Bind-Mount Host Storage (Recommended)
To keep model files and the SQLite database on your host filesystem or ZFS dataset (outside the container):

On your **Proxmox VE host shell**:
```bash
# Example: bind-mount host directory /mnt/storage/3d-models to /opt/3d-models/data in container ID 105
pct set 105 -mp0 /mnt/storage/3d-models,mp=/opt/3d-models/data
```

## 📦 Step 2: Automated Setup Script Execution
Inside the LXC container, execute the setup script to handle all required installations and service management:

```bash
# Clone or copy project into container
git clone <your-repo-url> /opt/printvault
cd /opt/printvault

# Make setup script executable and run
chmod +x setup.sh
./setup.sh
```

The script automatically performs the following actions:
1. Installs Node.js v22 LTS and required headless Chromium packages (`libnss3`, `libgbm1`, etc.).
2. Creates `/opt/printvault/data`.
3. Runs `npm install --omit=dev` (installs TypeScript, @types/*, puppeteer, three.js, etc.).
4. Builds the TypeScript project with `npm run build`.
5. Installs and starts the `app.service` systemd unit.

## ⚙️ Step 3: Service Management
After setup, use standard `systemctl` commands:

```bash
# Check service status
systemctl status app.service

# View live application logs
journalctl -u app.service -f

# Restart service
systemctl restart app.service
```

## 🔑 Environment Variables
| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3005` | Port the web server listens on |
| `DATA_DIR` | `./data` | Directory for SQLite database, uploaded files, and thumbnails |
| `SESSION_SECRET` | `anti-3d-model-secret-key-default` | Secret used to sign session cookies |
| `ADMIN_USER` | `admin` | Initial admin username auto-seeded if database is empty |
| `ADMIN_PASSWORD` | `adminpassword` | Initial admin password auto-seeded if database is empty |