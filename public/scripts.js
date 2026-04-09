/**
 * CHESSKIDOO ACADEMY - Admin Panel Scripts
 * Modular JavaScript with API integration
 */

(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // GLOBAL STATE
  // ═══════════════════════════════════════════════════════════════
  let allCoaches = [];
  let allStudents = [];
  let achievementsData = [];
  let eventsData = [];
  let allMessages = [];
  let mockCredentials = {};

  const API_BASE = 'https://vseombfkrvpffnpgbsnk.supabase.co/functions/v1';
  let role = null;
  let currentStudent = null;
  let charts = {};
  let payTarget = null;

  // ═══════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════
  const $ = id => document.getElementById(id);

  const isValidPhone = p => /^\d{10}$/.test(p);

  const formatTime = time24 => {
    if (!time24) return '—';
    const [h, m] = time24.split(':');
    const hh = h % 12 || 12;
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${hh}:${m} ${ampm}`;
  };

  function toast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span> ${msg}`;
    const container = $('toast-container');
    if (container) container.appendChild(el);
    setTimeout(() => el.remove(), 3800);
  }

  function openModal(id) { const el = $(id); if (el) el.style.display = 'flex'; }
  function closeModals() { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) closeModals(); }));

  function previewFile(inp, previewId) {
    const file = inp.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = $(previewId);
      if (img) { img.src = e.target.result; img.style.display = 'block'; }
    };
    reader.readAsDataURL(file);
  }

  async function uploadFile(file) { return URL.createObjectURL(file); }

  function makeAvSrc(s) {
    if (s.custom_avatar) return s.custom_avatar;
    const name = s.full_name || s.name || 'Student';
    if (name.toLowerCase() === 'saanvi iyer') {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1d4ed8&color=ffffff&bold=true&size=80`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=dca33e&color=000000&bold=true&size=80`;
  }

  function getStudentName(s) {
    return s.full_name || s.name || 'Unknown';
  }

  function getStudentLevel(s) {
    return s.level || s.grade || 'Beginner';
  }

  function getStudentRating(s) {
    return s.current_rating || s.rating || 800;
  }

  function getStudentDate(s) {
    return s.join_date || s.enrollment_date || '—';
  }

  function getStudentPhone(s) {
    return s.parent_phone || s.phone || '';
  }

  function getCoachName(c) {
    return c.full_name || c.name || '';
  }

  // ═══════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════
  async function loadAllData() {
    try {
      const [cRes, sRes, aRes, eRes] = await Promise.all([
        fetch('/api/coaches'),
        fetch('/api/students'),
        fetch('/api/achievements'),
        fetch('/api/events')
      ]);

      allCoaches = await cRes.json();
      allStudents = await sRes.json();
      achievementsData = await aRes.json();
      eventsData = await eRes.json();

      mockCredentials = {};
      allStudents.forEach(s => {
        if (s.full_name) {
          mockCredentials[s.full_name.toLowerCase()] = s.parent_phone || s.phone || '9876543210';
        }
      });

      syncCoachDropdowns();
      if (role === 'admin' || role === 'master') {
        renderDash();
      } else if (role === 'parent') {
        renderChild();
      }
    } catch (err) {
      toast('Failed to load data from server', 'error');
    }
  }

  function syncCoachDropdowns() {
    const options = allCoaches.map(c => `<option value="${c.id}">${c.full_name}</option>`).join('');
    if ($('f-coach')) $('f-coach').innerHTML = '<option value="">All Coaches</option>' + options;
    if ($('m-coach')) $('m-coach').innerHTML = options;
    if ($('e-coach')) $('e-coach').innerHTML = options;
  }

  // ═══════════════════════════════════════════════════════════════
  // SIDEBAR & NAVIGATION
  // ═══════════════════════════════════════════════════════════════
  function toggleSidebar() {
    const sidebar = $('sidebar');
    const overlay = $('sidebar-overlay');
    const main = document.querySelector('.main');
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('open');
      if (sidebar.classList.contains('open')) overlay.classList.add('active');
      else overlay.classList.remove('active');
    } else {
      sidebar.classList.toggle('collapsed');
      main.classList.toggle('expanded');
    }
  }

  const PAGE_TITLES = {
    dash: 'Academy Overview',
    stud: 'Student Registry',
    'coach-mgmt': 'Coach Management',
    child: 'My Child\'s Progress',
    fame: 'Wall of Fame',
    events: 'Upcoming Events',
    bills: 'Financials & Payments',
    coach: 'AI Intelligence Hub'
  };

  function setPage(p) {
    document.querySelectorAll('.page').forEach(pg => pg.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(ni => ni.classList.remove('active'));
    $('page-' + p)?.classList.add('active');
    $('nav-' + p)?.classList.add('active');
    $('p-title').textContent = PAGE_TITLES[p] || '';

    const btnArea = $('top-btn-area');
    if (btnArea) {
      btnArea.innerHTML = '';
      if (role === 'admin' || role === 'master') {
        if (p === 'dash' || p === 'stud') {
          btnArea.innerHTML = `<button type="button" class="btn btn-gold" onclick="openEnroll()">+ New Enrollment</button>`;
        }
        if (p === 'events') {
          btnArea.innerHTML = `<button type="button" class="btn btn-gold" onclick="openModal('ev-modal')">+ Create Event</button>`;
        }
      }
    }

    if (window.innerWidth <= 768) {
      $('sidebar')?.classList.remove('open');
      $('sidebar-overlay')?.classList.remove('active');
    }

    setTimeout(() => {
      if (p === 'dash') renderDash();
      if (p === 'stud') renderStudents();
      if (p === 'coach-mgmt') renderCoachMgmt();
      if (p === 'fame') renderFame();
      if (p === 'events') renderEvents();
      if (p === 'bills') renderBills();
      if (p === 'child') renderChild();
    }, 100);
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════
  function toggleEye() {
    const p = $('li-pass');
    const icon = $('eye-icon');
    if (p.type === 'password') {
      p.type = 'text';
      icon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
    } else {
      p.type = 'password';
      icon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
    }
  }

  function doLogin() {
    const rawUser = $('li-user').value.trim();
    const pass = $('li-pass').value.trim();
    const errEl = $('login-err');
    if (errEl) { errEl.style.display = 'none'; }

    if (!rawUser || !pass) {
      if (errEl) { errEl.textContent = "Please enter credentials."; errEl.style.display = 'block'; }
      return;
    }

    const lowerUser = rawUser.toLowerCase();

    // Master credentials (Tom@193)
    if (rawUser === 'Tom@193' && pass === 'Thamaraiselvam@309402$') {
      role = 'master';
      document.body.classList.add('admin-mode', 'master-mode');
      if ($('top-profile')) $('top-profile').style.display = 'flex';
      if ($('top-profile-name')) $('top-profile-name').innerHTML = 'Master <span style="background:var(--gold);color:#000;padding:2px 8px;border-radius:10px;font-size:10px;margin-left:8px">👑</span>';
      if ($('top-profile-av')) $('top-profile-av').src = `https://ui-avatars.com/api/?name=Master&background=dca33e&color=000000&bold=true&size=80`;
      finishLogin('dash');
      syncCoachDropdowns();
      return;
    }

    // Admin credentials
    if (lowerUser === 'admin' && pass === 'admin123') {
      role = 'admin';
      document.body.classList.add('admin-mode');
      if ($('top-profile')) $('top-profile').style.display = 'flex';
      if ($('top-profile-name')) $('top-profile-name').textContent = 'Admin';
      if ($('top-profile-av')) $('top-profile-av').src = `https://ui-avatars.com/api/?name=Admin&background=dca33e&color=000000&bold=true&size=80`;
      finishLogin('dash');
      syncCoachDropdowns();
      return;
    }

    // Parent/Student credentials
    if (mockCredentials[lowerUser] && mockCredentials[lowerUser] === pass) {
      role = 'parent';
      document.body.classList.add('parent-mode');
      currentStudent = allStudents.find(s => s.full_name && s.full_name.toLowerCase() === lowerUser);
      if (!currentStudent) {
        if (errEl) { errEl.textContent = "Student not found."; errEl.style.display = 'block'; }
        return;
      }
      if ($('top-profile')) $('top-profile').style.display = 'flex';
      if ($('top-profile-name')) $('top-profile-name').textContent = currentStudent.full_name.split(' ')[0];
      if ($('top-profile-av')) $('top-profile-av').src = makeAvSrc(currentStudent);
      finishLogin('child');
      return;
    }

    if (errEl) { errEl.textContent = "Invalid username or password."; errEl.style.display = 'block'; }
  }

  function finishLogin(page) {
    if ($('login-screen')) $('login-screen').style.display = 'none';
    setPage(page);
    loadAllData();
  }

  function doLogout() {
    closeModals();
    role = null;
    currentStudent = null;
    document.body.classList.remove('admin-mode', 'parent-mode', 'master-mode');
    if ($('login-screen')) $('login-screen').style.display = 'flex';
    if ($('top-profile')) $('top-profile').style.display = 'none';
    if ($('li-user')) $('li-user').value = '';
    if ($('li-pass')) $('li-pass').value = '';
  }

  function openProfile() {
    openModal('profile-modal');
  }

  // ═══════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════
  function renderDash() {
    const paidStudents = allStudents.filter(s => s.payment_status === 'Paid');
    const avgElo = allStudents.length ? Math.round(allStudents.reduce((a, s) => a + (s.current_rating || 0), 0) / allStudents.length) : 0;

    if ($('s-total')) $('s-total').textContent = allStudents.length;
    if ($('s-elo')) $('s-elo').textContent = avgElo;
    if ($('s-coaches')) $('s-coaches').textContent = allCoaches.length;

    const revenue = paidStudents.reduce((a, s) => a + (s.monthly_fee || 0), 0);
    const operationsCost = 15000;
    const totalSalaries = allCoaches.reduce((a, c) => a + (Number(c.salary) || 0), 0);
    const spending = totalSalaries + operationsCost;
    const profit = revenue - spending;

    if ($('s-rev')) $('s-rev').textContent = '₹' + revenue.toLocaleString();
    if ($('s-spend')) $('s-spend').textContent = '₹' + spending.toLocaleString();
    const profitEl = $('s-profit');
    if (profitEl) {
      if (profit >= 0) {
        profitEl.textContent = '₹' + profit.toLocaleString();
        profitEl.style.color = 'var(--success)';
      } else {
        profitEl.textContent = '-₹' + Math.abs(profit).toLocaleString();
        profitEl.style.color = 'var(--danger)';
      }
    }

    buildCharts(allStudents);
  }

  function buildCharts(studs) {
    const isLight = document.body.getAttribute('data-theme') === 'light';
    const tick = isLight ? '#6b6b80' : '#888884';
    const grid = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';

    if (charts.elo) { charts.elo.destroy(); charts.elo = null; }
    if (charts.coach) { charts.coach.destroy(); charts.coach = null; }

    const eloCtx = $('chartElo');
    const coachCtx = $('chartCoach');
    if (!eloCtx || !coachCtx) return;

    charts.elo = new Chart(eloCtx, {
      type: 'bar',
      data: {
        labels: studs.map(s => getStudentName(s).split(' ')[0]),
        datasets: [{ label: 'ELO', data: studs.map(s => getStudentRating(s)), backgroundColor: '#dca33e', borderRadius: 5 }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: grid }, ticks: { color: tick } },
          x: { grid: { display: false }, ticks: { color: tick } }
        }
      }
    });

    const coachMap = {};
    studs.forEach(s => {
      const cn = (s.coaches && s.coaches.full_name) || 'Unassigned';
      coachMap[cn] = (coachMap[cn] || 0) + 1;
    });

    charts.coach = new Chart(coachCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(coachMap),
        datasets: [{ data: Object.values(coachMap), backgroundColor: ['#dca33e', '#5a9fff', '#52c41a', '#ff4d4f'], borderWidth: isLight ? 2 : 0, borderColor: isLight ? '#fff' : 'transparent' }]
      },
      options: { plugins: { legend: { labels: { color: tick } } } }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // STUDENTS
  // ═══════════════════════════════════════════════════════════════
  function clearFilters() {
    if ($('f-coach')) $('f-coach').value = '';
    if ($('f-status')) $('f-status').value = '';
    if ($('f-min-fee')) $('f-min-fee').value = '';
    if ($('f-max-fee')) $('f-max-fee').value = '';
    if ($('f-date')) $('f-date').value = '';
    renderStudents();
  }

  function renderStudents() {
    const tbody = $('stud-body');
    if (!tbody) return;

    const fCoach = $('f-coach')?.value;
    const fStatus = $('f-status')?.value;
    const fGender = $('f-gender')?.value;
    const fMinFee = parseInt($('f-min-fee')?.value) || 0;
    const fMaxFee = parseInt($('f-max-fee')?.value) || Infinity;
    const fDate = $('f-date')?.value;
    const fAwards = $('f-awards')?.value;

    const filteredStudents = allStudents.filter(s => {
      let match = true;
      if (fCoach && s.coaches?.id !== fCoach) match = false;
      if (fStatus && s.payment_status !== fStatus) match = false;
      if ((s.monthly_fee || 0) < fMinFee || (s.monthly_fee || 0) > fMaxFee) match = false;
      if (fDate && getStudentDate(s) !== fDate) match = false;
      return match;
    });

    if (!filteredStudents.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">♟</div><p>No students match the filters.</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = filteredStudents.map(s => `
      <tr>
        <td>
          <div class="av-cell">
            <img src="${makeAvSrc(s)}" class="av-sm" alt="${getStudentName(s)}">
            <div>${getStudentName(s)}</div>
          </div>
        </td>
        <td>
          <span class="text-gold">${getStudentLevel(s)}</span><br>
          <span style="font-family:'DM Mono'; font-size:12px">${getStudentRating(s)}</span>
        </td>
        <td style="font-size:13px">${getStudentDate(s)}</td>
        <td style="color:var(--ivory-dim);font-size:13px">${(s.coaches && s.coaches.full_name) || '—'}</td>
        <td>
          <span class="${s.payment_status === 'Paid' ? 'text-success' : 'text-danger'}">${s.payment_status || 'Due'}</span><br>
          <span style="font-size:11px; color:var(--ivory-dim)">₹${s.monthly_fee || 0}</span>
        </td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button type="button" class="btn btn-outline-blue btn-sm" onclick="viewStudent('${s.id}')">View</button>
            <button type="button" class="btn btn-outline-grey btn-sm" onclick="openEdit('${s.id}')">Edit</button>
            <button type="button" class="btn btn-danger btn-sm" onclick="deleteStudent('${s.id}','${getStudentName(s).replace(/'/g, "\\'")}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function viewStudent(id) {
    const s = allStudents.find(x => x.id === id);
    if (!s) return;

    if ($('sv-av')) $('sv-av').src = makeAvSrc(s);
    if ($('sv-name')) $('sv-name').textContent = getStudentName(s);
    if ($('sv-level')) $('sv-level').textContent = getStudentLevel(s);
    if ($('sv-elo')) $('sv-elo').textContent = getStudentRating(s);
    if ($('sv-join')) $('sv-join').textContent = getStudentDate(s);
    if ($('sv-coach')) $('sv-coach').textContent = (s.coaches && s.coaches.full_name) || 'Unassigned';
    if ($('sv-batch')) $('sv-batch').textContent = s.batch_type || '—';
    if ($('sv-time')) $('sv-time').textContent = formatTime(s.batch_time);
    if ($('sv-fee')) $('sv-fee').textContent = s.monthly_fee || 0;
    if ($('sv-status')) {
      $('sv-status').innerHTML = `<span class="${s.payment_status === 'Paid' ? 'text-success' : 'text-danger'}">${s.payment_status || 'Due'}</span>`;
    }

    const phone = getStudentPhone(s);
    if ($('sv-phone')) $('sv-phone').textContent = phone || 'Not Provided';

    const editBtn = $('sv-edit-btn');
    if (editBtn) editBtn.onclick = () => { closeModals(); openEdit(s.id); };

    openModal('student-view-modal');
  }

  // ═══════════════════════════════════════════════════════════════
  // COACH MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  function renderCoachMgmt() {
    const tbody = $('coach-mgmt-body');
    if (!tbody) return;

    if (!allCoaches.length) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state">No coaches found.</div></td></tr>`;
      return;
    }

    tbody.innerHTML = allCoaches.map(c => {
      const assignedCount = allStudents.filter(s => s.coaches && s.coaches.id === c.id).length;
      const imgSrc = c.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(getCoachName(c))}&background=dca33e&color=000&bold=true`;
      return `
        <tr>
          <td>
            <div class="av-cell">
              <img src="${imgSrc}" class="av-sm" alt="Photo">
              <div>
                <span style="font-weight:600; color:var(--gold)">${getCoachName(c)}</span><br>
                <span style="font-size:11px; color:var(--ivory-dim)">${c.specialty || c.specialization || 'General'}</span>
              </div>
            </div>
          </td>
          <td style="font-size:12px; line-height:1.6">
            📞 <span style="color:var(--ivory)">+91 ${c.phone || 'N/A'}</span><br>
            📍 <span style="color:var(--ivory)">${c.address || 'N/A'}</span><br>
            💰 <span style="color:var(--ivory)">₹${Number(c.salary || c.hourly_rate || 0).toLocaleString()}</span><br>
            <span style="color:var(--ivory-dim); font-style:italic">${c.additional_details || c.bio || ''}</span>
          </td>
          <td>${assignedCount} Students</td>
          <td>
            <button class="btn btn-outline-blue btn-sm" onclick="viewCoachSchedule('${c.id}')">Schedule</button>
            <button class="btn btn-outline-grey btn-sm" onclick="openCoachModal('${c.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteCoach('${c.id}')">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function viewCoachSchedule(id) {
    const c = allCoaches.find(x => x.id === id);
    if (!c) return;

    if ($('sched-coach-name')) $('sched-coach-name').textContent = c.full_name;
    const container = $('schedule-container');
    if (!container) return;
    container.innerHTML = '';

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const myStudents = allStudents.filter(s => s.coaches && s.coaches.id === id);

    if (myStudents.length === 0) {
      container.innerHTML = `<div class="empty-state" style="padding:30px;">No batches assigned.</div>`;
    } else {
      days.forEach(day => {
        let batchesToday = myStudents.filter(s => {
          if (s.batch_type === 'Weekend' && (day === 'Saturday' || day === 'Sunday')) return true;
          if (s.batch_type !== 'Weekend' && day !== 'Saturday' && day !== 'Sunday') return true;
          return false;
        });

        if (batchesToday.length > 0) {
          const times = [...new Set(batchesToday.map(s => formatTime(s.batch_time)))].join(', ');
          container.innerHTML += `<div class="schedule-day"><b>${day}</b><span class="schedule-time">${times}</span></div>`;
        } else {
          container.innerHTML += `<div class="schedule-day"><span style="color:var(--ivory-dim)">${day}</span><span class="schedule-time" style="color:var(--ivory-dim)">OFF</span></div>`;
        }
      });
    }
    openModal('coach-schedule-modal');
  }

  function openCoachModal(id = null) {
    if (id) {
      const c = allCoaches.find(x => x.id === id);
      if (c) {
        if ($('cm-id')) $('cm-id').value = c.id;
        if ($('cm-name')) $('cm-name').value = getCoachName(c);
        if ($('cm-spec')) $('cm-spec').value = c.specialty || c.specialization || '';
        if ($('cm-phone')) $('cm-phone').value = c.phone || '';
        if ($('cm-address')) $('cm-address').value = c.address || '';
        if ($('cm-photo')) $('cm-photo').value = c.photo_url || '';
        if ($('cm-salary')) $('cm-salary').value = c.salary || c.hourly_rate || '';
        if ($('cm-etc')) $('cm-etc').value = c.additional_details || c.bio || '';
      }
    } else {
      ['cm-id', 'cm-name', 'cm-spec', 'cm-phone', 'cm-address', 'cm-photo', 'cm-salary', 'cm-etc'].forEach(id => {
        const el = $(id);
        if (el) el.value = '';
      });
    }
    if ($('coach-modal-title')) $('coach-modal-title').textContent = id ? 'Edit Coach' : 'Add Coach';
    openModal('coach-crud-modal');
  }

  async function saveCoach() {
    const id = $('cm-id')?.value;
    const name = $('cm-name')?.value.trim();
    const spec = $('cm-spec')?.value.trim();
    const phone = $('cm-phone')?.value.trim();
    const address = $('cm-address')?.value.trim();
    const photo = $('cm-photo')?.value.trim();
    const salary = $('cm-salary')?.value.trim();
    const etc = $('cm-etc')?.value.trim();

    if (!name) { toast('Coach name required', 'error'); return; }
    if (phone && !isValidPhone(phone)) { toast('Phone must be 10 digits', 'error'); return; }

    const coachData = { name: name, specialization: spec, phone, address, photo_url: photo, salary: salary, bio: etc };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/coaches?id=${id}` : `${API_BASE}/coaches`;

    try {
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(coachData) });
      toast(`Coach ${id ? 'updated' : 'added'}!`, 'success');
      closeModals();
      loadAllData();
    } catch (err) {
      toast('Error saving coach', 'error');
    }
  }

  async function deleteCoach(id) {
    if (!confirm("Delete this coach? Students assigned will become unassigned.")) return;
    try {
      await fetch(`${API_BASE}/coaches?id=${id}`, { method: 'DELETE' });
      toast('Coach removed', 'info');
      loadAllData();
    } catch {
      toast('Delete failed', 'error');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STUDENT CRUD
  // ═══════════════════════════════════════════════════════════════
  function openEdit(id) {
    const s = allStudents.find(x => x.id === id);
    if (!s) return;

    if ($('e-id')) $('e-id').value = s.id;
    if ($('e-name')) $('e-name').value = getStudentName(s);
    if ($('e-join')) $('e-join').value = getStudentDate(s);
    if ($('e-elo')) $('e-elo').value = getStudentRating(s);
    if ($('e-level')) $('e-level').value = getStudentLevel(s).toUpperCase();
    if ($('e-coach')) {
      $('e-coach').innerHTML = allCoaches.map(c => `<option value="${c.id}" ${s.coaches && c.id === s.coaches.id ? 'selected' : ''}>${c.full_name}</option>`).join('');
    }
    if ($('e-fee')) $('e-fee').value = s.monthly_fee || 0;
    if ($('e-status')) $('e-status').value = s.payment_status || 'Due';
    if ($('e-phone')) $('e-phone').value = getStudentPhone(s);
    if ($('e-batch-type')) $('e-batch-type').value = s.batch_type || 'Evening';
    if ($('e-batch-time')) $('e-batch-time').value = s.batch_time || '17:00';

    openModal('edit-modal');
  }

  async function updateStudent() {
    const id = $('e-id')?.value;
    if (!id) return;

    const newName = $('e-name')?.value.trim();
    const phone = $('e-phone')?.value.trim();
    const eloVal = parseInt($('e-elo')?.value);
    const feeVal = parseInt($('e-fee')?.value);
    const joinDate = $('e-join')?.value;

    if (!newName) { toast('Name cannot be empty', 'error'); return; }
    if (!isValidPhone(phone)) { toast('Parent Phone must be exactly 10 digits', 'error'); return; }
    if (!joinDate) { toast('Join date is required', 'error'); return; }
    if (isNaN(eloVal) || eloVal < 0) { toast('ELO must be a valid number 0 or greater', 'error'); return; }
    if (isNaN(feeVal) || feeVal < 0) { toast('Fee must be a valid positive number', 'error'); return; }

    const coachId = $('e-coach')?.value;
    const studentData = {
      name: newName,
      phone: phone,
      join_date: joinDate,
      rating: eloVal,
      grade: $('e-level')?.value,
      coach_id: coachId || null,
      monthly_fee: feeVal,
      payment_status: $('e-status')?.value,
      batch_type: $('e-batch-type')?.value,
      batch_time: $('e-batch-time')?.value
    };

    try {
      await fetch(`${API_BASE}/students?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData)
      });
      toast('Student updated successfully!', 'success');
      closeModals();
      loadAllData();
    } catch (err) {
      toast('Update failed', 'error');
    }
  }

  function openEnroll() {
    const preview = $('m-avatar-preview');
    if (preview) preview.style.display = 'none';
    const joinInput = $('m-join');
    if (joinInput) joinInput.value = new Date().toISOString().split('T')[0];
    openModal('enroll-modal');
  }

  async function saveStudent() {
    const name = $('m-name')?.value.trim();
    const phone = $('m-phone')?.value.trim();
    const eloVal = parseInt($('m-elo')?.value);
    const feeVal = parseInt($('m-fee')?.value);
    const joinDate = $('m-join')?.value;

    if (!name) { toast('Please enter a Full Name', 'error'); return; }
    if (!isValidPhone(phone)) { toast('Parent Phone must be exactly 10 digits', 'error'); return; }
    if (!joinDate) { toast('Join date is required', 'error'); return; }
    if (isNaN(eloVal) || eloVal < 0) { toast('Initial ELO must be a valid number 0 or greater', 'error'); return; }
    if (isNaN(feeVal) || feeVal < 0) { toast('Fee must be a valid positive number', 'error'); return; }

    let imgUrl = null;
    const file = $('m-avatar-file')?.files[0];
    if (file) imgUrl = await uploadFile(file);

    const coachId = $('m-coach')?.value;
    const newStudent = {
      name: name,
      phone: phone,
      enrollment_date: joinDate,
      rating: eloVal,
      grade: $('m-level')?.value,
      coach_id: coachId || null,
      monthly_fee: feeVal,
      payment_status: 'Due',
      batch_type: $('m-batch-type')?.value,
      batch_time: $('m-batch-time')?.value,
      tactics_score: 50,
      endgame_score: 50,
      openings_score: 50,
      positional_score: 50,
      custom_avatar: imgUrl
    };

    try {
      await fetch(`${API_BASE}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent)
      });
      toast(`${name} enrolled successfully!`, 'success');
      closeModals();
      loadAllData();
      ['m-name', 'm-phone', 'm-avatar-file'].forEach(id => { const el = $(id); if (el) el.value = ''; });
      if ($('m-elo')) $('m-elo').value = '0';
      if ($('m-fee')) $('m-fee').value = '5000';
      if ($('m-batch-time')) $('m-batch-time').value = '17:00';
      const preview = $('m-avatar-preview');
      if (preview) preview.style.display = 'none';
    } catch (err) {
      toast('Enrollment failed', 'error');
    }
  }

  async function deleteStudent(id, name) {
    if (!confirm(`Remove ${name}?`)) return;
    try {
      await fetch(`${API_BASE}/students?id=${id}`, { method: 'DELETE' });
      toast(`${name} removed.`, 'info');
      loadAllData();
    } catch {
      toast('Delete failed', 'error');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // WALL OF FAME
  // ═══════════════════════════════════════════════════════════════
  function renderFame() {
    const loadingEl = $('fame-loading');
    const gridEl = $('fame-grid');
    if (!gridEl) return;

    if (loadingEl) loadingEl.style.display = 'none';
    gridEl.style.display = 'grid';

    if (!achievementsData.length) {
      gridEl.innerHTML = `<div class="empty-state" style="grid-column:1/-1; padding: 100px 0;"><div class="empty-icon" style="font-size: 60px; margin-bottom: 20px;">🏆</div><p style="font-size:16px;">No achievements yet.</p></div>`;
      return;
    }

    gridEl.innerHTML = achievementsData.map(a => `
      <div class="ach-card">
        ${role === 'admin' ? `<button type="button" class="del-btn" onclick="deleteAchievement('${a.id}')" title="Remove">✕</button>` : ''}
        ${a.img_url ? `<img src="${a.img_url}" class="ach-img" alt="${a.title || 'Achievement'}">` : `<div class="ach-img-placeholder">🏆</div>`}
        <div class="ach-info">
          <div class="ach-title">${a.title || 'Achievement'}</div>
          <div class="ach-sub">Awarded to: ${(a.students && a.students.full_name) || '—'}</div>
        </div>
      </div>
    `).join('');
  }

  function openAwardModal() {
    const select = $('award-student');
    if (select) {
      select.innerHTML = '<option value="">Select Student</option>' + 
        allStudents.map(s => `<option value="${s.id}">${getStudentName(s)}</option>`).join('');
    }
    if ($('award-sid')) $('award-sid').value = '';
    if ($('award-title')) $('award-title').value = '';
    if ($('award-img-url')) $('award-img-url').value = '';
    const preview = $('award-img-preview');
    if (preview) { preview.src = ''; preview.style.display = 'none'; }
    const fileInput = $('award-img-file');
    if (fileInput) fileInput.value = '';
    openModal('award-modal');
  }

  function onAwardStudentChange() {
    const select = $('award-student');
    if (select && $('award-sid')) {
      $('award-sid').value = select.value;
    }
  }

  async function saveAward() {
    const title = $('award-title')?.value.trim();
    const studentId = $('award-sid')?.value;
    if (!title) { toast('Title required', 'error'); return; }
    if (!studentId) { toast('Please select a student', 'error'); return; }

    let imgUrl = $('award-img-url')?.value.trim() || null;
    const file = $('award-img-file')?.files[0];
    if (file) imgUrl = await uploadFile(file);

    const student = allStudents.find(s => s.id === studentId);
    const awardData = {
      title,
      student_id: studentId,
      students: { full_name: getStudentName(student) || '', id: studentId },
      img_url: imgUrl,
      description: $('award-desc')?.value || ''
    };

    try {
      await fetch(`${API_BASE}/achievements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(awardData)
      });
      toast('Achievement published!', 'success');
      closeModals();
      loadAllData();
      ['award-title', 'award-img-file', 'award-img-url'].forEach(id => { const el = $(id); if (el) el.value = ''; });
      const preview = $('award-img-preview');
      if (preview) preview.style.display = 'none';
    } catch {
      toast('Failed to publish', 'error');
    }
  }

  async function deleteAchievement(id) {
    if (!confirm('Remove achievement?')) return;
    try {
      await fetch(`${API_BASE}/achievements?id=${id}`, { method: 'DELETE' });
      toast('Removed.', 'info');
      loadAllData();
    } catch {
      toast('Delete failed', 'error');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════════════════════════
  function renderEvents() {
    const loadingEl = $('ev-loading');
    const gridEl = $('ev-grid');
    if (!gridEl) return;

    if (loadingEl) loadingEl.style.display = 'none';
    gridEl.style.display = 'grid';

    if (!eventsData.length) {
      gridEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><p>No events scheduled. Create one!</p></div>`;
      return;
    }

    gridEl.innerHTML = eventsData.map(e => `
      <div class="ev-card">
        <div class="ev-date">${e.date || '—'}</div>
        <div class="ev-type">${e.type || 'Event'}</div>
        <div class="ev-title">${e.title || 'Untitled'}</div>
        <div class="ev-meta">
          📍 ${e.location || '—'}<br>
          🏆 Prize: ${e.prize || '—'}
          ${role === 'admin' ? `<br><span style="color:var(--success);font-weight:600">👥 ${e.registrations_count || 0} Registered</span>` : ''}
        </div>
        <div style="display:flex;gap:8px">
          <button type="button" class="btn btn-gold btn-sm" style="flex:1" onclick="registerEvent('${e.id}')">Register</button>
          ${role === 'admin' ? `<button type="button" class="btn btn-danger btn-sm" onclick="deleteEvent('${e.id}')">Delete</button>` : ''}
        </div>
      </div>
    `).join('');
  }

  async function saveEvent() {
    const title = $('ev-title')?.value.trim();
    if (!title) { toast('Please enter an Event Name', 'error'); return; }

    const eventData = {
      title,
      date: $('ev-date')?.value,
      type: $('ev-type')?.value,
      prize: $('ev-prize')?.value,
      location: $('ev-loc')?.value,
      registrations_count: 0
    };

    try {
      await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });
      toast('Event published!', 'success');
      closeModals();
      loadAllData();
      ['ev-title', 'ev-date', 'ev-prize', 'ev-loc'].forEach(id => { const el = $(id); if (el) el.value = ''; });
    } catch {
      toast('Publish failed', 'error');
    }
  }

  async function deleteEvent(id) {
    if (!confirm('Delete event?')) return;
    try {
      await fetch(`${API_BASE}/events?id=${id}`, { method: 'DELETE' });
      toast('Deleted.', 'info');
      loadAllData();
    } catch {
      toast('Delete failed', 'error');
    }
  }

  async function registerEvent(eventId) {
    toast('Registered! Good luck! 🏆', 'success');
    loadAllData();
  }

  // ═══════════════════════════════════════════════════════════════
  // PAYMENTS
  // ═══════════════════════════════════════════════════════════════
  function renderBills() {
    const tbody = $('bill-body');
    if (!tbody) return;

    let studs = role === 'admin' || role === 'master' ? allStudents : (currentStudent ? [currentStudent] : []);

    if (!studs.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">💳</div><p>No payment records.</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = studs.map((s, i) => {
      let action = s.payment_status === 'Due'
        ? `<button type="button" class="btn btn-gold btn-sm" onclick="${role === 'admin' || role === 'master' ? `markPaid('${s.id}')` : `openPay('${s.id}','${s.full_name || ''}','${s.monthly_fee || 0}')`}">${role === 'admin' || role === 'master' ? 'Mark Paid' : 'Pay Now'}</button>`
        : `<button type="button" class="btn btn-outline btn-sm" onclick="downloadReceipt('${s.id}','${(s.full_name || '').replace(/'/g, "\\'")}','${s.monthly_fee || 0}')">Receipt 📄</button>`;

      return `<tr>
        <td style="font-family:'DM Mono';color:var(--ivory-dim)">#CK-${String(i + 1).padStart(4, '0')}</td>
        <td style="font-weight:600">${s.full_name || '—'}</td>
        <td style="font-family:'DM Mono'">₹${(s.monthly_fee || 0).toLocaleString()}</td>
        <td><span class="${s.payment_status === 'Paid' ? 'text-success' : 'text-danger'}">${s.payment_status || 'Due'}</span></td>
        <td>${action}</td>
      </tr>`;
    }).join('');
  }

  async function markPaid(id) {
    try {
      await fetch(`${API_BASE}/students?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'Paid' })
      });
      toast('Marked as paid ✓', 'success');
      loadAllData();
    } catch {
      toast('Update failed', 'error');
    }
  }

  function openPay(id, name, fee) {
    payTarget = { id, name, fee };
    if ($('pay-amt')) $('pay-amt').textContent = '₹' + fee.toLocaleString();
    if ($('pay-name')) $('pay-name').textContent = name;
    openModal('pay-modal');
  }

  function simPay(provider) {
    toast(`Processing ${provider} Payment...`, 'info');
    setTimeout(() => {
      if (payTarget) {
        markPaid(payTarget.id);
        downloadReceipt(payTarget.id, payTarget.name, payTarget.fee);
        closeModals();
      }
    }, 1500);
  }

  function downloadReceipt(id, name, fee) {
    const text = `========================================
CHESSKIDOO ACADEMY RECEIPT
========================================
Date: ${new Date().toLocaleDateString()}
Student: ${name}
Amount: ₹${Number(fee).toLocaleString()}
Status: PAID IN FULL
========================================`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = `Receipt_${(name || 'student').replace(/\s+/g, '_')}.txt`;
    a.click();
    toast('Receipt generated!', 'success');
  }

  function openContactModal() { openModal('contact-modal'); }

  function sendMsg() {
    if (!$('contact-msg')?.value.trim()) { toast('Message cannot be empty', 'error'); return; }
    $('contact-msg').value = '';
    toast('Message sent to coach! ✓', 'success');
    closeModals();
  }

  function sendFeedback() {
    if (!$('fb-msg')?.value.trim()) { toast('Feedback cannot be empty', 'error'); return; }
    $('fb-msg').value = '';
    toast('Thank you for your feedback! 🙏', 'success');
    closeModals();
  }

  // ═══════════════════════════════════════════════════════════════
  // CHILD VIEW (Parent Mode)
  // ═══════════════════════════════════════════════════════════════
  function renderChild() {
    if (!currentStudent) return;
    const s = currentStudent;

    if ($('c-name')) $('c-name').textContent = getStudentName(s);
    if ($('c-elo')) $('c-elo').textContent = getStudentRating(s);
    if ($('c-level')) $('c-level').textContent = getStudentLevel(s);
    if ($('c-coach')) $('c-coach').textContent = (s.coaches && s.coaches.full_name) || '—';
    if ($('c-notes')) $('c-notes').textContent = s.coach_notes || 'Great progress! Keep focusing on tactical patterns.';
    if ($('contact-coach')) $('contact-coach').textContent = (s.coaches && s.coaches.full_name) || '—';

    const avWrap = $('p-av-wrap');
    if (avWrap) {
      avWrap.innerHTML = '';
      const img = document.createElement('img');
      img.src = makeAvSrc(s);
      img.className = 'profile-av';
      avWrap.appendChild(img);
    }

    const skills = [
      { label: 'Tactics', val: s.tactics_score || 50 },
      { label: 'Endgame', val: s.endgame_score || 50 },
      { label: 'Openings', val: s.openings_score || 50 },
      { label: 'Positional', val: s.positional_score || 50 }
    ];

    if ($('skill-bars')) {
      $('skill-bars').innerHTML = skills.map(sk => `
        <div class="skill-bar-wrap" style="margin-bottom: 20px;">
          <div class="skill-bar-label" style="display:flex; justify-content:space-between; font-size:13px; font-weight:600; color:var(--ivory); margin-bottom:8px;">
            <span>${sk.label}</span>
            <span style="color:var(--gold);">${sk.val}/100</span>
          </div>
          <div style="height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden;">
            <div style="height:100%; width:${sk.val}%; background:linear-gradient(90deg, var(--gold), var(--gold2)); border-radius:4px; box-shadow:0 0 10px var(--gold-glow);"></div>
          </div>
        </div>
      `).join('');
    }

    const myAchs = achievementsData.filter(a => a.students && a.students.full_name === s.full_name);
    const pc = $('parent-ach');
    if (!pc) return;

    if (!myAchs.length) {
      pc.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🎖</div><p>No achievements yet — keep practising!</p></div>`;
    } else {
      pc.innerHTML = myAchs.map(a => `
        <div class="ach-card">
          ${a.img_url ? `<img src="${a.img_url}" class="ach-img" alt="${a.title}">` : `<div class="ach-img-placeholder">🏆</div>`}
          <div class="ach-info">
            <div class="ach-title">${a.title}</div>
            <div class="ach-sub">Awarded to: ${s.full_name}</div>
          </div>
        </div>
      `).join('');
    }

    const loadingEl = $('child-loading');
    const contentEl = $('child-content');
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';
  }

  // ═══════════════════════════════════════════════════════════════
  // AI ASSISTANT
  // ═══════════════════════════════════════════════════════════════
  function generateAIResponse(query) {
    const q = query.toLowerCase();

    if (q.includes('hello') || q === 'hi' || q.includes('hey')) {
      return "Hello! I am your Chesskidoo AI Assistant. Ask me about revenue, unpaid fees, top students, average ELO, or upcoming events.";
    }
    if (q.includes('help') || q.includes('what can you do')) {
      return "I can instantly analyze our database! Try asking:\n- 'What is our total revenue?'\n- 'Who has unpaid fees?'\n- 'Who is the top student?'\n- 'What is the average rating?'\n- 'Show me upcoming events.'";
    }
    if (q.includes('revenue') || q.includes('money') || q.includes('income') || q.includes('collected')) {
      return `So far this month, we have successfully collected ₹${allStudents.filter(s => s.payment_status === 'Paid').reduce((sum, s) => sum + Number(s.monthly_fee || 0), 0).toLocaleString()} in paid tuition fees.`;
    }
    if (q.includes('due') || q.includes('unpaid') || q.includes('pending') || q.includes('owe')) {
      const dueStudents = allStudents.filter(s => s.payment_status === 'Due');
      if (dueStudents.length === 0) return "Great news! All student accounts are fully paid up for this month.";
      return `We currently have ₹${dueStudents.reduce((sum, s) => sum + Number(s.monthly_fee || 0), 0).toLocaleString()} in outstanding fees.\n\nStudents with pending payments: ${dueStudents.map(s => getStudentName(s)).join(', ')}.`;
    }
    if (q.includes('top') || q.includes('best') || q.includes('highest')) {
      if (allStudents.length === 0) return "There are no students currently enrolled in the academy.";
      const top = [...allStudents].sort((a, b) => (getStudentRating(b) || 0) - (getStudentRating(a) || 0))[0];
      return `Our highest-rated cadet is ${getStudentName(top)} with an ELO of ${getStudentRating(top)}. They are currently training in the ${getStudentLevel(top)} tier.`;
    }
    if (q.includes('average') || q.includes('elo') || q.includes('rating') || q.includes('score')) {
      return `The current average ELO across our ${allStudents.length} active cadets is ${Math.round(allStudents.reduce((sum, s) => sum + (getStudentRating(s) || 0), 0) / allStudents.length)}.`;
    }
    if (q.includes('student') || q.includes('cadet') || q.includes('enroll') || q.includes('how many')) {
      return `We currently have ${allStudents.length} active cadets enrolled in the Chesskidoo academy.`;
    }
    if (q.includes('coach') || q.includes('trainer')) {
      return `We have ${allCoaches.length} expert coaches on staff: ${allCoaches.map(c => getCoachName(c)).join(', ')}.`;
    }
    if (q.includes('event') || q.includes('tournament') || q.includes('workshop')) {
      if (eventsData.length === 0) return "There are no upcoming events currently scheduled in the calendar.";
      return `Our next major event is the "${eventsData[0].title}" (${eventsData[0].type}) scheduled for ${eventsData[0].date} at ${eventsData[0].location}. We currently have ${eventsData[0].registrations_count} cadets registered!`;
    }
    if (q.includes('award') || q.includes('achievement') || q.includes('fame')) {
      if (achievementsData.length === 0) return "We don't have any recent achievements published to the Wall of Fame yet.";
      return `Our latest celebrated achievement is "${achievementsData[0].title}", which was awarded to ${achievementsData[0].students?.full_name}.`;
    }
    return "I'm not quite sure how to answer that specific query yet. Try asking me about 'revenue', 'top students', 'unpaid fees', or 'events'!";
  }

  function sendAI() {
    const input = $('ai-input');
    const box = $('chat-box');
    const query = input?.value.trim();
    if (!query) return;

    const uEl = document.createElement('div');
    uEl.className = 'msg-user';
    uEl.textContent = query;
    box.appendChild(uEl);
    if (input) input.value = '';

    const thinking = document.createElement('div');
    thinking.className = 'msg-ai msg-thinking';
    thinking.textContent = '♟ Analysing live data...';
    box.appendChild(thinking);
    box.scrollTop = box.scrollHeight;

    const btn = $('ai-send-btn');
    const originalText = btn?.textContent;
    if (btn) { btn.textContent = '...'; btn.disabled = true; }

    setTimeout(() => {
      thinking.textContent = generateAIResponse(query);
      thinking.classList.remove('msg-thinking');
      if (btn) { btn.textContent = originalText; btn.disabled = false; }
      box.scrollTop = box.scrollHeight;
    }, 900);
  }

  // ═══════════════════════════════════════════════════════════════
  // THEME
  // ═══════════════════════════════════════════════════════════════
  function toggleTheme() {
    const next = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    if (document.querySelector('.page.active')?.id === 'page-dash') renderDash();
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════
  window.addEventListener('DOMContentLoaded', () => {
    loadAllData();
  });

  // Expose functions globally for inline handlers
  window.toggleSidebar = toggleSidebar;
  window.setPage = setPage;
  window.toggleEye = toggleEye;
  window.doLogin = doLogin;
  window.doLogout = doLogout;
  window.openProfile = openProfile;
  window.clearFilters = clearFilters;
  window.renderStudents = renderStudents;
  window.viewStudent = viewStudent;
  window.renderCoachMgmt = renderCoachMgmt;
  window.viewCoachSchedule = viewCoachSchedule;
  window.openCoachModal = openCoachModal;
  window.saveCoach = saveCoach;
  window.deleteCoach = deleteCoach;
  window.openEdit = openEdit;
  window.updateStudent = updateStudent;
  window.openEnroll = openEnroll;
  window.saveStudent = saveStudent;
  window.deleteStudent = deleteStudent;
  window.saveAward = saveAward;
  window.openAwardModal = openAwardModal;
  window.onAwardStudentChange = onAwardStudentChange;
  window.deleteAchievement = deleteAchievement;
  window.renderEvents = renderEvents;
  window.saveEvent = saveEvent;
  window.deleteEvent = deleteEvent;
  window.registerEvent = registerEvent;
  window.renderBills = renderBills;
  window.markPaid = markPaid;
  window.openPay = openPay;
  window.simPay = simPay;
  window.downloadReceipt = downloadReceipt;
  window.openContactModal = openContactModal;
  window.sendMsg = sendMsg;
  window.sendFeedback = sendFeedback;
  window.renderChild = renderChild;
  window.sendAI = sendAI;
  window.toggleTheme = toggleTheme;
  window.closeModals = closeModals;
  window.previewFile = previewFile;
  window.openModal = openModal;

})();
