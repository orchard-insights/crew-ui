#!/usr/bin/env node
const { program } = require('commander')
const server = require('node-http-server')
const open = require('open')
const { build } = require('vite')

program
  .version('0.0.1')

program.command('serve')
  .description('Run crew UI')
  .option('-p, --port <port>', 'Which port to attach to [3001]', '3001')
  .option('--no-browser', 'Do not launch browser')
  .option('-u, --url <url>', 'Which url should the UI use to access the API [http://localhost:3000/]')
  .action((options) => {
    process.env.VITE_CREW_API_BASE_URL = options.url || 'http://localhost:3000/'
    process.env.VITE_CREW_API_WS_URL = options.url || 'http://localhost:3000/'
    const port = parseInt(options.port)

    // We have to build the UI with vite so that env vars get injected into the code...

    console.log('Building UI...')
    build().then(() => {

      console.log('Starting server...')

      server.deploy(
        {
          port,
          root:'./dist/'
        },
        (server) => {
          const url = `http://localhost:${port}/`
          console.log(`UI running at ${url}`)
          if (options.browser) {
            open(url)
          }
        }
      )

    })

  })

program.parse(process.argv)
