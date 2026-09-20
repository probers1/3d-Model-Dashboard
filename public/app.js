// State Management
let currentUser = null;
let viewer = null;
let activeModel = null;
let activeFileId = null;
let queuedUploadFiles = [];

// DOM Elements
const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');
const navActions = document.getElementById('nav-actions');
const userUsername = document.getElementById('user-username');
const userRole = document.getElementById('user-role');
const btnAdmin = document.getElementById('btn-admin');
const btnLogout = document.getElementById('btn-logout');
const btnOpenUpload = document.getElementById('btn-open-upload');

const modelsGrid = document.getElementById('models-grid');
const emptyState = document.getElementById('empty-state');
const modelsCount = document.getElementById('models-count');
const searchInput = document.getElementById('search-input');

// Modals
const uploadModal = document.getElementById('upload-modal');
const detailModal = document.getElementById('detail-modal');
const adminModal = document.getElementById('admin-modal');

// Format utilities
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateString) {
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// -----------------------------------------------------------------------------
// Authentication
// -----------------------------------------------------------------------------
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
      showDashboard();
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

function showLogin() {
  currentUser = null;
  authView.style.display = 'flex';
  dashboardView.style.display = 'none';
  navActions.style.display = 'none';
}

function showDashboard() {
  authView.style.display = 'none';
  dashboardView.style.display = 'block';
  navActions.style.display = 'flex';

  userUsername.textContent = currentUser.username;
  userRole.textContent = currentUser.role;
  userRole.className = `role-tag ${currentUser.role}`;

  if (currentUser.role === 'admin') {
    btnAdmin.style.display = 'inline-flex';
  } else {
    btnAdmin.style.display = 'none';
  }

  loadModels();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errBox = document.getElementById('login-error');
  const btn = document.getElementById('btn-login-submit');

  errBox.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Signing in...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    currentUser = data.user;
    showDashboard();
  } catch (err) {
    errBox.textContent = err.message;
    errBox.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
});

btnLogout.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  showLogin();
});

// -----------------------------------------------------------------------------
// Models Dashboard
// -----------------------------------------------------------------------------
let searchDebounceTimer = null;
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    loadModels(searchInput.value);
  }, 250);
});

async function loadModels(query = '') {
  try {
    const url = query ? `/api/models?q=${encodeURIComponent(query)}` : '/api/models';
    const res = await fetch(url);
    if (!res.ok) return;

    const models = await res.json();
    modelsCount.textContent = `${models.length} model${models.length === 1 ? '' : 's'}`;

    if (models.length === 0) {
      modelsGrid.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    modelsGrid.innerHTML = models.map(m => createModelCardHTML(m)).join('');

    // Attach click listeners to cards
    document.querySelectorAll('.model-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('a')) return;
        const id = card.dataset.id;
        openModelDetail(id);
      });
    });
  } catch (err) {
    console.error('Failed to load models:', err);
  }
}

function createModelCardHTML(m) {
  const tags = m.tags ? m.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  const tagsHTML = tags.map(t => `<span class="tag-pill">#${t}</span>`).join('');
  const thumbUrl = `/api/models/${m.id}/thumbnail?t=${new Date(m.updated_at).getTime()}`;

  return `
    <div class="model-card" data-id="${m.id}">
      <div class="card-thumb">
        <img src="${thumbUrl}" alt="${m.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="card-thumb-placeholder" style="display: none;">🧊</div>
        <span class="card-badge-count">📦 ${m.file_count || 1}</span>
      </div>
      <div class="card-body">
        <h4 class="card-title" title="${m.title}">${m.title}</h4>
        <p class="card-desc">${m.description || 'No description provided.'}</p>
        <div class="card-tags">${tagsHTML}</div>
        <div class="card-footer">
          <span>By ${m.author || 'Unknown'}</span>
          <span>${formatDate(m.created_at)}</span>
        </div>
      </div>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// Model Detail & 3D Viewer
// -----------------------------------------------------------------------------
async function openModelDetail(modelId) {
  try {
    const res = await fetch(`/api/models/${modelId}`);
    if (!res.ok) return;

    activeModel = await res.json();

    // Populate Fields
    document.getElementById('modal-model-title').textContent = activeModel.title;
    document.getElementById('detail-edit-title').value = activeModel.title;
    document.getElementById('detail-edit-tags').value = activeModel.tags || '';
    document.getElementById('detail-edit-desc').value = activeModel.description || '';
    document.getElementById('detail-author').textContent = activeModel.author || 'Unknown';
    document.getElementById('detail-created').textContent = formatDate(activeModel.created_at);
    document.getElementById('detail-files-count').textContent = `${activeModel.files.length} file${activeModel.files.length === 1 ? '' : 's'}`;

    document.getElementById('btn-download-all').href = `/api/models/${activeModel.id}/download-all`;

    // Render Files List
    renderFilesList(activeModel.files);

    // Show Modal
    openModal(detailModal);

    // Initialize 3D Viewer if not yet created
    const container = document.getElementById('viewer-container');
    if (!viewer) {
      viewer = new Model3DViewer(container);
    }

    // Trigger viewer resize
    setTimeout(() => {
      viewer.onResize();
    }, 50);

    // Load first file into 3D viewer
    if (activeModel.files.length > 0) {
      selectFileForViewing(activeModel.files[0].id);
    }
  } catch (err) {
    console.error('Failed to open model detail:', err);
  }
}

function renderFilesList(files) {
  const container = document.getElementById('detail-files-list');
  container.innerHTML = files.map(f => `
    <div class="file-item ${f.id === activeFileId ? 'selected' : ''}" data-file-id="${f.id}">
      <div class="file-meta" style="cursor: pointer;" onclick="selectFileForViewing('${f.id}')">
        <span style="font-size: 1.1rem;">📄</span>
        <div>
          <div class="file-name" title="${f.original_name}">${f.original_name}</div>
          <div class="file-size">${formatBytes(f.size)} • ${f.file_ext.toUpperCase()}</div>
        </div>
      </div>
      <div class="file-actions">
        <a href="/api/models/${activeModel.id}/files/${f.id}/download" class="btn btn-secondary btn-sm" title="Download file">⬇️</a>
        <button class="btn btn-danger btn-sm" title="Delete file" onclick="deleteModelFile('${f.id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

async function selectFileForViewing(fileId) {
  activeFileId = fileId;
  const file = activeModel.files.find(f => f.id === fileId);
  if (!file) return;

  // Highlight selected row in file list
  document.querySelectorAll('#detail-files-list .file-item').forEach(el => {
    el.classList.toggle('selected', el.dataset.fileId === fileId);
  });

  const fileUrl = `/api/models/${activeModel.id}/files/${file.id}/download`;
  try {
    await viewer.loadModel(fileUrl, file.file_ext);
  } catch (err) {
    console.error('Failed to render 3D file:', err);
  }
}

// Viewer Controls
document.querySelectorAll('.color-swatch').forEach(swatch => {
  swatch.addEventListener('click', () => {
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');
    const color = parseInt(swatch.dataset.color, 16);
    viewer.setColor(color);
  });
});

document.getElementById('btn-toggle-wireframe').addEventListener('click', () => {
  if (viewer) {
    const isWire = viewer.toggleWireframe();
    document.getElementById('btn-toggle-wireframe').classList.toggle('btn-primary', isWire);
  }
});

document.getElementById('btn-reset-camera').addEventListener('click', () => {
  if (viewer) viewer.resetCamera();
});

// Save Metadata
document.getElementById('btn-save-metadata').addEventListener('click', async () => {
  if (!activeModel) return;
  const title = document.getElementById('detail-edit-title').value.trim();
  const tags = document.getElementById('detail-edit-tags').value.trim();
  const description = document.getElementById('detail-edit-desc').value.trim();

  const btn = document.getElementById('btn-save-metadata');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const res = await fetch(`/api/models/${activeModel.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, tags, description })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update model');
    }

    activeModel.title = title;
    activeModel.tags = tags;
    activeModel.description = description;
    document.getElementById('modal-model-title').textContent = title;
    loadModels(searchInput.value);
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
});

// Delete Model
document.getElementById('btn-delete-model').addEventListener('click', async () => {
  if (!activeModel) return;
  if (!confirm(`Are you sure you want to permanently delete "${activeModel.title}" and all its files?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/models/${activeModel.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete model');
    }

    closeModal(detailModal);
    loadModels(searchInput.value);
  } catch (err) {
    alert(err.message);
  }
});

// Delete Single File
async function deleteModelFile(fileId) {
  if (!activeModel) return;
  const file = activeModel.files.find(f => f.id === fileId);
  if (!confirm(`Delete "${file ? file.original_name : 'this file'}"?`)) return;

  try {
    const res = await fetch(`/api/models/${activeModel.id}/files/${fileId}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete file');
    }

    // Refresh model data
    const refreshRes = await fetch(`/api/models/${activeModel.id}`);
    if (refreshRes.ok) {
      activeModel = await refreshRes.json();
      renderFilesList(activeModel.files);
      document.getElementById('detail-files-count').textContent = `${activeModel.files.length} files`;
      if (activeModel.files.length > 0) {
        selectFileForViewing(activeModel.files[0].id);
      } else {
        viewer.clearModel();
      }
      loadModels(searchInput.value);
    }
  } catch (err) {
    alert(err.message);
  }
}

// -----------------------------------------------------------------------------
// Upload Modal & Dropzone
// -----------------------------------------------------------------------------
btnOpenUpload.addEventListener('click', () => {
  queuedUploadFiles = [];
  document.getElementById('upload-form').reset();
  document.getElementById('selected-files-list').innerHTML = '';
  document.getElementById('upload-error').style.display = 'none';
  openModal(uploadModal);
});

const dropzone = document.getElementById('upload-dropzone');
const fileInput = document.getElementById('upload-file-input');

dropzone.addEventListener('click', () => fileInput.click());

['dragenter', 'dragover'].forEach(name => {
  dropzone.addEventListener(name, (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach(name => {
  dropzone.addEventListener(name, (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
  });
});

dropzone.addEventListener('drop', (e) => {
  const files = Array.from(e.dataTransfer.files);
  handleFilesSelected(files);
});

fileInput.addEventListener('change', () => {
  const files = Array.from(fileInput.files);
  handleFilesSelected(files);
});

function handleFilesSelected(files) {
  const valid = files.filter(f => {
    const ext = f.name.split('.').pop().toLowerCase();
    return ['stl', 'obj', 'zip'].includes(ext);
  });

  if (valid.length === 0) {
    alert('Please select .stl, .obj, or .zip files.');
    return;
  }

  // Auto-fill title from first file if empty
  const titleInput = document.getElementById('upload-title');
  if (!titleInput.value && valid.length > 0) {
    const rawName = valid[0].name.replace(/\.[^/.]+$/, '');
    titleInput.value = rawName.replace(/[_-]/g, ' ');
  }

  queuedUploadFiles = [...queuedUploadFiles, ...valid];
  renderSelectedUploadFiles();
}

function renderSelectedUploadFiles() {
  const container = document.getElementById('selected-files-list');
  container.innerHTML = queuedUploadFiles.map((f, i) => `
    <div class="file-item">
      <div class="file-meta">
        <span>📄</span>
        <span class="file-name">${f.name}</span>
        <span class="file-size">(${formatBytes(f.size)})</span>
      </div>
      <button type="button" class="btn btn-sm" style="color: var(--danger);" onclick="removeUploadFile(${i})">&times;</button>
    </div>
  `).join('');
}

function removeUploadFile(index) {
  queuedUploadFiles.splice(index, 1);
  renderSelectedUploadFiles();
}

document.getElementById('upload-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (queuedUploadFiles.length === 0) {
    alert('Please select at least one .stl/.obj or .zip file.');
    return;
  }

  const title = document.getElementById('upload-title').value.trim();
  const tags = document.getElementById('upload-tags').value.trim();
  const desc = document.getElementById('upload-desc').value.trim();
  const btn = document.getElementById('btn-upload-submit');
  const errBox = document.getElementById('upload-error');

  errBox.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> <span>Extracting & Rendering 3D Preview...</span>`;

  const formData = new FormData();
  formData.append('title', title);
  formData.append('tags', tags);
  formData.append('description', desc);

  for (const f of queuedUploadFiles) {
    formData.append('files', f);
  }

  try {
    const res = await fetch('/api/models', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    closeModal(uploadModal);
    await loadModels();
    openModelDetail(data.id);
  } catch (err) {
    errBox.textContent = err.message;
    errBox.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>Create Model</span>`;
  }
});

// -----------------------------------------------------------------------------
// Admin User Management
// -----------------------------------------------------------------------------
btnAdmin.addEventListener('click', () => {
  loadAdminUsers();
  openModal(adminModal);
});

async function loadAdminUsers() {
  try {
    const res = await fetch('/api/users');
    if (!res.ok) return;

    const users = await res.json();
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = users.map(u => `
      <tr>
        <td><strong>${u.username}</strong></td>
        <td><span class="role-tag ${u.role}">${u.role}</span></td>
        <td style="color: var(--text-muted); font-size: 0.8rem;">${formatDate(u.created_at)}</td>
        <td style="text-align: right;">
          ${u.id !== currentUser.id ? `<button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')">Delete</button>` : '<span style="color: var(--text-muted); font-size: 0.75rem;">(You)</span>'}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load users:', err);
  }
}

document.getElementById('create-user-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('new-user-username').value.trim();
  const password = document.getElementById('new-user-password').value;
  const role = document.getElementById('new-user-role').value;

  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create user');

    document.getElementById('create-user-form').reset();
    loadAdminUsers();
  } catch (err) {
    alert(err.message);
  }
});

async function deleteUser(id) {
  if (!confirm('Are you sure you want to delete this user?')) return;
  try {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete user');
    }
    loadAdminUsers();
  } catch (err) {
    alert(err.message);
  }
}

// -----------------------------------------------------------------------------
// Modal Helpers
// -----------------------------------------------------------------------------
function openModal(modal) {
  modal.classList.add('active');
}

function closeModal(modal) {
  modal.classList.remove('active');
}

document.querySelectorAll('.modal-overlay').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.hasAttribute('data-close')) {
      closeModal(modal);
    }
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(closeModal);
  }
});

// Startup
checkAuth();
