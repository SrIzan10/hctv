import { HctvSdk } from '../src/index.js';

const botToken = process.env.BOT_TOKEN;
const channelName = process.env.CHANNEL_NAME;

if (!botToken || !channelName) {
  throw new Error('Set BOT_TOKEN and CHANNEL_NAME');
}

const sdk = new HctvSdk({ botToken });
await sdk.chat.connect(channelName);

sdk.chat.onMessage((message) => {
  if (message.isBot || !message.userId) return;

  if (message.message.toLowerCase().includes('badword')) {
    sdk.chat.timeoutUser(channelName, message.userId, message.username, 300, 'Used blocked word');
    //sdk.chat.sendMessage(`@${message.username} timed out for 5 minutes.`, channelName);
  }
});

sdk.chat.onSystemMessage((m) => {
  console.log(`[system] ${m.type}: ${m.message}`);
});
sdk.chat.onModerationError((err) => {
  console.log(`[moderation] ${err.code}: ${err.message}`);
});