let payments = [];

export default function handler(request, response) {
  if (request.method === 'GET') {
    response.status(200).json(payments);
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
    response.status(201).json(newPayment);
  } else {
    response.status(405).json({ error: 'Method not allowed' });
  }
}
