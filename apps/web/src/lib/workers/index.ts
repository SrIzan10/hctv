import type { ChatPostMessageArguments } from '@slack/web-api';
import PgBoss from 'pg-boss';

export type JobName = 
  | 'notifier:sendMsg';

export interface JobDefinitions {
  'notifier:sendMsg': {
    payload: ChatPostMessageArguments;
    result: {
      success: boolean;
      error?: string;
    };
  };
}

export type PayloadFor<T extends JobName> = JobDefinitions[T]['payload'];
export type ResultFor<T extends JobName> = JobDefinitions[T]['result'];

export class TypedPgBoss {
  private instance: PgBoss;
  
  constructor(connectionString: string) {
    this.instance = new PgBoss(connectionString);
  }
  
  async start(): Promise<PgBoss> {
    return this.instance.start();
  }
  
  async stop(): Promise<void> {
    return this.instance.stop();
  }
  
  async send<T extends JobName>(
    name: T, 
    payload: PayloadFor<T>, 
    options?: PgBoss.SendOptions
  ): Promise<string | null> {
    await this.instance.createQueue(name);
    return this.instance.send(name, payload, options!);
  }
  
  async schedule<T extends JobName>(
    name: T,
    payload: PayloadFor<T>,
    cron: string,
    options?: PgBoss.ScheduleOptions
  ): Promise<void> {
    return this.instance.schedule(name, cron, payload, options);
  }
  
  async work<T extends JobName>(
    name: T,
    handler: (job: PgBoss.Job<PayloadFor<T>>) => Promise<ResultFor<T>> | void,
    options?: PgBoss.WorkOptions
  ): Promise<string> {
    const wrappedHandler: PgBoss.WorkHandler<unknown> = async (job: PgBoss.Job<unknown> | PgBoss.Job<unknown>[]) => {
      const singleJob = Array.isArray(job) ? job[0] : job;
      const processedJob = {...singleJob};
      if (Array.isArray(singleJob.data) && singleJob.data.length === 1) {
        processedJob.data = singleJob.data[0];
      }
      
      return await handler(processedJob as PgBoss.Job<PayloadFor<T>>);
    };
    
    return this.instance.work(name, options || {}, wrappedHandler);
  }
  
  getInstance(): PgBoss {
    return this.instance;
  }
}

const globalForPgBoss = global as unknown as { pgBoss: TypedPgBoss | null };

// Initialize if it doesn't exist yet
if (!globalForPgBoss.pgBoss) {
  globalForPgBoss.pgBoss = null;
}

// Get or create the singleton instance
export async function getPgBoss(): Promise<TypedPgBoss> {
  if (!globalForPgBoss.pgBoss) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    console.log('Creating new PgBoss instance...');
    const newBoss = new TypedPgBoss(process.env.DATABASE_URL);
    
    try {
      await newBoss.start();
      console.log('PgBoss started successfully');
      globalForPgBoss.pgBoss = newBoss;
    } catch (error) {
      console.error('Failed to start PgBoss:', error);
      throw error;
    }
  }
  
  return globalForPgBoss.pgBoss;
}

export async function closePgBoss(): Promise<void> {
  if (globalForPgBoss.pgBoss) {
    await globalForPgBoss.pgBoss.stop();
    globalForPgBoss.pgBoss = null;
    console.log('PgBoss stopped successfully');
  }
}
