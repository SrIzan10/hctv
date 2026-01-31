import { ChatClient } from './chat.js';

export class HctvSdk {
  private botToken: string;
  public chat: ChatClient;

  constructor(args: ConstructorArgs) {
    this.botToken = args.botToken;
    this.chat = new ChatClient(args.botToken, args.chatOptions);
  }
}

interface ConstructorArgs {
  botToken: string;
  chatOptions?: import('./chat.js').ChatClientOptions;
}
export { ChatClient, type ChatClientOptions } from './chat.js';
export type { ChatMessage, MessageHandler, SystemMessage, SystemMessageHandler, HistoryHandler } from './types.js';
