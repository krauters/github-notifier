import { plural } from '@krauters/utils'
import { debug } from '@actions/core'

/**
 * Get an emoji based on the age of something.
 *
 * @param {number} hoursAgo The number of hours ago since something happened.
 * @returns {string}
 */
export function getAgeBasedEmoji(hoursAgo: number): string {
	debug(`Getting an emoji based on age [${hoursAgo}]`)

	if (hoursAgo <= 8) {
		return ''
	}

	const emojis = ['watch']
	const random = Math.floor(Math.random() * emojis.length)

	return ` :${emojis[random]}:`
}

/**
 * Get the relative human readable age of something.
 *
 * @param {number} hoursAgo The number of hours ago since something happened.
 * @param {boolean} [withAgo=true] Whether to include the ' ago' suffix when appropriate.
 * @returns {string}
 */
export function getRelativeHumanReadableAge(hoursAgo: number, withAgo = true): string {
	debug('Getting human readable age')
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
 * Get have or has depending on quantity context.
 * @param {number} number The number of entities in question.
 * @returns {string}
 */
export function haveOrHas(number: number): string {
	return number === 1 ? 'has' : 'have'
}
