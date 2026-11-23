import { spawn } from 'node:child_process'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

const WEBHOOK_URL =
  'https://n8n-itmo.cyrweb.ru/webhook/bugradar-triage'

function n8nCurlProxy(): Plugin {
  return {
    name: 'n8n-curl-proxy',

    configureServer(server) {
      server.middlewares.use('/api/triage', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ message: 'Method not allowed' }))
          return
        }

        let body = ''

        req.setEncoding('utf8')

        req.on('data', (chunk) => {
          body += chunk
        })

        req.on('end', () => {
          const curl = spawn('curl', [
            '-4',
            '--http1.1',
            '--silent',
            '--show-error',
            '--connect-timeout',
            '20',
            '--retry',
            '5',
            '--retry-all-errors',
            '--retry-delay',
            '2',
            '--retry-max-time',
            '180',
            '--max-time',
            '180',
            '-X',
            'POST',
            WEBHOOK_URL,
            '-H',
            `Content-Type: ${
              req.headers['content-type'] ??
              'application/x-www-form-urlencoded'
            }`,
            '--data-raw',
            body,
          ])

          let output = ''
          let errorOutput = ''
          let completed = false

          curl.stdout.setEncoding('utf8')
          curl.stderr.setEncoding('utf8')

          curl.stdout.on('data', (chunk) => {
            output += chunk
          })

          curl.stderr.on('data', (chunk) => {
            errorOutput += chunk
          })

          curl.on('error', (error) => {
            if (completed) return
            completed = true

            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                message: `Не удалось запустить запрос: ${error.message}`,
              }),
            )
          })

          curl.on('close', (code) => {
            if (completed) return
            completed = true

            res.setHeader('Content-Type', 'application/json')

            if (code !== 0) {
              res.statusCode = 502
              res.end(
                JSON.stringify({
                  message:
                    errorOutput.trim() ||
                    'Не удалось связаться с n8n',
                }),
              )
              return
            }

            res.statusCode = 200
            res.end(output)
          })

          curl.stdin.end()
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), n8nCurlProxy()],

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    env: {
      VITE_N8N_WEBHOOK_URL:
        'http://localhost/webhook/bugradar-triage',
    },
  },
})