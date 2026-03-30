let coaches = [
  { id: 'c1', full_name: 'GM Viswanathan', specialty: 'Advanced Theory', phone: '9876543210', salary: '80000' },
  { id: 'c2', full_name: 'Coach Rohith', specialty: 'Midgame Tactics', phone: '9876543211', salary: '60000' }
];

export default function handler(request, response) {
  if (request.method === 'GET') {
    response.status(200).json(coaches);
  } else if (request.method === 'POST') {
    const newCoach = { id: 'c' + Date.now(), ...request.body };
    coaches.push(newCoach);
    response.status(201).json(newCoach);
  } else if (request.method === 'PUT') {
    const { id } = request.query;
    const index = coaches.findIndex(c => c.id === id);
    if (index === -1) return response.status(404).json({ error: 'Coach not found' });
    coaches[index] = { ...coaches[index], ...request.body };
    response.status(200).json(coaches[index]);
  } else if (request.method === 'DELETE') {
    const { id } = request.query;
    coaches = coaches.filter(c => c.id !== id);
    response.status(200).json({ message: 'Coach deleted' });
  } else {
    response.status(405).json({ error: 'Method not allowed' });
  }
}
