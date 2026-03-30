// Note: In-memory array will reset every time Vercel spins up the function.
// This is great for testing API structure, but NOT for real storage.
const games = [
  { id: 1, player1: 'Alice', player2: 'Bob', status: 'ongoing' },
  { id: 2, player1: 'Charlie', player2: 'Diana', status: 'completed' }
];

export default function handler(request, response) {
  if (request.method === 'GET') {
    response.status(200).json(games);
  } else if (request.method === 'POST') {
    // Make sure to parse JSON body if you're using Vercel; body should be parsed for you
    const newGame = {
      id: Date.now(),
      ...request.body
    };
    games.push(newGame); // Will work per-instance, not persisted
    response.status(201).json(newGame);
  } else {
    response.status(405).json({ error: 'Method not allowed' });
  }
}
