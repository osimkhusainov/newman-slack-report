const prettyms = require('pretty-ms');
const axios = require('axios').default;
var jsonminify = require('jsonminify');

let messageSize;

// creates message for slack
function slackMessage(
  stats,
  timings,
  failures,
  maxMessageSize,
  collection,
  environment,
  channel,
  buildUrl
) {
  messageSize = maxMessageSize;
  let parsedFailures = parseFailures(failures);
  let failureMessage = `
    "attachments": [
        {
            "mrkdwn_in": ["text"],
            "color": "#FF0000",
            "author_name": "Automated API Testing",
            "title": ":fire: Failures :fire:",
            "fields": [
                ${failMessage(parsedFailures)}
            ]
        }
    ]`;
  let successMessage = `
    "attachments": [
        {
            "mrkdwn_in": ["text"],
            "color": "#008000",
            "author_name": "Automated API Testing",
            "title": ":white_check_mark: All Passed :white_check_mark:"
        }
    ]`;
  return jsonminify(`
    {
        "channel": "${channel}",
        "blocks": [
            {
                "type": "divider"
            },
            ${collectionAndEnvironentFileBlock(collection, environment)}
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*Test Summary*"
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": "Total Tests:"
                    },
                    {
                        "type": "mrkdwn",
                        "text": "${stats.requests.total}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": "Test Passed:"
                    },
                    {
                        "type": "mrkdwn",
                        "text": "${
                          stats.requests.total - parsedFailures.length
                        }"
                    },
                    {
                        "type": "mrkdwn",
                        "text": "Test Failed:"
                    },
                    {
                        "type": "mrkdwn",
                        "text": "${parsedFailures.length}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": "Test Assertions:"
                    },
                    {
                        "type": "mrkdwn",
                        "text": "Total: ${stats.assertions.total}  Failed: ${
    stats.assertions.failed
  }"
                    },
                    {
                        "type": "mrkdwn",
                        "text": "Test Duration:"
                    },
                    {
                        "type": "mrkdwn",
                        "text": "${prettyms(
                          timings.completed - timings.started
                        )}"
                    },
                ],
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "More Details: ${buildUrl}"
                }
            },
            {
                "type": "divider"
            },
        ],
        ${failures.length > 0 ? failureMessage : successMessage}
       }`);
}

function collectionAndEnvironentFileBlock(collection, environment) {
  if (collection) {
    return `{
            "type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "Collection: ${collection} \\n Environment: ${
      environment ? environment : ''
    }"
			}
        }, `;
  }
  return '';
}

// Takes fail report and parse it for further processing
function parseFailures(failures) {
  return failures.reduce((acc, failure, index) => {
    if (index === 0) {
      acc.push({
        name: failure.source.name || 'No Name',
        tests: [
          {
            name: failure.error.name || 'No test name',
            test: failure.error.test || 'connection error',
            message: failure.error.message || 'No Error Message',
          },
        ],
      });
    } else if (acc[acc.length - 1].name !== failure.source.name) {
      acc.push({
        name: failure.source.name || 'No Name',
        tests: [
          {
            name: failure.error.name || 'No test name',
            test: failure.error.test || 'connection error',
            message: failure.error.message || 'No Error Message',
          },
        ],
      });
    } else {
      acc[acc.length - 1].tests.push({
        name: failure.error.name || 'No test name',
        test: failure.error.test || 'connection error',
        message: failure.error.message || 'No Error Message',
      });
    }
    return acc;
  }, []);
}

// Takes parsedFailures and create failMessages
function failMessage(parsedFailures) {
  return parsedFailures.reduce((acc, failure) => {
    acc =
      acc +
      `
        {
            "title": "${failure.name}",
            "short": false
        },
        ${failErrors(!failure.tests ? '' : failure.tests)}`;
    return acc;
  }, '');
}

// Takes failMessages and create Error messages for each failures
function failErrors(parsedErrors) {
  return parsedErrors.reduce((acc, error, index) => {
    acc =
      acc +
      `
        {
            "value": "*\`${index + 1}. ${error.name} - ${error.test}\`*",
            "short": false
        },
        {
            "value": "• ${cleanErrorMessage(error.message, messageSize)}",
            "short": false,
        },`;
    return acc;
  }, '');
}

function cleanErrorMessage(message, maxMessageSize) {
  let filteredMessage = message.replace('expected', 'Expected -');
  if (filteredMessage.length > maxMessageSize) {
    return `${filteredMessage.substring(0, maxMessageSize)}...`;
  }
  return filteredMessage;
}

// sends the message to slack via POST to webhook url
async function send(url, message, token) {
  const payload = {
    method: 'POST',
    url,
    headers: {
      'content-type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    data: message,
  };
  let result;
  try {
    result = await axios(payload);
  } catch (e) {
    result = false;
    console.error(`Error in sending message to slack ${e}`);
  }
  return result;
}

exports.slackUtils = {
  send,
  slackMessage,
};
