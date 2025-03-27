/** @type {import('ts-jest').JestConfigWithTsJest} */
/* eslint-disable @typescript-eslint/naming-convention */

export default {
	collectCoverage: true,
	coverageDirectory: 'coverage',
	coverageThreshold: {
		global: {
			branches: 60,
			functions: 60,
			lines: 60,
			statements: 60,
		},
	},
	preset: 'ts-jest/presets/default-esm',
	testEnvironment: 'node',
	extensionsToTreatAsEsm: ['.ts'],
	moduleNameMapper: {
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
	transform: {
		'^.+\\.tsx?$': [
			'ts-jest',
			{
				useESM: true,
			},
		],
	},
	testMatch: ['**/(test|tests)/**/*.test.{ts,tsx}'],
} 