import { HctvSdk } from "../src";

const botToken = process.env.BOT_TOKEN;
const aiToken = process.env.AI_TOKEN;
if (!botToken) {
  throw new Error('BOT_TOKEN environment variable is required');
}
if (!aiToken) {
  throw new Error('AI_TOKEN environment variable is required');
}

const sdk = new HctvSdk({ botToken: botToken })

await sdk.chat.connect('bot-playground')
console.log('connected to the chat!')

sdk.chat.onMessage(async m => {
  if (!m.message.startsWith('/ai')) return;
  const res = await fetch('https://ai.hackclub.com/proxy/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${aiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Reply concisely and like if you were on a chat platform. Use lowercase.' },
        { role: 'user', content: m.message.replace('/ai', '').trim() }
      ],
    }),
  });
  const data = await res.json();
  const aiMessage = data.choices?.[0]?.message?.content;

  if (aiMessage) {
    sdk.chat.sendMessage(`@${m.username} ${aiMessage}`);
  }
})