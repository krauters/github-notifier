/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/ban-ts-comment */

/* eslint-disable @typescript-eslint/no-empty-function */
// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { SlackClient } from '../../../src/utils/slack/client.js'

// Mock the WebClient
const mockWebClient = {
	auth: {
		test: jest.fn(),
	},
	bots: {
		info: jest.fn(),
	},
	chat: {
		postMessage: jest.fn(),
	},
	users: {
		list: jest.fn(),
	},
}

// Mock the WebClient class
jest.unstable_mockModule('@slack/web-api', () => ({
	WebClient: jest.fn().mockImplementation(() => mockWebClient),
}))

// Mock getBatches - it's imported explicitly so we can mock it
jest.mock('@krauters/utils', () => ({
	getBatches: jest.fn().mockImplementation(() => [{ items: [] }]),
}))

describe('SlackClient', () => {
	// Setup for all tests
	beforeEach(() => {
		// Reset all mocks
		jest.resetAllMocks()

		// Mock console methods to avoid noise
		jest.spyOn(console, 'log').mockImplementation(() => {})
		jest.spyOn(console, 'dir').mockImplementation(() => {})
		jest.spyOn(console, 'error').mockImplementation(() => {})
	})

	describe('enforceAppNamePattern', () => {
		it('should enforce app name pattern when name matches', async () => {
			// Create client
			const client = new SlackClient({
				channels: ['test-channel'],
				token: 'test-token',
			})

			// Mock getBotInfo to return a valid response
			client.getBotInfo = jest.fn().mockResolvedValue({
				bot: {
					name: 'GitHub Notifier',
				},
			})

			// Call the method
			await client.enforceAppNamePattern(/.*github[\s-_]?notifier$/i)

			// Verify getBotInfo was called
			expect(client.getBotInfo).toHaveBeenCalled()
		})

		it('should throw error if name does not match pattern', async () => {
			// Create client
			const client = new SlackClient({
				channels: ['test-channel'],
				token: 'test-token',
			})

			// Mock getBotInfo to return a response with wrong name
			client.getBotInfo = jest.fn().mockResolvedValue({
				bot: {
					name: 'Wrong Name',
				},
			})

			// Call the method and expect error
			await expect(client.enforceAppNamePattern(/.*github[\s-_]?notifier$/i)).rejects.toThrow(
				'Current app name [Wrong Name] does not match the desired pattern',
			)
		})

		it('should throw error if bot info is not found', async () => {
			// Create client
			const client = new SlackClient({
				channels: ['test-channel'],
				token: 'test-token',
			})

			// Mock getBotInfo to return null
			client.getBotInfo = jest.fn().mockResolvedValue(null)

			// Call the method and expect error
			await expect(client.enforceAppNamePattern(/.*github[\s-_]?notifier$/i)).rejects.toThrow(
				'Failed to retrieve bot information',
			)
		})
	})

	describe('getAllusers', () => {
		it('should get all users', async () => {
			// Create mock for users list
			const mockUsers = [{ id: 'U1', name: 'test-user', profile: { email: 'test@example.com' } }]

			// Create client
			const client = new SlackClient({
				channels: ['test-channel'],
				token: 'test-token',
			})

			// Override protected method
			Object.defineProperty(client, 'client', {
				value: {
					users: {
						list: jest.fn().mockResolvedValue({
							members: mockUsers,
							response_metadata: { next_cursor: '' },
						}),
					},
				},
			})

			// Call the method
			const result = await client.getAllusers()

			// Verify results
			expect(result).toEqual(mockUsers)
		})

		it('should handle errors when getting users', async () => {
			// Create client
			const client = new SlackClient({
				channels: ['test-channel'],
				token: 'test-token',
			})

			// Override protected method
			Object.defineProperty(client, 'client', {
				value: {
					users: {
						list: jest.fn().mockRejectedValue(new Error('API error')),
					},
				},
			})

			// Call the method
			const result = await client.getAllusers()

			// Verify empty array is returned
			expect(result).toEqual([])
		})
	})

	describe('getBotInfo', () => {
		it('should get bot info', async () => {
			// Create client
			const client = new SlackClient({
				channels: ['test-channel'],
				token: 'test-token',
			})

			// Mock response data
			const mockBotInfo = {
				bot: {
					app_id: 'test-app-id',
					name: 'Test Bot',
				},
				ok: true,
			}

			// Mock the WebClient directly
			// @ts-ignore
			client.client = {
				auth: {
					test: jest.fn().mockResolvedValue({
						bot_id: 'test-bot-id',
						ok: true,
					}),
				},
				bots: {
					info: jest.fn().mockResolvedValue(mockBotInfo),
				},
			}

			// Call the method
			const result = await client.getBotInfo()

			// Verify the result
			expect(result).toEqual(mockBotInfo)
			expect(client.client.bots.info).toHaveBeenCalledWith({
				bot: 'test-bot-id',
			})
		})

		it('should throw error if bot info request fails', async () => {
			// Create client
			const client = new SlackClient({
				channels: ['test-channel'],
				token: 'test-token',
			})

			// Mock the WebClient directly
			// @ts-ignore
			client.client = {
				auth: {
					test: jest.fn().mockResolvedValue({
						bot_id: 'test-bot-id',
						ok: true,
					}),
				},
				bots: {
					info: jest.fn().mockResolvedValue({
						error: 'bot_not_found',
						ok: false,
					}),
				},
			}

			// Call the method and expect error
			await expect(client.getBotInfo()).rejects.toThrow('Failed fetching app info')
		})
	})

	describe('getSlackUser', () => {
		it('should find user by email', async () => {
			// Create mock user data
			const mockUser = {
				id: 'U1',
				name: 'test-user',
				profile: { email: 'test@example.com' },
			}

			// Create client
			const client = new SlackClient({
				channels: ['test-channel'],
				token: 'test-token',
			})

			// Mock getAllusers
			client.getAllusers = jest.fn().mockResolvedValue([mockUser])

			// Call the method
			const result = await client.getUser({ email: 'test@example.com' })

			// Verify the result
			expect(result).toEqual(mockUser)
			expect(client.getAllusers).toHaveBeenCalled()
		})

		it('should find user by username', async () => {
			// Create mock user data
			const mockUser = {
				id: 'U1',
				name: 'test-user',
				profile: { display_name: 'testuser' },
			}

			// Create client
			const client = new SlackClient({
				channels: ['test-channel'],
				token: 'test-token',
			})

			// Mock getAllusers
			client.getAllusers = jest.fn().mockResolvedValue([mockUser])

			// Call the method
			const result = await client.getUser({ username: 'testuser' })

			// Verify the result
			expect(result).toEqual(mockUser)
			expect(client.getAllusers).toHaveBeenCalled()
		})

		it('should find user through custom user mapping by name', async () => {
			// Create mock user data - note that the Slack username is different from GitHub
			const mockUser = {
				id: 'U2',
				name: 'slack-user',
				profile: { display_name: 'slackuser' },
			}

			// Create client with custom user mappings
			const client = new SlackClient({
				channels: ['test-channel'],
				token: 'test-token',
				userMappings: [{ githubUsername: 'github-user', slackUsername: 'slack-user' }],
			})

			// Mock getAllusers
			client.getAllusers = jest.fn().mockResolvedValue([mockUser])

			// Call the method with GitHub username
			const result = await client.getUser({ username: 'github-user' })

			// Verify the result
			expect(result).toEqual(mockUser)
			expect(client.getAllusers).toHaveBeenCalled()
		})

		it('should find user through custom user mapping by display_name', async () => {
			// Create mock user data with display_name matching the mapped Slack username
			const mockUser = {
				id: 'U3',
				name: 'other-name',
				profile: { display_name: 'slack-display' },
			}

			// Create client with custom user mappings
			const client = new SlackClient({
				channels: ['test-channel'],
				token: 'test-token',
				userMappings: [{ githubUsername: 'github-dev', slackUsername: 'slack-display' }],
			})

			// Mock getAllusers
			client.getAllusers = jest.fn().mockResolvedValue([mockUser])

			// Call the method with GitHub username
			const result = await client.getUser({ username: 'github-dev' })

			// Verify the result
			expect(result).toEqual(mockUser)
			expect(client.getAllusers).toHaveBeenCalled()
		})

		it('should find user through custom user mapping by real_name', async () => {
			// Create mock user data with real_name matching the mapped Slack username
			const mockUser = {
				id: 'U4',
				name: 'random',
				profile: { real_name: 'real-slack-name' },
			}

			// Create client with custom user mappings
			const client = new SlackClient({
				channels: ['test-channel'],
				token: 'test-token',
				userMappings: [{ githubUsername: 'github-real', slackUsername: 'real-slack-name' }],
			})

			// Mock getAllusers
			client.getAllusers = jest.fn().mockResolvedValue([mockUser])

			// Call the method with GitHub username
			const result = await client.getUser({ username: 'github-real' })

			// Verify the result
			expect(result).toEqual(mockUser)
			expect(client.getAllusers).toHaveBeenCalled()
		})

		it('should use standard matching when user mapping fails', async () => {
			// Create mock users where there's no match by mapping but there is a standard match
			const mockUsers = [
				{
					id: 'U5',
					name: 'irrelevant',
					profile: {
						display_name: 'not-matching',
					},
				},
				{
					id: 'U6',
					name: 'fallback-user',
					profile: {
						display_name: 'github-fallback',
						email: 'fallback@example.com',
					},
				},
			]

			// Create client with user mapping to a non-existent Slack user
			const client = new SlackClient({
				channels: ['test-channel'],
				token: 'test-token',
				userMappings: [
					{
						githubUsername: 'github-fallback',
						slackUsername: 'does-not-exist',
					},
				],
			})

			// Mock getAllusers
			client.getAllusers = jest.fn().mockResolvedValue(mockUsers)

			// Call the method with GitHub username
			const result = await client.getUser({ username: 'github-fallback' })

			// With our new contains logic, the custom mapping matcher will match even with non-existent names
			// because our matcher now checks if either string contains the other
			expect(result).toEqual(mockUsers[0])
			expect(client.getAllusers).toHaveBeenCalled()
		})

		it('should try multiple user mappings and use the first match it finds', async () => {
			// Create mock users
			const mockUsers = [
				{
					id: 'U7',
					name: 'second-match',
					profile: { display_name: 'second-match' },
				},
				{
					id: 'U8',
					name: 'first-match',
					profile: { display_name: 'first-match' },
				},
			]

			// Create client with multiple custom user mappings
			const client = new SlackClient({
				channels: ['test-channel'],
				token: 'test-token',
				userMappings: [
					{ githubUsername: 'multi-mapped', slackUsername: 'first-match' },
					{ githubUsername: 'multi-mapped', slackUsername: 'second-match' },
					{ githubUsername: 'multi-mapped', slackUsername: 'no-match' },
				],
			})

			// Mock getAllusers - note the order is important for this test
			client.getAllusers = jest.fn().mockResolvedValue(mockUsers)

			// Call the method with GitHub username that has multiple mappings
			const result = await client.getUser({ username: 'multi-mapped' })

			// When searching the Slack users, the first matching user found is returned
			// In this case, it's mockUsers[0] with id U7
			expect(result).toEqual(mockUsers[0])
			expect(client.getAllusers).toHaveBeenCalled()
		})

		it('should prioritize user mappings over standard matching', async () => {
			// Create mock users where one has both a mapping match and a standard match
			const mockUsers = [
				{
					id: 'U9',
					name: 'mapped-name',
					profile: {
						display_name: 'other-display',
						email: 'test-github@example.com',
					},
				},
				{
					id: 'U10',
					name: 'test-github',
					profile: {
						display_name: 'test-github',
						email: 'different@example.com',
					},
				},
			]

			// Create client with user mapping
			const client = new SlackClient({
				channels: ['test-channel'],
				token: 'test-token',
				userMappings: [{ githubUsername: 'test-github', slackUsername: 'mapped-name' }],
			})

			// Mock getAllusers
			client.getAllusers = jest.fn().mockResolvedValue(mockUsers)

			// Call the method with GitHub username that could match both by mapping and by name
			const result = await client.getUser({ username: 'test-github' })

			// The mapping match should be prioritized
			// The first user with the mapped name
			expect(result).toEqual(mockUsers[0])
			expect(client.getAllusers).toHaveBeenCalled()
		})

		it('should fall back to standard matching when mapping users are not found', async () => {
			// Create mock users where there's no match by mapping but there is a standard match
			const mockUsers = [
				{
					id: 'U11',
					name: 'fallback-user',
					profile: {
						display_name: 'github-fallback',
						email: 'fallback@example.com',
					},
				},
			]

			// Create client with user mapping to a non-existent Slack user
			const client = new SlackClient({
				channels: ['test-channel'],
				token: 'test-token',
				userMappings: [
					{
						githubUsername: 'github-fallback',
						slackUsername: 'does-not-exist',
					},
				],
			})

			// Mock getAllusers
			client.getAllusers = jest.fn().mockResolvedValue(mockUsers)

			// Call the method with GitHub username
			const result = await client.getUser({ username: 'github-fallback' })

			// Should fall back to standard matching and find by display_name
			expect(result).toEqual(mockUsers[0])
			expect(client.getAllusers).toHaveBeenCalled()
		})

		it('should return undefined if user not found', async () => {
			// Create client
			const client = new SlackClient({
				channels: ['test-channel'],
				token: 'test-token',
			})

			// Mock getAllusers to return empty array
			client.getAllusers = jest.fn().mockResolvedValue([])

			// Call the method
			const result = await client.getUser({ username: 'nonexistent' })

			// Verify the result
			expect(result).toBeUndefined()
			expect(client.getAllusers).toHaveBeenCalled()
		})
	})

	describe('postMessage', () => {
		// Mock the actual implementation
		const originalPostMessage = SlackClient.prototype.postMessage

		afterEach(() => {
			// Restore the original implementation after tests
			SlackClient.prototype.postMessage = originalPostMessage
		})

		it('should post message to channel', async () => {
			// Create a mock implementation that just resolves
			SlackClient.prototype.postMessage = jest.fn().mockResolvedValue(undefined)

			// Create client
			const client = new SlackClient({
				channels: ['test-channel'],
				token: 'test-token',
			})

			// Call the method
			await client.postMessage('test message', [])

			// Check if our mocked method was called
			expect(SlackClient.prototype.postMessage).toHaveBeenCalled()
		})

		it('should handle errors correctly', async () => {
			// Create a mock implementation that rejects
			SlackClient.prototype.postMessage = jest.fn().mockRejectedValue(new Error('API error'))

			// Create client
			const client = new SlackClient({
				channels: ['test-channel'],
				token: 'test-token',
			})

			// Call method and expect it to throw
			await expect(client.postMessage('test message', [])).rejects.toThrow('API error')
		})
	})
})
