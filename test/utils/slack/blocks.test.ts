import {
	getContextMarkdownBlock,
	getEmojiBlocks,
	getFirstBlocks,
	getLastBlocks,
	getPullBlocks,
} from '../../../src/utils/slack/blocks.js'

// Jest globals
import { describe, expect, it, jest } from '@jest/globals'

/* eslint-disable max-lines-per-function */
describe('getFirstBlocks (empty orgs)', () => {
	it('should only return header (and optional sub-header) blocks when no orgs are provided', () => {
		const header = 'No Open PRs'
		const result = getFirstBlocks([], header)

		// only the header block should be present, since no orgs leads to no actions block
		expect(result).toHaveLength(1)
		expect(result[0]).toEqual({
			text: {
				emoji: true,
				text: header,
				type: 'plain_text',
			},
			type: 'header',
		})
	})
})

describe('Utils: Slack', () => {
	describe('Blocks', () => {
		describe('getContextMarkdownBlock', () => {
			it('should create a context block with markdown text', () => {
				const result = getContextMarkdownBlock('test markdown')
				expect(result).toHaveLength(1)
				expect(result[0]).toEqual({
					elements: [
						{
							text: 'test markdown',
							type: 'mrkdwn',
						},
					],
					type: 'context',
				})
			})

			it('should include indentation when specified', () => {
				const result = getContextMarkdownBlock('test markdown', true)
				expect(result).toHaveLength(1)
				expect(result[0]).toEqual({
					elements: [
						{
							text: ' ',
							type: 'plain_text',
						},
						{
							text: 'test markdown',
							type: 'mrkdwn',
						},
					],
					type: 'context',
				})
			})
		})

		describe('getEmojiBlocks', () => {
			it('should return empty array when no emoji name provided', () => {
				expect(getEmojiBlocks()).toEqual([])
			})

			it('should create rich text section blocks', () => {
				const result = getEmojiBlocks('smile')
				expect(result).toEqual([
					{
						name: 'smile',
						type: 'emoji',
					},
					{
						text: ' ',
						type: 'text',
					},
				])
			})

			it('should create context blocks', () => {
				const result = getEmojiBlocks('smile', 'context')
				expect(result).toEqual([
					{
						emoji: true,
						text: ':smile:',
						type: 'plain_text',
					},
				])
			})
		})

		describe('getFirstBlocks', () => {
			it('should create header and action blocks', () => {
				const result = getFirstBlocks(['org1'], 'Test Header')
				expect(result).toHaveLength(2)
				expect(result[0]).toEqual({
					text: {
						emoji: true,
						text: 'Test Header',
						type: 'plain_text',
					},
					type: 'header',
				})
				expect(result[1]).toEqual({
					elements: [
						{
							text: {
								emoji: true,
								text: 'Org1 Org',
								type: 'plain_text',
							},
							type: 'button',
							url: 'https://github.com/org1',
						},
						{
							text: {
								emoji: true,
								text: 'Org1 PRs',
								type: 'plain_text',
							},
							type: 'button',
							url: 'https://github.com/pulls?q=is%3Aopen+is%3Apr+archived%3Afalse+draft%3Afalse+user%3Aorg1',
						},
					],
					type: 'actions',
				})
			})

			it('should include sub-header text when provided', () => {
				const result = getFirstBlocks(['org1'], 'Test Header', 'Sub-header text')
				expect(result).toHaveLength(3)
				expect(result[1]).toEqual({
					elements: [
						{
							text: 'Sub-header text',
							type: 'mrkdwn',
						},
					],
					type: 'context',
				})
			})
		})

		describe('getLastBlocks', () => {
			it('should create context block with footer text', () => {
				const result = getLastBlocks('footer text')
				expect(result).toHaveLength(1)
				expect(result[0]).toEqual({
					elements: [
						{
							text: 'footer text',
							type: 'mrkdwn',
						},
					],
					type: 'context',
				})
			})
		})

		describe('getPullBlocks', () => {
			it('should use fallback logic for Slack user profile images', async () => {
				// @ts-expect-error Missing properties in Pull type
				const pull = {
					age: '2 days ago',
					ageInHours: 48,
					commits: 3,
					draft: false,
					filesAndChanges: { changes: 20, files: 5 },
					number: 123,
					repo: 'test-repo',
					repoUrl: 'https://github.com/org/test-repo',
					requestedReviewers: ['testuser'],
					reviewReport: {
						approvals: 0,
						approvalsRemaining: 1,
						requiredReviewers: 1,
						reviews: {
							reviewer1: {
								context: 'commented',
								email: 'reviewer1@example.com',
								login: 'reviewer1',
								relativeHumanReadableAge: '1 hour ago',
							},
						},
					},
					title: 'Test PR',
					url: 'https://github.com/org/test-repo/pull/123',
				}

				const testImageFallback = async (profileData, expectedImageUrl) => {
					const mockSlackClient = {
						getUser: jest.fn().mockImplementation(() => {
							return {
								id: 'U123456',
								profile: profileData,
							}
						}),
					}

					const blocks = await getPullBlocks(pull, mockSlackClient, false)

					const imageBlock = blocks.find(
						(block) =>
							block.type === 'context' && block.elements?.some((element) => element.type === 'image'),
					)

					// @ts-expect-error KnownBlock type doesn't properly recognize context elements
					const imageElement = imageBlock.elements.find((element) => element.type === 'image')
					expect(imageElement.image_url).toBe(expectedImageUrl)
				}

				/* eslint-disable @typescript-eslint/naming-convention */
				await testImageFallback(
					{ image_512: 'https://example.com/image512.jpg' },
					'https://example.com/image512.jpg',
				)
				await testImageFallback(
					{ image_192: 'https://example.com/image192.jpg' },
					'https://example.com/image192.jpg',
				)
				await testImageFallback(
					{ image_72: 'https://example.com/image72.jpg' },
					'https://example.com/image72.jpg',
				)
				await testImageFallback(
					{ image_48: 'https://example.com/image48.jpg' },
					'https://example.com/image48.jpg',
				)
				await testImageFallback(
					{ image_32: 'https://example.com/image32.jpg' },
					'https://example.com/image32.jpg',
				)
				await testImageFallback(
					{ image_24: 'https://example.com/image24.jpg' },
					'https://example.com/image24.jpg',
				)
			})
		})
	})
})
/* eslint-enable max-lines-per-function */
