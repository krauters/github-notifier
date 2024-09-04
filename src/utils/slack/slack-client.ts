import type { Block, BotsInfoResponse } from '@slack/web-api'
import type { Bot } from '@slack/web-api/dist/types/response/BotsInfoResponse.js'
import type { Member, Profile } from '@slack/web-api/dist/types/response/UsersListResponse.js'
import type { User } from '@slack/web-api/dist/types/response/UsersLookupByEmailResponse.js'

import { WebClient } from '@slack/web-api'

import { generateBatches } from '../misc.js'
import { type GetUser, SlackAppUrl, type SlackClientProps } from './structures.js'

export class SlackClient {
	private channels: string[]
	private client: WebClient
	private users: undefined | User[]
	public bot?: Bot

	/**
	 * Slack client for interacting with the Slack API.
	 * @param {string} token - Slack token.
	 * @param {string[]} channels - Slack channel IDs for posting messages in.
	 */
	constructor({ channels, token }: SlackClientProps) {
		this.client = new WebClient(token)
		this.channels = channels
	}

	/**
	 * Ensure app name pattern.
	 * @param {RegExp} pattern - The pattern to require the bot name to adhere to.
	 * @returns {Promise<void>}
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
	 * @returns {Promise<Member[]>}
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
	 * @returns {void}
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
	 * @param {string | undefined} email - An email address that hopefully as matched to a Slack user account.
	 * @param {string} username - An email address that hopefully as matched to a Slack user account.
	 * @param {string} [botId] - The botId for the bot to find.
	 * @returns {Promise<Member | undefined>}
	 */
	async getSlackUser({ email, userId, username }: GetUser): Promise<Member | undefined> {
		console.log(`Getting Slack UserId for email [${email}], username [${username}], and userId [${userId}]...`)

		const users = this.users ?? (await this.getAllusers())
		const user = users.find((user: Member) => {
			if (userId) {
				return user?.id === userId
			}

			const profile: Profile | undefined = user.profile

			return (
				(email && profile?.email === email) ||
				String(profile?.email).includes(username!) ||
				profile?.display_name === username ||
				profile?.real_name === username
			)
		})

		if (user) {
			console.log(`User found with userId [${user.id}]`)

			return user
		}

		console.log('User not found, returning undefined')
	}

	/**
	 * Post a message with blocks to Slack channels.
	 * @param {string} text - The message to post.
	 * @param {KnownBlocks[]} blocks - Slack blocks to post.
	 * @param {string[]} [channels=this.channels] - Channels to post to.
	 * @returns {Promise<void>}
	 */
	async postMessage(text: string, blocks: Block[], channels = this.channels): Promise<void> {
		for (const channel of channels) {
			let batchNumber = 0
			for (const batch of generateBatches(blocks)) {
				console.log(`Posting batch [${batchNumber++}] to Slack channel [${channel}]...`)
				const payload = {
					blocks: batch,
					channel,
					icon_emoji: ':github_octocat:',
					text,
					unfurl_links: false,
					unfurl_media: false,
					username: 'GitHub Notifier',
				}

				const response = await this.client.chat.postMessage(payload)
				console.log(
					`Posted batch [${batchNumber++}] to Slack channel [${channel}] with success [${response.ok}]`,
				)
			}
		}
	}
}
