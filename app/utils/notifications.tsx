import { useEffect, useRef, useState } from 'react'

export type GameInviteNotification = {
	type: 'game-invite' | 'game-invite-accepted' | 'game-invite-rejected'
	data: {
		id: string
		fromId: string
		fromUsername: string
		toId: string
		message?: string
		createdAt: string
	}
}

export function useNotifications(userId: string | null) {
	const [notifications, setNotifications] = useState<GameInviteNotification[]>(
		[],
	)
	const [isConnected, setIsConnected] = useState(false)
	const eventSourceRef = useRef<EventSource | null>(null)

	useEffect(() => {
		if (!userId) {
			return
		}

		// Create EventSource connection
		const eventSource = new EventSource('/resources/notifications/stream', {
			withCredentials: true,
		})
		eventSourceRef.current = eventSource

		eventSource.onopen = () => {
			console.log('SSE connection established')
			setIsConnected(true)
		}

		eventSource.onerror = (error) => {
			console.error('SSE connection error:', error)
			setIsConnected(false)
		}

		// Handle connection message
		eventSource.addEventListener('message', (event) => {
			try {
				const data = JSON.parse(event.data)
				if (data.type === 'connected') {
					console.log('Connected to notifications stream:', data.clientId)
				}
			} catch (error) {
				console.error('Error parsing connection message:', error)
			}
		})

		// Handle game invite notifications
		eventSource.addEventListener('game-invite', (event) => {
			try {
				const data = JSON.parse(event.data)
				const notification: GameInviteNotification = {
					type: 'game-invite',
					data,
				}
				setNotifications((prev) => [...prev, notification])
			} catch (error) {
				console.error('Error parsing game-invite notification:', error)
			}
		})

		// Handle game invite accepted notifications
		eventSource.addEventListener('game-invite-accepted', (event) => {
			try {
				const data = JSON.parse(event.data)
				const notification: GameInviteNotification = {
					type: 'game-invite-accepted',
					data,
				}
				setNotifications((prev) => [...prev, notification])
			} catch (error) {
				console.error('Error parsing game-invite-accepted notification:', error)
			}
		})

		// Handle game invite rejected notifications
		eventSource.addEventListener('game-invite-rejected', (event) => {
			try {
				const data = JSON.parse(event.data)
				const notification: GameInviteNotification = {
					type: 'game-invite-rejected',
					data,
				}
				setNotifications((prev) => [...prev, notification])
			} catch (error) {
				console.error('Error parsing game-invite-rejected notification:', error)
			}
		})

		// Cleanup on unmount
		return () => {
			eventSource.close()
			eventSourceRef.current = null
			setIsConnected(false)
		}
	}, [userId])

	const clearNotifications = () => {
		setNotifications([])
	}

	const removeNotification = (id: string) => {
		setNotifications((prev) => prev.filter((n) => n.data.id !== id))
	}

	return {
		notifications,
		isConnected,
		clearNotifications,
		removeNotification,
	}
}
