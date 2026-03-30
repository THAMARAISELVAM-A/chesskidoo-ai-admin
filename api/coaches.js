 async function saveCoach() {
  // (collect your coach form fields here)
  const coachName = $('c-name').value.trim();
  const specialty = $('c-specialty').value.trim();
  const phone = $('c-phone').value.trim();
  const salary = $('c-salary').value.trim();

  if (!coachName) return toast('Please enter a Coach Name', 'error');
  if (!phone) return toast('Please enter a Coach Phone', 'error');

  try {
    const response = await fetch('https://project-yj5uk.vercel.app/api/coaches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: coachName,
        specialty,
        phone,
        salary,
      })
    });

    const newCoach = await response.json();
    allCoaches.push(newCoach);

    toast(`${coachName} added!`, 'success');
    closeModals();
    renderCoaches();
    renderDash();
  } catch (error) {
    toast('Error adding coach', 'error');
    console.error(error);
  }
}
