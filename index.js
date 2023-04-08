const { slackUtils } = require('./slackUtils');

function SlackNewmanReporter(emitter, reporterOptions) {
  if (missingReporterOptions(reporterOptions)) {
    return;
  }
  const buildUrl = reporterOptions.buildurl || '';
  const webhookUrl = reporterOptions.webhookurl;
  const messageSize = reporterOptions.messageSize || 100;
  const collection = reporterOptions.collection || '';
  const environment = reporterOptions.environment || '';
  const token = reporterOptions.token || '';
  const channel = reporterOptions.channel || '';

  emitter.on('done', (error, summary) => {
    if (error) {
      console.error('error in done');
      return;
    }
    let run = summary.run;
    const str = webhookUrl.toString();
    if (str.indexOf('#') == -1) {
      slackUtils.send(
        webhookUrl,
        slackUtils.slackMessage(
          run.stats,
          run.timings,
          run.failures,
          messageSize,
          collection,
          environment,
          channel,
          buildUrl
        ),
        token
      );
    } else {
      const webhookUrls = webhookUrl.toString().split('#');
      for (let i = 0; i < webhookUrls.length; i++) {
        slackUtils.send(
          webhookUrls[i],
          slackUtils.slackMessage(
            run.stats,
            run.timings,
            run.failures,
            messageSize,
            collection,
            environment,
            channel,
            buildUrl
          ),
          token
        );
      }
    }
  });

  function missingReporterOptions(reporterOptions) {
    let missing = false;
    if (!reporterOptions.webhookurl) {
      console.error('Missing Slack Webhook Url');
      missing = true;
    }
    if (
      reporterOptions.webhookurl === 'https://slack.com/api/chat.postMessage'
    ) {
      if (!reporterOptions.token) {
        console.error('Missing Bearer Token');
        missing = true;
      }
      if (!reporterOptions.channel) {
        console.error('Missing channel');
        missing = true;
      }
    }
    return missing;
  }
}
module.exports = SlackNewmanReporter;
