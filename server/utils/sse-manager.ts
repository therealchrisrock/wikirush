import { type Response } from 'express'

export type NotificationEvent = {
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

type Client = {
	id: string
	userId: string
	response: Response
}

class SSENotificationManager {
	private clients: Map<string, Client[]> = new Map()

	addClient(userId: string, clientId: string, response: Response) {
		const clients = this.clients.get(userId) || []
		clients.push({ id: clientId, userId, response })
		this.clients.set(userId, clients)

		console.log(`SSE client connected: ${clientId} for user ${userId}`)
	}

	removeClient(userId: string, clientId: string) {
		const clients = this.clients.get(userId) || []
		const updatedClients = clients.filter((c) => c.id !== clientId)

		if (updatedClients.length === 0) {
			this.clients.delete(userId)
		} else {
			this.clients.set(userId, updatedClients)
		}

		console.log(`SSE client disconnected: ${clientId} for user ${userId}`)
	}

	sendToUser(userId: string, event: NotificationEvent) {
		const clients = this.clients.get(userId)

		if (!clients || clients.length === 0) {
			console.log(`No active SSE clients for user ${userId}`)
			return
		}

		const message = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`

		clients.forEach((client) => {
			try {
				client.response.write(message)
			} catch (error) {
				console.error(`Error sending to client ${client.id}:`, error)
				this.removeClient(userId, client.id)
			}
		})

		console.log(`Sent ${event.type} to ${clients.length} client(s) for user ${userId}`)
	}

	getActiveClientsCount(userId?: string): number {
		if (userId) {
			return this.clients.get(userId)?.length || 0
		}
		return Array.from(this.clients.values()).reduce(
			(sum, clients) => sum + clients.length,
			0,
		)
	}
}

export const sseManager = new SSENotificationManager()
