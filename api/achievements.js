 let achievements = [
  { id: 'a1', title: 'District Champion', student_id: 's1', student_name: 'Riyas', date: '2024-03-15' }
];

export default function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') return response.status(200).end();

  if (request.method === 'GET') {
    return response.status(200).json(achievements);
  } else if (request.method === 'POST') {
    const newAchievement = {
      id: 'a' + Date.now(),
      title: request.body.title,
      student_id: request.body.student_id,
      student_name: request.body.student_name,
      date: new Date().toISOString()
    };
    achievements.push(newAchievement);
    return response.status(201).json(newAchievement);
  } else if (request.method === 'DELETE') {
    const { id } = request.query;
    achievements = achievements.filter(a => a.id !== id);
    return response.status(200).json({ message: 'Achievement deleted' });
  } else {
    return response.status(405).json({ error: 'Method not allowed' });
  }
}
