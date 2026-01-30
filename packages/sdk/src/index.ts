import { ChatClient } from './chat.js';
import type { ChatMessage, MessageHandler } from './types.js';

export class HctvSdk {
  private botToken: string;
  public chat: ChatClient;

  constructor(args: ConstructorArgs) {
    this.botToken = args.botToken;
    this.chat = new ChatClient(args.botToken);
  }
}

interface ConstructorArgs {
  botToken: string;
}
export { ChatClient } from './chat.js';
export type { ChatMessage, MessageHandler } from './types.js';
