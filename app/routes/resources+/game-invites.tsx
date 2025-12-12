import { type ActionFunctionArgs, json } from 'react-router'
import { z } from 'zod'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'

const SendInviteSchema = z.object({
	toUserId: z.string(),
	message: z.string().optional(),
})

const RespondToInviteSchema = z.object({
	inviteId: z.string(),
	action: z.enum(['accept', 'reject']),
})

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'send') {
		const rawData = Object.fromEntries(formData)
		const result = SendInviteSchema.safeParse(rawData)

		if (!result.success) {
			return json({ error: 'Invalid data' }, { status: 400 })
		}

		const { toUserId, message } = result.data

		// Check if user exists
		const toUser = await prisma.user.findUnique({
			where: { id: toUserId },
			select: { id: true, username: true },
		})

		if (!toUser) {
			return json({ error: 'User not found' }, { status: 404 })
		}

		// Check if there's already a pending invite
		const existingInvite = await prisma.gameInvite.findFirst({
			where: {
				fromId: userId,
				toId: toUserId,
				status: 'pending',
			},
		})

		if (existingInvite) {
			return json({ error: 'Invite already sent' }, { status: 400 })
		}

		// Get sender info
		const fromUser = await prisma.user.findUnique({
			where: { id: userId },
			select: { username: true },
		})

		// Create the invite
		const invite = await prisma.gameInvite.create({
			data: {
				fromId: userId,
				toId: toUserId,
				message,
				status: 'pending',
			},
			select: {
				id: true,
				fromId: true,
				toId: true,
				message: true,
				createdAt: true,
			},
		})

		// Send SSE notification
		const response = await fetch(
			`${new URL(request.url).origin}/api/notifications/send`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					userId: toUserId,
					event: {
						type: 'game-invite',
						data: {
							id: invite.id,
							fromId: invite.fromId,
							fromUsername: fromUser?.username || 'Unknown',
							toId: invite.toId,
							message: invite.message,
							createdAt: invite.createdAt.toISOString(),
						},
					},
				}),
			},
		)

		if (!response.ok) {
			console.error('Failed to send SSE notification')
		}

		return json({ success: true, invite })
	}

	if (intent === 'respond') {
		const rawData = Object.fromEntries(formData)
		const result = RespondToInviteSchema.safeParse(rawData)

		if (!result.success) {
			return json({ error: 'Invalid data' }, { status: 400 })
		}

		const { inviteId, action } = result.data

		// Get the invite
		const invite = await prisma.gameInvite.findUnique({
			where: { id: inviteId },
			select: {
				id: true,
				fromId: true,
				toId: true,
				status: true,
				from: { select: { username: true } },
			},
		})

		if (!invite) {
			return json({ error: 'Invite not found' }, { status: 404 })
		}

		if (invite.toId !== userId) {
			return json({ error: 'Unauthorized' }, { status: 403 })
		}

		if (invite.status !== 'pending') {
			return json({ error: 'Invite already responded to' }, { status: 400 })
		}

		// Update invite status
		const updatedInvite = await prisma.gameInvite.update({
			where: { id: inviteId },
			data: { status: action === 'accept' ? 'accepted' : 'rejected' },
			select: {
				id: true,
				fromId: true,
				to: { select: { username: true } },
			},
		})

		// Send SSE notification to sender
		const eventType =
			action === 'accept' ? 'game-invite-accepted' : 'game-invite-rejected'

		const response = await fetch(
			`${new URL(request.url).origin}/api/notifications/send`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					userId: updatedInvite.fromId,
					event: {
						type: eventType,
						data: {
							id: updatedInvite.id,
							fromId: userId,
							fromUsername: updatedInvite.to.username,
							toId: updatedInvite.fromId,
							createdAt: new Date().toISOString(),
						},
					},
				}),
			},
		)

		if (!response.ok) {
			console.error('Failed to send SSE notification')
		}

		return json({ success: true, action })
	}

	return json({ error: 'Invalid intent' }, { status: 400 })
}
