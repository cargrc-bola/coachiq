// netlify/functions/notion.js
// Proxy seguro para a API do Notion — evita CORS e mantém o token no servidor

exports.handler = async (event) => {
  // Só aceita POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Token vem da variável de ambiente do Netlify (nunca exposta ao browser)
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  if (!NOTION_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'NOTION_TOKEN não configurado nas variáveis de ambiente do Netlify.' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Body inválido.' }) };
  }

  const { method, endpoint, payload } = body;
  if (!method || !endpoint) {
    return { statusCode: 400, body: JSON.stringify({ error: 'method e endpoint são obrigatórios.' }) };
  }

  // Bloqueia endpoints perigosos — só permite leitura/escrita na database
  const allowed = [
    /^databases\/[a-f0-9]+\/query$/,
    /^databases\/[a-f0-9]+$/,
    /^pages\/[a-f0-9-]+$/,
    /^pages$/,
  ];
  const isAllowed = allowed.some(re => re.test(endpoint));
  if (!isAllowed) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Endpoint não permitido.' }) };
  }

  try {
    const response = await fetch(`https://api.notion.com/v1/${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });

    const data = await response.json();
    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
