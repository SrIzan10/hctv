import { serve } from '@hono/node-server'
import { createNodeWebSocket } from '@hono/node-ws'
import { Hono } from 'hono'
import { readFile } from 'node:fs/promises'

const threed = await readFile('./src/3d.txt', 'utf-8')

const app = new Hono()
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

app.get('/', async (c) => {  
  return c.text(threed)
})

app.get(
  '/ws',
  upgradeWebSocket((c) => ({
    // https://hono.dev/helpers/websocket
  }))
)

serve({
  fetch: app.fetch,
  port: 8000,
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
