import {
  createBotSchema,
  createChannelSchema,
  changeUsernameSchema,
  editBotSchema,
  onboardSchema,
  streamInfoEditSchema,
  updateChatModerationSchema,
  updateChannelSettingsSchema,
  updateNotificationChannelsSchema,
} from '#shared/schemas/forms';

export const schemaDb = [
  { name: 'streamInfoEdit', zod: streamInfoEditSchema },
  { name: 'onboard', zod: onboardSchema },
  { name: 'createChannel', zod: createChannelSchema },
  { name: 'updateChannelSettings', zod: updateChannelSettingsSchema },
  { name: 'createBot', zod: createBotSchema },
  { name: 'editBot', zod: editBotSchema },
  { name: 'changeUsername', zod: changeUsernameSchema },
  { name: 'updateChatModeration', zod: updateChatModerationSchema },
  { name: 'updateNotificationChannels', zod: updateNotificationChannelsSchema },
] as const;
