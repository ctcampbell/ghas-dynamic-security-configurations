import { app } from "@azure/functions";
import * as process from "process";
import { createProbot, createAzureFunctionV4 } from "@probot/adapter-azure-functions";
import { pino } from 'pino';

import probotapp from "./app";

const transport = pino.transport({
  targets: [
    {
      level: 'info',
      target: '@0dep/pino-applicationinsights',
      options: {
        connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
        colorize: false,
        config: {
          disableStatsbeat: true,
          enableAutoCollectExternalLoggers: true,
          enableAutoCollectConsole: true
        },
      },
    },
    {
      level: 'info',
      target: 'pino-pretty',
      options: {
        colorize: false,
        ignore: 'pid,hostname',
        translateTime: "yyyy-mm-dd'T'HH:MM:ss.l",
      },
    },
  ],
});

const probotApp = createProbot();
probotApp.log = pino({ level: 'info' }, transport);

app.http('azureprobot', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: createAzureFunctionV4(probotapp, {
    probot: probotApp,
  })
});

probotApp.log.info("Probot app initialized with Azure Functions adapter");
