// --- NEW MONTHLY MATRIX ATTENDANCE LOGIC ---
window.openMonthlyMatrix = function() {
  const monthInput = document.getElementById('mat-month');
  if (monthInput) monthInput.value = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  const coachSelect = document.getElementById('mat-coach');
  if (coachSelect) {
    coachSelect.innerHTML = '<option value="">All Coaches</option>' + 
      allCoaches.map(c => `<option value="${c.id}">${getCoachName(c)}</option>`).join('');
  }
  
  renderMonthlyMatrix();
  openModal('monthly-attendance-modal');
};

window.renderMonthlyMatrix = function() {
  const container = document.getElementById('mat-container');
  if (!container) return;
  
  const monthVal = document.getElementById('mat-month')?.value || new Date().toISOString().slice(0, 7);
  const coachId = document.getElementById('mat-coach')?.value;
  
  const [year, month] = monthVal.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  
  let filteredStudents = allStudents.filter(s => s.status === 'active');
  if (coachId) filteredStudents = filteredStudents.filter(s => String(s.coach_id) === String(coachId));
  
  // Build header
  let html = `<table style="width:max-content;font-size:12px;text-align:center;border-collapse:collapse"><thead><tr>`;
  html += `<th style="position:sticky;left:0;background:var(--bg2);z-index:2;text-align:left;min-width:150px">Student</th>`;
  for (let i = 1; i <= daysInMonth; i++) {
    html += `<th style="min-width:30px">${i}</th>`;
  }
  html += `</tr></thead><tbody>`;
  
  // Build rows
  filteredStudents.forEach(s => {
    html += `<tr>`;
    html += `<td style="position:sticky;left:0;background:var(--bg2);z-index:1;text-align:left;font-weight:600;white-space:nowrap;border-bottom:1px solid var(--border)">
               ${escapeHtml(getStudentName(s))}
             </td>`;
             
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const record = allAttendance.find(a => String(a.student_id) === String(s.id) && a.date === dateStr);
      const status = record ? record.status : '';
      
      let cellContent = '';
      let cellStyle = 'cursor:pointer;border:1px solid var(--border);';
      if (status === 'present') { cellContent = '🟩'; cellStyle += 'background:rgba(16,185,129,0.1);'; }
      else if (status === 'absent') { cellContent = '🟥'; cellStyle += 'background:rgba(239,68,68,0.1);'; }
      else if (status === 'late') { cellContent = '🟨'; }
      else if (status === 'excused') { cellContent = '⬜'; }
      
      html += `<td style="${cellStyle}" onclick="toggleCellAttendance('${s.id}', '${dateStr}', '${status}')">
                 ${cellContent}
               </td>`;
    }
    html += `</tr>`;
  });
  
  html += `</tbody></table>`;
  container.innerHTML = html;
};

window.toggleCellAttendance = async function(studentId, date, currentStatus) {
  // Cycle: present -> absent -> empty
  let newStatus = '';
  if (!currentStatus) newStatus = 'present';
  else if (currentStatus === 'present') newStatus = 'absent';
  else newStatus = '';
  
  // Optimistic UI update in local state
  const existingIndex = allAttendance.findIndex(a => String(a.student_id) === String(studentId) && a.date === date);
  if (newStatus === '') {
    if (existingIndex > -1) {
      allAttendance.splice(existingIndex, 1); // remove
    }
  } else {
    if (existingIndex > -1) {
      allAttendance[existingIndex].status = newStatus;
    } else {
      allAttendance.push({ student_id: studentId, date: date, status: newStatus, notes: '' });
    }
  }
  
  // Re-render
  renderMonthlyMatrix();
  
  // API Call silently in background
  if (newStatus === '') {
    apiCall('/api/attendance', { method: 'POST', body: JSON.stringify([{student_id: studentId, date: date, status: 'absent'}]) }).catch(()=>{});
  } else {
    apiCall('/api/attendance', { method: 'POST', body: JSON.stringify([{student_id: studentId, date: date, status: newStatus}]) }).catch(()=>{});
  }
};

// --- MASTER SCHEDULE MATRIX (100% DYNAMIC) ---
// No more hardcoded data. Everything comes from live student/coach data via
// window.buildDynamicSchedule() defined in scripts.js.

window.openMasterSchedule = function() {
  const container = document.getElementById('master-schedule-container');
  if (!container) return;

  // Always use LIVE data from the dynamic schedule builder.
  let scheduleData = (typeof window.buildDynamicSchedule === 'function') ? window.buildDynamicSchedule() : [];
  const isAdmin = window.currentUser && window.currentUser.role === 'admin';

  let html = `
    <style>
        #master-schedule-container table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 3px;
            table-layout: fixed;
            background-color: transparent;
        }

        #master-schedule-container th {
            background-color: #1c2030;
            color: #a4b0cb;
            font-weight: 600;
            padding: 5px;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-radius: 2px;
            font-size: 10px;
            border: none;
        }

        #master-schedule-container th.coach-header {
            width: 12%;
        }

        #master-schedule-container td {
            padding: 2px;
            vertical-align: middle;
            text-align: center;
            background-color: #1a1e2e;
            border-radius: 2px;
            height: 52px;
            border: none;
        }

        #master-schedule-container td.coach-cell {
            font-weight: bold;
            font-size: 11px;
            text-align: center;
            padding: 4px;
            line-height: 1.2;
            color: #fff;
        }

        /* Border highlights per coach */
        .row-rohith { border-left: 3.5px solid #3b5998 !important; }
        .row-ranjith { border-left: 3.5px solid #27ae60 !important; }
        .row-gyana { border-left: 3.5px solid #8e44ad !important; }
        .row-arivu { border-left: 3.5px solid #d35400 !important; }
        .row-yogesh { border-left: 3.5px solid #2ecc71 !important; }
        .row-sudhin { border-left: 3.5px solid #f39c12 !important; }
        .row-vasanth { border-left: 3.5px solid #16a085 !important; }
        .row-vishnu { border-left: 3.5px solid #7f8c8d !important; }
        .row-default { border-left: 3.5px solid #4f5d75 !important; }

        .empty-cell {
            color: #2c3242;
            font-size: 12px;
        }

        .mat-block {
            display: block;
            padding: 4px;
            margin: 2px 0;
            border-radius: 3px;
            color: #ffffff;
            font-weight: 600;
            line-height: 1.1;
            text-align: left;
            cursor: pointer;
            position: relative;
            transition: opacity 0.15s;
        }
        .mat-block:hover { opacity: 0.85; }

        .bg-rohith { background-color: #3b5998; }
        .bg-ranjith { background-color: #27ae60; }
        .bg-gyana { background-color: #8e44ad; }
        .bg-arivu { background-color: #d35400; }
        .bg-yogesh { background-color: #2ecc71; }
        .bg-sudhin { background-color: #f39c12; }
        .bg-vasanth { background-color: #16a085; }
        .bg-vishnu { background-color: #7f8c8d; }
        .bg-default { background-color: #4f5d75; }

        .time-text {
            display: block;
            font-size: 9px;
            opacity: 0.85;
            margin-top: 2px;
            font-weight: normal;
        }
        
        .student-text {
            display: block;
            font-size: 9.5px;
            font-style: italic;
            opacity: 0.95;
            font-weight: normal;
            margin-top: 3px;
            border-top: 1px solid rgba(255, 255, 255, 0.15);
            padding-top: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .mat-edit-btn {
            position: absolute;
            top: 2px;
            right: 2px;
            background: rgba(0,0,0,0.4);
            border: none;
            color: #fff;
            font-size: 9px;
            cursor: pointer;
            border-radius: 3px;
            padding: 1px 3px;
            opacity: 0;
            transition: opacity 0.15s;
        }
        .mat-block:hover .mat-edit-btn { opacity: 1; }

        /* Inline Edit Popover */
        .mat-edit-popover {
            position: fixed;
            z-index: 9999;
            background: #1a1e2e;
            border: 1px solid #3c4256;
            border-radius: 10px;
            padding: 16px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.6);
            min-width: 300px;
            max-width: 380px;
            color: #fff;
            font-family: 'Segoe UI', sans-serif;
        }
        .mat-edit-popover h4 {
            margin: 0 0 12px 0;
            font-size: 13px;
            color: #daa33e;
        }
        .mat-edit-popover label {
            display: block;
            font-size: 11px;
            color: #a4b0cb;
            font-weight: 600;
            margin-bottom: 4px;
            margin-top: 10px;
        }
        .mat-edit-popover input, .mat-edit-popover select {
            width: 100%;
            padding: 7px 10px;
            background: #141722;
            border: 1px solid #2c3242;
            color: #fff;
            border-radius: 6px;
            font-size: 12px;
            box-sizing: border-box;
        }
        .mat-edit-popover .day-pills {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
            margin-top: 4px;
        }
        .mat-edit-popover .day-pill {
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid #2c3242;
            background: #141722;
            color: #a4b0cb;
            font-size: 10px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.15s;
        }
        .mat-edit-popover .day-pill.active {
            background: #daa33e;
            color: #000;
            border-color: #daa33e;
        }
        .mat-edit-actions {
            display: flex;
            gap: 8px;
            margin-top: 14px;
            justify-content: flex-end;
        }
        .mat-edit-actions button {
            padding: 6px 14px;
            border-radius: 6px;
            border: none;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
        }
        .mat-btn-save { background: #daa33e; color: #000; }
        .mat-btn-cancel { background: #2c3242; color: #fff; }
    </style>
  `;

  if (scheduleData.length === 0) {
    html += `<div style="text-align:center; padding:40px; color:#8a90a6;">
        <span style="font-size:36px; display:block; margin-bottom:12px;">📅</span>
        No schedule data available. Assign coaches and set schedule days for students in the Schedule Manager.
    </div>`;
    container.innerHTML = html;
    openModal('master-schedule-modal');
    return;
  }

  html += `<table>
        <thead>
            <tr>
                <th class="coach-header">Coach</th>
                <th>Mon</th>
                <th>Tue</th>
                <th>Wed</th>
                <th>Thu</th>
                <th>Fri</th>
                <th>Sat</th>
                <th>Sun</th>
            </tr>
        </thead>
        <tbody>
  `;

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  function getCoachThemeClass(name) {
      const n = (name || '').toLowerCase();
      if (n.includes('rohith')) return 'rohith';
      if (n.includes('ranjith')) return 'ranjith';
      if (n.includes('gyana')) return 'gyana';
      if (n.includes('arivu')) return 'arivu';
      if (n.includes('yogesh')) return 'yogesh';
      if (n.includes('sudhin')) return 'sudhin';
      if (n.includes('vasanth')) return 'vasanth';
      if (n.includes('vishnu')) return 'vishnu';
      return 'default';
  }

  scheduleData.forEach(c => {
    const theme = getCoachThemeClass(c.coach);
    const coachId = c.coachId || '';
    html += `<tr>`;
    html += `<td class="coach-cell row-${theme}">${c.coach}<br><span style="font-size:9px; font-weight:normal; color:#8a90a6;">${c.tier || 'Coach'}</span></td>`;
    
    // Group batches by day
    const dayBatches = { 'Monday': [], 'Tuesday': [], 'Wednesday': [], 'Thursday': [], 'Friday': [], 'Saturday': [], 'Sunday': [] };
    
    c.batches.forEach((b, batchIndex) => {
        let timeStr = '';
        let daysStr = (b.schedule || '').toLowerCase();
        
        if (b.schedule && b.schedule.includes('|')) {
            const parts = b.schedule.split('|');
            daysStr = parts[0].toLowerCase();
            timeStr = parts[1].trim();
        }
        
        daysOfWeek.forEach(day => {
            if (daysStr.includes(day.toLowerCase()) || daysStr.includes(day.substring(0,3).toLowerCase())) {
                dayBatches[day].push({ name: b.name, time: timeStr, students: b.students, schedule: b.schedule, batchIndex, coachId });
            }
        });
    });

    daysOfWeek.forEach(day => {
        const batches = dayBatches[day];
        if (batches.length === 0) {
            html += `<td class="empty-cell">&mdash;</td>`;
        } else {
            html += `<td>`;
            batches.forEach(b => {
                const stdStr = b.students && b.students.length > 0 ? b.students.join(', ') : 'No students';
                const editBtn = isAdmin ? `<button class="mat-edit-btn" onclick="event.stopPropagation(); window.openBatchInlineEdit('${b.coachId}', ${b.batchIndex}, this)" title="Edit batch">✏️</button>` : '';
                html += `<div class="mat-block bg-${theme}">${b.name}${editBtn}<span class="time-text">${b.time}</span><span class="student-text" title="${stdStr}">${stdStr}</span></div>`;
            });
            html += `</td>`;
        }
    });

    html += `</tr>`;
  });
  
  html += `</tbody></table>`;
  
  container.innerHTML = html;
  openModal('master-schedule-modal');
};

// --- Inline Batch Editor ---
window.openBatchInlineEdit = function(coachId, batchIndex, btnEl) {
  // Remove any existing popover
  document.querySelectorAll('.mat-edit-popover').forEach(el => el.remove());

  // Get live schedule data
  const scheduleData = (typeof window.buildDynamicSchedule === 'function') ? window.buildDynamicSchedule() : [];
  const coachEntry = scheduleData.find(c => String(c.coachId) === String(coachId));
  if (!coachEntry || !coachEntry.batches[batchIndex]) return;

  const batch = coachEntry.batches[batchIndex];
  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Parse existing days and time from schedule string (e.g. "Monday & Wednesday | 6:00 PM - 7:00 PM")
  let currentDays = [];
  let currentTime = '';
  if (batch.schedule && batch.schedule.includes('|')) {
    const parts = batch.schedule.split('|');
    const daysPart = parts[0].toLowerCase();
    currentTime = parts[1].trim();
    allDays.forEach(d => {
      if (daysPart.includes(d.toLowerCase())) currentDays.push(d);
    });
  }

  // Position popover near the button
  const rect = btnEl.getBoundingClientRect();
  const popX = Math.min(rect.left, window.innerWidth - 400);
  const popY = Math.min(rect.bottom + 4, window.innerHeight - 400);

  const popover = document.createElement('div');
  popover.className = 'mat-edit-popover';
  popover.style.left = popX + 'px';
  popover.style.top = popY + 'px';

  const dayPillsHtml = allDays.map(d => 
    `<span class="day-pill ${currentDays.includes(d) ? 'active' : ''}" data-day="${d}" onclick="this.classList.toggle('active')">${d.substring(0,3)}</span>`
  ).join('');

  // Students in this batch — allow removal
  const studentChipsHtml = (batch.students || []).map(name => 
    `<span style="display:inline-flex; align-items:center; gap:4px; background:#2c3242; padding:3px 8px; border-radius:4px; font-size:11px; margin:2px;">
       ${name}
     </span>`
  ).join('');

  popover.innerHTML = `
    <h4>✏️ Edit ${batch.name} — ${coachEntry.coach}</h4>
    <label>Class Days</label>
    <div class="day-pills" id="mat-edit-days">${dayPillsHtml}</div>
    <label>Time Slot</label>
    <input type="text" id="mat-edit-time" value="${currentTime}" placeholder="e.g. 6:00 PM - 7:00 PM">
    <label>Students in Batch</label>
    <div style="margin-top:4px; max-height:80px; overflow-y:auto;">${studentChipsHtml || '<span style="color:#8a90a6; font-size:11px;">No students assigned</span>'}</div>
    <div class="mat-edit-actions">
      <button class="mat-btn-cancel" onclick="this.closest('.mat-edit-popover').remove()">Cancel</button>
      <button class="mat-btn-save" onclick="window.saveBatchInlineEdit('${coachId}', ${batchIndex})">Save</button>
    </div>
  `;

  document.body.appendChild(popover);

  // Close on outside click
  setTimeout(() => {
    const handler = function(e) {
      if (!popover.contains(e.target)) {
        popover.remove();
        document.removeEventListener('mousedown', handler);
      }
    };
    document.addEventListener('mousedown', handler);
  }, 50);
};

window.saveBatchInlineEdit = async function(coachId, batchIndex) {
  const popover = document.querySelector('.mat-edit-popover');
  if (!popover) return;

  // Read new days
  const activePills = popover.querySelectorAll('.day-pill.active');
  const newDays = Array.from(activePills).map(el => el.dataset.day);
  const newTime = document.getElementById('mat-edit-time')?.value || '';

  if (newDays.length === 0) {
    if (window.toast) window.toast('Please select at least one day.', 'error');
    return;
  }

  // Build the new schedule string
  const daysString = newDays.join(' & ');
  const newSchedule = newTime ? `${daysString} | ${newTime}` : daysString;

  // Find all students in this batch and update their schedule notes
  const scheduleData = (typeof window.buildDynamicSchedule === 'function') ? window.buildDynamicSchedule() : [];
  const coachEntry = scheduleData.find(c => String(c.coachId) === String(coachId));
  if (!coachEntry || !coachEntry.batches[batchIndex]) return;

  const batch = coachEntry.batches[batchIndex];
  const studentNames = batch.students || [];

  if (window.toast) window.toast(`Updating schedule for ${studentNames.length} students...`, 'info');

  let successCount = 0;
  for (const name of studentNames) {
    const student = (window.allStudents || []).find(s =>
      (s.name || s.full_name || '').toLowerCase().includes(name.toLowerCase())
    );
    if (!student) continue;

    // Get existing schedule data from the student
    const existingSchedule = window.extractScheduleJSON ? window.extractScheduleJSON(student.notes) : null;
    const schedData = {
      ...(existingSchedule || {}),
      regDays: daysString,
      regTime: newTime,
      coachId: coachId,
      coachName: coachEntry.coach
    };

    if (window.persistScheduleForStudent) {
      const ok = await window.persistScheduleForStudent(student, schedData);
      if (ok) successCount++;
    }
  }

  popover.remove();

  if (window.toast) window.toast(`Schedule updated for ${successCount}/${studentNames.length} students.`, successCount > 0 ? 'success' : 'error');

  // Re-render the matrix with fresh data
  window.openMasterSchedule();
};
