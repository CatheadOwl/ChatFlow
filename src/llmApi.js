export async function sendChatRequest(config, questionOrMessages) {
  const settings = config.settings || {
    endpoint: config.baseUrl || config.endpoint || '',
    apiKey: config.apiKey || config.key || '',
    model: config.model,
    deployment: config.deployment,
    apiVersion: config.apiVersion,
  };
  const endpointRaw = (settings.endpoint || '').trim();
  if (!endpointRaw) throw new Error('Missing endpoint in config');

  const headers = { 'Content-Type': 'application/json' };
  const apiKey = settings.apiKey;

  // normalize messages: allow passing a single string or an array of {role,content} or strings
  let messages = [];
  if (Array.isArray(questionOrMessages)) {
    messages = questionOrMessages.map(m => (typeof m === 'string' ? { role: 'user', content: m } : m));
  } else {
    messages = [{ role: 'user', content: String(questionOrMessages || '') }];
  }

  // Assume OpenAI-compatible endpoint only
  const url = endpointRaw.includes('/v1/') ? endpointRaw : `${endpointRaw.replace(/\/$/, '')}/v1/chat/completions`;
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const payload = {
    model: settings.model || '',
    messages,
  };

  const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Request failed: ${resp.status} ${resp.statusText} ${text}`);
  }

  const data = await resp.json();
  if (data.choices && data.choices[0]) {
    return data.choices[0].message?.content ?? data.choices[0].text ?? JSON.stringify(data.choices[0]);
  }

  return JSON.stringify(data).slice(0, 2000);
}
