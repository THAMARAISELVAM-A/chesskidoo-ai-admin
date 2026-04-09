import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { query, context, history } = request.body;

  if (!process.env.OPENAI_API_KEY) {
    return response.status(200).json({ 
      answer: "OpenAI API key is not configured. Please add OPENAI_API_KEY to your .env file to enable advanced AI features." 
    });
  }

  try {
    const systemPrompt = `
      You are the "Chesskidoo Intelligence Hub" – a specialized AI for Chesskidoo Academy.
      Your goal is to provide deep insights into institutional data, including student performance, coach efficiency, and financial health.

      ACADEMY DATA CONTEXT:
      ${JSON.stringify(context, null, 2)}

      OPERATIONAL GUIDELINES:
      1. Financials: If asked about revenue, calculate totals from the 'Paid' status students. Identify 'Due' students as risks.
      2. Performance: Analyze ELO trends and identify "Star Cadets" (highest rating) or "Rising Stars" (recent growth).
      3. Events: Evaluate registration success and suggest improvements.
      4. Professionalism: Keep your tone executive but encouraging. Use chess metaphors where appropriate (e.g., "The middlegame of our financial year looks strong").
      5. Conciseness: Provide actionable bullet points for long data-heavy answers.

      If you don't have specific data, use the general trends from what is provided.
    `;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map(h => ({ role: h.role, content: h.content })),
      { role: "user", content: query }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", // Use a more capable model for analytics
      messages: messages,
      temperature: 0.7,
      max_tokens: 800
    });

    return response.status(200).json({ answer: completion.choices[0].message.content });
  } catch (error) {
    console.error('OpenAI Error:', error);
    return response.status(500).json({ error: 'Failed to generate AI response' });
  }
}

