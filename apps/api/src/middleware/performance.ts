import { FastifyInstance } from 'fastify'

export default async function performancePlugin(app: FastifyInstance) {
  app.addHook('onRequest', (request: any, _reply, done) => {
    request.startTime = process.hrtime.bigint()
    done()
  })

  app.addHook('onSend', (request: any, reply, payload, done) => {
    const start = request.startTime as bigint | undefined
    if (start) {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000
      reply.header('x-response-time', `${durationMs.toFixed(2)}ms`)

      if (process.env.NODE_ENV === 'production' && durationMs > 200) {
        app.log.warn(
          { method: request.method, url: request.url, durationMs },
          'Slow request detected'
        )
      }
    }

    done(null, payload)
  })
}
