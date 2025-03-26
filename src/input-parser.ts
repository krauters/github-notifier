import { debug, getBooleanInput, getInput } from '@actions/core'
import { stringToArray } from '@krauters/utils'

import type { InputProps } from './structures.js'

/**
 * Parses and validates all inputs required for the GitHub Notifier.
 *
 * @returns The parsed and validated inputs for the GitHub Notifier.
 */
export function parseInputs(): InputProps {
	debug('Parsing inputs...')
	const githubTokens = stringToArray(getInput('github-tokens', { required: true }))
	const channels = stringToArray(getInput('channels', { required: true }))
	const slackToken = getInput('slack-token', { required: true })
	const withTestData = getBooleanInput('with-test-data')
	const withArchived = getBooleanInput('with-archived')
	const withPublic = getBooleanInput('with-public')
	const withDrafts = getBooleanInput('with-drafts')
	const withPullReport = false
	const withUserMentions = getBooleanInput('with-user-mentions')
	const repositoryFilter = stringToArray(getInput('repository-filter'))

	// https://github.com/actions/github-script/issues/436
	const baseUrl = getInput('base-url') || process.env.GITHUB_API_URL

	return {
		githubConfig: {
			options: {
				baseUrl,
			},
			tokens: githubTokens,
		},
		repositoryFilter,
		slackConfig: {
			channels,
			token: slackToken,
		},
		withArchived,
		withDrafts,
		withPublic,
		withPullReport,
		withTestData,
		withUserMentions,
	}
}
