import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('scratch/matrix.html', 'utf8');
const $ = cheerio.load(html);

const assignments = [];
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

$('tbody tr').each((i, tr) => {
  const coachCell = $(tr).find('td:first-child, th:first-child');
  const coachName = coachCell.find('.coach-name').text().trim() || coachCell.contents().first().text().trim();
  const coachLevel = coachCell.find('span').text().trim(); // e.g. "Beginner"
  
  if (!coachName) return;

  const dayCells = $(tr).find('td').not(':first-child');
  
  dayCells.each((dayIndex, td) => {
    const dayName = days[dayIndex];
    $(td).find('.block').each((j, block) => {
      const fullText = $(block).text().trim(); // e.g. "Batch 16:00 PM - 7:00 PMAbinitha"
      const timeText = $(block).find('.time-text').text().trim();
      const studentText = $(block).find('.student-text').text().trim();
      
      // Batch name is what's left
      const batchName = $(block).contents().filter(function() {
        return this.nodeType === 3; // Text nodes
      }).text().trim();

      const students = studentText.split(',').map(s => s.trim()).filter(s => s);
      
      students.forEach(student => {
        // Find if we already recorded this student for this batch
        let existing = assignments.find(a => a.studentName === student && a.coachName === coachName && a.batchName === batchName);
        if (existing) {
          if (!existing.days.includes(dayName)) {
            existing.days.push(dayName);
          }
        } else {
          assignments.push({
            studentName: student,
            coachName: coachName,
            batchType: coachLevel,
            batchName: batchName,
            timeText: timeText,
            days: [dayName]
          });
        }
      });
    });
  });
});

// Post-process to format days/time and merge 
// (e.g. if a batch is on Tue/Wed/Sat at 5:00 AM, the matrix has it in 3 cells. 
//  Our existing logic above groups them if batchName, coachName, and studentName match)

assignments.forEach(a => {
  const shortDays = a.days.map(d => d.substring(0, 3));
  a.batchTime = `${shortDays.join(', ')} | ${a.timeText}`;
});

fs.writeFileSync('scratch/student_assignments.json', JSON.stringify(assignments, null, 2));
console.log(`Parsed ${assignments.length} assignments.`);
