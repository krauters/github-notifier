/* eslint-disable jsdoc/require-jsdoc */
import type { AdjustDateProps } from './structures.js'

import { SnapType } from './structures.js'

/**
 * Get the correct version of a word depending on quantity context.
 * @param {string} word - The word the may need to be pluralized.
 * @param {number} number - The number of entities in question.
 * @returns {string}
 */
export function plural(word: string, number: number): string {
	return number === 1 ? word : `${word}s`
}

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

/**
 * Generate batches of items from a larger array of items.
 * @param {T[]} items - Generic items in an array.
 * @param {number} size - The size of batches to yield.
 * @yields {T[]}
 */
export function* generateBatches<T>(items: T[], size = 50) {
	for (let i = 0; i < items.length; i += size) {
		yield items.slice(i, i + size)
	}
}

// Todo - Move this to shared utils.
const snapActions = {
	[SnapType.Day]: (date: Date) => {
		date.setHours(0, 0, 0, 0)
	},
	[SnapType.Hour]: (date: Date) => {
		date.setHours(date.getHours(), 0, 0, 0)
	},
	[SnapType.Minute]: (date: Date) => {
		date.setMinutes(0, 0, 0)
	},
	[SnapType.Month]: (date: Date) => {
		date.setDate(1)
		date.setHours(0, 0, 0, 0)
	},
	[SnapType.Second]: (date: Date) => {
		date.setSeconds(0, 0)
	},
	[SnapType.Week]: (date: Date) => {
		date.setDate(date.getDate() - date.getDay())
		date.setHours(0, 0, 0, 0)
	},
	[SnapType.Year]: (date: Date) => {
		date.setMonth(0, 1)
		date.setHours(0, 0, 0, 0)
	},
}

/**
 * Adjust a date by the provided parameters and optionally including snap.
 * @param {AdjustDateProps} props - Props to adjust a date.
 * @returns {Date}
 */
export function adjustDate({ date, days, months, snap = SnapType.Day }: AdjustDateProps): Date {
	const result = date ?? new Date()
	result.setMonth(result.getMonth() + months)
	result.setDate(result.getDate() + (days ?? 0))

	if (snap && snapActions[snap]) {
		snapActions[snap](result)
	}

	console.debug(`Adjusted date is [${result}]`)

	return result
}

/**
 * Calculates the number of minutes between two dates.
 * @param {Date} [date1] - The first date.
 * @param {Date} [date2] - The second date.
 * @returns {number|undefined} The number of minutes between the two dates.
 */
export function minutesBetweenDates(date1?: Date, date2?: Date): number | undefined {
	if (!date1 || !date2) {
		return
	}
	const msPerMinute = 1000 * 60
	const diffInMs = date2.getTime() - date1.getTime()

	return Math.floor(diffInMs / msPerMinute)
}

/**
 * Get the average of a list of numbers.
 * @param {number[]} list - List of numbers to average.
 * @returns {number}
 */
export function average(list: number[]): number | undefined {
	if (!list.length) {
		return undefined
	}

	return Math.floor(list.reduce((prev, curr) => prev + curr) / list.length)
}

/**
 * Calculates the ISO week number for a given date. The first week of a year is the one that contains the first Thursday of that year.
 * @param {Date} date - The date for which the week number is to be determined.
 * @returns {number} The ISO week number of the year.
 */
export function getWeekNumber(date: Date): number {
	const target = new Date(date)
	target.setHours(0, 0, 0, 0)

	// Shift to closest Thursday.
	target.setDate(target.getDate() - target.getDay() + 3)

	// Get January 1st of the year.
	const firstJan = new Date(target.getFullYear(), 0, 1)

	// Adjust so Monday is 0.
	const firstJanDay = (firstJan.getDay() + 6) % 7

	// Adjust to nearest Monday starting the week
	firstJan.setDate(firstJan.getDate() + (firstJanDay <= 3 ? 1 - firstJanDay : 8 - firstJanDay))

	const diff = target.valueOf() - firstJan.valueOf()
	const weekNumber = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1

	return weekNumber
}

/**
 * Calculates the number of hours ago against a given date.
 * @param {Date} date - The date that we are calculating against.
 * @returns {number} The number of hours ago.
 */
export function getHoursAgo(date: Date): number {
	return Math.floor((new Date().valueOf() - date.valueOf()) / (1000 * 60 * 60))
}

/**
 * Concatenates a list of strings into a single string, with each string separated by a comma,
 * and 'and' inserted before the last string.
 * @param {string[]} items - An array of strings to concatenate.
 * @returns {string}
 */
export function formatStringList(items: string[]): string {
	if (items.length === 0) {
		return ''
	}

	if (items.length === 1) {
		return items[0]
	}

	if (items.length === 2) {
		return `${items[0]} and ${items[1]}`
	}

	const allButLast = items.slice(0, -1).join(', ')

	return `${allButLast}, and ${items[items.length - 1]}`
}

interface StringToArrayParsingOptions {
	delimeter?: string
	removeWhitespace?: boolean
}

/**
 * Convert a string to an array.
 * @param {string} text - Text that will be converted into an array.
 * @param {StringToArrayParsingOptions} options - Parsing options.
 * @returns {string[]}
 */
export function stringToArray(text: string, options?: StringToArrayParsingOptions): string[] {
	let result: string[] = []

	if (options?.removeWhitespace ?? true) {
		text = text.replace(/\s/g, '')
	}
	if (text) {
		result = text.split(options?.delimeter ?? ',')
	}

	return result
}
