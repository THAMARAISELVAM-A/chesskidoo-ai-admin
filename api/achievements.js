let achievements = [
  { id: 'a1', title: 'District Champion', student_id: 's1', date: '2024-03-15' }
];

export default function handler(request, response) {
  if (request.method === 'GET') {
    response.status(200).json(achievements);
  } else if (request.method === 'POST') {
    const newAchievement = { id: 'a' + Date.now(), ...request.body, date: new Date().toISOString() };
    achievements.push(newAchievement);
    response.status(201).json(newAchievement);
  } else if (request.method === 'DELETE') {
    const { id } = request.query;
    achievements = achievements.filter(a => a.id !== id);
    response.status(200).json({ message: 'Achievement deleted' });
  } else {
    response.status(405).json({ error: 'Method not allowed' });
  }
}
