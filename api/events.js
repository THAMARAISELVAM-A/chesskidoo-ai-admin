 async function saveEvent() {
  const title = $('e-title').value.trim();
  const date = $('e-date').value.trim();
  const type = $('e-type').value.trim();
  const prize = $('e-prize').value.trim();
  const location = $('e-location').value.trim();

  if (!title || !date) return toast('Complete all fields', 'error');

  try {
    const response = await fetch('https://project-yj5uk.vercel.app/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, date, type, prize, location
      })
    });

    const newEvent = await response.json();
    eventsData.push(newEvent);

    toast('Event added!', 'success');
    closeModals();
    renderEvents();
    renderDash();
  } catch (error) {
    toast('Error adding event', 'error');
    console.error(error);
  }
}
