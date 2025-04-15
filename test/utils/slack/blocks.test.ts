import {
	getContextMarkdownBlock,
	getEmojiBlocks,
	getFirstBlocks,
	getLastBlocks,
} from '../../../src/utils/slack/blocks.js'

// Jest globals
import { describe, expect, it } from '@jest/globals'

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
	})
})
