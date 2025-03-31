// Define a union type of all possible job names
export type JobName = 
  | 'email:send'
  | 'video:process'
  | 'notification:push'
  | 'user:sync'
  // Add more job names as needed

// Define payload and result types for each job
export interface JobDefinitions {
  'email:send': {
    payload: {
      to: string;
      subject: string;
      body: string;
      attachments?: Array<{name: string, content: string}>;
    };
    result: {
      sent: boolean;
      messageId?: string;
      error?: string;
    };
  };
  
  'video:process': {
    payload: {
      videoId: string;
      formats: string[];
      resolution?: string;
    };
    result: {
      success: boolean;
      processedFormats: string[];
      duration: number;
    };
  };
  
  'notification:push': {
    payload: {
      userId: string;
      message: string;
      data?: Record<string, any>;
    };
    result: {
      delivered: boolean;
      deviceCount: number;
    };
  };
  
  'user:sync': {
    payload: {
      userId: string;
      externalSystems: string[];
    };
    result: {
      syncedSystems: string[];
      failedSystems: string[];
    };
  };
}

export type PayloadFor<T extends JobName> = JobDefinitions[T]['payload'];

export type ResultFor<T extends JobName> = JobDefinitions[T]['result'];