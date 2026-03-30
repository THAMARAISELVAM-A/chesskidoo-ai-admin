export default function handler(request, response) {
  response.status(200).json({
    message: 'Hello from your Chess Admin backend!',
    timestamp: new Date(),
  });
}
