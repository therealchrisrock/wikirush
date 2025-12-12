import { json, type LoaderFunctionArgs } from 'react-router'
import { Form, useLoaderData } from 'react-router'
import { NotificationListener } from '#app/components/notifications.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { useNotifications } from '#app/utils/notifications.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)

	// Get all users except current user
	const users = await prisma.user.findMany({
		where: {
			NOT: { id: userId },
		},
		select: {
			id: true,
			username: true,
			name: true,
		},
		take: 20,
	})

	// Get pending invites sent by current user
	const sentInvites = await prisma.gameInvite.findMany({
		where: {
			fromId: userId,
			status: 'pending',
		},
		select: {
			id: true,
			to: {
				select: {
					username: true,
				},
			},
			message: true,
			createdAt: true,
		},
		orderBy: { createdAt: 'desc' },
	})

	// Get pending invites received by current user
	const receivedInvites = await prisma.gameInvite.findMany({
		where: {
			toId: userId,
			status: 'pending',
		},
		select: {
			id: true,
			from: {
				select: {
					username: true,
				},
			},
			message: true,
			createdAt: true,
		},
		orderBy: { createdAt: 'desc' },
	})

	return json({ users, sentInvites, receivedInvites, userId })
}

export default function GameInvites() {
	const { users, sentInvites, receivedInvites, userId } =
		useLoaderData<typeof loader>()
	const { notifications, isConnected, removeNotification } =
		useNotifications(userId)

	return (
		<div className="container mx-auto max-w-4xl p-8">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-3xl font-bold">Game Invites</h1>
				<div className="flex items-center gap-2">
					<div
						className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
					/>
					<span className="text-sm text-gray-600">
						{isConnected ? 'Connected' : 'Disconnected'}
					</span>
				</div>
			</div>

			<NotificationListener
				notifications={notifications}
				onDismiss={removeNotification}
			/>

			<div className="mb-8 rounded-lg border bg-card p-6">
				<h2 className="mb-4 text-xl font-semibold">Send Game Invite</h2>
				<Form method="post" action="/resources/game-invites" className="space-y-4">
					<input type="hidden" name="intent" value="send" />
					<div>
						<Label htmlFor="toUserId">Select User</Label>
						<select
							id="toUserId"
							name="toUserId"
							required
							className="w-full rounded-md border px-3 py-2"
						>
							<option value="">Choose a user...</option>
							{users.map((user) => (
								<option key={user.id} value={user.id}>
									{user.username} {user.name ? `(${user.name})` : ''}
								</option>
							))}
						</select>
					</div>
					<div>
						<Label htmlFor="message">Message (optional)</Label>
						<Input
							id="message"
							name="message"
							placeholder="Want to play a game?"
						/>
					</div>
					<Button type="submit">Send Invite</Button>
				</Form>
			</div>

			<div className="mb-8 rounded-lg border bg-card p-6">
				<h2 className="mb-4 text-xl font-semibold">Received Invites</h2>
				{receivedInvites.length === 0 ? (
					<p className="text-gray-500">No pending invites</p>
				) : (
					<div className="space-y-3">
						{receivedInvites.map((invite) => (
							<div
								key={invite.id}
								className="flex items-center justify-between rounded border p-3"
							>
								<div>
									<p className="font-medium">From: {invite.from.username}</p>
									{invite.message && (
										<p className="text-sm text-gray-600">{invite.message}</p>
									)}
									<p className="text-xs text-gray-400">
										{new Date(invite.createdAt).toLocaleString()}
									</p>
								</div>
								<div className="flex gap-2">
									<Form method="post" action="/resources/game-invites">
										<input type="hidden" name="intent" value="respond" />
										<input type="hidden" name="inviteId" value={invite.id} />
										<input type="hidden" name="action" value="accept" />
										<Button type="submit" size="sm" variant="default">
											Accept
										</Button>
									</Form>
									<Form method="post" action="/resources/game-invites">
										<input type="hidden" name="intent" value="respond" />
										<input type="hidden" name="inviteId" value={invite.id} />
										<input type="hidden" name="action" value="reject" />
										<Button type="submit" size="sm" variant="destructive">
											Reject
										</Button>
									</Form>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			<div className="rounded-lg border bg-card p-6">
				<h2 className="mb-4 text-xl font-semibold">Sent Invites</h2>
				{sentInvites.length === 0 ? (
					<p className="text-gray-500">No pending sent invites</p>
				) : (
					<div className="space-y-3">
						{sentInvites.map((invite) => (
							<div key={invite.id} className="rounded border p-3">
								<p className="font-medium">To: {invite.to.username}</p>
								{invite.message && (
									<p className="text-sm text-gray-600">{invite.message}</p>
								)}
								<p className="text-xs text-gray-400">
									{new Date(invite.createdAt).toLocaleString()}
								</p>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
