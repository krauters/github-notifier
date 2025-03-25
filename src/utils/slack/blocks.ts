/* eslint-disable @typescript-eslint/naming-convention */
import type { KnownBlock, PlainTextElement, RichTextElement } from '@slack/web-api'

import { formatStringList, plural } from '@krauters/utils'

import type { Pull } from '../github/structures.js'
import type { SlackClient } from './slack-client.js'

import { prBaseUrl, scmUrl } from '../../defaults.js'
import { getAgeBasedEmoji, haveOrHas } from '../misc.js'

/**
 * Get a context block with markdown text.
 *
 * @param text The footer text/markdown.
 * @param [withIndentation=false] Include leading white space.
 */
export function getContextMarkdownBlock(text: string, withIndentation = false): KnownBlock[] {
	const elements: PlainTextElement[] = []
	if (withIndentation) {
		elements.push({
			text: ' ',
			type: 'plain_text',
		})
	}

	return [
		{
			elements: [
				...elements,
				{
					text,
					type: 'mrkdwn',
				},
			],
			type: 'context',
		},
	]
}

/**
 * Get emoji blocks.
 *
 * @param name The name of the emoji.
 * @param type The type of section.
 */
export function getEmojiBlocks(name?: string, type = 'rich_text_section'): (PlainTextElement | RichTextElement)[] {
	if (!name) {
		return []
	}

	if (type === 'rich_text_section') {
		return [
			{
				name,
				type: 'emoji',
			},
			{
				text: ' ',
				type: 'text',
			},
		]
	}

	if (type === 'context') {
		return [
			{
				emoji: true,
				text: `:${name}:`,
				type: 'plain_text',
			},
		]
	}

	return []
}

/**
 * Get the first Slack block which includes a header and buttons.
 *
 * @param org The GitHub org.
 * @param header The header text.
 * @param [text] The sub-header text.
 */
export function getFirstBlocks(org: string, header: string, text?: string): KnownBlock[] {
	return [
		{
			text: {
				emoji: true,
				text: header,
				type: 'plain_text',
			},
			type: 'header',
		},
		...(text ? getContextMarkdownBlock(text) : []),
		{
			elements: [
				{
					text: {
						emoji: true,
						text: `${org.toUpperCase()} Org`,
						type: 'plain_text',
					},
					type: 'button',
					url: `${scmUrl}/${org}`,
				},
				{
					text: {
						emoji: true,
						text: `${org.toUpperCase()} PRs`,
						type: 'plain_text',
					},
					type: 'button',
					url: `${prBaseUrl}${org}`,
				},
			],
			type: 'actions',
		},
	]
}

/**
 * Get the last Slack block which includes footer markdown.
 *
 * @param text The footer text/markdown.
 */
export function getLastBlocks(text: string): KnownBlock[] {
	return getContextMarkdownBlock(text)
}

/**
 * Get a pull block.
 *
 * @param pull Pull data.
 * @param slack Slack client.
 * @param withUserMentions Whether or not to mention Slack users.
 */

export async function getPullBlocks(pull: Pull, slack: SlackClient, withUserMentions: boolean): Promise<KnownBlock[]> {
	const {
		age,
		ageInHours,
		commits,
		draft,
		filesAndChanges,
		number,
		repo,
		repoUrl,
		requestedReviewers,
		reviewReport,
		title,
		url,
	} = pull
	let ageBasedEmoji = getAgeBasedEmoji(ageInHours)
	let approvedEmojiBlocks: (PlainTextElement | RichTextElement)[] = []
	let draftEmojiBlocks: (PlainTextElement | RichTextElement)[] = []

	if (draft) {
		draftEmojiBlocks = getEmojiBlocks('footprints')
	}

	const { approvals, approvalsRemaining, requiredReviewers, reviews } = reviewReport

	// Let's not give a green checkmark unless there is at least 1 approval
	if (approvalsRemaining === 0 && approvals && approvals > 0) {
		approvedEmojiBlocks = getEmojiBlocks('white_check_mark')
		ageBasedEmoji = ''
	}

	const context = [
		`<${repoUrl}|${repo}>`,
		`created ${age}${ageBasedEmoji}`,
		commits && `${commits} ${plural('commit', commits)}`,
		filesAndChanges && `${filesAndChanges.files} ${plural('file', filesAndChanges.files)}`,
		filesAndChanges && `${filesAndChanges.changes} ${plural('change', filesAndChanges.changes)}`,
		requiredReviewers && `${requiredReviewers} required ${plural('reviewer', requiredReviewers)}`,
	].filter((item) => !!item)

	const contextBlocks: KnownBlock[] = []
	for (const review of Object.values(reviews ?? [])) {
		const { context, email, login: username, relativeHumanReadableAge } = review
		const slackUser = await slack.getSlackUser({
			email,
			username,
		})

		// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
		const displayName = slackUser?.profile?.display_name || slackUser?.profile?.real_name_normalized || username
		const imageUrl = slackUser?.profile?.image_72

		contextBlocks.push({
			elements: [
				{
					text: ' ',
					type: 'plain_text',
				},
				{
					alt_text: 'Reviewer Slack avatar',
					image_url: String(imageUrl),
					type: 'image',
				},
				{
					text: `*${displayName}* ${context} _${relativeHumanReadableAge}_.`,
					type: 'mrkdwn',
				},
			],
			type: 'context',
		})
	}

	if (requestedReviewers.length) {
		const slackUserIdsOrLogins: string[] = []
		for (const username of requestedReviewers) {
			const slackUser = await slack.getSlackUser({ username })
			// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
			slackUserIdsOrLogins.push((withUserMentions && slackUser?.id && `<@${slackUser.id}>`) || username)
		}
		contextBlocks.unshift(
			...getContextMarkdownBlock(
				formatStringList(slackUserIdsOrLogins) +
					` ${haveOrHas(slackUserIdsOrLogins.length)} been requested to review.`,
				true,
			),
		)
	}

	return [
		{
			elements: [
				{
					elements: [
						...(approvedEmojiBlocks as RichTextElement[]),
						...(draftEmojiBlocks as RichTextElement[]),
						{
							style: {
								bold: true,
							},
							text: `#${number} ${title}`,
							type: 'link',
							url,
						},
					],
					type: 'rich_text_section',
				},
			],
			type: 'rich_text',
		},
		{
			elements: [
				{
					text: context.join('﹒'),
					type: 'mrkdwn',
				},
			],
			type: 'context',
		},
		...contextBlocks,
		{
			type: 'divider',
		},
	]
}
