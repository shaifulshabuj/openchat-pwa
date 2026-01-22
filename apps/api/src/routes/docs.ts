import { FastifyInstance } from 'fastify'

const apiDocumentation = {
  openapi: '3.0.0',
  info: {
    title: 'OpenChat API',
    version: '1.0.0',
    description: 'API for OpenChat PWA - A modern messaging application',
    contact: {
      name: 'OpenChat Team',
      url: 'https://github.com/shaifulshabuj/openchat-pwa'
    },
    license: {
      name: 'Apache 2.0',
      url: 'https://www.apache.org/licenses/LICENSE-2.0.html'
    }
  },
  servers: [
    {
      url: process.env.NODE_ENV === 'production' 
        ? 'https://openchat-api.railway.app' 
        : 'http://localhost:8001',
      description: process.env.NODE_ENV === 'production' 
        ? 'Production server' 
        : 'Development server'
    }
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health Check',
        description: 'Check if the API is running',
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                    version: { type: 'string', example: '1.0.0' },
                    environment: { type: 'string', example: 'development' },
                    uptime: { type: 'number', example: 123.45 }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/register': {
      post: {
        summary: 'Register new user',
        description: 'Create a new user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'username', 'displayName', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'user@example.com' },
                  username: { type: 'string', minLength: 3, maxLength: 20, example: 'username123' },
                  displayName: { type: 'string', minLength: 1, maxLength: 50, example: 'John Doe' },
                  password: { type: 'string', minLength: 8, example: 'SecurePassword123!' }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        user: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', example: 'cm123...' },
                            email: { type: 'string', example: 'user@example.com' },
                            username: { type: 'string', example: 'username123' },
                            displayName: { type: 'string', example: 'John Doe' },
                            avatar: { type: 'string', nullable: true },
                            status: { type: 'string', enum: ['ONLINE', 'OFFLINE', 'AWAY', 'BUSY'] }
                          }
                        },
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI...' }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Validation error or user already exists',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string', example: 'Email already exists' }
                  }
                }
              }
            }
          },
          '429': {
            description: 'Rate limit exceeded',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string', example: 'Too many authentication attempts, please try again later.' },
                    retryAfter: { type: 'number', example: 300 }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/login': {
      post: {
        summary: 'Login user',
        description: 'Authenticate user and return JWT token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'user@example.com' },
                  password: { type: 'string', example: 'SecurePassword123!' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        user: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            email: { type: 'string' },
                            username: { type: 'string' },
                            displayName: { type: 'string' },
                            avatar: { type: 'string', nullable: true },
                            status: { type: 'string', enum: ['ONLINE', 'OFFLINE', 'AWAY', 'BUSY'] }
                          }
                        },
                        token: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string', example: 'Invalid credentials' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/chats': {
      get: {
        summary: 'Get user chats',
        description: 'Retrieve all chats for the authenticated user',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Chats retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          type: { type: 'string', enum: ['DIRECT', 'GROUP', 'CHANNEL'] },
                          name: { type: 'string', nullable: true },
                          avatar: { type: 'string', nullable: true },
                          description: { type: 'string', nullable: true },
                          lastMessage: {
                            type: 'object',
                            nullable: true,
                            properties: {
                              id: { type: 'string' },
                              content: { type: 'string' },
                              createdAt: { type: 'string', format: 'date-time' },
                              sender: {
                                type: 'object',
                                properties: {
                                  id: { type: 'string' },
                                  displayName: { type: 'string' }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create new chat',
        description: 'Create a new direct or group chat',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type'],
                properties: {
                  type: { type: 'string', enum: ['DIRECT', 'GROUP'], example: 'DIRECT' },
                  participantIds: { 
                    type: 'array', 
                    items: { type: 'string' },
                    example: ['cm123...'] 
                  },
                  name: { type: 'string', example: 'My Group Chat' },
                  description: { type: 'string', example: 'Chat description' }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Chat created successfully'
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' }
        }
      }
    }
  }
}

export default async function apiDocsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/docs', async (request, reply) => {
    return reply.type('application/json').send(apiDocumentation)
  })

  fastify.get('/api/docs/ui', async (request, reply) => {
    const swaggerUI = `
<!DOCTYPE html>
<html>
<head>
    <title>OpenChat API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui.css" />
    <style>
        body { margin: 0; background: #fafafa; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui-bundle.js"></script>
    <script>
        SwaggerUIBundle({
            url: '/api/docs',
            dom_id: '#swagger-ui',
            presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.presets.standalone],
            layout: "StandaloneLayout"
        });
    </script>
</body>
</html>`

    return reply.type('text/html').send(swaggerUI)
  })
}