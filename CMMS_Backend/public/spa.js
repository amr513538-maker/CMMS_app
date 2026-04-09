/* =============================================
   CMMS Single-Page Application
   with Advanced Dashboard, Tracking, Settings
   ============================================= */

const API_BASE = ""; 

const state = {
  token: localStorage.getItem("cmms_token") || null,
  user: JSON.parse(localStorage.getItem("cmms_user") || "null"),
};

function qs(sel) { return document.querySelector(sel); }

function setToken(token) {
  state.token = token;
  if (token) localStorage.setItem("cmms_token", token);
  else localStorage.removeItem("cmms_token");
}

function setUser(user) {
  state.user = user;
  if (user) localStorage.setItem("cmms_user", JSON.stringify(user));
  else localStorage.removeItem("cmms_user");
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    headers["content-type"] = headers["content-type"] || "application/json";
  }
  if (state.token) headers.authorization = `Bearer ${state.token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    setToken(null); setUser(null);
    window.location.hash = "#/login";
    throw new Error("Unauthorized");
  }
  return res;
}

function escapeHtml(s) {
  return String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function roleLabel(role) {
  if (role === "admin") return "Admin";
  if (role === "planner") return "Planner";
  if (role === "technician") return "Technician";
  return "Requester";
}

function can(role, permission) {
  if (!role) return false;
  if (permission === "viewRequests") return ["admin", "planner", "technician"].includes(role);
  if (permission === "admin") return role === "admin";
  return false;
}

async function ensureMe() {
  if (!state.token) return null;
  try {
    const res = await api("/api/auth/me");
    if (!res.ok) throw new Error("unauthorized");
    const user = await res.json();
    setUser(user);
    return user;
  } catch {
    setToken(null); setUser(null);
    return null;
  }
}

/* ---- Navigation ---- */
function renderNav() {
  const nav = qs("#nav");
  if (!nav) return;

  const items = [];
  if (!state.token) {
    items.push({ href: "#/login", label: "Login" });
    items.push({ href: "#/register", label: "Sign Up" });
  } else {
    items.push({ href: "#/dashboard", label: "Dashboard" });
    if (can(state.user?.role, "viewRequests")) items.push({ href: "#/requests", label: "Tasks Queue" });
    items.push({ href: "#/request/new", label: "New Request ➕" });
    items.push({ href: "#/track", label: "Track 📦" });
    items.push({ href: "#/settings", label: "⚙️ Profile" });
    items.push({ href: "javascript:void(0)", label: "Logout", onclick: "showLogoutModal()" });
  }

  nav.innerHTML = items
    .map(i => `<a class="nav__link" href="${i.href}" ${i.onclick ? `onclick="${i.onclick}"` : ""}>${escapeHtml(i.label)}</a>`)
    .join("");
}

function render(html) {
  const app = qs("#app");
  if (!app) return;
  app.innerHTML = html;
  renderNav();
}

function pageCard(title, bodyHtml) {
  return `
    <section class="card">
      <div class="card__header"><h1 class="card__title">${escapeHtml(title)}</h1></div>
      <div class="card__body">${bodyHtml}</div>
    </section>`;
}

function route() {
  const hash = window.location.hash || "#/login";
  return hash.replace(/^#/, "");
}

/* ============================================================
   Google Sign-In logic
   ============================================================ */
window.handleGoogleCredential = async function (response) {
  const credential = response.credential;
  if (!credential) return;
  qs("#googleBtn").innerHTML = '<span class="spinner"></span> Signing in...';
  try {
    const res = await fetch(`${API_BASE}/api/auth/google`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ credential }),
    });
    if (!res.ok) throw new Error((await res.json())?.error || "Google sign-in failed");
    const data = await res.json();
    setToken(data.token); setUser(data.user);
    window.location.hash = "#/dashboard";
  } catch (err) {
    alert(err.message);
    qs("#googleBtn").innerHTML = googleSvg() + " Sign in with Google";
  }
};
function googleSvg() {
  return `<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;
}
function initGoogleSignIn() {
  if (typeof google === "undefined" || !google.accounts) return setTimeout(initGoogleSignIn, 500);
  fetch(`${API_BASE}/api/config`).then(r => r.json()).then(cfg => {
    if (cfg.googleClientId && cfg.googleClientId !== "YOUR_GOOGLE_CLIENT_ID_HERE") {
      google.accounts.id.initialize({ client_id: cfg.googleClientId, callback: window.handleGoogleCredential });
      window.__googleReady = true;
    } else {
      qs("#googleBtn").style.display = "none";
    }
  }).catch(() => qs("#googleBtn").style.display = "none");
}
window.triggerGoogleSignIn = function () {
  if (window.__googleReady) google.accounts.id.prompt();
};

/* ============================================================
   Pages
   ============================================================ */

/* ---- Login & Register ---- */
async function showLogin() {
  render(pageCard("Welcome Back", `
    <div class="google-section">
      <div id="g_id_onload" data-client_id="__GOOGLE_CLIENT_ID__" data-callback="handleGoogleCredential" data-auto_prompt="false" style="display:none;"></div>
      <button class="btn--google" id="googleBtn" type="button" onclick="triggerGoogleSignIn()">${googleSvg()} Sign in with Google</button>
    </div><div class="divider">or</div>
    
    <form id="loginForm" class="form">
      <label>Email</label><input type="email" name="email" required />
      <label>Password</label><input type="password" name="password" required />
      <button class="btn btn--primary" type="submit" id="loginSubmitBtn">Sign in</button>
    </form>
    <div id="loginError" class="error" style="display:none;"></div>
    <div class="auth-switch">Don't have an account? <a href="#/register">Create one</a></div>
  `));
  initGoogleSignIn();

  qs("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget));
    const btn = qs("#loginSubmitBtn");
    btn.textContent = "Signing in..."; btn.disabled = true;
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json())?.error || "Login failed");
      const data = await res.json();
      setToken(data.token); setUser(data.user);
      window.location.hash = "#/dashboard";
    } catch (err) {
      qs("#loginError").style.display = "block";
      qs("#loginError").textContent = err.message;
      btn.textContent = "Sign in"; btn.disabled = false;
    }
  });
}

async function showRegister() {
  render(pageCard("Create Account", `
    <div class="google-section">
      <button class="btn--google" id="googleBtn" type="button" onclick="triggerGoogleSignIn()">${googleSvg()} Sign up with Google</button>
    </div><div class="divider">or</div>
    <form id="registerForm" class="form">
      <label>Full Name</label><input type="text" name="full_name" required />
      <label>Email</label><input type="email" name="email" required />
      <label>Password</label><input type="password" name="password" minlength="6" required />
      <button class="btn btn--primary" type="submit" id="regSubmitBtn">Create Account</button>
    </form>
    <div id="regError" class="error" style="display:none;"></div>
    <div class="auth-switch">Already have an account? <a href="#/login">Sign in</a></div>
  `));
  initGoogleSignIn();

  qs("#registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget));
    const btn = qs("#regSubmitBtn");
    btn.textContent = "Creating account..."; btn.disabled = true;
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json())?.error || "Registration failed");
      const data = await res.json();
      setToken(data.token); setUser(data.user);
      window.location.hash = "#/dashboard";
    } catch (err) {
      qs("#regError").style.display = "block";
      qs("#regError").textContent = err.message;
      btn.textContent = "Create Account"; btn.disabled = false;
    }
  });
}

/* ---- Dashboard ---- */
async function showDashboard() {
  const u = await ensureMe();
  if (!u) return;

  render(pageCard(`Dashboard - Welcome ${escapeHtml(u.full_name)}`, `<div class="muted"><span class="spinner"></span> Loading stats...</div>`));

  try {
    const res = await api("/api/dashboard/stats");
    const data = await res.json();

    const dHtml = `
      <div class="dashboard-grid">
        <div class="stat-card"><div class="stat-card__title">Total Requests</div><div class="stat-card__value">${data.kpis.total}</div></div>
        <div class="stat-card"><div class="stat-card__title">Open (New/Assigned)</div><div class="stat-card__value text-warning">${data.kpis.open}</div></div>
        <div class="stat-card"><div class="stat-card__title">In Progress</div><div class="stat-card__value text-primary">${data.kpis.inProgress}</div></div>
        <div class="stat-card"><div class="stat-card__title">Completed</div><div class="stat-card__value text-success">${data.kpis.done}</div></div>
      </div>

      <div class="widgets-grid">
        <section class="card">
          <div class="card__header"><h3 class="card__title">Status Distribution</h3></div>
          <div class="card__body">
            <canvas id="statusChart" width="400" height="200"></canvas>
          </div>
        </section>

        <section class="card">
          <div class="card__header"><h3 class="card__title">Critical Action Required</h3></div>
          <div class="card__body">
            ${data.criticalRequests?.length > 0 ? `
              <ul style="padding-left:14px; margin:0;">
                ${data.criticalRequests.map(r => `
                  <li style="margin-bottom:8px">
                    <a href="#/track/${r.request_code}" style="color:var(--danger)"><b>${r.request_code}</b></a> - ${escapeHtml(r.asset_name || "Unknown Asset")}
                    <span class="pill pill--soft text-danger">${r.priority}</span>
                  </li>
                `).join('')}
              </ul>
            ` : '<p class="muted">No critical requests pending. All good! 🎉</p>'}
          </div>
        </section>
      </div>

      <h3 style="margin-top:32px">Recent Activity</h3>
      <div class="tableWrap">
        <table class="table">
          <thead><tr><th>Code</th><th>Asset</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            ${data.recentRequests.map(r => `
              <tr>
                <td><a href="#/track/${r.request_code}" style="color:var(--primary); font-weight:bold">${r.request_code}</a></td>
                <td>${escapeHtml(r.asset_name || "-")}</td>
                <td><span class="pill pill--soft">${r.status}</span></td>
                <td class="muted">${new Date(r.requested_at).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    render(pageCard(`Dashboard - <span class="pill">${roleLabel(u.role)}</span>`, dHtml));

    // Render Chart.js
    if (data.statusChart.length > 0 && window.Chart) {
      const ctx = document.getElementById('statusChart').getContext('2d');
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: data.statusChart.map(s => s.status),
          datasets: [{
            data: data.statusChart.map(s => s.count),
            backgroundColor: ['#4f6ef7', '#f59e0b', '#22c55e', '#ef4444', '#8b8fa4'],
            borderWidth: 0
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: {color:'#e4e5ea'} } } }
      });
    }

  } catch (err) {
    if(err.message!=="Unauthorized") render(pageCard("Dashboard", `<p class="error">Failed to load dashboard data.</p>`));
  }
}

/* ---- New Maintenance Request ---- */
async function showNewRequest() {
  const u = await ensureMe();
  if (!u) return;

  render(pageCard("New Maintenance Request 🛠️", `
    <form id="reqForm" class="form">
      <div style="display:flex; gap:16px; flex-wrap:wrap">
        <div style="flex:1; min-width:200px">
          <label>Asset Name</label>
          <input type="text" name="deviceName" placeholder="e.g., Pump-1" />
        </div>
        <div style="flex:1; min-width:200px">
          <label>Location / Area</label>
          <input type="text" name="location" placeholder="e.g., Building A, Floor 2" />
        </div>
      </div>

      <label>Issue Description (Required) 🔥</label>
      <textarea name="issueDescription" rows="6" placeholder="Describe the issue in detail..." required style="font-size:16px; border-color:var(--primary)"></textarea>
      
      <div style="display:flex; gap:16px; flex-wrap:wrap">
        <div style="flex:1; min-width:200px">
          <label>Priority</label>
          <select name="priority">
            <option value="Low">Low</option><option value="Medium" selected>Medium</option>
            <option value="High">High</option><option value="Critical">Critical 🔴</option>
          </select>
        </div>
        <div style="flex:1; min-width:200px">
          <label>Attach Image 📸</label>
          <input type="file" name="image" accept="image/png, image/jpeg" class="form input" />
        </div>
      </div>

      <button class="btn btn--primary" type="submit" id="reqSubmitBtn" style="margin-top:16px; width:100%; font-size:16px; padding:12px">Submit Request & Get Tracking Code</button>
    </form>
    <div id="reqErr" class="error" style="display:none;"></div>
  `));

  qs("#reqForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = new FormData(e.currentTarget);
    const btn = qs("#reqSubmitBtn"); btn.textContent = "Submitting..."; btn.disabled = true;
    try {
      const res = await api("/api/maintenance-requests", { method: "POST", body: payload });
      const data = await res.json();
      window.location.hash = `#/track/${data.request_code}`;
    } catch (err) {
      const el = qs("#reqErr");
      el.style.display = "block"; el.textContent = err.message || "Failed to submit request.";
      btn.textContent = "Submit Request"; btn.disabled = false;
    }
  });
}

/* ---- Requests List ---- */
async function showRequests() {
  const u = await ensureMe();
  if (!u) return;
  render(pageCard("Tasks Queue", `<div class="muted"><span class="spinner"></span> Loading requests...</div>`));

  try {
    const res = await api("/api/maintenance-requests");
    const rows = await res.json();
    const table = `
      <div class="tableWrap">
        <table class="table">
          <thead><tr><th>Code</th><th>Asset</th><th>Description</th><th>Priority</th><th>Status</th><th>Assigned To</th></tr></thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td><a href="#/track/${r.request_code}" style="color:var(--primary); font-weight:bold">${r.request_code}</a></td>
                <td>${escapeHtml(r.asset_name || "-")}</td>
                <td>${escapeHtml(r.description).substring(0,30)}...</td>
                <td><span class="text-${r.priority.toLowerCase() === 'critical' ? 'danger' : 'muted'}">${escapeHtml(r.priority)}</span></td>
                <td><span class="pill pill--soft">${escapeHtml(r.status)}</span></td>
                <td class="muted">${escapeHtml(r.assigned_to || "Unassigned")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>`;
    render(pageCard("Tasks Queue", rows.length === 0 ? `<p class="muted">No requests found.</p>` : table));
  } catch (err) {
    if(err.message!=="Unauthorized") render(pageCard("Tasks", `<p class="error">Failed to load requests data.</p>`));
  }
}

/* ---- Track Order (Timeline) ---- */
async function showTrackInput() {
  render(pageCard("Track Order 📦", `
    <p class="muted">Enter your request code (e.g., REQ-2026-XXXX) to see its status and timeline.</p>
    <div style="display:flex; gap:10px; margin-top:20px;">
      <input type="text" id="trackInput" placeholder="REQ-XXXX" class="form input" style="flex:1" />
      <button class="btn btn--primary" onclick="window.location.hash = '#/track/' + document.getElementById('trackInput').value">Track</button>
    </div>
  `));
}

async function showTracking(code) {
  const u = await ensureMe();
  if (!u) return window.location.hash = `#/login`;

  render(pageCard("Order Tracking", `<div class="muted"><span class="spinner"></span> Loading timeline...</div>`));

  try {
    const res = await api(`/api/maintenance-requests/track/${code}`);
    const data = await res.json();
    const req = data.request;
    const evts = data.events;

    // Build Stepper
    const steps = ["New", "Assigned", "In Progress", "Done"];
    let currentStepIndex = steps.indexOf(req.status);
    if(currentStepIndex===-1) currentStepIndex = 0;
    if(req.status==="Cancelled") currentStepIndex = -1; // hide stepper 
    
    let stepperHtml = `<div class="stepper" style="${req.status==='Cancelled' ? 'display:none' : ''}">`;
    steps.forEach((s, idx) => {
      let icon = idx + 1;
      if (idx < currentStepIndex || req.status === "Done") icon = '✓';
      const activeClass = idx <= currentStepIndex ? "active" : "";
      stepperHtml += `
        <div class="step ${activeClass}">
          <div class="step__circle">${icon}</div>
          <span>${s}</span>
        </div>
      `;
    });
    stepperHtml += `</div>`;

    // Timeline
    let timelineHtml = `<div class="timeline">`;
    evts.forEach(e => {
      timelineHtml += `
        <div class="timeline-item ${e.event_type}">
          <div class="timeline-header">
            <b>${escapeHtml(e.user_name || "System")}</b> &bull; <span class="muted">${new Date(e.created_at).toLocaleString()}</span>
          </div>
          <div class="timeline-body">${escapeHtml(e.message)}</div>
        </div>
      `;
    });
    timelineHtml += `</div>`;

    // Actions
    let controlsHtml = ``;
    if (req.status !== "Done" && req.status !== "Cancelled") {
      controlsHtml += `
        <form id="commentForm" style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
          <textarea name="message" placeholder="Type a comment or note..." required rows="2" class="form input" style="width:100%"></textarea>
          <input type="hidden" name="event_type" value="comment" />
          <button type="submit" class="btn btn--primary" id="btnComment" style="align-self:end">Add Comment</button>
        </form>
      `;
    }
    
    // Status Change
    if (can(u.role, "viewRequests") && req.status !== "Done") {
      controlsHtml += `
        <form id="statusForm" class="form" style="background:var(--bg-hover); padding:16px; border-radius:12px; margin-top:20px;">
          <h4>🔧 Admin/Tech Controls</h4>
          <div style="display:flex; gap:10px; align-items:end; flex-wrap:wrap;">
            <div style="flex:1; min-width:200px;">
              <label>Update Status</label>
              <select name="new_status">
                <option value="">-- No Change --</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            ${can(u.role, "admin") ? `
              <div style="flex:1; min-width:200px;">
                <label>Assign to Tech ID</label>
                <input type="number" name="assign_to" placeholder="Tech User ID" />
              </div>
            ` : ''}
            <button type="submit" class="btn btn--danger">Apply Changes</button>
          </div>
          <input type="hidden" name="message" value="Automated Action" />
        </form>
      `;
    }

    render(pageCard(`Tracking: ${req.request_code}`, `
      <div style="display:flex; justify-content:space-between; margin-bottom:30px; flex-wrap:wrap; gap:16px">
        <div>
          <h2 style="margin:0">${escapeHtml(req.asset_name || "General Request")}</h2>
          <p class="muted" style="margin-top:4px">
            📍 <b>Location:</b> ${escapeHtml(req.location || "N/A")} <br/>
            👤 <b>Reported by:</b> ${escapeHtml(req.requested_by_name)}
          </p>
        </div>
        <div style="text-align:right">
          <div class="pill ${req.priority === 'Critical' ? 'text-danger' : 'text-primary'}">${req.priority}</div>
          <p class="muted" style="margin-top:8px; font-size:12px;">Assigned to: <b>${escapeHtml(req.assigned_to_name || "Pending")}</b></p>
        </div>
      </div>
      
      ${stepperHtml}
      
      <div class="card__body" style="background:var(--bg-elevated); margin-bottom:20px; border-radius:var(--radius)">
        <b style="color:var(--text-muted); text-transform:uppercase; font-size:12px;">Issue Description</b><br />
        <div style="margin-top:8px; font-size:15px; line-height:1.6">${escapeHtml(req.description)}</div>
        ${req.image_url ? `<div style="margin-top:16px;"><img src="${req.image_url}" alt="Issue Photo" style="max-width:100%; border-radius:8px; border:1px solid var(--border);" /></div>` : ''}
      </div>

      <h3 style="margin-top:40px;">Order Timeline</h3>
      ${timelineHtml}
      ${controlsHtml}
    `));

    // Bind forms
    const commentForm = qs("#commentForm");
    if (commentForm) {
      commentForm.addEventListener("submit", async(e) => {
        e.preventDefault();
        const payload = Object.fromEntries(new FormData(e.currentTarget));
        await api(`/api/maintenance-requests/${req.id}/events`, { method: "POST", body: JSON.stringify(payload) });
        showTracking(code); 
      });
    }

    const statusForm = qs("#statusForm");
    if (statusForm) {
      statusForm.addEventListener("submit", async(e) => {
        e.preventDefault();
        const payload = Object.fromEntries(new FormData(e.currentTarget));
        if(!payload.new_status && !payload.assign_to) return;
        payload.message = "System Update";
        await api(`/api/maintenance-requests/${req.id}/events`, { method: "POST", body: JSON.stringify(payload) });
        showTracking(code);
      });
    }

  } catch (err) {
    if (err.message === "Unauthorized") return;
    render(pageCard("Order Tracking", `<p class="error text-danger">${err.message || "Failed to load tracking data."}</p>`));
  }
}

/* ---- Profile Settings ---- */
async function showSettings() {
  const u = await ensureMe();
  if (!u) return;

  render(pageCard("⚙️ Profile Settings", `
    <div class="widgets-grid">
      
      <!-- Basic Info -->
      <section class="card" style="box-shadow:none; border-color:var(--border)">
        <div class="card__header"><h3 class="card__title">Personal Information</h3></div>
        <div class="card__body">
          <form id="profileForm" class="form">
            <label>Full Name</label>
            <input type="text" name="full_name" value="${escapeHtml(u.full_name)}" required />
            <label>Phone Number</label>
            <input type="text" name="phone" value="${escapeHtml(u.phone)}" placeholder="05XXXXXXXX" />
            <label>Department</label>
            <input type="text" name="department" value="${escapeHtml(u.department)}" placeholder="e.g. Sales" />
            <label>Job Title</label>
            <input type="text" name="job_title" value="${escapeHtml(u.job_title)}" placeholder="e.g. Engineer" />
            
            <button type="submit" class="btn btn--primary" id="btnProfile">Save Changes</button>
          </form>
          <div id="profMsg" style="display:none; margin-top:10px" class="success"></div>
        </div>
      </section>

      <!-- Security Info -->
      <section class="card" style="box-shadow:none; border-color:var(--border)">
        <div class="card__header"><h3 class="card__title">Security</h3></div>
        <div class="card__body">
          <form id="secForm" class="form">
            <label>Email Address</label>
            <input type="email" name="email" value="${escapeHtml(u.email)}" required />
            
            <label>New Password (Optional)</label>
            <input type="password" name="new_password" minlength="6" placeholder="Leave blank to keep current" />
            
            <div style="padding:16px; border:1px solid rgba(239, 68, 68, 0.4); border-radius:var(--radius); margin-top:16px; background:var(--danger-bg)">
              <label class="text-danger">Current Password</label>
              <input type="password" name="current_password" placeholder="Required for changes" />
              <div class="hint">For Google Login users, password isn't required unless you set one previously.</div>
            </div>

            <button type="submit" class="btn btn--danger" id="btnSec">Update Security Details</button>
          </form>
          <div id="secMsg" style="display:none; margin-top:10px" class="success"></div>
        </div>
      </section>
    </div>
  `));

  qs("#profileForm").addEventListener("submit", async(e)=>{
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await api("/api/auth/profile", { method: "PUT", body: JSON.stringify(payload) });
      setUser(await res.json());
      const el = qs("#profMsg"); el.style.display="block"; el.textContent="Profile updated successfully.";
    } catch(err) { alert(err.message); }
  });

  qs("#secForm").addEventListener("submit", async(e)=>{
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if(payload.new_password) {
        await api("/api/auth/password", { method: "PUT", body: JSON.stringify({current_password: payload.current_password, new_password: payload.new_password}) });
      }
      if(payload.email && payload.email !== u.email) {
        await api("/api/auth/profile", { method: "PUT", body: JSON.stringify({ email: payload.email, current_password: payload.current_password, full_name: u.full_name }) });
        alert("Email changed! Please login again.");
        return doLogout();
      }
      const el = qs("#secMsg"); el.style.display="block"; el.className="success"; el.textContent="Security details updated.";
    } catch(err) {
      const el = qs("#secMsg"); el.style.display="block"; el.className="error"; el.textContent=err.message;
    }
  });
}

/* ---- Modals & Logout ---- */
window.showLogoutModal = function() {
  const html = `
    <div class="modal-overlay active" id="logoutModal">
      <div class="modal">
        <h3>Are you sure you want to sign out?</h3>
        <p class="muted" style="margin-bottom:24px">You will need to log back in to access the system.</p>
        <div class="modal-actions">
          <button class="btn" style="background:var(--bg-input)" onclick="document.getElementById('logoutModal').remove()">Cancel</button>
          <button class="btn btn--danger" onclick="doLogout()">Yes, Sign out</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", html);
};

function doLogout() {
  const m = qs("#logoutModal"); if(m) m.remove();
  setToken(null); setUser(null);
  window.location.hash = "#/login";
}

/* ---- Router ---- */
async function router() {
  const p = route();
  if (!state.token && !["/login", "/register", "/track"].some(r => p.startsWith(r))) {
    window.location.hash = "#/login"; return;
  }

  if (p === "/login") return showLogin();
  if (p === "/register") return showRegister();
  if (p === "/dashboard" || p === "/") return showDashboard();
  if (p === "/request/new") return showNewRequest();
  if (p === "/requests") return showRequests();
  if (p === "/settings") return showSettings();
  if (p === "/track") return showTrackInput();
  if (p.startsWith("/track/")) return showTracking(p.split("/")[2]);

  render(pageCard("Not found", `<p class="muted">Page not found.</p>`));
}

window.addEventListener("hashchange", router);
window.addEventListener("load", async () => {
  if (!window.location.hash) window.location.hash = state.token ? "#/dashboard" : "#/login";
  if (state.token) await ensureMe();
  renderNav();
  router();
});
