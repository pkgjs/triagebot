'use strict'
const path = require('path')
const { inspect } = require('util')
const core = require('@actions/core')
const github = require('@actions/github')

;(async function () {
  try {
    const client = new github.GitHub(process.env.GITHUB_TOKEN);
    const configPath = path.resolve(process.env.GITHUB_WORKSPACE, core.getInput('config', { required: true }))
    const config = require(configPath)
    console.log(inspect(github.context, false, null), config)

    switch (github.context.eventName) {
      case 'push':
        await onPush()
        break
      case 'issues':
        await onIssue(client, github.context, config)
        break
      case 'issue_comment':
        await onIssueComment(client, github.context, config)
        break
      case 'pull_request':
        break
      default:
        console.log(github.context)
    }
  } catch (err) {
    console.log(err)
    core.error(err)
    core.setFailed(err.message)
  }
})()

async function onPush () {

}

async function onIssue (client, context, config) {
  const labels = []
  const number = github.context.payload.issue && github.context.payload.issue.number

  switch (context.payload.action) {
    case 'opened':
    case 'edited':
      // If this is not opened by a member, add needs triage label
      if (context.payload.issue.author_association !== 'MEMBER') {
        labels.push(config.needsTriageLabel)
      }

      // If the title looks like it has a component in it, add component lable
      if (config.componentLabels) {
        const component = /^\((.*)\)/.exec(context.payload.issue.title)
        if (component && component[1] && config.componentLabels[component[1]]) {
          labels.push(config.componentLabels[component[1]])
        }
      }

      break;
  }

  // Add lables
  if (labels.length) {
    await addLabels(client, number, labels)
  }
}

async function onIssueComment (client, context, config) {
  switch (context.payload.action) {
    case 'created':
    case 'edited':
      break;
  }
}

async function addLabels (client, number, labels) {
  await client.issues.addLabels({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: number,
    labels: labels
  });
}
