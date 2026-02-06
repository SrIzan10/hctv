import { HctvSdk } from '../src/index.js';

const sdk = new HctvSdk({
  botToken: process.env.BOT_TOKEN!,
});

await sdk.chat.connect('channel1');
await sdk.chat.connect('channel2');
await sdk.chat.connect('channel3');
console.log(`connected to ${sdk.chat.connectedChannels.join(', ')}`);

// gets messages from all channels I'm connected to
sdk.chat.onMessage((message) => {
  console.log(`[${message.channelName}] ${message.username}: ${message.message}`);
});

// specifically handle messages from channel1
sdk.chat.onMessage((message) => {
  console.log(`ts from channel1: ${message.message}`);
}, 'channel1');

sdk.chat.sendMessage('this is channel1!', 'channel1');
sdk.chat.sendMessage('this is channel2!', 'channel2');

console.log(`connected to channel1? ${sdk.chat.isConnectedTo('channel1')}`);
console.log(`connected to channel2? ${sdk.chat.isConnectedTo('channel2')}`);

// disconnect from channel2 after 5 seconds
setTimeout(() => {
  console.log('disconnecting from channel2...');
  sdk.chat.disconnect('channel2');
  console.log(`still connected to: ${sdk.chat.connectedChannels.join(', ')}`);
}, 5000);

// disconnect from all channels
setTimeout(() => {
  console.log('disconnecting from all channels...');
  sdk.chat.disconnect();
}, 10000);
