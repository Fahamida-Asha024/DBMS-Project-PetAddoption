let petsCache = [];

document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  if (!user || user.role !== 'staff') {
    window.location.href = 'index.html';
    return;
  }
  document.getElementById('whoAmI').textContent = `👤 ${user.name} (staff)`;

  loadDeliveries();
  loadNotifications();
  setInterval(loadNotifications, 15000);
});

function switchPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`panel-${name}`).style.display = 'block';
  document.querySelector(`.nav-btn[data-panel="${name}"]`).classList.add('active');

  const titles = { deliveries: 'My Deliveries', vaccinations: 'Vaccinations' };
  document.getElementById('panelTitle').textContent = titles[name];

  if (name === 'deliveries') loadDeliveries();
  if (name === 'vaccinations') loadVaxPanel();
}

async function loadNotifications() {
  try {
    const list = await api.getNotifications();
    const unread = list.filter(n => !n.is_read);
    const badge = document.getElementById('notifBadge');
    badge.style.display = unread.length ? 'inline-block' : 'none';
    badge.textContent = unread.length;

    document.getElementById('notifList').innerHTML = list.length
      ? list.map(n => `
          <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="markNotifRead(${n.id})">
            <div>${n.message}</div>
            <div class="notif-time">${new Date(n.created_at).toLocaleString()}</div>
          </div>
        `).join('')
      : `<p class="empty-note">No notifications yet.</p>`;
  } catch (err) { console.error('notifications error', err); }
}

async function markNotifRead(id) {
  try { await api.markNotificationRead(id); loadNotifications(); } catch (err) { console.error(err); }
}

function toggleNotifPanel() {
  const el = document.getElementById('notifDropdown');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
  if (el.style.display === 'block') loadNotifications();
}

async function loadDeliveries() {
  const body = document.getElementById('deliveriesBody');
  body.innerHTML = `<tr class="empty-row"><td colspan="6">Loading…</td></tr>`;
  try {
    const rows = await api.getAssignedToMe();
    body.innerHTML = rows.length ? rows.map(d => `
      <tr>
        <td>${d.pet_name} <span style="color:#8a8378;">(${d.pet_breed})</span></td>
        <td>${d.adopter_name}</td>
        <td>${d.adopter_phone}</td>
        <td>${d.adopter_address || '—'}</td>
        <td><span class="status-pill status-${d.delivery_status}">${d.delivery_status.replace('_', ' ')}</span></td>
        <td>
          ${d.delivery_status !== 'delivered'
            ? `<button class="btn-small btn-approve" onclick="markDelivered(${d.id})">Mark Delivered</button>`
            : '—'}
        </td>
      </tr>
    `).join('') : `<tr class="empty-row"><td colspan="6">No deliveries assigned to you yet.</td></tr>`;
  } catch (err) {
    body.innerHTML = `<tr class="empty-row"><td colspan="6">Error: ${err.message}</td></tr>`;
  }
}

async function markDelivered(id) {
  try {
    await api.markDelivered(id);
    loadDeliveries();
  } catch (err) { alert(err.message); }
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
  try { await api.deleteVaccination(id); loadVaccinations(); } catch (err) { alert(err.message); }
}

function closeFormModal() {
  document.getElementById('formOverlay').classList.remove('open');
}

function handleLogout() {
  clearToken();
  window.location.href = 'index.html';
}