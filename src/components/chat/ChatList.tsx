'use client'

import { useState } from 'react'
import { Chat, Profile } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ChatWithDetails extends Chat {
  user?: Profile
  psychologist?: Profile
  lastMessage?: {
    id: string
    content: string
    created_at: string
    sender_id: string
    sender?: Profile
  }
  unreadCount: number
  participantCount: number
}

interface ChatListProps {
  chats: ChatWithDetails[]
  currentChatId?: string
  currentUserId: string
  onChatSelect: (chat: ChatWithDetails) => void
  onRefresh: () => void
  isLoading?: boolean
  highlightedChats?: Set<string>
}

export function ChatList({ 
  chats, 
  currentChatId, 
  currentUserId,
  onChatSelect, 
  onRefresh,
  isLoading = false,
  highlightedChats = new Set()
}: ChatListProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    } else if (diffDays === 1) {
      return 'Ontem'
    } else if (diffDays < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit' 
      })
    }
  }

  const getChatTitle = (chat: ChatWithDetails) => {
    if (chat.title && chat.title !== `Chat com ${chat.user_id}`) {
      return chat.title
    }

    // Mostrar o nome do outro participante
    const otherParticipant = chat.user_id === currentUserId ? chat.psychologist : chat.user
    return otherParticipant?.name || otherParticipant?.username || 'Chat sem nome'
  }

  const getChatAvatar = (chat: ChatWithDetails) => {
    const otherParticipant = chat.user_id === currentUserId ? chat.psychologist : chat.user
    return otherParticipant?.avatar_path || ''
  }

  const getChatRole = (chat: ChatWithDetails) => {
    const otherParticipant = chat.user_id === currentUserId ? chat.psychologist : chat.user
    return otherParticipant?.user_role || 'app'
  }

  const filteredChats = chats.filter(chat => {
    const title = getChatTitle(chat).toLowerCase()
    const otherParticipant = chat.user_id === currentUserId ? chat.psychologist : chat.user
    const username = otherParticipant?.username?.toLowerCase() || ''
    const search = searchTerm.toLowerCase()
    
    return title.includes(search) || username.includes(search)
  })

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'psicologos': return 'bg-green-100 text-green-800'
      case 'cms': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'psicologos': return 'Psicólogo'
      case 'cms': return 'Admin'
      default: return 'Usuário'
    }
  }

  if (isLoading) {
    return (
      <div className="w-80 border-r bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600">Carregando chats...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 border-r bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg">Chats</h2>
            {highlightedChats.size > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-600 font-medium">
                  {highlightedChats.size} nova{highlightedChats.size !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="px-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
        </div>
        
        {/* Search */}
        <Input
          placeholder="Buscar chats..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-sm"
        />
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Nenhum chat encontrado</h3>
            <p className="text-sm text-gray-500">
              {searchTerm ? 'Tente outro termo de busca' : 'Aguarde mensagens do Flutter ou crie um novo chat'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredChats.map((chat) => {
              const isHighlighted = highlightedChats.has(chat.id)
              const isActive = currentChatId === chat.id
              
              return (
                <div
                  key={chat.id}
                  onClick={() => onChatSelect(chat)}
                  className={`p-4 cursor-pointer transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-50 border-r-2 border-blue-500' 
                      : isHighlighted 
                        ? 'bg-green-50 hover:bg-green-100 border-l-2 border-green-500' 
                        : 'hover:bg-gray-50'
                  } ${isHighlighted ? 'animate-pulse' : ''}`}
                >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    {getChatAvatar(chat) ? (
                      <img 
                        src={getChatAvatar(chat)} 
                        alt="Avatar" 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-gray-900 truncate text-sm">
                        {getChatTitle(chat)}
                      </h3>
                      {chat.lastMessage && (
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatTime(chat.lastMessage.created_at)}
                        </span>
                      )}
                    </div>

                    {/* Role Badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(getChatRole(chat))}`}>
                        {getRoleLabel(getChatRole(chat))}
                      </span>
                      {chat.unreadCount > 0 && (
                        <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Last Message */}
                    {chat.lastMessage ? (
                      <p className="text-sm text-gray-600 truncate">
                        {chat.lastMessage.sender_id === currentUserId ? 'Você: ' : ''}
                        {chat.lastMessage.content}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Nenhuma mensagem ainda</p>
                    )}
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          {filteredChats.length} chat{filteredChats.length !== 1 ? 's' : ''} 
          {searchTerm && ` (filtrado${filteredChats.length !== 1 ? 's' : ''})`}
        </p>
      </div>
    </div>
  )
} 