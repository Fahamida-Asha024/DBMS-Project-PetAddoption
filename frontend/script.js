let allPets = [];
let selectedPetForAdoption = null;

document.addEventListener('DOMContentLoaded', () => {
  loadPets();
  updateNavForLoggedInUser();
});

function updateNavForLoggedInUser() {
  const user = getCurrentUser();
  const loginLink = document.querySelector('nav a[onclick*="showLoginModal"]');
  const myReqLink = document.getElementById('myAdoptionsNavLink');

  if (user) {
    if (loginLink) {
      loginLink.textContent = `👤 ${user.name} (Logout)`;
      loginLink.setAttribute('onclick', 'handleLogout(); return false;');
    }
    if (user.role === 'admin') { window.location.href = 'admin-dashboard.html'; return; }
    if (user.role === 'staff') { window.location.href = 'staff-dashboard.html'; return; }

    if (myReqLink) {
      myReqLink.style.display = 'inline';
      loadMyAdoptions();
    }
  } else {
    if (myReqLink) myReqLink.style.display = 'none';
  }
}

function handleLogout() {
  clearToken();
  window.location.href = 'index.html';
}

function scrollToBrowse() {
  document.getElementById('browse').scrollIntoView({ behavior: 'smooth' });
}
function scrollToMyAdoptions() {
  document.getElementById('myAdoptions')?.scrollIntoView({ behavior: 'smooth' });
}
async function loadPets() {
  const grid = document.getElementById('petGrid');
  grid.innerHTML = `<div class="empty">Loading pets…</div>`;
  try {
    allPets = await api.getPets();
    updateHeroStats();
    populateFilterOptions();
    renderPetGrid();
  } catch (err) {
    grid.innerHTML = `<div class="empty">Could not load pets — ${err.message}</div>`;
  }
}

function updateHeroStats() {
  const available = allPets.filter(p => p.status === 'Available').length;
  const adopted = allPets.filter(p => p.status === 'Adopted').length;
  document.getElementById('statAvailable').textContent = available;
  document.getElementById('statAdopted').textContent = adopted;
  document.getElementById('statTotal').textContent = allPets.length;
}

function populateFilterOptions() {
  const typeSel = document.getElementById('typeFilter');
  const breedSel = document.getElementById('breedFilter');
  const types = [...new Set(allPets.map(p => p.type))];
  const breeds = [...new Set(allPets.map(p => p.breed))].sort();

  typeSel.innerHTML = '<option value="">All types</option>' +
    types.map(t => `<option value="${t}">${t}</option>`).join('');
  breedSel.innerHTML = '<option value="">All breeds</option>' +
    breeds.map(b => `<option value="${b}">${b}</option>`).join('');
}

function statusPillClass(status) {
  if (status === 'Available') return 'status-available';
  if (status === 'Pending') return 'status-pending';
  return 'status-adopted';
}

function renderPetGrid() {
  const search = document.getElementById('searchBox').value.toLowerCase();
  const type = document.getElementById('typeFilter').value;
  const breed = document.getElementById('breedFilter').value;
  const status = document.getElementById('statusFilter').value;

  const filtered = allPets.filter(p =>
    (p.name.toLowerCase().includes(search) || p.breed.toLowerCase().includes(search)) &&
    (!type || p.type === type) &&
    (!breed || p.breed === breed) &&
    (!status || p.status === status)
  );

  const grid = document.getElementById('petGrid');
  grid.innerHTML = filtered.length ? filtered.map(p => `
    <div class="pet-card">
      <div class="pet-photo">${petEmoji(p.type)}</div>
      <div class="pet-body">
        <span class="status-pill ${statusPillClass(p.status)}">${p.status}</span>
        <h3>${p.name}</h3>
        <div class="pet-meta">${p.breed} · ${p.type} · ${p.age} yr · ${p.gender}</div>
        <button class="btn btn-primary" onclick="openModal(${p.id})">View & Adopt</button>
      </div>
    </div>
  `).join('') : `<div class="empty">No pets match your search.</div>`;
}

function petEmoji(type) {
  const map = { Dog: '🐶', Cat: '🐱', Rabbit: '🐰' };
  return map[type] || '🐾';
}

['searchBox', 'typeFilter', 'breedFilter', 'statusFilter'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', renderPetGrid);
  document.getElementById(id)?.addEventListener('change', renderPetGrid);
});
async function openModal(petId) {
  const overlay = document.getElementById('overlay');
  const content = document.getElementById('modalContent');
  content.innerHTML = `<p>Loading…</p>`;
  overlay.classList.add('open');

  try {
    const pet = await api.getPet(petId);
    selectedPetForAdoption = pet;

    const vaxHtml = pet.vaccinations && pet.vaccinations.length
      ? pet.vaccinations.map(v => `
          <div class="vax-item">💉 ${v.vaccine_name} — given ${v.date_administered}, next due ${v.next_due_date}</div>
        `).join('')
      : `<div class="vax-item">No vaccination records yet.</div>`;

    const user = getCurrentUser();
    const isLoggedInAdopter = user && user.role === 'adopter';

    let actionHtml;
    if (pet.status === 'Adopted') {
      actionHtml = `<p style="margin-top:16px;color:#8a8378;">This pet has already been adopted.</p>`;
    } else if (pet.status === 'Pending') {
      actionHtml = `<p style="margin-top:16px;color:#8a8378;">This pet already has a pending adoption request.</p>`;
    } else if (isLoggedInAdopter) {
      actionHtml = `
        <form class="request-form" onsubmit="submitAdoption(event)">
          <p style="font-size:13px;color:#6B655D;margin:0;">
            Requesting to adopt as <strong>${user.name}</strong> (${user.email}).
            An admin will review your request.
          </p>
          <button type="submit" class="btn btn-primary">Request to Adopt ${pet.name}</button>
          <div class="confirm-msg" id="adoptConfirm"></div>
        </form>`;
    } else {
      actionHtml = `
        <p style="font-size:13px;color:#6B655D;margin-top:16px;">
          Please <a href="#" onclick="closeModal();showLoginModal();return false;" style="color:var(--forest);font-weight:600;">log in</a>
          as an adopter (or <a href="#" onclick="closeModal();showRegisterModal();return false;" style="color:var(--forest);font-weight:600;">register</a> first)
          to request adopting this pet.
        </p>`;
    }

    content.innerHTML = `
      <div class="modal-photo">${petEmoji(pet.type)}</div>
      <h2>${pet.name}</h2>
      <div class="modal-meta">${pet.breed} · ${pet.type}</div>
      <div class="info-row"><span>Age</span><span>${pet.age} years</span></div>
      <div class="info-row"><span>Gender</span><span>${pet.gender}</span></div>
      <div class="info-row"><span>Status</span><span>${pet.status}</span></div>
      <div class="vax-list">
        <h4>Vaccination records</h4>
        ${vaxHtml}
      </div>
      ${actionHtml}
    `;
  } catch (err) {
    content.innerHTML = `<p>Could not load this pet — ${err.message}</p>`;
  }
}

function closeModal() {
  document.getElementById('overlay').classList.remove('open');
  selectedPetForAdoption = null;
}
document.getElementById('overlay')?.addEventListener('click', (e) => {
  if (e.target.id === 'overlay') closeModal();
});

async function submitAdoption(e) {
  e.preventDefault();
  const confirmEl = document.getElementById('adoptConfirm');
  try {
    await api.createAdoption(selectedPetForAdoption.id);
    confirmEl.textContent = `✅ Request submitted! Status: pending review by admin.`;
    confirmEl.classList.add('show');

    await loadPets();
    await loadMyAdoptions();
    setTimeout(closeModal, 1800);
  } catch (err) {
    confirmEl.textContent = `❌ ${err.message}`;
    confirmEl.classList.add('show');
  }
}
async function loadMyAdoptions() {
  const section = document.getElementById('myAdoptions');
  const body = document.getElementById('myAdoptionsBody');
  if (!section) return;
  section.style.display = 'block';

  try {
    const rows = await api.getMyAdoptions();
    body.innerHTML = rows.length ? rows.map(r => `
      <tr>
        <td>${r.pet_name}</td>
        <td><span class="status-pill ${r.status === 'approved' ? 'status-adopted' : r.status === 'rejected' ? 'status-rejected' : 'status-pending'}">${r.status}</span></td>
        <td>${r.staff_name ? r.staff_name : '—'}</td>
        <td>${r.delivery_status.replace('_', ' ')}</td>
        <td>${new Date(r.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('') : `<tr class="empty-row"><td colspan="5">You haven't requested any adoptions yet.</td></tr>`;
  } catch (err) {
    body.innerHTML = `<tr class="empty-row"><td colspan="5">Could not load — ${err.message}</td></tr>`;
  }
}

function showLoginModal() {
  document.getElementById('loginOverlay').classList.add('open');
  document.getElementById('loginError').style.display = 'none';
}
function closeLoginModal() {
  document.getElementById('loginOverlay').classList.remove('open');
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  errorEl.style.display = 'none';

  try {
    const result = await api.login({ username, password });
    setToken(result.token);
    setCurrentUser(result.user);
    closeLoginModal();

    if (result.user.role === 'admin') {
      window.location.href = 'admin-dashboard.html';
    } else if (result.user.role === 'staff') {
      window.location.href = 'staff-dashboard.html';
    } else {
      updateNavForLoggedInUser();
      loadPets();
    }
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  }
}
function showRegisterModal() {
  document.getElementById('registerOverlay').classList.add('open');
  document.getElementById('registerError').style.display = 'none';
}
function closeRegisterModal() {
  document.getElementById('registerOverlay').classList.remove('open');
}

async function handleRegister(e) {
  e.preventDefault();
  const errorEl = document.getElementById('registerError');
  errorEl.style.display = 'none';

  const payload = {
    name: document.getElementById('regFullName').value.trim(),
    username: document.getElementById('regUsername').value.trim(),
    email: document.getElementById('regEmail').value.trim(),
    phone: document.getElementById('regPhone').value.trim(),
    address: document.getElementById('regAddress').value.trim(),
    password: document.getElementById('regPassword').value,
  };
  const confirmPassword = document.getElementById('regConfirmPassword').value;

  if (payload.password.length < 6) {
    errorEl.textContent = 'Password must be at least 6 characters.';
    errorEl.style.display = 'block';
    return;
  }
  if (payload.password !== confirmPassword) {
    errorEl.textContent = 'Passwords do not match.';
    errorEl.style.display = 'block';
    return;
  }

  try {
    await api.register(payload);
    closeRegisterModal();
    showLoginModal();
    document.getElementById('loginUsername').value = payload.username;
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  }
}