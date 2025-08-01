'use client'

import { useEffect, useRef } from 'react'
import { Message, Profile } from '@/lib/supabase'
import { MessageBubble } from './MessageBubble'

interface MessageListProps {
  messages: (Message & { sender?: Profile })[]
  currentUserId: string
  isLoading?: boolean
  anonymizePatientName?: (profile: Profile | undefined, userId: string) => string
}

export function MessageList({ messages, currentUserId, isLoading = false, anonymizePatientName }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Carregando mensagens...</p>
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma mensagem ainda</h3>
          <p className="text-gray-500">Envie uma mensagem para começar a conversa!</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto bg-gray-50 p-4"
      style={{ scrollBehavior: 'smooth' }}
    >
      <div className="space-y-1">
        {messages.map((message, index) => {
          const isOwn = message.sender_id === currentUserId
          const previousMessage = messages[index - 1]
          const showSender = !previousMessage || previousMessage.sender_id !== message.sender_id
          
          return (
            <MessageBubble 
              key={message.id}
              message={message}
              isOwn={isOwn}
              showSender={showSender}
              anonymizePatientName={anonymizePatientName}
            />
          )
        })}
      </div>
      <div ref={messagesEndRef} />
    </div>
  )
} 