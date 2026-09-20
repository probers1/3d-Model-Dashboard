#!/usr/bin/env bash
# ==============================================================================
# Bare-Metal / Proxmox LXC Deployment Script for 3D Model Management Dashboard
# Targeted for Debian 12 (Bookworm) / Ubuntu 22.04 / 24.04 LTS
# ==============================================================================

set -euo pipefail

APP_DIR="/opt/3d-models"
DATA_DIR="${APP_DIR}/data"
SERVICE_NAME="app.service"

echo "===> [1/6] Updating system packages..."
apt-get update -y
apt-get install -y curl ca-certificates gnupg git

echo "===> [2/6] Installing Node.js (v22 LTS or newer)..."
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 22 ]; then
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes
    NODE_MAJOR=22
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
    apt-get update -y
    apt-get install -y nodejs
fi
echo "Node version: $(node -v)"
echo "NPM version:  $(npm -v)"

echo "===> [3/6] Installing Chromium headless dependencies (for 3D thumbnail rendering)..."
# Standard headless Chromium dependencies on Debian/Ubuntu
apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 || apt-get install -y libasound2t64 || true

echo "===> [4/6] Setting up application directories..."
mkdir -p "${APP_DIR}"
mkdir -p "${DATA_DIR}/models"

# Copy project files to /opt/3d-models if running from an extracted repository
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ "${CURRENT_DIR}" != "${APP_DIR}" ]; then
    echo "Copying files from ${CURRENT_DIR} to ${APP_DIR}..."
    cp -r "${CURRENT_DIR}"/* "${APP_DIR}/" 2>/dev/null || true
    cp "${CURRENT_DIR}/.env.example" "${APP_DIR}/.env" 2>/dev/null || true
fi

cd "${APP_DIR}"

echo "===> [5/6] Installing Node dependencies..."
npm install --omit=dev

echo "===> [6/6] Configuring systemd service..."
cp "${APP_DIR}/${SERVICE_NAME}" /etc/systemd/system/${SERVICE_NAME}
systemctl daemon-reload
systemctl enable --now ${SERVICE_NAME}

echo ""
echo "=========================================================================="
echo " Deployment Complete!"
echo " Service Status: $(systemctl is-active ${SERVICE_NAME})"
echo " Listening on:   http://$(hostname -I | awk '{print $1}'):3005"
echo " Data directory: ${DATA_DIR}"
echo ""
echo " Proxmox LXC Bind-Mount Note:"
echo " If you want to bind-mount host storage (e.g. ZFS dataset or NAS):"
echo " On your Proxmox host, run:"
echo "   pct set <VMID> -mp0 /host/path/to/models,mp=/opt/3d-models/data"
echo "=========================================================================="
