let events = [
  { id: 'e1', title: 'Summer Blitz Tournament', date: '2024-08-15', type: 'Blitz', prize: '₹10,000', location: 'Main Hall' }
];

export default function handler(request, response) {
  if (request.method === 'GET') {
    response.status(200).json(events);
  } else if (request.method === 'POST') {
    const newEvent = { id: 'e' + Date.now(), ...request.body };
    events.push(newEvent);
    response.status(201).json(newEvent);
  } else if (request.method === 'DELETE') {
    const { id } = request.query;
    events = events.filter(e => e.id !== id);
    response.status(200).json({ message: 'Event deleted' });
  } else {
    response.status(405).json({ error: 'Method not allowed' });
  }
}
