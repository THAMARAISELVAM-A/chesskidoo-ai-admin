 async function saveAward() {
  const title = $('a-title').value.trim();
  const student_id = $('a-student-id').value.trim();

  if (!title || !student_id) return toast('Complete all fields', 'error');

  try {
    const response = await fetch('https://project-yj5uk.vercel.app/api/achievements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        student_id,
      })
    });

    const newAch = await response.json();
    achievementsData.push(newAch);

    toast('Achievement added!', 'success');
    closeModals();
    renderAwards();
    renderDash();
  } catch (error) {
    toast('Error adding achievement', 'error');
    console.error(error);
  }
}
