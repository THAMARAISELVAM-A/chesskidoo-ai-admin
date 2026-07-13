import fs from 'fs';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vseombfkrvpffnpgbsnk.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  if (!fs.existsSync('matrix.html')) {
    console.error("matrix.html not found! Please create matrix.html and paste the full schedule HTML.");
    process.exit(1);
  }

  const html = fs.readFileSync('matrix.html', 'utf8');
  const $ = cheerio.load(html);

  const assignments = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  $('tbody tr').each((i, tr) => {
    const coachCell = $(tr).find('td:first-child, th:first-child');
    const coachName = coachCell.find('.coach-name').text().trim() || coachCell.contents().first().text().trim();
    const coachLevel = coachCell.find('span').text().trim(); 
    
    if (!coachName) return;

    const dayCells = $(tr).find('td').not(':first-child');
    
    dayCells.each((dayIndex, td) => {
      const dayName = days[dayIndex];
      $(td).find('.block').each((j, block) => {
        const timeText = $(block).find('.time-text').text().trim();
        const studentText = $(block).find('.student-text').text().trim();
        
        const batchName = $(block).contents().filter(function() {
          return this.nodeType === 3; 
        }).text().trim();

        const students = studentText.split(',').map(s => s.trim()).filter(s => s);
        
        students.forEach(student => {
          let studentNameClean = student.replace(/\s*\(.*?\)\s*/g, '').trim();
          let existing = assignments.find(a => a.studentName === studentNameClean && a.coachName === coachName && a.batchName === batchName);
          if (existing) {
            if (!existing.days.includes(dayName)) {
              existing.days.push(dayName);
            }
          } else {
            assignments.push({
              studentName: studentNameClean,
              coachName: coachName,
              batchType: coachLevel || 'Beginner',
              batchName: batchName,
              timeText: timeText,
              days: [dayName]
            });
          }
        });
      });
    });
  });

  assignments.forEach(a => {
    const shortDays = a.days.map(d => d.substring(0, 3));
    a.batchTime = `${shortDays.join(', ')} | ${a.timeText}`;
  });

  console.log(`Parsed ${assignments.length} unique student assignments from matrix.html`);

  if (assignments.length === 0) {
    console.error("No assignments parsed. Check matrix.html format.");
    process.exit(1);
  }

  // Fetch from DB
  const { data: dbStudents, error: err1 } = await supabase.from('students').select('id, name');
  if (err1) throw err1;

  const { data: dbCoaches, error: err2 } = await supabase.from('coaches').select('id, name');
  if (err2) throw err2;

  let updatedCount = 0;
  let notFoundCount = 0;

  for (const a of assignments) {
    // Fuzzy match student
    const studentMatches = dbStudents.filter(s => s.name.toLowerCase().includes(a.studentName.toLowerCase()) || a.studentName.toLowerCase().includes(s.name.toLowerCase()));
    
    if (studentMatches.length > 0) {
      const student = studentMatches[0];
      
      // Match coach
      const coachMatches = dbCoaches.filter(c => c.name.toLowerCase().includes(a.coachName.toLowerCase()));
      const coachId = coachMatches.length > 0 ? coachMatches[0].id : null;

      // Map batch type to dropdown values
      let bType = a.batchType;
      if (a.batchName.toLowerCase().includes('batch')) {
        bType = a.batchName; // "Batch 1"
      }

      const updatePayload = {
        batch_type: bType,
        batch_time: a.batchTime
      };

      if (coachId) {
        updatePayload.coach_id = coachId;
      }

      const { error: updErr } = await supabase.from('students').update(updatePayload).eq('id', student.id);
      if (updErr) {
        console.error(`Failed to update ${student.name}:`, updErr.message);
      } else {
        updatedCount++;
        console.log(`Updated ${student.name} -> Coach: ${a.coachName}, Batch: ${bType}, Time: ${a.batchTime}`);
      }
    } else {
      console.warn(`Could not find matching student in DB for: ${a.studentName}`);
      notFoundCount++;
    }
  }

  console.log(`\nMigration Complete! Successfully updated ${updatedCount} students. (${notFoundCount} not found in DB)`);
}

run().catch(console.error);
