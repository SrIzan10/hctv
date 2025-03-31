import PgBoss from 'pg-boss';

export type JobName = 
  | 'notifier:sendMsg';

export interface JobDefinitions {
  'notifier:sendMsg': {
    payload: {
      msg: string;
      channelId: string;
    };
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
    return options ? this.instance.send(name, payload, options) : this.instance.send(name, payload);
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
    const wrappedHandler: PgBoss.WorkHandler<unknown> = async (job) => {
      return await handler(job as unknown as PgBoss.Job<PayloadFor<T>>);
    };
    
    return this.instance.work(name, options || {}, wrappedHandler);
  }
  
  getInstance(): PgBoss {
    return this.instance;
  }
}

let pgBossInstance: TypedPgBoss | null = null;

export async function getPgBoss(): Promise<TypedPgBoss> {
  if (!pgBossInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    pgBossInstance = new TypedPgBoss(process.env.DATABASE_URL);
    await pgBossInstance.start();
    console.log('PgBoss started successfully');
  }
  return pgBossInstance;
}

export async function closePgBoss(): Promise<void> {
  if (pgBossInstance) {
    await pgBossInstance.getInstance().stop();
    pgBossInstance = null;
    console.log('PgBoss stopped successfully');
  }
}