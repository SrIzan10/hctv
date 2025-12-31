export class HctvSdk {
  private botToken: string
  constructor(args: ConstructorArgs) {
    this.botToken = args.botToken
  }
}



/*
const client = new HctvSdk({ botToken: 'hctvb_asddfasdfasdfasdfasdf' });
await client.chat.connect('channelName');
client.chat.onMessage((message) => {
  // message would include data like the channelname etc
  console.log('New message:', message);
});
*/

interface ConstructorArgs {
  botToken: string;
}
