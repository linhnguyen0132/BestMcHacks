// ====== APP.JS - FreeFromTrial (UPDATED) ======

// ====== INITIALIZATION ======

// ---------- Dropdown (global) ----------
function initServiceDropdown() {
  const select = document.getElementById("trialServiceSelect");
  if (!select || typeof commonServices === "undefined") return;

  select.innerHTML = `
    <option value="">Select a service…</option>
    <option value="manual">Other (type manually)</option>
  `;

  commonServices
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(service => {
      const opt = document.createElement("option");
      opt.value = service.name;
      opt.textContent = `${service.icon} ${service.name}`;
      select.appendChild(opt);
    });
}


// Auto-fill cancel url (et prix plus tard si tu veux)
function onServiceSelectChange() {
  const select = document.getElementById("trialServiceSelect");
  const nameInput = document.getElementById("trialName");
  const priceInput = document.getElementById("trialPrice");
  const urlInput = document.getElementById("trialUrl");

  if (!select) return;

  const value = select.value;

  if (!value || value === "manual") {
    nameInput.disabled = false;
    if (value === "manual") nameInput.value = "";
    return;
  }

  const svc = commonServicesMap[value];
  if (!svc) return;

  nameInput.disabled = true;
  nameInput.value = svc.name;
  priceInput.value = svc.price || "";
  urlInput.value = svc.cancelUrl || "";
}


// ---------- One single DOMContentLoaded ----------
document.addEventListener("DOMContentLoaded", async () => {
  // init dropdown even if not logged in
  initServiceDropdown();

  // Set min date
  const dateInput = document.getElementById("trialDate");
  if (dateInput) dateInput.min = new Date().toISOString().split("T")[0];

  // Auth check
  const me = await apiMe();
  if (me) {
    currentUser = me;
    if (typeof refreshSubscriptionsFromDB === "function") {
      await refreshSubscriptionsFromDB();
    }
    showDashboard();
  }
});



// ====== AUTH FUNCTIONS ======

function showAuth(type) {
    const modal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    modal.classList.remove('hidden');
    
    if (type === 'login') {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    } else {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
    }
}

function hideAuth() {
    document.getElementById('authModal').classList.add('hidden');
}

function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    currentUser = {
        id: 1,
        name: email.split('@')[0],
        email: email
    };
    
    localStorage.setItem('fftUser', JSON.stringify(currentUser));
    
    hideAuth();
    showDashboard();
}

function signup() {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    
    if (!name || !email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    currentUser = {
        id: Date.now(),
        name: name,
        email: email
    };
    
    localStorage.setItem('fftUser', JSON.stringify(currentUser));
    
    hideAuth();
    showDashboard();
}

async function logout() {
    await logoutAPI();

    currentUser = null;
    localStorage.removeItem('fftUser');

    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('landingPage').classList.remove('hidden');
    document.getElementById('userDropdown').classList.add('hidden');
}


// ====== DASHBOARD FUNCTIONS ======

function showDashboard() {
    document.getElementById('landingPage').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    if (currentUser) {
        const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
        document.getElementById('userAvatar').textContent = initials.slice(0, 2);
        document.getElementById('userName').textContent = currentUser.name.split(' ')[0];
        
        document.getElementById('settingsName').value = currentUser.name;
        document.getElementById('settingsEmail').value = currentUser.email;
    }
    
    renderDashboard();
}

function renderDashboard() {
    const activeTrials = subscriptions.filter(s => s.status !== 'cancelled');
    const urgentTrials = subscriptions.filter(s => s.status === 'urgent');
    const cancelledTrials = subscriptions.filter(s => s.status === 'cancelled');
    
    document.getElementById('totalTrials').textContent = activeTrials.length;
    document.getElementById('urgentTrials').textContent = urgentTrials.length;
    document.getElementById('cancelledTrials').textContent = cancelledTrials.length;
    document.getElementById('moneySaved').textContent = '$' + calculateSavings().toFixed(2);
    
    renderUrgentList();
    renderUpcomingList();
    renderAllSubscriptions();
}

function renderUrgentList() {
    const list = document.getElementById('urgentList');
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

// ====== UPDATED: createTrialItem with smart Cancel button ======
function createTrialItem(sub) {
    const expiryText = sub.status === 'cancelled' 
        ? 'Cancelled' 
        : `${sub.expiresIn} day${sub.expiresIn !== 1 ? 's' : ''} left • ${sub.price}`;
    
    // Check if cancelUrl exists and is valid
    const hasCancelUrl = sub.cancelUrl && sub.cancelUrl !== '#' && sub.cancelUrl !== '';
    
    let cancelButton = '';
    if (sub.status !== 'cancelled') {
        if (hasCancelUrl) {
            // Has cancel URL → show clickable button that opens link AND offers to mark as cancelled
            cancelButton = `
                <div class="trial-actions">
                    <button class="btn-primary" onclick="openCancelLink('${sub.id}', '${sub.cancelUrl}')">Cancel</button>
                </div>
            `;
        } else {
            // No cancel URL → show disabled button with tooltip
            cancelButton = `
                <div class="trial-actions">
                    <button class="btn-disabled" disabled title="No cancellation link available">No link</button>
                </div>
            `;
        }
    }
    
    return `
        <div class="trial-item">
            <div class="trial-icon">${sub.icon}</div>
            <div class="trial-info">
                <h4>${sub.name}</h4>
                <p>${expiryText}</p>
            </div>
            <span class="trial-status ${sub.status}">${statusLabels[sub.status]}</span>
            ${cancelButton}
        </div>
    `;
}
function onServiceSelectChange() {
  const select = document.getElementById("trialServiceSelect");
  const manualInput = document.getElementById("trialName");
  const priceInput = document.getElementById("trialPrice");
  const urlInput = document.getElementById("trialUrl");

  if (!select) return;

  const value = select.value;

  if (value === "manual" || value === "") {
    // manual mode
    manualInput.classList.remove("hidden");
    manualInput.value = "";
    // don't wipe user inputs if they already typed
    return;
  }

  // Selected a known service
  manualInput.classList.add("hidden");
  manualInput.value = value;

  // Auto-fill cancel URL
  const svc = commonServices[value];
  if (svc?.cancelUrl && urlInput) urlInput.value = svc.cancelUrl;

  // OPTIONAL: auto-fill price (if you store it)
  // If you don't have prices in commonServices yet, leave as is.
  // Example:
  // if (svc?.price && priceInput) priceInput.value = svc.price;
}

// ====== UPDATED: createSubscriptionCard with smart Cancel button ======
function createSubscriptionCard(sub) {
    const expiryText = sub.status === 'cancelled' 
        ? 'Cancelled' 
        : formatDate(sub.expiryDate);
    
    // Check if cancelUrl exists and is valid
    const hasCancelUrl = sub.cancelUrl && sub.cancelUrl !== '#' && sub.cancelUrl !== '';
    
    let actionButtons = '';
    if (sub.status !== 'cancelled') {
        if (hasCancelUrl) {
            // Has cancel URL → two buttons
            actionButtons = `
                <button class="btn-primary" onclick="openCancelLink('${sub.id}', '${sub.cancelUrl}')">Cancel</button>
                <button class="btn-secondary" onclick="markCancelled('${sub.id}')">Mark Cancelled</button>
            `;
        } else {
            // No cancel URL → disabled cancel button + mark cancelled button
            actionButtons = `
                <button class="btn-disabled" disabled title="No cancellation link available">No cancel link</button>
                <button class="btn-secondary" onclick="markCancelled('${sub.id}')">Mark Cancelled</button>
            `;
        }
    } else {
        // Already cancelled → just show remove button
        actionButtons = `
            <button class="btn-secondary" onclick="deleteTrial('${sub.id}')">Remove</button>
        `;
    }
    
    return `
        <div class="subscription-card">
            <div class="subscription-header">
                <div class="sub-icon">${sub.icon}</div>
                <div class="sub-info">
                    <h4>${sub.name}</h4>
                    <p>${sub.category || 'Subscription'}</p>
                </div>
                <span class="trial-status ${sub.status}">${statusLabels[sub.status]}</span>
            </div>
            <div class="subscription-details">
                <div class="detail">
                    <span>Expires</span>
                    <span>${expiryText}</span>
                </div>
                <div class="detail">
                    <span>Price</span>
                    <span>${sub.price}</span>
                </div>
                <div class="detail">
                    <span>Days left</span>
                    <span>${sub.status === 'cancelled' ? '-' : sub.expiresIn}</span>
                </div>
            </div>
            <div class="subscription-actions">
                ${actionButtons}
            </div>
        </div>
    `;
}

// ====== NEW: Function to open cancel link and ask to mark as cancelled ======
function openCancelLink(id, url) {
    // Open the cancellation page in a new tab
    window.open(url, '_blank');
    
    // Ask user if they want to mark it as cancelled
    setTimeout(() => {
        if (confirm('Did you cancel the subscription?\n\nClick OK to mark it as cancelled in your dashboard.')) {
            markCancelled(id);
        }
    }, 500); // Small delay so the new tab opens first
}

// ====== NAVIGATION ======

function showSection(section) {
    document.getElementById('overviewSection').classList.add('hidden');
    document.getElementById('subscriptionsSection').classList.add('hidden');
    document.getElementById('settingsSection').classList.add('hidden');
    
    document.getElementById(section + 'Section').classList.remove('hidden');
    
    document.querySelectorAll('.dashboard-nav .nav-links a').forEach(a => {
        a.classList.remove('nav-active');
    });
    event.target.classList.add('nav-active');
    
    document.getElementById('userDropdown').classList.add('hidden');
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('hidden');
}

document.addEventListener('click', function(e) {
    const userMenu = document.querySelector('.user-menu');
    const dropdown = document.getElementById('userDropdown');
    
    if (userMenu && dropdown && !userMenu.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

// ====== FILTER FUNCTIONS ======

function filterByStatus(status) {
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderAllSubscriptions(status);
}

function filterSubscriptions(searchTerm) {
    const activeFilter = document.querySelector('.filter-tab.active');
    const status = activeFilter ? activeFilter.textContent.toLowerCase() : 'all';
    renderAllSubscriptions(status, searchTerm);
}

// ====== ADD TRIAL MODAL ======

function openAddModal() {
    document.getElementById('addModal').classList.remove('hidden');

    // Reset dropdown + manual field
    const select = document.getElementById("trialServiceSelect");
    const manualWrap = document.getElementById("manualServiceWrapper");
    const nameInput = document.getElementById("trialName");

    if (select) select.value = "";
    if (manualWrap) manualWrap.classList.add("hidden");
    if (nameInput) nameInput.value = "";

    // Reset other fields
    document.getElementById('trialDate').value = '';
    document.getElementById('trialPrice').value = '';
    document.getElementById('trialUrl').value = '';
}

function closeAddModal() {
    document.getElementById('addModal').classList.add('hidden');
}
function previewCancelUrl() {
  const url = document.getElementById("trialUrl").value.trim();
  if (!url) return alert("No cancel URL set yet.");
  window.open(url, "_blank");
}

async function addTrial() {
  const name = document.getElementById('trialName').value.trim();
  const date = document.getElementById('trialDate').value;
  const priceText = document.getElementById('trialPrice').value.trim();
  const url = document.getElementById('trialUrl').value.trim();

  if (!name || !date) {
    alert('Please enter a service name and expiry date');
    return;
  }

  let renewalPrice = null;
  if (priceText) {
    const num = parseFloat(priceText.replace(/[^0-9.]/g, ""));
    renewalPrice = Number.isFinite(num) ? num : null;
  }

  try {
    await apiCreateTrial({
      serviceName: name,
      endDate: date,
      cancelUrl: url || null,
      renewalPrice: renewalPrice
    });

    await refreshSubscriptionsFromDB();
    closeAddModal();
    renderDashboard();
    showToast(`${name} added successfully!`);
  } catch (e) {
    console.error(e);
    alert("Failed to add trial: " + e.message);
  }
}

// ====== TRIAL ACTIONS ======

async function markCancelled(id) {
  try {
    await apiPatchTrial(id, { status: "canceled" });
    await refreshSubscriptionsFromDB();
    renderDashboard();
    showToast("Marked as cancelled!");
  } catch (e) {
    console.error(e);
    alert("Failed to cancel: " + e.message);
  }
}

async function deleteTrial(id) {
  if (!confirm('Are you sure you want to remove this subscription?')) return;

  try {
    await apiDeleteTrial(id);
    await refreshSubscriptionsFromDB();
    renderDashboard();
    showToast('Subscription removed');
  } catch (e) {
    console.error(e);
    alert("Failed to delete: " + e.message);
  }
}

function initPopularServicesDropdown() {
  const select = document.getElementById("trialServiceSelect");
  if (!select) return;

  // Reset
  select.innerHTML = `
    <option value="">Select a popular service…</option>
    <option value="__manual__">Other (type manually)</option>
  `;

  // Populate popular services
  popularServices.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.name;
    opt.textContent = `${s.icon} ${s.name}`;
    select.appendChild(opt);
  });
}

function onServiceSelectChange() {
  const select = document.getElementById("trialServiceSelect");
  const manualWrap = document.getElementById("manualServiceWrapper");
  const nameInput = document.getElementById("trialName");
  const priceInput = document.getElementById("trialPrice");
  const urlInput = document.getElementById("trialUrl");

  if (!select) return;

  const chosen = select.value;

  if (!chosen) {
    // nothing selected
    manualWrap.classList.add("hidden");
    nameInput.value = "";
    return;
  }

  if (chosen === "__manual__") {
    // manual mode
    manualWrap.classList.remove("hidden");
    nameInput.value = "";
    return;
  }

  // popular service selected -> auto-fill
  manualWrap.classList.add("hidden");
  nameInput.value = chosen;

  const svc = popularServiceMap[chosen];
  if (svc) {
    if (priceInput) priceInput.value = svc.price || "";
    if (urlInput) urlInput.value = svc.cancelUrl || "";
  }
}

// ====== SETTINGS FUNCTIONS ======

function saveProfile() {
    const name = document.getElementById('settingsName').value.trim();
    const email = document.getElementById('settingsEmail').value.trim();
    
    if (!name || !email) {
        alert('Please fill in all fields');
        return;
    }
    
    currentUser.name = name;
    currentUser.email = email;
    
    localStorage.setItem('fftUser', JSON.stringify(currentUser));
    
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    document.getElementById('userAvatar').textContent = initials.slice(0, 2);
    document.getElementById('userName').textContent = name.split(' ')[0];
    
    showToast('Profile saved!');
}

function deleteAccount() {
    if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
        if (confirm('Really sure? All your data will be lost.')) {
            logout();
            showToast('Account deleted');
        }
    }
}

// ====== RENDER ALL SUBSCRIPTIONS ======

function renderAllSubscriptions(filter = 'all', search = '') {
    const list = document.getElementById('allSubscriptionsList');
    
    let filtered = subscriptions;
    
    if (filter !== 'all') {
        filtered = filtered.filter(s => s.status === filter);
    }
    
    if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(s => 
            s.name.toLowerCase().includes(searchLower) ||
            s.category?.toLowerCase().includes(searchLower)
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

// ====== MINIMAL BACKEND AUTH HOOKS ======

async function apiMe() {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("apiMe error:", e);
    return null;
  }
}

function loginWithGoogle() {
  window.location.href = "/api/oauth/google";
}

async function logoutAPI() {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch (e) {
    console.warn("logoutAPI error:", e);
  }
}

// ====== TOAST NOTIFICATIONS ======

function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
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
    
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

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

// ====== API FUNCTIONS ======

async function apiGetTrials() {
  const res = await fetch("/api/trials", { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function apiCreateTrial(trial) {
  const res = await fetch("/api/trials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(trial),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function apiPatchTrial(id, patch) {
  const res = await fetch(`/api/trials/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function apiDeleteTrial(id) {
  const res = await fetch(`/api/trials/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

function money(n) {
  if (n === null || n === undefined) return "Unknown";
  return `$${Number(n).toFixed(2)}/month`;
}

function backendStatusToUiStatus(backendStatus, daysLeft) {
  if (backendStatus === "canceled" || backendStatus === "expired") return "cancelled";
  return calculateStatus(daysLeft);
}

function guessIconFromName(name) {
  const lower = (name || "").toLowerCase();
  for (const [service, data] of Object.entries(commonServices)) {
    if (lower.includes(service.toLowerCase())) return data.icon;
  }
  return "📱";
}

function trialDocToSubscription(doc) {
  const expiryISO = doc.endDate;
  const daysLeft = daysUntil(expiryISO);

  return {
    id: doc._id,
    name: doc.serviceName,
    icon: guessIconFromName(doc.serviceName),
    expiresIn: daysLeft,
    expiryDate: expiryISO,
    status: backendStatusToUiStatus(doc.status, daysLeft),
    price: money(doc.renewalPrice),
    cancelUrl: doc.cancelUrl || "",
    category: "Subscription",
    _backendStatus: doc.status,
  };
}
