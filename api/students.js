 let students = [
  { id: 's1', full_name: 'Riyas', gender: 'Male', join_date: '2024-01-15', level: 'ELITE', current_rating: 2450, coach_id: 'c1', payment_status: 'Paid', monthly_fee: 6500, batch_type: 'Evening', batch_time: '18:00' },
  { id: 's2', full_name: 'Varun', gender: 'Male', join_date: '2024-02-10', level: 'ADVANCED', current_rating: 2100, coach_id: 'c1', payment_status: 'Paid', monthly_fee: 5000, batch_type: 'Weekend', batch_time: '10:00' }
];

export default function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') return response.status(200).end();

  if (request.method === 'GET') {
    return response.status(200).json(students);
  } else if (request.method === 'POST') {
    const newStudent = { id: 's' + Date.now(), ...request.body };
    students.push(newStudent);
    return response.status(201).json(newStudent);
  } else if (request.method === 'PUT') {
    const { id } = request.query;
    const index = students.findIndex(s => s.id === id);
    if (index === -1) return response.status(404).json({ error: 'Student not found' });
    students[index] = { ...students[index], ...request.body };
    return response.status(200).json(students[index]);
  } else if (request.method === 'DELETE') {
    const { id } = request.query;
    students = students.filter(s => s.id !== id);
    return response.status(200).json({ message: 'Student deleted' });
  } else {
    return response.status(405).json({ error: 'Method not allowed' });
  }
}
