import type { AuthState } from './utils/auth';

declare module 'h3' {
  interface H3EventContext {
    auth?: AuthState;
  }
}

export {};
