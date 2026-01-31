---
editUrl: false
next: false
prev: false
title: "ChatClient"
---

Defined in: [chat.ts:14](https://github.com/SrIzan10/hclive/blob/df845b5601eb6cb26def868034edc3500b99a4bd/packages/sdk/src/chat.ts#L14)

## Constructors

### Constructor

> **new ChatClient**(`botToken`, `options?`): `ChatClient`

Defined in: [chat.ts:24](https://github.com/SrIzan10/hclive/blob/df845b5601eb6cb26def868034edc3500b99a4bd/packages/sdk/src/chat.ts#L24)

#### Parameters

##### botToken

`string`

##### options?

[`ChatClientOptions`](/sdk-typedoc/interfaces/chatclientoptions/)

#### Returns

`ChatClient`

## Accessors

### currentChannel

#### Get Signature

> **get** **currentChannel**(): `string` \| `null`

Defined in: [chat.ts:187](https://github.com/SrIzan10/hclive/blob/df845b5601eb6cb26def868034edc3500b99a4bd/packages/sdk/src/chat.ts#L187)

##### Returns

`string` \| `null`

***

### isConnected

#### Get Signature

> **get** **isConnected**(): `boolean`

Defined in: [chat.ts:183](https://github.com/SrIzan10/hclive/blob/df845b5601eb6cb26def868034edc3500b99a4bd/packages/sdk/src/chat.ts#L183)

##### Returns

`boolean`

## Methods

### connect()

> **connect**(`channelName`): `Promise`\<`void`\>

Defined in: [chat.ts:29](https://github.com/SrIzan10/hclive/blob/df845b5601eb6cb26def868034edc3500b99a4bd/packages/sdk/src/chat.ts#L29)

#### Parameters

##### channelName

`string`

#### Returns

`Promise`\<`void`\>

***

### disconnect()

> **disconnect**(): `void`

Defined in: [chat.ts:147](https://github.com/SrIzan10/hclive/blob/df845b5601eb6cb26def868034edc3500b99a4bd/packages/sdk/src/chat.ts#L147)

#### Returns

`void`

***

### onHistory()

> **onHistory**(`handler`): () => `void`

Defined in: [chat.ts:171](https://github.com/SrIzan10/hclive/blob/df845b5601eb6cb26def868034edc3500b99a4bd/packages/sdk/src/chat.ts#L171)

#### Parameters

##### handler

[`HistoryHandler`](/sdk-typedoc/type-aliases/historyhandler/)

#### Returns

> (): `void`

##### Returns

`void`

***

### onMessage()

> **onMessage**(`handler`): () => `void`

Defined in: [chat.ts:161](https://github.com/SrIzan10/hclive/blob/df845b5601eb6cb26def868034edc3500b99a4bd/packages/sdk/src/chat.ts#L161)

#### Parameters

##### handler

[`MessageHandler`](/sdk-typedoc/type-aliases/messagehandler/)

#### Returns

> (): `void`

##### Returns

`void`

***

### onSystemMessage()

> **onSystemMessage**(`handler`): () => `void`

Defined in: [chat.ts:166](https://github.com/SrIzan10/hclive/blob/df845b5601eb6cb26def868034edc3500b99a4bd/packages/sdk/src/chat.ts#L166)

#### Parameters

##### handler

[`SystemMessageHandler`](/sdk-typedoc/type-aliases/systemmessagehandler/)

#### Returns

> (): `void`

##### Returns

`void`

***

### sendMessage()

> **sendMessage**(`message`): `void`

Defined in: [chat.ts:154](https://github.com/SrIzan10/hclive/blob/df845b5601eb6cb26def868034edc3500b99a4bd/packages/sdk/src/chat.ts#L154)

#### Parameters

##### message

`string`

#### Returns

`void`
