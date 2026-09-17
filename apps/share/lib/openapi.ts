import { PACK_CREDITS, PACK_PRICE_LABEL } from './pack';
import { SITE_DESCRIPTION } from './site';

const issue = {
  type: 'object',
  additionalProperties: false,
  required: ['path', 'code', 'message'],
  properties: {
    path: { type: 'string' },
    code: { type: 'string' },
    message: { type: 'string' },
    suggestion: { type: 'string' },
  },
} as const;

const fail = {
  type: 'object',
  required: ['ok', 'error'],
  properties: {
    ok: { const: false },
    error: { type: 'string' },
    pay: { type: 'boolean' },
    issues: { type: 'array', items: issue },
    packCredits: { type: 'integer' },
    packPriceLabel: { type: 'string' },
  },
} as const;

const minted = {
  type: 'object',
  required: ['ok', 'url', 'png', 'token'],
  properties: {
    ok: { const: true },
    url: { type: 'string', format: 'uri' },
    png: { type: 'string', format: 'uri' },
    token: { type: 'string' },
  },
} as const;

const bearer = {
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    description:
      'Optional wallet token. Same value as the vizzy_wallet cookie, optionally prefixed with vizzy_. After three free charts a day, compose and publish need this or the cookie.',
  },
} as const;

export function openApiSpec(origin: string) {
  return {
    openapi: '3.1.0',
    info: {
      title: 'vizzy',
      version: '1.0.0',
      summary: 'A chart you can paste.',
      description: `${SITE_DESCRIPTION} Emit ChartConfig v1. Do not invent D3. Three free charts a day, then ${PACK_PRICE_LABEL} for ${PACK_CREDITS}.`,
    },
    servers: [{ url: origin }],
    tags: [
      { name: 'compose', description: 'Prompt in, paste URL and PNG out.' },
      { name: 'publish', description: 'Rows plus ChartConfig in, paste URL and PNG out.' },
      { name: 'quota', description: 'What this wallet or IP can still generate today.' },
    ],
    security: [{ bearerAuth: [] }, {}],
    paths: {
      '/api/compose': {
        get: {
          tags: ['compose'],
          summary: 'Describe POST /api/compose',
          operationId: 'describeCompose',
          responses: {
            '200': {
              description: 'How to POST a prompt.',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
          },
        },
        post: {
          tags: ['compose'],
          summary: 'Generate a chart from a prompt',
          operationId: 'composeChart',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['prompt'],
                  properties: {
                    prompt: { type: 'string', examples: ['ARR by quarter, last two years'] },
                    seed: { type: 'object', description: 'Optional chart seed from a paste page.' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Minted paste URL and PNG. HTML clients are redirected.',
              content: { 'application/json': { schema: minted } },
            },
            '400': {
              description: 'Prompt or compiled config failed.',
              content: { 'application/json': { schema: fail } },
            },
            '402': {
              description: 'Free meter spent. Pay, then retry with the wallet cookie or Bearer token.',
              content: { 'application/json': { schema: fail } },
            },
          },
        },
      },
      '/api/publish': {
        get: {
          tags: ['publish'],
          summary: 'Describe POST /api/publish',
          operationId: 'describePublish',
          responses: {
            '200': {
              description: 'How to POST rows.',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
          },
        },
        post: {
          tags: ['publish'],
          summary: 'Mint a chart from rows',
          operationId: 'publishChart',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'data'],
                  properties: {
                    title: { type: 'string' },
                    data: {
                      type: 'array',
                      minItems: 1,
                      items: { type: 'object' },
                    },
                    config: { type: 'object', description: 'ChartConfig v1. Inferred from rows if omitted.' },
                    source: { type: 'object' },
                    kicker: { type: 'string' },
                    note: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Minted paste URL and PNG.',
              content: { 'application/json': { schema: minted } },
            },
            '400': {
              description: 'title, rows, or config failed. issues[] names the field.',
              content: { 'application/json': { schema: fail } },
            },
            '402': {
              description: 'Free meter spent. Same wallet as compose.',
              content: { 'application/json': { schema: fail } },
            },
          },
        },
      },
      '/api/quota': {
        get: {
          tags: ['quota'],
          summary: 'Peek remaining free charts and paid credits',
          operationId: 'getQuota',
          responses: {
            '200': {
              description: 'Current meter for this cookie, Bearer token, or IP.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      configured: { type: 'boolean' },
                      canCompose: { type: 'boolean' },
                      freeLeft: { type: 'integer' },
                      credits: { type: 'integer' },
                      unlimited: { type: 'boolean' },
                      pay: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: bearer,
      schemas: {
        ValidationIssue: issue,
        Fail: fail,
        Minted: minted,
      },
    },
  };
}
