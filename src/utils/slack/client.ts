/* eslint-disable @typescript-eslint/naming-convention */
import type { Block, BotsInfoResponse } from '@slack/web-api'
import type { Bot } from '@slack/web-api/dist/types/response/BotsInfoResponse.js'
import type { Member } from '@slack/web-api/dist/types/response/UsersListResponse.js'
import type { User } from '@slack/web-api/dist/types/response/UsersLookupByEmailResponse.js'

import { getBatches } from '@krauters/utils'
import { WebClient } from '@slack/web-api'

import { type GetUser, SlackAppUrl, type SlackConfig } from './structures.js'

export class SlackClient {
	public bot?: Bot
	private channels: string[]
	private client: WebClient
	private users: undefined | User[]

	/**
	 * Slack client for interacting with the Slack API.
	 *
	 * @param token Slack token.
	 * @param channels Slack channel IDs for posting messages in.
	 */
	constructor({ channels, token }: SlackConfig) {
		this.client = new WebClient(token)
		this.channels = channels
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
				console.log(`Got [${result.members?.length}] users from Slack`)
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
		console.log(`Getting Slack UserId for email [${email}], username [${username}], and userId [${userId}]...`)

		const users = this.users ?? (await this.getAllusers())

		// Define matching functions for better readability and extensibility
		const matchById = (user: Member) => userId && user.id === userId
		const matchByEmail = (user: Member) => email && user.profile?.email === email
		const matchByEmailContainsUsername = (user: Member) =>
			username && String(user.profile?.email ?? '').includes(username)
		const matchByDisplayName = (user: Member) => username && user.profile?.display_name === username
		const matchByRealName = (user: Member) => username && user.profile?.real_name === username

		const user = users.find((user: Member) => {
			const idMatch = matchById(user)
			const emailMatch = matchByEmail(user)
			const emailContainsUsernameMatch = matchByEmailContainsUsername(user)
			const displayNameMatch = matchByDisplayName(user)
			const realNameMatch = matchByRealName(user)

			// Log the first match attempt that succeeds for debugging
			if (idMatch && userId) console.log(`Match found by userId [${userId}] with Slack userId [${user.id}]`)
			else if (emailMatch && email)
				console.log(`Match found by email [${email}] with Slack email [${user.profile?.email}]`)
			else if (emailContainsUsernameMatch && username)
				console.log(`Match found by username [${username}] contained in Slack email [${user.profile?.email}]`)
			else if (displayNameMatch && username)
				console.log(
					`Match found by username [${username}] matching Slack display_name [${user.profile?.display_name}]`,
				)
			else if (realNameMatch && username)
				console.log(
					`Match found by username [${username}] matching Slack real_name [${user.profile?.real_name}]`,
				)

			// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
			return idMatch || emailMatch || emailContainsUsernameMatch || displayNameMatch || realNameMatch
		})

		if (user) {
			console.log(`User found with userId [${user.id}]`)

			return user
		}

		console.log(`No user match found after checking against [${users.length}] users`)
		if (userId) console.log(`Tried to match userId [${userId}] against Slack user.id fields`)
		if (email) console.log(`Tried to match email [${email}] against Slack user.profile.email fields`)
		if (username)
			console.log(
				`Tried to match username [${username}] against Slack user.profile.email (contains), display_name and real_name fields`,
			)

		console.log(`Since no Slack user match found, unable to @mention user or use their profile image`)
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
				console.dir(payload, { depth: null })
				const response = await this.client.chat.postMessage(payload)
				console.dir(response, { depth: null })
				console.log(
					`Posted batch [${batchNumber++}] to Slack channel [${channel}] with success [${response.ok}]`,
				)
			}
		}
	}
}
