 let events = [
  { id: 'e1', title: 'Summer Blitz Tournament', date: '2024-08-15', type: 'Blitz', prize: '₹10,000', location: 'Main Hall', registrations_count: 12 }
];

export default function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') return response.status(200).end();

  if (request.method === 'GET') {
    return response.status(200).json(events);
  } else if (request.method === 'POST') {
    const newEvent = {
      id: 'e' + Date.now(),
      title: request.body.title,
      date: request.body.date,
      type: request.body.type,
      prize: request.body.prize,
      location: request.body.location,
      registrations_count: 0
    };
    events.push(newEvent);
    return response.status(201).json(newEvent);
  } else if (request.method === 'DELETE') {
    const { id } = request.query;
    events = events.filter(e => e.id !== id);
    return response.status(200).json({ message: 'Event deleted' });
  } else {
    return response.status(405).json({ error: 'Method not allowed' });
  }
}
