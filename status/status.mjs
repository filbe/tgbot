import http from 'http';
import { shellExec } from './shellExec.mjs';

const Status = {
  GREEN: 'green',
  GREY: 'gray',
  YELLOW: 'yellow',
  RED: 'red',
};

const getTgbotStatus = async () => {
  let tgbotProcessStatus = {
    status: Status.GREY,
    message: 'Initializing',
  };
  try {
    const response = (await shellExec('supervisorctl status tgbot')).stdout;
    if (response && response.indexOf('RUNNING') !== -1) {
      tgbotProcessStatus = {
        status: Status.GREEN,
      };
    } else {
      tgbotProcessStatus = {
        status: Status.RED,
        message: response,
      };
    }
  } catch (e) {
    tgbotProcessStatus = {
      status: Status.YELLOW,
      message: JSON.stringify(e),
    };
  }
  return {
    identifier: 'tgbot',
    name: 'Telegram Bot',
    description: 'Telegram bot with OpenAI capabilities',
    ...tgbotProcessStatus,
  };
};

const getStatus = async () => {
  const tgbotStatus = await getTgbotStatus();

  const openAiCredentialsStatus = {
    identifier: 'openaicreds',
    name: 'OpenAI Credentials',
    description:
      'Have you configured your OpenAI credentials (env: OPENAI_API_KEY)?',
    status: !!process.env.OPENAI_API_KEY ? Status.GREEN : Status.GREY,
    message: !!process.env.OPENAI_API_KEY
      ? 'Yes!'
      : 'No, please go to Options -> Environment variables, and add OPENAI_API_KEY',
  };

  const status = {
    diploiStatusVersion: 1,
    items: [tgbotStatus, openAiCredentialsStatus],
  };

  return status;
};

const requestListener = async (req, res) => {
  res.writeHead(200);
  const status = await getStatus();
  res.end(JSON.stringify(status));
};

const server = http.createServer(requestListener);
server.listen(3000);

const podReadinessLoop = async (lastStatusIsOK) => {
  const status = await getStatus();
  let allOK = !status.items.find((s) => s.status !== Status.GREEN);
  if (allOK) {
    if (!lastStatusIsOK) {
      console.log(
        new Date(),
        '<STATUS> Status is OK, logging is off until next error (checks every 30s)'
      );
    }
    await shellExec('touch /tmp/pod-ready');
  } else {
    console.log(new Date(), '<STATUS> Status not OK', status);
    setTimeout(() => {
      podReadinessLoop(allOK);
    }, 1000 + (allOK ? 1 : 0) * 30000);
  }
};
(async () => {
  podReadinessLoop(false);
})();
