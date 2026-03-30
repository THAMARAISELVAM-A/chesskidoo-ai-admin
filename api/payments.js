 let payments = [];

export default function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') return response.status(200).end();

  if (request.method === 'GET') {
    return response.status(200).json(payments);
  } else if (request.method === 'POST') {
    const newPayment = {
      id: 'pay' + Date.now(),
      student_id: request.body.student_id,
      amount: request.body.amount,
      date: new Date().toISOString(),
      status: 'Completed',
      method: request.body.method
    };
    payments.push(newPayment);
    return response.status(201).json(newPayment);
  } else {
    return response.status(405).json({ error: 'Method not allowed' });
  }
}
