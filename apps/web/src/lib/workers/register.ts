import { getPgBoss } from '@/lib/workers';
import snClient from '../services/slackNotifier';

export async function registerWorkers() {
  const boss = await getPgBoss();
  
  await boss.work('notifier:sendMsg', async (job) => {
    console.log('Processing job:', job.id);
    
    await snClient.chat.postMessage(job.data).catch(e => {
      return { success: false, error: e.message };
    });
    return { success: true };
  });
  
  console.log('All workers registered successfully');
}