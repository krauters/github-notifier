/* eslint-disable jsdoc/require-jsdoc */
import { plural } from '@krauters/utils'

/**
 * Get have or has depending on quantity context.
 * @param {number} number - The number of entities in question.
 * @returns {string}
 */
export function haveOrHas(number: number): string {
	return number === 1 ? 'has' : 'have'
}

/**
 * Get the relative human readable age of something.
 * @param {number} hoursAgo - The number of hours ago since something happened.
 * @param {boolean} [withAgo=true] - Whether to include the ' ago' suffix when appropriate.
 * @returns {string}
 */
export function getRelativeHumanReadableAge(hoursAgo: number, withAgo = true): string {
	console.debug('Getting human readable age')
	const suffix = withAgo ? ' ago' : ''
	if (hoursAgo < 1) {
		return 'in the last hour'
	} else if (hoursAgo < 24) {
		return `${hoursAgo} ${plural('hour', hoursAgo)}${suffix}`
	}
	const daysAgo = Math.floor(hoursAgo / 24)

	return `${daysAgo} ${plural('day', daysAgo)}${suffix}`
}

/**
 * Get an emoji based on the age of something.
 * @param {number} hoursAgo - The number of hours ago since something happened.
 * @returns {string}
 */
export function getAgeBasedEmoji(hoursAgo: number): string {
	console.debug(`Getting an emoji based on age [${hoursAgo}]`)

	if (hoursAgo <= 8) {
		return ''
	}

	const emojis = ['red-sus', 'rish_sus']
	const random = Math.floor(Math.random() * emojis.length)

	return ` :${emojis[random]}:`
}
