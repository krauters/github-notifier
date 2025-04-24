/* eslint-disable @typescript-eslint/naming-convention */
import type { Block, BotsInfoResponse } from '@slack/web-api'
import type { Bot } from '@slack/web-api/dist/types/response/BotsInfoResponse.js'
import type { Member } from '@slack/web-api/dist/types/response/UsersListResponse.js'
import type { User } from '@slack/web-api/dist/types/response/UsersLookupByEmailResponse.js'

import { debug } from '@actions/core'
import { getBatches } from '@krauters/utils'
import { WebClient } from '@slack/web-api'

import { type GetUser, SlackAppUrl, type SlackConfig, type UserMapping } from './structures.js'
import { createUserMatchers, logFailedMatches, type MatchParams } from './user-matchers.js'

export class SlackClient {
	public bot?: Bot
	private channels: string[]
	private client: WebClient
	private userMappings: UserMapping[]
	private users: undefined | User[]

	/**
	 * Slack client for interacting with the Slack API.
	 *
	 * @param token Slack token.
	 * @param channels Slack channel IDs for posting messages in.
	 * @param userMappings User mappings for the Slack client.
	 */
	constructor({ channels, token, userMappings = [] }: SlackConfig) {
		this.client = new WebClient(token)
		this.channels = channels
		this.userMappings = userMappings
	}

	/**
	 * Ensure app name pattern.
	 *
	 * @param pattern The pattern to require the bot name to adhere to.
	 */
	async enforceAppNamePattern(pattern: RegExp): Promise<void> {
		const info = await this.getBotInfo()

		if (!info) {
			throw new Error('Failed to retrieve bot information')
		}
		const name = info?.bot?.name ?? ''
		if (!pattern.test(name)) {
			throw new Error(
				`Current app name [${name}] does not match the desired pattern [${pattern}]. Please update Slack app "Basic Information" > "Display Information" > "App name" to have the suffix "GitHub Notifier". Slack app url [${SlackAppUrl.Prefix}/${info?.bot?.app_id}/${SlackAppUrl.SuffixDisplayInfo}].`,
			)
		}

		this.bot = info.bot
	}

	/**
	 * Get all Slack users.
	 */
	async getAllusers(): Promise<Member[]> {
		this.users = []
		let cursor: string | undefined
		console.log('Getting all Slack users...')
		try {
			// Keep paginating until no more cursor is returned
			do {
				const result = await this.client.users.list({ cursor })
				if (result.members && Array.isArray(result.members)) {
					this.users = [...this.users, ...result.members]
				}
				cursor = result.response_metadata?.next_cursor
				debug(`Got [${result.members?.length}] users from Slack`)
			} while (cursor)

			console.log(`Got a total of [${this.users.length}] active users from Slack`)

			return this.users
		} catch (error) {
			console.error(`Failed to fetch users with error [${error}]`)

			return []
		}
	}

	/**
	 * Get Slack app information for current app.
	 */
	async getBotInfo(): Promise<BotsInfoResponse> {
		try {
			const authResponse = await this.client.auth.test({})
			const response = await this.client.bots.info({ bot: authResponse.bot_id })

			if (!response.ok) {
				throw new Error(response.error)
			}

			return response
		} catch (error) {
			throw new Error(`Failed fetching app info with error [${error}]`)
		}
	}

	/**
	 * Get a Slack user object based on matching email or username.
	 *
	 * @param email An email address that hopefully as matched to a Slack user account.
	 * @param username An email address that hopefully as matched to a Slack user account.
	 * @param [botId] The botId for the bot to find.
	 */
	async getUser({ email, userId, username }: GetUser): Promise<Member | undefined> {
		debug(`Getting Slack UserId for email [${email}], username [${username}], and userId [${userId}]...`)

		const users = this.users ?? (await this.getAllusers())
		const matchParams: MatchParams = { email, userId, userMappings: this.userMappings, username }
		const matchers = createUserMatchers(matchParams)

		// Find the first user that matches any of our criteria
		const matchedUser = users.find((slackUser) => {
			// Find a matching criteria for this Slack user, if any
			const matchedCriteria = matchers.find((criteria) => criteria.check(slackUser))

			// If we found a match, log it
			if (matchedCriteria) {
				matchedCriteria.log(slackUser)

				return true
			}

			return false
		})

		if (matchedUser) {
			debug(`User found with userId [${matchedUser.id}]`)

			return matchedUser
		}

		// No match found, log the failure
		logFailedMatches(matchParams, users.length)
	}

	/**
	 * Post a message with blocks to Slack channels.
	 *
	 * @param text The message to post.
	 * @param blocks Slack blocks to post.
	 * @param [channels=this.channels] Channels to post to.
	 */
	async postMessage(text: string, blocks: Block[], channels = this.channels): Promise<void> {
		for (const channel of channels) {
			let batchNumber = 0
			for (const batch of getBatches(blocks)) {
				console.log(`Posting batch [${batchNumber++}] to Slack channel [${channel}]...`)
				const payload = {
					blocks: batch.items,
					channel,
					icon_url:
						'https://github.com/krauters/github-notifier/blob/images/images/teddy-cat-square.png?raw=true',

					// icon_emoji: ':github_octocat:',
					text,
					unfurl_links: false,
					unfurl_media: false,
					username: 'GitHub Notifier',
				}
				debug(JSON.stringify(payload, null, 2))
				const response = await this.client.chat.postMessage(payload)
				debug(JSON.stringify(response, null, 2))
				console.log(
					`Posted batch [${batchNumber++}] to Slack channel [${channel}] with success [${response.ok}]`,
				)
			}
		}
	}
}
