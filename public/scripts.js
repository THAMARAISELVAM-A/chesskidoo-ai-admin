/**
 * CHESSKIDOO ACADEMY - Complete Admin Panel Scripts
 * Properly integrated with Supabase backend
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

  const API_BASE = '/api';
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
    return `${hh}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  function toast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span> ${msg}`;
    const container = $('toast-container');
    if (container) container.appendChild(el);
    setTimeout(() => el.remove(), 3800);
  }

  function openModal(id) { $(id).style.display = 'flex'; }
  function closeModals() { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) closeModals(); }));

  function previewFile(inp, previewId) {
    const file = inp.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { const img = $(previewId); if (img) { img.src = e.target.result; img.style.display = 'block'; } };
    reader.readAsDataURL(file);
  }

  async function uploadFile(file) { return URL.createObjectURL(file); }

  // Helper functions for schema differences
  function getStudentName(s) { return s.full_name || s.name || ''; }
  function getStudentLevel(s) { return s.level || s.grade || 'Beginner'; }
  function getStudentRating(s) { return s.current_rating || s.rating || 800; }
  function getStudentDate(s) { return s.join_date || s.enrollment_date || ''; }
  function getStudentPhone(s) { return s.parent_phone || s.phone || ''; }
  function getCoachName(c) { return c.full_name || c.name || ''; }
  function getCoachSpecialty(c) { return c.specialty || c.specialization || ''; }
  function getEventDate(e) { return e.date || e.event_date || ''; }

  function makeAvSrc(s) {
    if (s.custom_avatar) return s.custom_avatar;
    const name = getStudentName(s);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Student')}&background=dca33e&color=000000&bold=true&size=80`;
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

      syncCoachDropdowns();
      
      if (role === 'admin' || role === 'master') {
        renderDash();
        updateMsgBadge();
      } else if (role === 'parent') {
        renderChild();
      }
    } catch (err) {
      console.error('Load error:', err);
      toast('Failed to load data', 'error');
    }
  }

  function syncCoachDropdowns() {
    const options = allCoaches.map(c => `<option value="${c.id}">${getCoachName(c)}</option>`).join('');
    if ($('f-coach')) $('f-coach').innerHTML = '<option value="">All Coaches</option>' + options;
    if ($('m-coach')) $('m-coach').innerHTML = options;
    if ($('e-coach')) $('e-coach').innerHTML = options;
    if ($('award-student')) $('award-student').innerHTML = '<option value="">Select Student</option>' + allStudents.map(s => `<option value="${s.id}">${getStudentName(s)}</option>`).join('');
  }

  async function updateMsgBadge() {
    try {
      const res = await fetch('/api/messages');
      const msgs = await res.json();
      const unread = msgs.filter(m => !m.is_read && m.receiver_type === 'admin').length;
      const badge = $('msg-badge');
      if (badge) {
        if (unread > 0) { badge.style.display = 'inline'; badge.textContent = unread; }
        else { badge.style.display = 'none'; }
      }
    } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════════
  // NAVIGATION
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
    dash: 'Academy Overview', stud: 'Student Registry', 'coach-mgmt': 'Coach Management',
    child: 'My Child', fame: 'Wall of Fame', events: 'Events', bills: 'Payments',
    msgs: 'Messages', coach: 'AI Assistant'
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
        if (p === 'dash' || p === 'stud') btnArea.innerHTML = `<button class="btn btn-gold" onclick="openEnroll()">+ New Enrollment</button>`;
        if (p === 'events') btnArea.innerHTML = `<button class="btn btn-gold" onclick="openModal('ev-modal')">+ Create Event</button>`;
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
      if (p === 'msgs') renderMsgs();
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
    if (errEl) errEl.style.display = 'none';
    if (!rawUser || !pass) { errEl.textContent = 'Please enter credentials.'; errEl.style.display = 'block'; return; }

    const lowerUser = rawUser.toLowerCase();

    // Master
    if (rawUser === 'Tom@193' && pass === 'Thamaraiselvam@309402$') {
      role = 'master';
      document.body.classList.add('admin-mode', 'master-mode');
      $('top-profile').style.display = 'flex';
      $('top-profile-name').innerHTML = 'Master <span style="background:var(--gold);color:#000;padding:2px 8px;border-radius:10px;font-size:10px">👑</span>';
      $('top-profile-av').src = `https://ui-avatars.com/api/?name=Master&background=dca33e&color=000&bold=true&size=80`;
      finishLogin('dash');
      return;
    }

    // Admin
    if (lowerUser === 'admin' && pass === 'admin123') {
      role = 'admin';
      document.body.classList.add('admin-mode');
      $('top-profile').style.display = 'flex';
      $('top-profile-name').textContent = 'Admin';
      $('top-profile-av').src = `https://ui-avatars.com/api/?name=Admin&background=dca33e&color=000&bold=true&size=80`;
      finishLogin('dash');
      return;
    }

    // Parent - check against student phones
    const student = allStudents.find(s => getStudentName(s).toLowerCase() === lowerUser);
    if (student) {
      const storedPhone = getStudentPhone(student);
      if (storedPhone === pass) {
        role = 'parent';
        document.body.classList.add('parent-mode');
        currentStudent = student;
        $('top-profile').style.display = 'flex';
        $('top-profile-name').textContent = getStudentName(student).split(' ')[0];
        $('top-profile-av').src = makeAvSrc(student);
        finishLogin('child');
        return;
      }
    }

    errEl.textContent = 'Invalid credentials.';
    errEl.style.display = 'block';
  }

  function finishLogin(page) {
    $('login-screen').style.display = 'none';
    setPage(page);
    loadAllData();
  }

  function doLogout() {
    closeModals();
    role = null;
    currentStudent = null;
    document.body.classList.remove('admin-mode', 'parent-mode', 'master-mode');
    $('login-screen').style.display = 'flex';
    $('top-profile').style.display = 'none';
    $('li-user').value = '';
    $('li-pass').value = '';
  }

  function openProfile() {
    openModal('profile-modal');
    $('prof-admin-view').style.display = role === 'admin' || role === 'master' ? 'block' : 'none';
    $('prof-parent-view').style.display = role === 'parent' ? 'block' : 'none';
    if ($('active-users-list')) $('active-users-list').innerHTML = `<div><span style="color:var(--success)">●</span> You (Current)</div>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════
  function renderDash() {
    const paidStudents = allStudents.filter(s => s.payment_status === 'Paid');
    const avgElo = allStudents.length ? Math.round(allStudents.reduce((a, s) => a + (getStudentRating(s) || 0), 0) / allStudents.length) : 0;

    $('s-total').textContent = allStudents.length;
    $('s-elo').textContent = avgElo;
    $('s-coaches').textContent = allCoaches.length;

    const revenue = paidStudents.reduce((a, s) => a + (s.monthly_fee || 0), 0);
    const operationsCost = 15000;
    const totalSalaries = allCoaches.reduce((a, c) => a + (Number(c.salary) || 0), 0);
    const spending = totalSalaries + operationsCost;
    const profit = revenue - spending;

    $('s-rev').textContent = '₹' + revenue.toLocaleString();
    $('s-spend').textContent = '₹' + spending.toLocaleString();
    const profitEl = $('s-profit');
    if (profit >= 0) { profitEl.textContent = '₹' + profit.toLocaleString(); profitEl.style.color = 'var(--success)'; }
    else { profitEl.textContent = '-₹' + Math.abs(profit).toLocaleString(); profitEl.style.color = 'var(--danger)'; }

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
      data: { labels: studs.map(s => getStudentName(s).split(' ')[0]), datasets: [{ label: 'ELO', data: studs.map(s => getStudentRating(s)), backgroundColor: '#dca33e', borderRadius: 5 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { grid: { color: grid }, ticks: { color: tick } }, x: { grid: { display: false }, ticks: { color: tick } } } }
    });

    const coachMap = {};
    studs.forEach(s => { const cn = (s.coaches && s.coaches.full_name) || 'Unassigned'; coachMap[cn] = (coachMap[cn] || 0) + 1; });
    charts.coach = new Chart(coachCtx, {
      type: 'doughnut',
      data: { labels: Object.keys(coachMap), datasets: [{ data: Object.values(coachMap), backgroundColor: ['#dca33e', '#5a9fff', '#52c41a', '#ff4d4f'], borderWidth: isLight ? 2 : 0 }] },
      options: { plugins: { legend: { labels: { color: tick } } } }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // STUDENTS
  // ═══════════════════════════════════════════════════════════════
  function clearFilters() {
    ['f-coach', 'f-status', 'f-min-fee', 'f-max-fee'].forEach(id => { const el = $(id); if (el) el.value = ''; });
    renderStudents();
  }

  function renderStudents() {
    const tbody = $('stud-body');
    const fCoach = $('f-coach')?.value;
    const fStatus = $('f-status')?.value;
    const fMinFee = parseInt($('f-min-fee')?.value) || 0;
    const fMaxFee = parseInt($('f-max-fee')?.value) || Infinity;

    const filtered = allStudents.filter(s => {
      if (fCoach && s.coaches?.id !== fCoach) return false;
      if (fStatus && s.payment_status !== fStatus) return false;
      if ((s.monthly_fee || 0) < fMinFee || (s.monthly_fee || 0) > fMaxFee) return false;
      return true;
    });

    if (!filtered.length) { tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">♟</div><p>No students found.</p></div></td></tr>`; return; }

    tbody.innerHTML = filtered.map(s => `
      <tr>
        <td><div class="av-cell"><img src="${makeAvSrc(s)}" class="av-sm"><div>${getStudentName(s)}</div></div></td>
        <td><span class="text-gold">${getStudentLevel(s)}</span><br><span style="font-family:'DM Mono';font-size:12px">${getStudentRating(s)}</span></td>
        <td>${getStudentDate(s) || '—'}</td>
        <td>${(s.coaches && s.coaches.full_name) || '—'}</td>
        <td><span class="${s.payment_status === 'Paid' ? 'text-success' : 'text-danger'}">${s.payment_status || 'Due'}</span><br><span style="font-size:11px;color:var(--ivory-dim)">₹${s.monthly_fee || 0}</span></td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-outline-blue btn-sm" onclick="viewStudent('${s.id}')">View</button>
            <button class="btn btn-outline-grey btn-sm" onclick="openEdit('${s.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.id}','${getStudentName(s).replace(/'/g, "\\'")}')">Del</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function viewStudent(id) {
    const s = allStudents.find(x => x.id === id);
    if (!s) return;
    $('sv-av').src = makeAvSrc(s);
    $('sv-name').textContent = getStudentName(s);
    $('sv-level').textContent = getStudentLevel(s);
    $('sv-elo').textContent = getStudentRating(s);
    $('sv-join').textContent = getStudentDate(s) || '—';
    $('sv-coach').textContent = (s.coaches && s.coaches.full_name) || 'Unassigned';
    $('sv-batch').textContent = s.batch_type || '—';
    $('sv-fee').textContent = s.monthly_fee || 0;
    $('sv-status').innerHTML = `<span class="${s.payment_status === 'Paid' ? 'text-success' : 'text-danger'}">${s.payment_status || 'Due'}</span>`;
    $('sv-phone').textContent = getStudentPhone(s) || '—';
    $('sv-edit-btn').onclick = () => { closeModals(); openEdit(s.id); };
    openModal('student-view-modal');
  }

  function openEdit(id) {
    const s = allStudents.find(x => x.id === id);
    if (!s) return;
    $('e-id').value = s.id;
    $('e-name').value = getStudentName(s);
    $('e-phone').value = getStudentPhone(s);
    $('e-elo').value = getStudentRating(s);
    $('e-level').value = getStudentLevel(s).toUpperCase();
    $('e-join').value = getStudentDate(s);
    $('e-fee').value = s.monthly_fee || 0;
    $('e-status').value = s.payment_status || 'Due';
    $('e-batch-type').value = s.batch_type || 'Evening';
    $('e-batch-time').value = s.batch_time || '17:00';
    $('e-coach').innerHTML = allCoaches.map(c => `<option value="${c.id}" ${s.coaches && c.id === s.coaches.id ? 'selected' : ''}>${getCoachName(c)}</option>`).join('');
    openModal('edit-modal');
  }

  async function updateStudent() {
    const id = $('e-id').value;
    if (!id) return;
    const name = $('e-name').value.trim();
    const phone = $('e-phone').value.trim();
    if (!name) { toast('Name required', 'error'); return; }
    if (!isValidPhone(phone)) { toast('Phone must be 10 digits', 'error'); return; }

    const data = {
      name: name,
      phone: phone,
      rating: parseInt($('e-elo').value) || 800,
      grade: $('e-level').value,
      enrollment_date: $('e-join').value,
      monthly_fee: parseInt($('e-fee').value) || 5000,
      payment_status: $('e-status').value,
      batch_type: $('e-batch-type').value,
      batch_time: $('e-batch-time').value,
      coach_id: $('e-coach').value || null
    };

    try {
      await fetch(`${API_BASE}/students?id=${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      toast('Updated!', 'success');
      closeModals();
      loadAllData();
    } catch (e) { toast('Update failed', 'error'); }
  }

  function openEnroll() {
    $('m-name').value = '';
    $('m-phone').value = '';
    $('m-elo').value = '800';
    $('m-fee').value = '5000';
    $('m-join').value = new Date().toISOString().split('T')[0];
    openModal('enroll-modal');
  }

  async function saveStudent() {
    const name = $('m-name').value.trim();
    const phone = $('m-phone').value.trim();
    if (!name) { toast('Name required', 'error'); return; }
    if (!isValidPhone(phone)) { toast('Phone must be 10 digits', 'error'); return; }

    const data = {
      name: name,
      phone: phone,
      rating: parseInt($('m-elo').value) || 800,
      grade: $('m-level').value,
      enrollment_date: $('m-join').value,
      monthly_fee: parseInt($('m-fee').value) || 5000,
      payment_status: 'Due',
      batch_type: $('m-batch-type').value,
      batch_time: $('m-batch-time').value,
      coach_id: $('m-coach').value || null
    };

    try {
      await fetch(`${API_BASE}/students`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      toast(`${name} enrolled!`, 'success');
      closeModals();
      loadAllData();
    } catch (e) { toast('Enrollment failed', 'error'); }
  }

  async function deleteStudent(id, name) {
    if (!confirm(`Remove ${name}?`)) return;
    try {
      await fetch(`${API_BASE}/students?id=${id}`, { method: 'DELETE' });
      toast('Removed.', 'info');
      loadAllData();
    } catch (e) { toast('Delete failed', 'error'); }
  }

  // ═══════════════════════════════════════════════════════════════
  // COACHES
  // ═══════════════════════════════════════════════════════════════
  function renderCoachMgmt() {
    const tbody = $('coach-mgmt-body');
    if (!allCoaches.length) { tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state">No coaches.</div></td></tr>`; return; }

    tbody.innerHTML = allCoaches.map(c => {
      const count = allStudents.filter(s => s.coaches && s.coaches.id === c.id).length;
      return `
        <tr>
          <td><div class="av-cell"><img src="${c.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(getCoachName(c))}&background=dca33e&color=000`}" class="av-sm"><div><span style="font-weight:600;color:var(--gold)">${getCoachName(c)}</span><br><span style="font-size:11px;color:var(--ivory-dim)">${getCoachSpecialty(c)}</span></div></div></td>
          <td style="font-size:12px;line-height:1.6">📞 +91 ${c.phone || 'N/A'}<br>📍 ${c.address || 'N/A'}<br>💰 ₹${Number(c.salary || 0).toLocaleString()}</td>
          <td>${count} Students</td>
          <td>
            <button class="btn btn-outline-blue btn-sm" onclick="viewCoachSchedule('${c.id}')">Schedule</button>
            <button class="btn btn-outline-grey btn-sm" onclick="openCoachModal('${c.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteCoach('${c.id}')">Del</button>
          </td>
        </tr>`;
    }).join('');
  }

  function viewCoachSchedule(id) {
    const c = allCoaches.find(x => x.id === id);
    $('sched-coach-name').textContent = getCoachName(c);
    const container = $('schedule-container');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const myStudents = allStudents.filter(s => s.coaches && s.coaches.id === id);

    if (!myStudents.length) { container.innerHTML = '<div class="empty-state">No batches.</div>'; }
    else {
      container.innerHTML = days.map(day => {
        const batches = myStudents.filter(s => (s.batch_type === 'Weekend' && (day === 'Saturday' || day === 'Sunday')) || (s.batch_type !== 'Weekend' && day !== 'Saturday' && day !== 'Sunday'));
        if (!batches.length) return `<div class="schedule-day"><span style="color:var(--ivory-dim)">${day}</span><span class="schedule-time" style="color:var(--ivory-dim)">OFF</span></div>`;
        return `<div class="schedule-day"><b>${day}</b><span class="schedule-time">${[...new Set(batches.map(s => formatTime(s.batch_time)))].join(', ')}</span></div>`;
      }).join('');
    }
    openModal('coach-schedule-modal');
  }

  function openCoachModal(id = null) {
    if (id) {
      const c = allCoaches.find(x => x.id === id);
      $('cm-id').value = c.id;
      $('cm-name').value = getCoachName(c);
      $('cm-spec').value = getCoachSpecialty(c);
      $('cm-phone').value = c.phone || '';
      $('cm-address').value = c.address || '';
      $('cm-photo').value = c.photo_url || '';
      $('cm-salary').value = c.salary || '';
      $('cm-etc').value = c.bio || c.additional_details || '';
      $('coach-modal-title').textContent = 'Edit Coach';
    } else {
      ['cm-id', 'cm-name', 'cm-spec', 'cm-phone', 'cm-address', 'cm-photo', 'cm-salary', 'cm-etc'].forEach(id => $(id).value = '');
      $('coach-modal-title').textContent = 'Add Coach';
    }
    openModal('coach-crud-modal');
  }

  async function saveCoach() {
    const id = $('cm-id').value;
    const name = $('cm-name').value.trim();
    if (!name) { toast('Name required', 'error'); return; }

    const data = {
      name: name,
      specialization: $('cm-spec').value,
      phone: $('cm-phone').value,
      address: $('cm-address').value,
      photo_url: $('cm-photo').value,
      salary: $('cm-salary').value,
      bio: $('cm-etc').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/coaches?id=${id}` : `${API_BASE}/coaches`;

    try {
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      toast(`Coach ${id ? 'updated' : 'added'}!`, 'success');
      closeModals();
      loadAllData();
    } catch (e) { toast('Error saving coach', 'error'); }
  }

  async function deleteCoach(id) {
    if (!confirm('Delete coach?')) return;
    try {
      await fetch(`${API_BASE}/coaches?id=${id}`, { method: 'DELETE' });
      toast('Removed.', 'info');
      loadAllData();
    } catch (e) { toast('Delete failed', 'error'); }
  }

  // ═══════════════════════════════════════════════════════════════
  // ACHIEVEMENTS
  // ═══════════════════════════════════════════════════════════════
  function renderFame() {
    $('fame-loading').style.display = 'none';
    $('fame-grid').style.display = 'grid';

    if (!achievementsData.length) { $('fame-grid').innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon" style="font-size:60px">🏆</div><p>No achievements yet.</p></div>`; return; }

    $('fame-grid').innerHTML = achievementsData.map(a => `
      <div class="ach-card">
        ${role === 'admin' ? `<button class="del-btn" onclick="deleteAchievement('${a.id}')">✕</button>` : ''}
        ${a.img_url ? `<img src="${a.img_url}" class="ach-img">` : `<div class="ach-img-placeholder">🏆</div>`}
        <div class="ach-info"><div class="ach-title">${a.title || 'Achievement'}</div><div class="ach-sub">${(a.students && a.students.full_name) || '—'}</div></div>
      </div>`).join('');
  }

  function openAwardModal() {
    $('award-student').innerHTML = '<option value="">Select Student</option>' + allStudents.map(s => `<option value="${s.id}">${getStudentName(s)}</option>`).join('');
    $('award-sid').value = '';
    $('award-title').value = '';
    $('award-img-url').value = '';
    $('award-img-preview').style.display = 'none';
    $('award-img-file').value = '';
    openModal('award-modal');
  }

  function onAwardStudentChange() { $('award-sid').value = $('award-student').value; }

  async function saveAward() {
    const title = $('award-title').value.trim();
    const studentId = $('award-sid').value;
    if (!title) { toast('Title required', 'error'); return; }
    if (!studentId) { toast('Select a student', 'error'); return; }

    const student = allStudents.find(s => s.id === studentId);
    const data = {
      title: title,
      student_id: studentId,
      students: { full_name: getStudentName(student), id: studentId },
      img_url: $('award-img-url').value.trim() || null
    };

    try {
      await fetch(`${API_BASE}/achievements`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      toast('Published!', 'success');
      closeModals();
      loadAllData();
    } catch (e) { toast('Failed', 'error'); }
  }

  async function deleteAchievement(id) {
    if (!confirm('Remove achievement?')) return;
    try {
      await fetch(`${API_BASE}/achievements?id=${id}`, { method: 'DELETE' });
      toast('Removed.', 'info');
      loadAllData();
    } catch (e) { toast('Failed', 'error'); }
  }

  // ═══════════════════════════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════════════════════════
  function renderEvents() {
    $('ev-loading').style.display = 'none';
    $('ev-grid').style.display = 'grid';

    if (!eventsData.length) { $('ev-grid').innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><p>No events.</p></div>`; return; }

    $('ev-grid').innerHTML = eventsData.map(e => `
      <div class="ev-card">
        <div class="ev-date">${getEventDate(e) || '—'}</div>
        <div class="ev-type">${e.type || 'Event'}</div>
        <div class="ev-title">${e.title}</div>
        <div class="ev-meta">📍 ${e.location || '—'}<br>🏆 ${e.prize || '—'}</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-gold btn-sm" style="flex:1" onclick="registerEvent('${e.id}')">Register</button>
          ${role === 'admin' ? `<button class="btn btn-danger btn-sm" onclick="deleteEvent('${e.id}')">Del</button>` : ''}
        </div>
      </div>`).join('');
  }

  async function saveEvent() {
    const title = $('ev-title').value.trim();
    if (!title) { toast('Title required', 'error'); return; }

    const data = { title: title, date: $('ev-date').value, type: $('ev-type').value, prize: $('ev-prize').value, location: $('ev-loc').value };

    try {
      await fetch(`${API_BASE}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      toast('Published!', 'success');
      closeModals();
      loadAllData();
    } catch (e) { toast('Failed', 'error'); }
  }

  async function deleteEvent(id) {
    if (!confirm('Delete event?')) return;
    try {
      await fetch(`${API_BASE}/events?id=${id}`, { method: 'DELETE' });
      toast('Deleted.', 'info');
      loadAllData();
    } catch (e) { toast('Failed', 'error'); }
  }

  async function registerEvent(id) {
    toast('Registered!', 'success');
    loadAllData();
  }

  // ═══════════════════════════════════════════════════════════════
  // PAYMENTS
  // ═══════════════════════════════════════════════════════════════
  function renderBills() {
    const tbody = $('bill-body');
    const studs = role === 'admin' || role === 'master' ? allStudents : (currentStudent ? [currentStudent] : []);
    if (!studs.length) { tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">No records.</div></td></tr>`; return; }

    tbody.innerHTML = studs.map((s, i) => {
      const action = s.payment_status === 'Due'
        ? `<button class="btn btn-gold btn-sm" onclick="${role === 'admin' ? `markPaid('${s.id}')` : `openPay('${s.id}','${getStudentName(s)}','${s.monthly_fee||0}')`}">${role === 'admin' ? 'Mark Paid' : 'Pay'}</button>`
        : `<button class="btn btn-outline btn-sm" onclick="downloadReceipt('${s.id}','${getStudentName(s)}','${s.monthly_fee||0}')">Receipt</button>`;
      return `<tr><td style="font-family:'DM Mono';color:var(--ivory-dim)">#CK-${String(i+1).padStart(4,'0')}</td><td style="font-weight:600">${getStudentName(s)}</td><td style="font-family:'DM Mono'">₹${s.monthly_fee||0}</td><td><span class="${s.payment_status==='Paid'?'text-success':'text-danger'}">${s.payment_status||'Due'}</span></td><td>${action}</td></tr>`;
    }).join('');
  }

  async function markPaid(id) {
    try {
      await fetch(`${API_BASE}/students?id=${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payment_status: 'Paid' }) });
      toast('Marked as paid!', 'success');
      loadAllData();
    } catch (e) { toast('Failed', 'error'); }
  }

  function openPay(id, name, fee) { payTarget = { id, name, fee }; $('pay-amt').textContent = '₹' + fee; $('pay-name').textContent = name; openModal('pay-modal'); }

  function simPay(provider) {
    toast(`Processing ${provider}...`, 'info');
    setTimeout(() => {
      if (payTarget) { markPaid(payTarget.id); downloadReceipt(payTarget.id, payTarget.name, payTarget.fee); closeModals(); }
    }, 1500);
  }

  function downloadReceipt(id, name, fee) {
    const text = `====================================\nCHESSKIDOO ACADEMY RECEIPT\n====================================\nDate: ${new Date().toLocaleDateString()}\nStudent: ${name}\nAmount: ₹${fee}\nStatus: PAID\n====================================`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = `Receipt_${name.replace(/\s/g,'_')}.txt`;
    a.click();
  }

  // ═══════════════════════════════════════════════════════════════
  // MESSAGES
  // ═══════════════════════════════════════════════════════════════
  async function renderMsgs() {
    $('msgs-loading').style.display = 'none';
    $('msgs-list').style.display = 'grid';
    
    try {
      allMessages = await fetch('/api/messages').then(r => r.json());
    } catch (e) { allMessages = []; }

    if (!allMessages.length) { $('msgs-list').innerHTML = `<div class="empty-state"><div class="empty-icon">💬</div><p>No messages.</p></div>`; return; }

    $('msgs-list').innerHTML = allMessages.map(m => `
      <div style="padding:20px;background:var(--bg2);border:1px solid var(--border);border-radius:16px;${!m.is_read ? 'border-left:4px solid var(--gold)' : ''}">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          <span style="color:var(--gold);font-weight:600">${m.sender_type === 'admin' ? '👑 Admin' : '👤 ' + (m.sender_name || 'Parent')}</span>
          <span style="color:var(--ivory-dim);font-size:12px">${new Date(m.created_at).toLocaleDateString()}</span>
        </div>
        <div style="color:var(--ivory);margin-bottom:12px">${m.message}</div>
        <div style="display:flex;gap:10px">
          ${!m.is_read ? `<button class="btn btn-outline-blue btn-sm" onclick="markMsgRead('${m.id}')">Mark Read</button>` : ''}
          <button class="btn btn-danger btn-sm" onclick="deleteMsg('${m.id}')">Delete</button>
        </div>
      </div>`).join('');
  }

  async function markMsgRead(id) {
    try {
      await fetch(`${API_BASE}/messages?id=${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_read: true }) });
      renderMsgs();
    } catch (e) {}
  }

  async function deleteMsg(id) {
    if (!confirm('Delete?')) return;
    try {
      await fetch(`${API_BASE}/messages?id=${id}`, { method: 'DELETE' });
      renderMsgs();
    } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════════
  // PARENT VIEW
  // ═══════════════════════════════════════════════════════════════
  function renderChild() {
    if (!currentStudent) return;
    const s = currentStudent;
    $('c-name').textContent = getStudentName(s);
    $('c-elo').textContent = getStudentRating(s);
    $('c-level').textContent = getStudentLevel(s);
    $('c-coach').textContent = (s.coaches && s.coaches.full_name) || '—';
    $('c-notes').textContent = s.coach_notes || 'Great progress!';
    $('contact-coach').textContent = (s.coaches && s.coaches.full_name) || '—';
    $('p-av-wrap').innerHTML = `<img src="${makeAvSrc(s)}" class="profile-av">`;

    const skills = ['Tactics', 'Endgame', 'Openings', 'Positional'];
    const scores = [s.tactics_score || 50, s.endgame_score || 50, s.openings_score || 50, s.positional_score || 50];
    $('skill-bars').innerHTML = skills.map((sk, i) => `
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;margin-bottom:6px"><span>${sk}</span><span style="color:var(--gold)">${scores[i]}/100</span></div>
        <div style="height:8px;background:rgba(255,255,255,0.05);border-radius:4px"><div style="height:100%;width:${scores[i]}%;background:linear-gradient(90deg,var(--gold),var(--gold2));border-radius:4px"></div></div>
      </div>`).join('');

    const myAchs = achievementsData.filter(a => a.students && a.students.full_name === getStudentName(s));
    $('parent-ach').innerHTML = myAchs.length ? myAchs.map(a => `<div class="ach-card">${a.img_url ? `<img src="${a.img_url}" class="ach-img">` : `<div class="ach-img-placeholder">🏆</div>`}<div class="ach-info"><div class="ach-title">${a.title}</div></div></div>`).join('') : `<div class="empty-state"><div class="empty-icon">🎖</div><p>No achievements yet.</p></div>`;

    $('child-loading').style.display = 'none';
    $('child-content').style.display = 'block';
  }

  function openContactModal() { openModal('contact-modal'); }

  async function sendMsg() {
    const msg = $('contact-msg').value.trim();
    if (!msg) { toast('Message required', 'error'); return; }
    try {
      await fetch(`${API_BASE}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sender_type: 'parent', sender_id: currentStudent.id, receiver_type: 'admin', message: msg }) });
      toast('Sent!', 'success');
      closeModals();
    } catch (e) { toast('Failed', 'error'); }
  }

  async function sendFeedback() {
    const msg = $('fb-msg').value.trim();
    if (!msg) { toast('Feedback required', 'error'); return; }
    try {
      await fetch(`${API_BASE}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sender_type: 'parent', sender_id: currentStudent?.id, receiver_type: 'admin', subject: 'Parent Feedback', message: msg }) });
      toast('Thank you!', 'success');
      closeModals();
    } catch (e) { toast('Failed', 'error'); }
  }

  // ═══════════════════════════════════════════════════════════════
  // AI ASSISTANT
  // ═══════════════════════════════════════════════════════════════
  function generateAIResponse(query) {
    const q = query.toLowerCase();
    if (q.includes('hello') || q.includes('hi')) return "Hello! Ask about revenue, students, coaches, or events.";
    if (q.includes('revenue') || q.includes('money')) return `Revenue: ₹${allStudents.filter(s => s.payment_status === 'Paid').reduce((a, s) => a + (s.monthly_fee || 0), 0).toLocaleString()}`;
    if (q.includes('due') || q.includes('unpaid')) { const due = allStudents.filter(s => s.payment_status === 'Due'); return due.length ? `Due: ${due.length} students (₹${due.reduce((a, s) => a + (s.monthly_fee || 0), 0).toLocaleString()})` : 'All paid!'; }
    if (q.includes('student') || q.includes('cadet')) return `We have ${allStudents.length} students.`;
    if (q.includes('coach')) return `We have ${allCoaches.length} coaches: ${allCoaches.map(c => getCoachName(c)).join(', ')}.`;
    if (q.includes('event')) return eventsData.length ? `Next: ${eventsData[0].title} (${eventsData[0].date || 'TBD'})` : 'No upcoming events.';
    return "Try asking about revenue, students, coaches, or events!";
  }

  function sendAI() {
    const input = $('ai-input');
    const box = $('chat-box');
    const query = input.value.trim();
    if (!query) return;
    const uEl = document.createElement('div');
    uEl.className = 'msg-user';
    uEl.textContent = query;
    box.appendChild(uEl);
    input.value = '';
    const thinking = document.createElement('div');
    thinking.className = 'msg-ai msg-thinking';
    thinking.textContent = '🤔 Analyzing...';
    box.appendChild(thinking);
    box.scrollTop = box.scrollHeight;
    setTimeout(() => { thinking.textContent = generateAIResponse(query); thinking.classList.remove('msg-thinking'); box.scrollTop = box.scrollHeight; }, 800);
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
  // INIT
  // ═══════════════════════════════════════════════════════════════
  window.addEventListener('DOMContentLoaded', loadAllData);

  // Expose functions
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
  window.openAwardModal = openAwardModal;
  window.onAwardStudentChange = onAwardStudentChange;
  window.saveAward = saveAward;
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
  window.renderMsgs = renderMsgs;
  window.markMsgRead = markMsgRead;
  window.deleteMsg = deleteMsg;
})();
