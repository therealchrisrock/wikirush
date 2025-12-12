import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { type GameInviteNotification } from '#app/utils/notifications.tsx'

export function NotificationToast({
	notification,
	onDismiss,
}: {
	notification: GameInviteNotification
	onDismiss: () => void
}) {
	const { type, data } = notification

	useEffect(() => {
		if (type === 'game-invite') {
			toast.info(`Game invite from ${data.fromUsername}`, {
				description: data.message || 'Join a new game!',
				action: {
					label: 'View',
					onClick: () => {
						window.location.href = `/game-invites/${data.id}`
					},
				},
				onDismiss,
			})
		} else if (type === 'game-invite-accepted') {
			toast.success(`${data.fromUsername} accepted your game invite!`, {
				description: 'Start playing now',
				action: {
					label: 'Play',
					onClick: () => {
						window.location.href = `/game/${data.id}`
					},
				},
				onDismiss,
			})
		} else if (type === 'game-invite-rejected') {
			toast.error(`${data.fromUsername} declined your game invite`, {
				onDismiss,
			})
		}
	}, [type, data, onDismiss])

	return null
}

export function NotificationListener({
	notifications,
	onDismiss,
}: {
	notifications: GameInviteNotification[]
	onDismiss: (id: string) => void
}) {
	const [shownNotifications, setShownNotifications] = useState<Set<string>>(
		new Set(),
	)

	useEffect(() => {
		for (const notification of notifications) {
			if (!shownNotifications.has(notification.data.id)) {
				setShownNotifications((prev) => new Set([...prev, notification.data.id]))
			}
		}
	}, [notifications, shownNotifications])

	return (
		<>
			{notifications.map((notification) => {
				if (!shownNotifications.has(notification.data.id)) {
					return (
						<NotificationToast
							key={notification.data.id}
							notification={notification}
							onDismiss={() => {
								onDismiss(notification.data.id)
							}}
						/>
					)
				}
				return null
			})}
		</>
	)
}
