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

// --- NEW MASTER SCHEDULE LOGIC ---
// Curated weekly timetable (source of truth: the coach schedule PDFs). Used for
// the day-pill calendar in the per-coach and master schedule views, since live
// student records don't store class DAYS.
const hardcodedSchedule = [
  { coach: 'Arivuselvam', tier: 'Advanced', batches: [
      { name: 'Batch 1', schedule: 'Monday & Wednesday | 6:00 PM - 7:00 PM', students: ['Aarunya', 'Magathi', 'Pranav'] },
      { name: 'Batch 2', schedule: 'Monday & Wednesday | 8:00 PM - 9:00 PM', students: ['Aatish', 'Uttsan'] },
      { name: 'Batch 3', schedule: 'Tuesday & Thursday | 7:00 PM - 8:00 PM', students: ['Mukilan', 'Sachin'] },
      { name: 'Batch 4', schedule: 'Monday & Wednesday | 7:00 PM - 8:00 PM', students: ['Eduveer', 'Yugan'] }
  ] },
  { coach: 'Gyana Suriya', tier: 'Beginner', batches: [
      { name: 'Batch 1', schedule: 'Saturday & Sunday | 7:00 PM - 8:00 PM', students: ['Aara', 'Anush', 'Rakshitha', 'Shervin'] },
      { name: 'Batch 2', schedule: 'Wednesday & Friday | 5:40 AM - 6:20 AM', students: ['Ekash'] },
      { name: 'Batch 3', schedule: 'Wednesday & Friday | 7:00 AM - 8:00 AM', students: ['Nigunan'] }
  ] },
  { coach: 'Ranjith', tier: 'Advanced', batches: [
      { name: 'Batch 1', schedule: 'Tuesday & Thursday | 2:45 PM - 3:45 PM', students: ['Sakthi', 'Sathya'] },
      { name: 'Batch 2', schedule: 'Saturday & Sunday | 7:00 PM - 8:00 PM', students: ['Riyas', 'Susil', 'Varun'] }
  ] },
  { coach: 'Sudhin', tier: 'Beginner', batches: [
      { name: 'Batch 1', schedule: 'Thursday & Friday | 6:00 AM - 7:00 AM', students: ['Jeevan'] },
      { name: 'Batch 3', schedule: 'Saturday & Sunday | 7:00 PM - 8:00 PM', students: ['Aakif', 'Pranish', 'Venkatesh Daughter'] }
  ] },
  { coach: 'Vishnu', tier: 'Intermediate', batches: [
      { name: 'Batch 1', schedule: 'Friday & Saturday | 7:00 PM - 8:00 PM', students: [] },
      { name: 'Batch 2', schedule: 'Wednesday & Thursday | 7:00 PM - 8:00 PM', students: ['Yogesh'] },
      { name: 'Batch 3', schedule: 'Wednesday & Thursday | 6:00 PM - 7:00 PM', students: ['Abinitha'] }
  ] },
  { coach: 'Yogesh', tier: 'Beginner', batches: [
      { name: 'Batch 1', schedule: 'Saturday & Sunday | 7:30 PM - 8:30 PM', students: ['Athvik', 'Mohammad Rayan', 'Pranesh'] },
      { name: 'Batch 2', schedule: 'Saturday & Sunday | 6:00 PM - 7:00 PM', students: ['Sai', 'Venkatesh Son'] }
  ] },
  { coach: 'Vasanth Kumar', tier: 'Beginner', batches: [
      { name: 'Batch 1', schedule: 'Monday & Wednesday | 7:00 PM - 7:40 PM', students: ['Aaradhya'] }
  ] },
  { coach: 'Rohith', tier: 'Beginner', batches: [
      { name: 'Batch 1', schedule: 'Monday, Wednesday & Saturday | 5:00 AM - 5:40 AM', students: ['Sreelaxmi'] },
      { name: 'Batch 2', schedule: 'Thursday & Friday | 6:00 PM - 8:00 PM', students: ['Samiksha'] }
  ] }
];

// Expose the master schedule data so the per-coach schedule view can reuse it.
window.hardcodedSchedule = hardcodedSchedule;

window.openMasterSchedule = function() {
  const container = document.getElementById('master-schedule-container');
  if (!container) return;

  // Prefer LIVE data (reflects coach reassignments, deletions, new enrolments).
  // Fall back to the bundled sample only if live data isn't available yet.
  let scheduleData = (typeof window.buildDynamicSchedule === 'function') ? window.buildDynamicSchedule() : null;
  if (!scheduleData || scheduleData.length === 0) scheduleData = hardcodedSchedule;

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
        }

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
    </style>
    <table>
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
    html += `<tr>`;
    html += `<td class="coach-cell row-${theme}">${c.coach}<br><span style="font-size:9px; font-weight:normal; color:#8a90a6;">${c.tier || 'Coach'}</span></td>`;
    
    // Group batches by day
    const dayBatches = { 'Monday': [], 'Tuesday': [], 'Wednesday': [], 'Thursday': [], 'Friday': [], 'Saturday': [], 'Sunday': [] };
    
    c.batches.forEach(b => {
        let timeStr = '';
        let daysStr = (b.schedule || '').toLowerCase();
        
        if (b.schedule && b.schedule.includes('|')) {
            const parts = b.schedule.split('|');
            daysStr = parts[0].toLowerCase();
            timeStr = parts[1].trim();
        }
        
        daysOfWeek.forEach(day => {
            if (daysStr.includes(day.toLowerCase()) || daysStr.includes(day.substring(0,3).toLowerCase())) {
                dayBatches[day].push({ name: b.name, time: timeStr, students: b.students });
            }
        });
    });

    daysOfWeek.forEach(day => {
        const batches = dayBatches[day];
        if (batches.length === 0) {
            html += `<td class="empty-cell">&mdash;</td>`;
        } else {
            html += `<td>`;
            // Sort by time roughly (AM before PM, then numerical)
            batches.forEach(b => {
                const stdStr = b.students && b.students.length > 0 ? b.students.join(', ') : 'No students';
                html += `<div class="mat-block bg-${theme}">${b.name}<span class="time-text">${b.time}</span><span class="student-text" title="${stdStr}">${stdStr}</span></div>`;
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
