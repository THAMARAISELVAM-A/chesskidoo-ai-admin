async function saveStudent() {
  const name = $('m-name').value.trim();
  const phone = $('m-phone').value.trim();
  const eloVal = parseInt($('m-elo').value);
  const feeVal = parseInt($('m-fee').value);
  const joinDate = $('m-join').value;

  if (!name) return toast('Please enter a Full Name', 'error');
  if (!isValidPhone(phone)) return toast('Parent Phone must be exactly 10 digits', 'error');

  try {
    const response = await fetch('https://project-yj5uk.vercel.app/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: name,
        gender: $('m-gender').value,
        join_date: joinDate,
        level: $('m-level').value,
        current_rating: eloVal,
        coach_id: $('m-coach').value,
        payment_status: 'Due',
        monthly_fee: feeVal,
        batch_type: $('m-batch-type').value,
        batch_time: $('m-batch-time').value
      })
    });

    const newStudent = await response.json();
    allStudents.push(newStudent);

    toast(`${name} enrolled successfully!`, 'success');
    closeModals();
    renderStudents();
    renderDash();
  } catch (error) {
    toast('Error enrolling student', 'error');
    console.error(error);
  }
}
