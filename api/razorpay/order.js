import Razorpay from 'razorpay';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { amount, currency, receipt } = request.body;

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return response.status(200).json({ 
      simulated: true,
      id: "order_sim_" + Date.now(),
      amount: amount,
      currency: currency || 'INR'
    });
  }

  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: amount * 100, // Amount in paise
      currency: currency || 'INR',
      receipt: receipt || "receipt_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);
    return response.status(200).json(order);
  } catch (error) {
    console.error('Razorpay Order Error:', error);
    return response.status(500).json({ error: 'Failed to create order' });
  }
}
