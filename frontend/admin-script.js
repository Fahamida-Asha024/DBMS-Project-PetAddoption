
let currentAdoptionFilter = 'pending';
let staffCache = [];
let petsCache = [];

document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  if (!user || user.role !== 'admin') {
    window.location.href = 'index.html';
    return;
  }
  document.getElementById('whoAmI').textContent = `👤 ${user.name} (admin)`;

  loadAdoptions();
  loadNotifications();
  setInterval(loadNotifications, 15000); // poll every 15s
});

function switchPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`panel-${name}`).style.display = 'block';
  document.querySelector(`.nav-btn[data-panel="${name}"]`).classList.add('active');

  const titles = {
    adoptions: 'Adoption Requests', pets: 'Manage Pets', adopters: 'Adopters',
    vaccinations: 'Vaccinations', staff: 'Staff Management', reports: 'Reports',
  };
  document.getElementById('panelTitle').textContent = titles[name];

  if (name === 'adoptions') loadAdoptions();
  if (name === 'pets') loadPetsPanel();
  if (name === 'adopters') loadAdoptersPanel();
  if (name === 'vaccinations') loadVaxPanel();
  if (name === 'staff') loadStaffPanel();
  if (name === 'reports') loadReportsPanel();
}

async function loadNotifications() {
  try {
    const list = await api.getNotifications();
    const unread = list.filter(n => !n.is_read);
    const badge = document.getElementById('notifBadge');
    badge.style.display = unread.length ? 'inline-block' : 'none';
    badge.textContent = unread.length;

    const container = document.getElementById('notifList');
    container.innerHTML = list.length
      ? list.map(n => `
          <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="markNotifRead(${n.id})">
            <div>${n.message}</div>
            <div class="notif-time">${new Date(n.created_at).toLocaleString()}</div>
          </div>
        `).join('')
      : `<p class="empty-note">No notifications yet.</p>`;
  } catch (err) {
    console.error('notifications error', err);
  }
}

async function markNotifRead(id) {
  try {
    await api.markNotificationRead(id);
    loadNotifications();
  } catch (err) { console.error(err); }
}

function toggleNotifPanel() {
  const el = document.getElementById('notifDropdown');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
  if (el.style.display === 'block') loadNotifications();
}

function filterAdoptions(status) {
  currentAdoptionFilter = status;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab[data-status="${status}"]`).classList.add('active');
  loadAdoptions();
}

async function loadAdoptions() {
  const body = document.getElementById('adoptionsBody');
  body.innerHTML = `<tr class="empty-row"><td colspan="8">Loading…</td></tr>`;
  try {
    const [rows, staff] = await Promise.all([
      api.getAdoptions(currentAdoptionFilter),
      api.listStaff(),
    ]);
    staffCache = staff;

    body.innerHTML = rows.length ? rows.map(r => `
      <tr>
        <td>${r.pet_name} <span style="color:#8a8378;">(${r.pet_type})</span></td>
        <td>${r.adopter_name}</td>
        <td>${r.adopter_phone}<br><span style="font-size:12px;color:#8a8378;">${r.adopter_email}</span></td>
        <td>${new Date(r.created_at).toLocaleDateString()}</td>
        <td><span class="status-pill status-${r.status}">${r.status}</span></td>
        <td>
          ${r.status === 'pending' ? `
            <button class="btn-small btn-approve" onclick="approveRequest(${r.id})">Approve</button>
            <button class="btn-small btn-reject" onclick="rejectRequest(${r.id})">Reject</button>
          ` : '—'}
        </td>
        <td>
          ${r.status === 'approved' ? `
            <select onchange="assignStaffToRequest(${r.id}, this.value)">
              <option value="">${r.staff_name ? r.staff_name : 'Assign staff...'}</option>
              ${staffCache.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
          ` : (r.staff_name || '—')}
        </td>
        <td>${r.delivery_status.replace('_', ' ')}</td>
      </tr>
    `).join('') : `<tr class="empty-row"><td colspan="8">No requests found.</td></tr>`;
  } catch (err) {
    body.innerHTML = `<tr class="empty-row"><td colspan="8">Error: ${err.message}</td></tr>`;
  }
}

async function approveRequest(id) {
  try {
    await api.approveAdoption(id);
    loadAdoptions();
  } catch (err) { alert(err.message); }
}

async function rejectRequest(id) {
  if (!confirm('Reject this adoption request?')) return;
  try {
    await api.rejectAdoption(id);
    loadAdoptions();
  } catch (err) { alert(err.message); }
}

async function assignStaffToRequest(id, staffId) {
  if (!staffId) return;
  try {
    await api.assignStaff(id, staffId);
    loadAdoptions();
  } catch (err) { alert(err.message); }
}

async function loadPetsPanel() {
  try {
    petsCache = await api.getPets();
    renderPetsTable();
  } catch (err) {
    document.getElementById('petsBody').innerHTML = `<tr class="empty-row"><td colspan="7">Error: ${err.message}</td></tr>`;
  }
}

function renderPetsTable() {
  const search = document.getElementById('petSearch').value.toLowerCase();
  const filtered = petsCache.filter(p => p.name.toLowerCase().includes(search) || p.breed.toLowerCase().includes(search));
  const body = document.getElementById('petsBody');
  body.innerHTML = filtered.length ? filtered.map(p => `
    <tr>
      <td>${p.name}</td><td>${p.type}</td><td>${p.breed}</td><td>${p.age}</td><td>${p.gender}</td>
      <td><span class="status-pill status-${p.status}">${p.status}</span></td>
      <td>
        <button class="btn-small" onclick="openPetForm(${p.id})">Edit</button>
        <button class="btn-small btn-reject" onclick="deletePetRow(${p.id})">Delete</button>
      </td>
    </tr>
  `).join('') : `<tr class="empty-row"><td colspan="7">No pets found.</td></tr>`;
}

function openPetForm(id = null) {
  const pet = id ? petsCache.find(p => p.id === id) : null;
  document.getElementById('formModalContent').innerHTML = `
    <h2>${pet ? 'Edit Pet' : 'Add New Pet'}</h2>
    <form onsubmit="submitPetForm(event, ${id ?? 'null'})">
      <div class="field"><label>Name</label><input id="fName" value="${pet?.name ?? ''}" required></div>
      <div class="field"><label>Type</label><input id="fType" value="${pet?.type ?? ''}" required placeholder="Dog / Cat / Rabbit"></div>
      <div class="field"><label>Breed</label><input id="fBreed" value="${pet?.breed ?? ''}" required></div>
      <div class="field"><label>Age (years)</label><input type="number" id="fAge" value="${pet?.age ?? 0}" required></div>
      <div class="field"><label>Gender</label>
        <select id="fGender">
          <option value="Male" ${pet?.gender === 'Male' ? 'selected' : ''}>Male</option>
          <option value="Female" ${pet?.gender === 'Female' ? 'selected' : ''}>Female</option>
        </select>
      </div>
      ${pet ? `
      <div class="field"><label>Status</label>
        <select id="fStatus">
          <option value="Available" ${pet.status === 'Available' ? 'selected' : ''}>Available</option>
          <option value="Pending" ${pet.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Adopted" ${pet.status === 'Adopted' ? 'selected' : ''}>Adopted</option>
        </select>
      </div>` : ''}
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="closeFormModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>
  `;
  document.getElementById('formOverlay').classList.add('open');
}

async function submitPetForm(e, id) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('fName').value,
    type: document.getElementById('fType').value,
    breed: document.getElementById('fBreed').value,
    age: Number(document.getElementById('fAge').value),
    gender: document.getElementById('fGender').value,
  };
  try {
    if (id) {
      payload.status = document.getElementById('fStatus').value;
      await api.updatePet(id, payload);
    } else {
      await api.createPet(payload);
    }
    closeFormModal();
    loadPetsPanel();
  } catch (err) { alert(err.message); }
}

async function deletePetRow(id) {
  if (!confirm('Delete this pet record?')) return;
  try {
    await api.deletePet(id);
    loadPetsPanel();
  } catch (err) { alert(err.message); }
}

async function loadAdoptersPanel() {
  try {
    const rows = await api.getAdopters();
    document.getElementById('adoptersBody').innerHTML = rows.length ? rows.map(a => `
      <tr><td>${a.name}</td><td>${a.phone}</td><td>${a.email}</td><td>${a.address || '—'}</td></tr>
    `).join('') : `<tr class="empty-row"><td colspan="4">No adopters yet.</td></tr>`;
  } catch (err) {
    document.getElementById('adoptersBody').innerHTML = `<tr class="empty-row"><td colspan="4">Error: ${err.message}</td></tr>`;
  }
}

async function loadVaxPanel() {
  if (!petsCache.length) petsCache = await api.getPets();
  const sel = document.getElementById('vaxPetFilter');
  sel.innerHTML = '<option value="">Select a pet...</option>' +
    petsCache.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  document.getElementById('vaxBody').innerHTML = `<tr class="empty-row"><td colspan="5">Select a pet above.</td></tr>`;
}

async function loadVaccinations() {
  const petId = document.getElementById('vaxPetFilter').value;
  const body = document.getElementById('vaxBody');
  if (!petId) { body.innerHTML = `<tr class="empty-row"><td colspan="5">Select a pet above.</td></tr>`; return; }

  try {
    const rows = await api.getVaccinations(petId);
    const pet = petsCache.find(p => p.id == petId);
    body.innerHTML = rows.length ? rows.map(v => `
      <tr>
        <td>${pet.name}</td><td>${v.vaccine_name}</td><td>${v.date_administered}</td><td>${v.next_due_date}</td>
        <td><button class="btn-small btn-reject" onclick="deleteVax(${v.id})">Delete</button></td>
      </tr>
    `).join('') : `<tr class="empty-row"><td colspan="5">No vaccination records for this pet.</td></tr>`;
  } catch (err) {
    body.innerHTML = `<tr class="empty-row"><td colspan="5">Error: ${err.message}</td></tr>`;
  }
}

function openVaxForm() {
  const petId = document.getElementById('vaxPetFilter').value;
  if (!petId) { alert('Select a pet first'); return; }
  document.getElementById('formModalContent').innerHTML = `
    <h2>Add Vaccination Record</h2>
    <form onsubmit="submitVaxForm(event, ${petId})">
      <div class="field"><label>Vaccine Name</label><input id="vName" required></div>
      <div class="field"><label>Date Administered</label><input type="date" id="vDate" required></div>
      <div class="field"><label>Next Due Date</label><input type="date" id="vNextDue" required></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="closeFormModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>
  `;
  document.getElementById('formOverlay').classList.add('open');
}

async function submitVaxForm(e, petId) {
  e.preventDefault();
  try {
    await api.createVaccination({
      petId: Number(petId),
      vaccineName: document.getElementById('vName').value,
      dateAdministered: document.getElementById('vDate').value,
      nextDueDate: document.getElementById('vNextDue').value,
    });
    closeFormModal();
    loadVaccinations();
  } catch (err) { alert(err.message); }
}

async function deleteVax(id) {
  if (!confirm('Delete this vaccination record?')) return;
  try {
    await api.deleteVaccination(id);
    loadVaccinations();
  } catch (err) { alert(err.message); }
}

async function loadStaffPanel() {
  try {
    const rows = await api.listStaff();
    document.getElementById('staffBody').innerHTML = rows.length ? rows.map(s => `
      <tr><td>${s.name}</td><td>${s.username}</td><td>${s.email}</td><td>${s.phone || '—'}</td></tr>
    `).join('') : `<tr class="empty-row"><td colspan="4">No staff members yet.</td></tr>`;
  } catch (err) {
    document.getElementById('staffBody').innerHTML = `<tr class="empty-row"><td colspan="4">Error: ${err.message}</td></tr>`;
  }
}

function openStaffForm() {
  document.getElementById('formModalContent').innerHTML = `
    <h2>Add Staff Member</h2>
    <form onsubmit="submitStaffForm(event)">
      <div class="field"><label>Full Name</label><input id="sName" required></div>
      <div class="field"><label>Username</label><input id="sUsername" required></div>
      <div class="field"><label>Email</label><input type="email" id="sEmail" required></div>
      <div class="field"><label>Phone</label><input id="sPhone"></div>
      <div class="field"><label>Password</label><input type="password" id="sPassword" minlength="6" required></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="closeFormModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Create</button>
      </div>
    </form>
  `;
  document.getElementById('formOverlay').classList.add('open');
}

async function submitStaffForm(e) {
  e.preventDefault();
  try {
    await api.createStaff({
      name: document.getElementById('sName').value,
      username: document.getElementById('sUsername').value,
      email: document.getElementById('sEmail').value,
      phone: document.getElementById('sPhone').value,
      password: document.getElementById('sPassword').value,
    });
    closeFormModal();
    loadStaffPanel();
  } catch (err) { alert(err.message); }
}

async function loadReportsPanel() {
  try {
    const dash = await api.getDashboard();
    document.getElementById('reportStats').innerHTML = `
      <div class="stat-card"><span class="stat-num">${dash.totalPets}</span><div class="stat-label">Total Pets</div></div>
      <div class="stat-card"><span class="stat-num">${dash.available}</span><div class="stat-label">Available</div></div>
      <div class="stat-card"><span class="stat-num">${dash.adopted}</span><div class="stat-label">Adopted</div></div>
      <div class="stat-card"><span class="stat-num">${dash.totalAdopters}</span><div class="stat-label">Adopters</div></div>
      <div class="stat-card"><span class="stat-num">${dash.totalAdoptions}</span><div class="stat-label">Total Adoptions</div></div>
    ` + `
      <div class="card" style="grid-column:1/-1;background:#fff;border:1px solid var(--sage-line);border-radius:var(--radius);padding:20px;margin-top:16px;">
        <h3 style="margin-top:0;color:var(--forest-dark);">Pets by Type</h3>
        <table class="data-table">
          <thead><tr><th>Type</th><th>Count</th></tr></thead>
          <tbody>
            ${dash.byType.map(t => `<tr><td>${t.type}</td><td>${t.count}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="card" style="grid-column:1/-1;background:#fff;border:1px solid var(--sage-line);border-radius:var(--radius);padding:20px;margin-top:16px;">
        <h3 style="margin-top:0;color:var(--forest-dark);">Recent Adoptions</h3>
        <table class="data-table">
          <thead><tr><th>Pet</th><th>Adopter</th><th>Date</th></tr></thead>
          <tbody>
            ${dash.recentAdoptions.length ? dash.recentAdoptions.map(r => `
              <tr><td>${r.pet_name}</td><td>${r.adopter_name}</td><td>${new Date(r.adoption_date).toLocaleDateString()}</td></tr>
            `).join('') : `<tr class="empty-row"><td colspan="3">No adoptions yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    document.getElementById('reportStats').innerHTML = `<p>Error: ${err.message}</p>`;
  }
}

/* ---------------- Shared form modal + logout ---------------- */
function closeFormModal() {
  document.getElementById('formOverlay').classList.remove('open');
}
function handleLogout() {
  clearToken();
  window.location.href = 'index.html';
}