// ====== APP.JS - FreeFromTrial ======

// ====== INITIALIZATION ======
document.addEventListener('DOMContentLoaded', async function() {
  const me = await apiMe();
  if (me) {
    currentUser = me;
    await refreshSubscriptionsFromDB();   // ✅ NEW
    showDashboard();
  }

  const dateInput = document.getElementById('trialDate');
  if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];
});

async function refreshSubscriptionsFromDB() {
  try {
    const docs = await apiGetTrials();           // backend docs
    subscriptions = docs.map(trialDocToSubscription);
  } catch (e) {
    console.error("refreshSubscriptionsFromDB error:", e);
    subscriptions = []; // fallback
  }
}


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
    
    // Basic validation
    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    // Fake login - in real app, this would call the backend
    currentUser = {
        id: 1,
        name: email.split('@')[0],
        email: email
    };
    
    // Save to localStorage
    localStorage.setItem('fftUser', JSON.stringify(currentUser));
    
    hideAuth();
    showDashboard();
}

function signup() {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    
    // Basic validation
    if (!name || !email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    // Fake signup - in real app, this would call the backend
    currentUser = {
        id: Date.now(),
        name: name,
        email: email
    };
    
    // Save to localStorage
    localStorage.setItem('fftUser', JSON.stringify(currentUser));
    
    hideAuth();
    showDashboard();
}

async function logout() {
    await logoutAPI(); // ✅ NEW (ignore errors)

    currentUser = null;
    localStorage.removeItem('fftUser');

    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('landingPage').classList.remove('hidden');
    document.getElementById('userDropdown').classList.add('hidden');
}


// ====== DASHBOARD FUNCTIONS ======

function showDashboard() {
    // Hide landing page
    document.getElementById('landingPage').classList.add('hidden');
    
    // Show dashboard
    document.getElementById('dashboard').classList.remove('hidden');
    
    // Update user info in navbar
    if (currentUser) {
        const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
        document.getElementById('userAvatar').textContent = initials.slice(0, 2);
        document.getElementById('userName').textContent = currentUser.name.split(' ')[0];
        
        // Update settings
        document.getElementById('settingsName').value = currentUser.name;
        document.getElementById('settingsEmail').value = currentUser.email;
    }
    
    // Render dashboard data
    renderDashboard();
}

function renderDashboard() {
    // Update stats
    const activeTrials = subscriptions.filter(s => s.status !== 'cancelled');
    const urgentTrials = subscriptions.filter(s => s.status === 'urgent');
    const cancelledTrials = subscriptions.filter(s => s.status === 'cancelled');
    
    document.getElementById('totalTrials').textContent = activeTrials.length;
    document.getElementById('urgentTrials').textContent = urgentTrials.length;
    document.getElementById('cancelledTrials').textContent = cancelledTrials.length;
    document.getElementById('moneySaved').textContent = '$' + calculateSavings().toFixed(2);
    
    // Render urgent list
    renderUrgentList();
    
    // Render upcoming list
    renderUpcomingList();
    
    // Render all subscriptions
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

function createTrialItem(sub) {
    const expiryText = sub.status === 'cancelled' 
        ? 'Cancelled' 
        : `${sub.expiresIn} day${sub.expiresIn !== 1 ? 's' : ''} left • ${sub.price}`;
    
    return `
        <div class="trial-item">
            <div class="trial-icon">${sub.icon}</div>
            <div class="trial-info">
                <h4>${sub.name}</h4>
                <p>${expiryText}</p>
            </div>
            <span class="trial-status ${sub.status}">${statusLabels[sub.status]}</span>
            ${sub.status !== 'cancelled' ? `
                <div class="trial-actions">
                    <a href="${sub.cancelUrl}" target="_blank" class="btn-primary" style="text-decoration:none;">Cancel</a>
                </div>
            ` : ''}
        </div>
    `;
}

function renderAllSubscriptions(filter = 'all', search = '') {
    const list = document.getElementById('allSubscriptionsList');
    
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

function createSubscriptionCard(sub) {
    const expiryText = sub.status === 'cancelled' 
        ? 'Cancelled' 
        : formatDate(sub.expiryDate);
    
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
                ${sub.status !== 'cancelled' ? `
                    <a href="${sub.cancelUrl}" target="_blank" class="btn-primary" style="text-decoration:none;">Cancel</a>
                    <button class="btn-secondary" onclick="markCancelled('${sub.id}')">Mark Cancelled</button>
                ` : `
                    <button class="btn-secondary" onclick="deleteTrial('${sub.id}')">Remove</button>

                `}
            </div>
        </div>
    `;
}

// ====== NAVIGATION ======

function showSection(section) {
    // Hide all sections
    document.getElementById('overviewSection').classList.add('hidden');
    document.getElementById('subscriptionsSection').classList.add('hidden');
    document.getElementById('settingsSection').classList.add('hidden');
    
    // Show selected section
    document.getElementById(section + 'Section').classList.remove('hidden');
    
    // Update nav active state
    document.querySelectorAll('.dashboard-nav .nav-links a').forEach(a => {
        a.classList.remove('nav-active');
    });
    event.target.classList.add('nav-active');
    
    // Close user dropdown
    document.getElementById('userDropdown').classList.add('hidden');
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('hidden');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    const userMenu = document.querySelector('.user-menu');
    const dropdown = document.getElementById('userDropdown');
    
    if (userMenu && dropdown && !userMenu.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

// ====== FILTER FUNCTIONS ======

function filterByStatus(status) {
    // Update active tab
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
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
    document.getElementById('addModal').classList.remove('hidden');
    
    // Clear form
    document.getElementById('trialName').value = '';
    document.getElementById('trialDate').value = '';
    document.getElementById('trialPrice').value = '';
    document.getElementById('trialUrl').value = '';
}

function closeAddModal() {
    document.getElementById('addModal').classList.add('hidden');
}

async function addTrial() {
  const name = document.getElementById('trialName').value.trim();
  const date = document.getElementById('trialDate').value; // YYYY-MM-DD
  const priceText = document.getElementById('trialPrice').value.trim();
  const url = document.getElementById('trialUrl').value.trim();

  if (!name || !date) {
    alert('Please enter a service name and expiry date');
    return;
  }

  // Convert "$9.99/month" -> 9.99
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
    await apiPatchTrial(id, { status: "canceled" }); // backend expects "canceled"
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
    
    // Update localStorage
    localStorage.setItem('fftUser', JSON.stringify(currentUser));
    
    // Update navbar
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

// ====== MINIMAL BACKEND AUTH HOOKS ======

async function apiMe() {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) return null;
    return await res.json(); // {id,email,name,picture}
  } catch (e) {
    console.error("apiMe error:", e);
    return null;
  }
}

function loginWithGoogle() {
  // IMPORTANT: DO backend is mounted at /api
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
  // simple: CAD par défaut
  return `$${Number(n).toFixed(2)}/month`;
}

function backendStatusToUiStatus(backendStatus, daysLeft) {
  // backend: detected|confirmed|canceled|expired
  if (backendStatus === "canceled" || backendStatus === "expired") return "cancelled";
  return calculateStatus(daysLeft); // urgent/warning/safe
}

function guessIconFromName(name) {
  const lower = (name || "").toLowerCase();
  for (const [service, data] of Object.entries(commonServices)) {
    if (lower.includes(service.toLowerCase())) return data.icon;
  }
  return "📱";
}

function trialDocToSubscription(doc) {
  const expiryISO = doc.endDate; // ISO string from backend
  const daysLeft = daysUntil(expiryISO);

  return {
    id: doc._id,
    name: doc.serviceName,
    icon: guessIconFromName(doc.serviceName),
    expiresIn: daysLeft,
    expiryDate: expiryISO,
    status: backendStatusToUiStatus(doc.status, daysLeft),
    price: money(doc.renewalPrice),
    cancelUrl: doc.cancelUrl || "#",
    category: "Subscription",
    _backendStatus: doc.status, // optional debug
  };
}

// ====== API FUNCTIONS (FOR LATER) ======

/*
// When backend is ready, replace fake functions with these:

async function loginAPI(email, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return await response.json();
    } catch (error) {
        console.error('Login error:', error);
        return null;
    }
}

async function signupAPI(name, email, password) {
    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        return await response.json();
    } catch (error) {
        console.error('Signup error:', error);
        return null;
    }
}

async function getSubscriptions() {
    try {
        const response = await fetch('/api/subscriptions', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });
        return await response.json();
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        return [];
    }
}

async function addSubscriptionAPI(subscription) {
    try {
        const response = await fetch('/api/subscriptions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + getToken()
            },
            body: JSON.stringify(subscription)
        });
        return await response.json();
    } catch (error) {
        console.error('Error adding subscription:', error);
        return null;
    }
}

// Gumloop API for email scanning
async function scanEmailsWithGumloop(email) {
    try {
        const response = await fetch('https://api.gumloop.com/...', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer YOUR_GUMLOOP_API_KEY',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        return await response.json();
    } catch (error) {
        console.error('Gumloop error:', error);
        return null;
    }
}
*/
