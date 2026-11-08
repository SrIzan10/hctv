import { WebClient } from '@slack/web-api';

const client = new WebClient(process.env.SLACK_NOTIFIER_TOKEN);
export default client;