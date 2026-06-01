import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export const maxDuration = 60;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    // Si c'est une requête PDF, extraire le texte d'abord
    if (payload.pdf_base64) {
      const pdfBuffer = Buffer.from(payload.pdf_base64, 'base64');
      const pdfData = await pdfParse(pdfBuffer);
      const texte = pdfData.text.substring(0, 8000);
      
      const claudeBody = {
        model: payload.model || 'claude-sonnet-4-6',
        max_tokens: payload.max_tokens || 1500,
        messages: [{
          role: 'user',
          content: payload.prompt + '\n\nContenu du PDF:\n' + texte
        }]
      };
      
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(claudeBody),
      });
      const d = await r.json();
      return res.status(r.status).json(d);
    }
    
    // Requête normale (texte seul)
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    return res.status(r.status).json(d);
  } catch(e) { 
    console.error('Proxy error:', e);
    return res.status(500).json({ error: e.message }); 
  }
}