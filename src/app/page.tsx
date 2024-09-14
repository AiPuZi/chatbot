import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Trash2, Plus, Send } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Conversation {
  id: number
  messages: Message[]
}

const API_URL = 'http://localhost:8000'  // 替换为您的后端 URL

export default function Chatbot() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    const response = await fetch(`${API_URL}/conversations`)
    const data = await response.json()
    setConversations(data)
  }

  const createNewConversation = async () => {
    const response = await fetch(`${API_URL}/conversations`, { method: 'POST' })
    const data = await response.json()
    await fetchConversations()
    setCurrentConversation(data.id)
  }

  const deleteConversation = async (id: number) => {
    await fetch(`${API_URL}/conversations/${id}`, { method: 'DELETE' })
    await fetchConversations()
    if (currentConversation === id) {
      setCurrentConversation(null)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || currentConversation === null) return

    setIsLoading(true)
    const userMessage: Message = { role: 'user', content: input }
    
    try {
      const response = await fetch(`${API_URL}/conversations/${currentConversation}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userMessage),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const assistantMessage = await response.json()
      await fetchConversations()
      setInput('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-64 bg-white p-4 border-r border-gray-200">
        <Button onClick={createNewConversation} className="w-full mb-4 bg-blue-100 text-blue-600 hover:bg-blue-200">
          <Plus className="mr-2 h-4 w-4" /> New Chat
        </Button>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          {conversations.map(conv => (
            <div key={conv.id} className="flex items-center justify-between mb-2">
              <Button 
                variant="ghost" 
                className={`w-full justify-start ${currentConversation === conv.id ? 'bg-blue-50' : ''}`}
                onClick={() => setCurrentConversation(conv.id)}
              >
                Chat {conv.id}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => deleteConversation(conv.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </ScrollArea>
      </div>
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 m-4 bg-white">
          <CardHeader>
            <CardTitle>Chat</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-16rem)]">
              {currentConversation !== null && 
                conversations.find(conv => conv.id === currentConversation)?.messages.map((msg, index) => (
                  <div key={index} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <span className={`inline-block p-2 rounded-lg ${msg.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      {msg.content}
                    </span>
                  </div>
                ))
              }
            </ScrollArea>
          </CardContent>
          <CardFooter>
            <div className="flex w-full items-center space-x-2">
              <Input 
                type="text" 
                placeholder="Type your message..." 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <Button onClick={sendMessage} disabled={isLoading || currentConversation === null}>
                {isLoading ? 'Sending...' : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
