export const scmUrl = 'https://github.com'
export const prBaseUrl = `${scmUrl}/pulls?q=is%3Aopen+is%3Apr+archived%3Afalse+draft%3Afalse+user%3A`
export const ignoreFilenamesForChanges = ['package-lock.json']
export const workflowLogsUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
export const workflowPath = process.env.GITHUB_WORKFLOW_REF?.split('@')[0].replace(
	String(process.env.GITHUB_REPOSITORY),
	'',
)
export const workflowUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/tree/${process.env.GITHUB_REF_NAME}/${workflowPath}`
