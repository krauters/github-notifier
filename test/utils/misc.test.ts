import { getAgeBasedEmoji, getRelativeHumanReadableAge, haveOrHas } from '../../src/utils/misc.js'

describe('Utils: Misc', () => {
	describe('getAgeBasedEmoji', () => {
		it('should return empty string for hours <= 8', () => {
			expect(getAgeBasedEmoji(8)).toBe('')
			expect(getAgeBasedEmoji(7)).toBe('')
			expect(getAgeBasedEmoji(0)).toBe('')
		})

		it('should return a random emoji for hours > 8', () => {
			const result = getAgeBasedEmoji(9)
			expect(result).toMatch(/ :(watch):/)
		})
	})

	describe('getRelativeHumanReadableAge', () => {
		it('should return "in the last hour" for less than 1 hour', () => {
			expect(getRelativeHumanReadableAge(0.5)).toBe('in the last hour')
		})

		it('should return hours with pluralization', () => {
			expect(getRelativeHumanReadableAge(1)).toBe('1 hour ago')
			expect(getRelativeHumanReadableAge(2)).toBe('2 hours ago')
		})

		it('should return days with pluralization', () => {
			expect(getRelativeHumanReadableAge(24)).toBe('1 day ago')
			expect(getRelativeHumanReadableAge(48)).toBe('2 days ago')
		})

		it('should handle without "ago" suffix', () => {
			expect(getRelativeHumanReadableAge(1, false)).toBe('1 hour')
			expect(getRelativeHumanReadableAge(2, false)).toBe('2 hours')
			expect(getRelativeHumanReadableAge(24, false)).toBe('1 day')
			expect(getRelativeHumanReadableAge(48, false)).toBe('2 days')
		})
	})

	describe('haveOrHas', () => {
		it('should return "has" for singular', () => {
			expect(haveOrHas(1)).toBe('has')
		})

		it('should return "have" for plural', () => {
			expect(haveOrHas(0)).toBe('have')
			expect(haveOrHas(2)).toBe('have')
			expect(haveOrHas(10)).toBe('have')
		})
	})
})
