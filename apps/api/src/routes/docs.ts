import { FastifyInstance } from 'fastify'
import { readFile } from 'fs/promises'
import path from 'path'
import swaggerUi from 'swagger-ui-express'

let cachedSpec: Record<string, unknown> | null = null

const loadOpenApiSpec = async () => {
  if (cachedSpec) {
    return cachedSpec
  }

  const specPath = path.join(__dirname, '../../src/docs/openapi.json')
  const rawSpec = await readFile(specPath, 'utf8')
  cachedSpec = JSON.parse(rawSpec) as Record<string, unknown>
  return cachedSpec
}

export default async function apiDocsRoutes(fastify: FastifyInstance) {
  fastify.get('/docs', async (request, reply) => {
    const spec = await loadOpenApiSpec()
    return reply.type('application/json').send(spec)
  })

  fastify.get('/docs/ui', async (request, reply) => {
    const spec = await loadOpenApiSpec()
    const html = swaggerUi.generateHTML(spec, {
      customSiteTitle: 'OpenChat API Docs'
    })

    return reply.type('text/html').send(html)
  })
}
