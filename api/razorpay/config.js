export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  
  if (!keyId) {
    return response.status(200).json({ 
      keyId: null, 
      configured: false 
    });
  }

  return response.status(200).json({ 
    keyId: keyId,
    configured: true 
  });
}