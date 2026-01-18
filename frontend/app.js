// ====== APP.JS - FreeFromTrial (Backend-connected) ======

let currentUser = null;

// NOTE: "subscriptions" est utilisé partout par ton UI.
// On va l'alimenter à partir du backend (/api/trials).
let subscriptions = [];

// ====== INITIALIZATION ======
document.addEventListener('DOMContentLoaded', async function () {
  // Set min date for trial date input
  const dateInput = document.getElementById('trialDate');
  if (dateInput) {
    dateInput.min = new Date().toISOString().split('T')[0];
  }

  // Check session via backend
  try {
    const user = await apiMe();
    if (user) {
      currentUser = user; // {id,email,name,picture}
      showDashboard();
    } else {
      // Not logged in -> show landing
      document.getElementById('dashboard')?.classList.add('hidden');
      document.getElementById('landingPage')?.classList.remove('hidden');
    }
  } catch (e) {
    console.error("Init error:", e);
    showToast("Backend not reachable. Check /api/health.");
  }
});

// ====== AUTH (Google OAuth) ======

async function apiMe() {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) return null;
  return await res.json();
}

function loginWithGoogle() {
  // Redirect to backend (which redirects to Google)
  window.location.href = "/api/oauth/google";
}

async function logoutAPI() {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

// Keep your logout() name so HTML doesn't break
async function logout() {
  try {
    await logoutAPI();
  } catch (e) {
    console.warn("Logout failed:", e);
  }
  currentUser = null;

  // Hide dashboard, show landing
  document.getElementById('dashboard')?.classList.add('hidden');
  document.getElementById('landingPage')?.classList.remove('hidden');

  // Close dropdown if open
  document.getElementById('userDropdown')?.classList.add('hidden');

  showToast("Logged out");
}

// OPTIONAL: You can keep these modal helpers if your UI still has them
function showAuth(type) {
  const modal = document.getElementById('authModal');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  if (!modal) return;
  modal.classList.remove('hidden');

  if (type === 'login') {
    loginForm?.classList.remove('hidden');
    signupForm?.classList.add('hidden');
  } else {
    loginForm?.classList.add('hidden');
    signupForm?.classList.remove('hidden');
  }
}

function hideAuth() {
  document.getElementById('authModal')?.classList.add('hidden');
}

// ====== BACKEND TRIALS API ======

async function apiListTrials() {
  const res = await fetch("/api/trials", { credentials: "include" });
  if (!res.ok) {
    // If 401 -> not logged in
    if (res.status === 401) return null;
    throw new Error(await res.text());
  }
  return await res.json();
}

async function apiCreateTrial(payload) {
  const res = await fetch("/api/trials", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    // show server error details in console
    console.error("Create trial failed:", res.status, text);
    throw new Error(text);
  }
  return await res.json();
}

async function apiDeleteTrial(id) {
  const res = await fetch(`/api/trials/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("Delete trial failed:", res.status, text);
    throw new Error(text);
  }
  return await res.json();
}

// ====== DASHBOARD FUNCTIONS ======

function showDashboard() {
  // Hide landing page
  document.getElementById('landingPage')?.classList.add('hidden');

  // Show dashboard
  document.getElementById('dashboard')?.classList.remove('hidden');

  // Update user info in navbar
  if (currentUser) {
    const name = currentUser.name || currentUser.email || "User";
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();

    const avatarEl = document.getElementById('userAvatar');
    const userNameEl = document.getElementById('userName');

    if (avatarEl) avatarEl.textContent = initials.slice(0, 2);
    if (userNameEl) userNameEl.textContent = name.split(' ')[0];

    // Update settings
    const settingsName = document.getElementById('settingsName');
    const settingsEmail = document.getElementById('settingsEmail');
    if (settingsName) settingsName.value = name;
    if (settingsEmail) settingsEmail.value = currentUser.email || "";
  }

  // Render dashboard data (async)
  renderDashboard();
}

async function renderDashboard() {
  // Pull from backend
  const trials = await apiListTrials();
  if (trials === null) {
    // not logged in
    showToast("Please log in");
    await logout();
    return;
  }

  // Convert backend trials -> UI subscriptions
  subscriptions = trials.map(t => ({
    id: t._id,
    name: t.serviceName,
    icon: pickIcon(t.serviceName),
    expiresIn: (typeof t.daysLeft === "number") ? t.daysLeft : daysUntil(t.endDate),
    expiryDate: t.endDate,
    status: mapBackendStatusToUi(t.status),
    price: (t.renewalPrice != null) ? `$${Number(t.renewalPrice).toFixed(2)}` : "Unknown",
    cancelUrl: t.cancelUrl || "#",
    category: "Subscription"
  }));

  // Update stats
  const activeTrials = subscriptions.filter(s => s.status !== 'cancelled');
  const urgentTrials = subscriptions.filter(s => s.status === 'urgent');
  const cancelledTrials = subscriptions.filter(s => s.status === 'cancelled');

  const totalEl = document.getElementById('totalTrials');
  const urgentEl = document.getElementById('urgentTrials');
  const cancelledEl = document.getElementById('cancelledTrials');
  const savedEl = document.getElementById('moneySaved');

  if (totalEl) totalEl.textContent = activeTrials.length;
  if (urgentEl) urgentEl.textContent = urgentTrials.length;
  if (cancelledEl) cancelledEl.textContent = cancelledTrials.length;
  if (savedEl) savedEl.textContent = '$' + calculateSavings().toFixed(2);

  // Render lists
  renderUrgentList();
  renderUpcomingList();
  renderAllSubscriptions();
}

function renderUrgentList() {
  const list = document.getElementById('urgentList');
  if (!list) return;

  const urgent = subscriptions.filter(s => s.status === 'urgent' || s.status === 'warning');

  if (urgent.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎉</div>
        <p>No urgent trials! You're all caught up.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = urgent.map(sub => createTrialItem(sub)).join('');
}

function renderUpcomingList() {
  const list = document.getElementById('upcomingList');
  if (!list) return;

  const upcoming = subscriptions
    .filter(s => s.status !== 'cancelled')
    .sort((a, b) => a.expiresIn - b.expiresIn)
    .slice(0, 5);

  if (upcoming.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>No subscriptions yet. Add your first trial!</p>
      </div>
    `;
    return;
  }

  list.innerHTML = upcoming.map(sub => createTrialItem(sub)).join('');
}

function createTrialItem(sub) {
  const expiryText = sub.status === 'cancelled'
    ? 'Cancelled'
    : `${sub.expiresIn} day${sub.expiresIn !== 1 ? 's' : ''} left • ${sub.price}`;

  return `
    <div class="trial-item">
      <div class="trial-icon">${sub.icon}</div>
      <div class="trial-info">
        <h4>${escapeHtml(sub.name)}</h4>
        <p>${escapeHtml(expiryText)}</p>
      </div>
      <span class="trial-status ${sub.status}">${statusLabels[sub.status] || sub.status}</span>
      ${sub.status !== 'cancelled' ? `
        <div class="trial-actions">
          <a href="${escapeAttr(sub.cancelUrl)}" target="_blank" class="btn-primary" style="text-decoration:none;">Cancel</a>
        </div>
      ` : ''}
    </div>
  `;
}

function renderAllSubscriptions(filter = 'all', search = '') {
  const list = document.getElementById('allSubscriptionsList');
  if (!list) return;

  let filtered = subscriptions;

  // Apply status filter
  if (filter !== 'all') {
    filtered = filtered.filter(s => s.status === filter);
  }

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(s =>
      s.name.toLowerCase().includes(searchLower) ||
      (s.category || '').toLowerCase().includes(searchLower)
    );
  }

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <div class="empty-icon">🔍</div>
        <p>No subscriptions found</p>
      </div>
    `;
    return;
  }

  list.innerHTML = filtered.map(sub => createSubscriptionCard(sub)).join('');
}

function createSubscriptionCard(sub) {
  const expiryText = sub.status === 'cancelled'
    ? 'Cancelled'
    : formatDate(sub.expiryDate);

  return `
    <div class="subscription-card">
      <div class="subscription-header">
        <div class="sub-icon">${sub.icon}</div>
        <div class="sub-info">
          <h4>${escapeHtml(sub.name)}</h4>
          <p>${escapeHtml(sub.category || 'Subscription')}</p>
        </div>
        <span class="trial-status ${sub.status}">${statusLabels[sub.status] || sub.status}</span>
      </div>
      <div class="subscription-details">
        <div class="detail">
          <span>Expires</span>
          <span>${escapeHtml(expiryText)}</span>
        </div>
        <div class="detail">
          <span>Price</span>
          <span>${escapeHtml(sub.price)}</span>
        </div>
        <div class="detail">
          <span>Days left</span>
          <span>${sub.status === 'cancelled' ? '-' : sub.expiresIn}</span>
        </div>
      </div>
      <div class="subscription-actions">
        ${sub.status !== 'cancelled' ? `
          <a href="${escapeAttr(sub.cancelUrl)}" target="_blank" class="btn-primary" style="text-decoration:none;">Cancel</a>
          <!-- Mark cancelled (UI only). If you want backend state, add PATCH endpoint -->
          <button class="btn-secondary" onclick="markCancelled('${escapeJs(sub.id)}')">Mark Cancelled</button>
        ` : `
          <button class="btn-secondary" onclick="deleteTrial('${escapeJs(sub.id)}')">Remove</button>
        `}
      </div>
    </div>
  `;
}

// ====== NAVIGATION ======

function showSection(section, event) {
  // Hide all sections
  document.getElementById('overviewSection')?.classList.add('hidden');
  document.getElementById('subscriptionsSection')?.classList.add('hidden');
  document.getElementById('settingsSection')?.classList.add('hidden');

  // Show selected section
  document.getElementById(section + 'Section')?.classList.remove('hidden');

  // Update nav active state
  document.querySelectorAll('.dashboard-nav .nav-links a').forEach(a => a.classList.remove('nav-active'));
  if (event?.target) event.target.classList.add('nav-active');

  // Close user dropdown
  document.getElementById('userDropdown')?.classList.add('hidden');
}

function toggleUserMenu() {
  const dropdown = document.getElementById('userDropdown');
  dropdown?.classList.toggle('hidden');
}

// Close dropdown when clicking outside
document.addEventListener('click', function (e) {
  const userMenu = document.querySelector('.user-menu');
  const dropdown = document.getElementById('userDropdown');

  if (userMenu && dropdown && !userMenu.contains(e.target)) {
    dropdown.classList.add('hidden');
  }
});

// ====== FILTER FUNCTIONS ======

function filterByStatus(status, event) {
  // Update active tab
  document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
  if (event?.target) event.target.classList.add('active');

  // Re-render with filter
  renderAllSubscriptions(status);
}

function filterSubscriptions(searchTerm) {
  const activeFilter = document.querySelector('.filter-tab.active');
  const status = activeFilter ? activeFilter.textContent.toLowerCase() : 'all';
  renderAllSubscriptions(status, searchTerm);
}

// ====== ADD TRIAL MODAL ======

function openAddModal() {
  document.getElementById('addModal')?.classList.remove('hidden');

  // Clear form
  const t1 = document.getElementById('trialName');
  const t2 = document.getElementById('trialDate');
  const t3 = document.getElementById('trialPrice');
  const t4 = document.getElementById('trialUrl');

  if (t1) t1.value = '';
  if (t2) t2.value = '';
  if (t3) t3.value = '';
  if (t4) t4.value = '';
}

function closeAddModal() {
  document.getElementById('addModal')?.classList.add('hidden');
}

async function addTrial() {
  const name = document.getElementById('trialName')?.value.trim();
  const endDate = document.getElementById('trialDate')?.value;
  const priceRaw = document.getElementById('trialPrice')?.value.trim();
  const urlRaw = document.getElementById('trialUrl')?.value.trim();

  if (!name || !endDate) {
    alert('Please enter a service name and expiry date');
    return;
  }

  const renewalPrice = priceRaw ? Number(priceRaw) : null;
  if (priceRaw && Number.isNaN(renewalPrice)) {
    alert("Price must be a number");
    return;
  }

  try {
    await apiCreateTrial({
      serviceName: name,
      endDate: endDate,            // "YYYY-MM-DD"
      cancelUrl: urlRaw || null,
      renewalPrice: renewalPrice
    });

    closeAddModal();
    await renderDashboard();
    showToast(`${name} added successfully!`);
  } catch (e) {
    console.error(e);
    // backend may return 409 on duplicate
    showToast("Error adding trial (maybe duplicate?)");
  }
}

// ====== TRIAL ACTIONS ======

function markCancelled(id) {
  const sub = subscriptions.find(s => String(s.id) === String(id));
  if (sub) {
    sub.status = 'cancelled';
    sub.expiresIn = -1;
    renderDashboard();
    showToast(`${sub.name} marked as cancelled (UI only)!`);
  }
}

async function deleteTrial(id) {
  if (!confirm('Are you sure you want to remove this subscription?')) return;

  try {
    await apiDeleteTrial(id);
    await renderDashboard();
    showToast('Subscription removed');
  } catch (e) {
    console.error(e);
    showToast('Error removing subscription');
  }
}

// ====== SETTINGS FUNCTIONS ======

function saveProfile() {
  // For now, profile is from Google; you can later PATCH /api/users/me
  showToast("Profile is managed by Google OAuth (read-only for now).");
}

function deleteAccount() {
  showToast("Not implemented yet.");
}

// ====== TOAST NOTIFICATIONS ======

function showToast(message) {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  // Create toast
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    background: #1E293B;
    color: #F8FAFC;
    padding: 1rem 2rem;
    border-radius: 10px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
    z-index: 3000;
    animation: toastIn 0.3s ease;
  `;

  document.body.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add toast animations to document
const toastStyles = document.createElement('style');
toastStyles.textContent = `
  @keyframes toastIn {
    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  @keyframes toastOut {
    from { opacity: 1; transform: translateX(-50%) translateY(0); }
    to { opacity: 0; transform: translateX(-50%) translateY(20px); }
  }
`;
document.head.appendChild(toastStyles);

// ====== HELPERS (UI + Safety) ======

function mapBackendStatusToUi(status) {
  // backend: detected|confirmed|canceled|expired
  if (!status) return 'active';
  const s = String(status).toLowerCase();

  if (s === "canceled" || s === "cancelled") return "cancelled";
  if (s === "expired") return "cancelled";

  // Use daysLeft to decide urgent/warning if available later.
  // For now mark as active.
  return "active";
}

function pickIcon(serviceName) {
  // If you have commonServices in another file, use that.
  // Otherwise simple default.
  if (!serviceName) return "📱";
  const s = serviceName.toLowerCase();
  if (s.includes("netflix")) return "🎬";
  if (s.includes("youtube")) return "📺";
  if (s.includes("spotify")) return "🎵";
  if (s.includes("amazon")) return "📦";
  if (s.includes("apple")) return "🍎";
  return "📱";
}

function daysUntil(dateStrOrIso) {
  const d = new Date(dateStrOrIso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

function formatDate(dateStrOrIso) {
  const d = new Date(dateStrOrIso);
  if (Number.isNaN(d.getTime())) return String(dateStrOrIso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  // minimal for href attributes
  return String(str ?? "").replaceAll('"', "%22").replaceAll("'", "%27");
}

function escapeJs(str) {
  return String(str ?? "").replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}
