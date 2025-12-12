import { type LoaderFunctionArgs } from 'react-router'
import { eventStream } from 'remix-utils/sse/server'
import { getUserId } from '#app/utils/auth.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await getUserId(request)

	if (!userId) {
		return new Response('Unauthorized', { status: 401 })
	}

	// Forward the request to the Express SSE endpoint with the userId
	return eventStream(request.signal, function setup(send) {
		// Create a fetch request to the Express SSE endpoint
		const url = new URL(request.url)
		const sseUrl = `${url.protocol}//${url.host}/api/notifications/stream`

		const headers = new Headers()
		headers.set('x-user-id', userId)

		fetch(sseUrl, { headers, signal: request.signal })
			.then(async (response) => {
				if (!response.body) {
					throw new Error('No response body')
				}

				const reader = response.body.getReader()
				const decoder = new TextDecoder()

				try {
					while (true) {
						const { done, value } = await reader.read()
						if (done) break

						const chunk = decoder.decode(value, { stream: true })
						const lines = chunk.split('\n')

						for (const line of lines) {
							if (line.startsWith('data:')) {
								const data = line.slice(5).trim()
								send({ data })
							} else if (line.startsWith('event:')) {
								const event = line.slice(6).trim()
								send({ event })
							}
						}
					}
				} catch (error) {
					if (error instanceof Error && error.name !== 'AbortError') {
						console.error('SSE stream error:', error)
					}
				}
			})
			.catch((error) => {
				if (error instanceof Error && error.name !== 'AbortError') {
					console.error('SSE connection error:', error)
				}
			})

		return function clear() {
			// Cleanup when connection closes
		}
	})
}
