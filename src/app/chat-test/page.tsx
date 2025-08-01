'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, Message, Chat, Profile } from '@/lib/supabase'
import { MessageList } from '@/components/chat/MessageList'
import { ChatInput } from '@/components/chat/ChatInput'
import { ChatList } from '@/components/chat/ChatList'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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

export default function ChatTestPage() {
  const [currentChat, setCurrentChat] = useState<ChatWithDetails | null>(null)
  const [chats, setChats] = useState<ChatWithDetails[]>([])
  const [messages, setMessages] = useState<(Message & { sender?: any })[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingChats, setIsLoadingChats] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')

  // Estados para configuração inicial
  const [selectedUserId, setSelectedUserId] = useState('')
  const [isSetupComplete, setIsSetupComplete] = useState(false)

  // Estados para notificações e highlights
  const [newMessageNotification, setNewMessageNotification] = useState<{chatId: string, message: string} | null>(null)
  const [highlightedChats, setHighlightedChats] = useState<Set<string>>(new Set())

  // Buscar usuários disponíveis
  const loadAvailableUsers = async () => {
    try {
      const response = await fetch('/api/chat/list', { method: 'POST' })
      const result = await response.json()
      
      if (response.ok) {
        setAvailableUsers(result.users.all || [])
      } else {
        console.error('Erro ao buscar usuários:', result.error)
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
    }
  }

  // Configurar usuário e carregar chats
  const setupUser = async () => {
    if (!selectedUserId) return
    
    setIsLoading(true)
    try {
      setCurrentUserId(selectedUserId)
      setIsSetupComplete(true)
      
      // Carregar chats do usuário
      await loadChats()
    } catch (error) {
      console.error('Erro ao configurar usuário:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Carregar lista de chats (MODO ADMINISTRATIVO - TODOS OS CHATS)
  const loadChats = async () => {
    if (!currentUserId) return
    
    setIsLoadingChats(true)
    try {
      // USAR MODO ADMIN para ver TODOS os chats do sistema
      const response = await fetch(`/api/chat/list?current_user_id=${currentUserId}&admin_mode=true`)
      const result = await response.json()
      
      if (response.ok) {
        console.log(`🔥 MODO ADMIN: Carregados ${result.chats?.length || 0} chats do sistema completo`)
        
        if (result.chats && result.chats.length > 0) {
          console.log('📋 Chats carregados:')
          result.chats.forEach((chat: any, index: number) => {
            console.log(`  ${index + 1}. ID: ${chat.id}`)
            console.log(`     Título: ${chat.title || 'Sem título'}`)
            console.log(`     Participantes: ${chat.user?.name || chat.user_id} + ${chat.psychologist?.name || chat.psychologist_id || 'nenhum'}`)
            console.log(`     Mensagens: ${chat.messageCount || 0}`)
            console.log(`     Última atividade: ${chat.lastMessage ? new Date(chat.lastMessage.created_at).toLocaleString() : 'Nunca'}`)
          })
        } else {
          console.log('⚠️ Nenhum chat retornado pela API')
        }
        
        setChats(result.chats || [])
        
        // Se não tiver chat selecionado, selecionar o primeiro
        if (!currentChat && result.chats && result.chats.length > 0) {
          console.log('📌 Selecionando primeiro chat automaticamente:', result.chats[0].title || result.chats[0].id)
          handleChatSelect(result.chats[0])
        }
      } else {
        console.error('❌ Erro ao carregar chats:', result.error)
        console.error('Detalhes do erro:', result)
      }
    } catch (error) {
      console.error('Erro ao carregar chats:', error)
    } finally {
      setIsLoadingChats(false)
    }
  }

  // Selecionar chat
  const handleChatSelect = async (chat: ChatWithDetails) => {
    setCurrentChat(chat)
    
    // Remover highlight do chat selecionado
    setHighlightedChats(prev => {
      const newSet = new Set(prev)
      newSet.delete(chat.id)
      return newSet
    })
    
    // Limpar notificação se for do chat selecionado
    if (newMessageNotification?.chatId === chat.id) {
      setNewMessageNotification(null)
    }
    
    await loadMessages(chat.id)
  }

  // Função para mostrar notificação de nova mensagem
  const showNewMessageNotification = (chatId: string, senderName: string, content: string) => {
    setNewMessageNotification({
      chatId,
      message: `${senderName}: ${content.length > 50 ? content.substring(0, 50) + '...' : content}`
    })

    // Destacar o chat que recebeu a mensagem
    setHighlightedChats(prev => new Set([...prev, chatId]))

    // Remover notificação após 5 segundos
    setTimeout(() => {
      setNewMessageNotification(prev => 
        prev?.chatId === chatId ? null : prev
      )
    }, 5000)
  }

  // Carregar mensagens do chat
  const loadMessages = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chat/messages?chat_id=${chatId}`)
      const result = await response.json()
      
      if (response.ok) {
        setMessages(result.messages || [])
      } else {
        console.error('Erro ao carregar mensagens:', result.error)
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
    }
  }

  // Enviar mensagem
  const sendMessage = async (content: string) => {
    if (!currentChat || !currentUserId) return

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: currentChat.id,
          sender_id: currentUserId,
          content,
          message_type: 'text'
        })
      })

      const result = await response.json()
      if (!response.ok) {
        console.error('Erro ao enviar mensagem:', result.error)
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      throw error
    }
  }

  // Carregar dados iniciais
  useEffect(() => {
    loadAvailableUsers()
  }, [])

  // Carregar chats quando usuário é configurado
  useEffect(() => {
    if (currentUserId && isSetupComplete) {
      loadChats()
    }
  }, [currentUserId, isSetupComplete])

  // Configurar RealTime para mensagens
  useEffect(() => {
    if (!currentChat) return

    setConnectionStatus('connecting')

    // Inscrever-se nas mudanças na tabela de mensagens
    const messagesChannel = supabase
      .channel(`chat-messages-${currentChat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${currentChat.id}`,
        },
        async (payload) => {
          console.log('💬 CANAL ESPECÍFICO: Nova mensagem no chat atual:', payload.new.content)
          
          // Buscar informações do remetente
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, name, username, avatar_path')
            .eq('id', payload.new.sender_id)
            .single()

          const newMessage = {
            ...payload.new,
            sender
          } as Message & { sender?: any }

          // Verificar se a mensagem já existe para evitar duplicação
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === newMessage.id)
            if (exists) {
              console.log('⚠️ Mensagem já existe na lista, ignorando duplicação')
              return prev
            }
            console.log('➕ Adicionando nova mensagem à lista do chat atual')
            return [...prev, newMessage]
          })
          
          // Atualizar lista de chats para refletir nova mensagem
          await loadChats()
        }
      )
      .subscribe((status) => {
        console.log('Status da conexão RealTime (mensagens):', status)
        setConnectionStatus(status === 'SUBSCRIBED' ? 'connected' : 'disconnected')
      })

    return () => {
      console.log('Desconectando do canal RealTime de mensagens')
      supabase.removeChannel(messagesChannel)
      setConnectionStatus('disconnected')
    }
  }, [currentChat])

  // RealTime GLOBAL para detectar TODAS as mensagens
  useEffect(() => {
    if (!currentUserId || !isSetupComplete) return

    console.log('🔥 Configurando monitoramento GLOBAL de mensagens...')

    // Listener GLOBAL para TODAS as mensagens do sistema
    const globalMessagesChannel = supabase
      .channel('global-messages-monitor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          console.log('🌐 CANAL GLOBAL: Nova mensagem detectada no sistema:', payload.new.content)
          console.log(`📍 Chat: ${payload.new.chat_id}, Sender: ${payload.new.sender_id}`)
          
          // MODO ADMIN: Processar TODAS as mensagens do sistema
          console.log('🔥 MODO ADMIN: Processando mensagem de qualquer chat')
          
          // Buscar informações do remetente para notificação
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, name, username, avatar_path')
            .eq('id', payload.new.sender_id)
            .single()

          // Buscar o chat da mensagem para informações completas
          const { data: chatData } = await supabase
            .from('chats')
            .select('*')
            .eq('id', payload.new.chat_id)
            .single()

          // Se a mensagem NÃO é do usuário atual (mostrar notificação para mensagens de outros)
          if (payload.new.sender_id !== currentUserId) {
            const senderName = sender?.name || sender?.username || 'Usuário'
            const chatTitle = chatData?.title || `Chat ${payload.new.chat_id.substring(0, 8)}`
            console.log(`📢 Nova mensagem de ${senderName} no chat "${chatTitle}":`, payload.new.content)
            
            // Mostrar notificação apenas se não for do chat ativo OU se for do chat ativo mas a janela não está em foco
            if (!currentChat || payload.new.chat_id !== currentChat.id || document.hidden) {
              showNewMessageNotification(payload.new.chat_id, `${senderName} (${chatTitle})`, payload.new.content)
            }
          } else {
            console.log('ℹ️ Mensagem enviada pelo usuário atual, não notificar')
          }
          
          // SEMPRE atualizar lista de chats para mostrar todos os chats
          console.log('🔄 Atualizando lista completa de chats...')
          await loadChats()
          
          // NÃO adicionar mensagens do chat ativo aqui - isso é feito pelo canal específico
          // Evita duplicação de mensagens
          console.log('ℹ️ Canal global: mensagem processada (lista de mensagens gerenciada pelo canal específico)')
        }
      )
      .subscribe((status) => {
        console.log('🌐 Status do monitoramento GLOBAL:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Sistema ATIVO - Monitorando todas as mensagens!')
          console.log('🎯 Aguardando mensagens de qualquer usuário do sistema...')
          setConnectionStatus('connected')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Erro na conexão RealTime')
          setConnectionStatus('disconnected')
        } else {
          console.log('🔄 Conectando ao monitoramento global...')
          setConnectionStatus('connecting')
        }
      })

    // Listener para novos chats
    const chatsChannel = supabase
      .channel(`user-chats-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'chats',
        },
        async (payload) => {
          console.log('📝 Mudança detectada em chats:', payload)
          
          // MODO ADMIN: Detectar QUALQUER mudança em chats
          const chat = payload.new || payload.old
          if (chat) {
            console.log('🔄 MODO ADMIN: Nova mudança em chat detectada, atualizando lista completa...')
            console.log(`   Chat ID: ${chat.id}`)
            console.log(`   Participantes: ${chat.user_id} + ${chat.psychologist_id || 'nenhum'}`)
            await loadChats()
          }
        }
      )
      .subscribe((status) => {
        console.log('📋 Status da conexão RealTime (chats):', status)
      })

    return () => {
      console.log('🛑 Desconectando monitoramento global')
      supabase.removeChannel(globalMessagesChannel)
      supabase.removeChannel(chatsChannel)
    }
  }, [currentUserId, isSetupComplete, currentChat])

  // Reset para reconfigurar
  const resetSetup = () => {
    setIsSetupComplete(false)
    setCurrentChat(null)
    setChats([])
    setMessages([])
    setCurrentUserId('')
    setSelectedUserId('')
    setConnectionStatus('disconnected')
  }

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600'
      case 'connecting': return 'text-yellow-600'
      default: return 'text-red-600'
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Conectado'
      case 'connecting': return 'Conectando...'
      default: return 'Desconectado'
    }
  }

  if (!isSetupComplete) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>🔥 Painel Administrativo - Chat System</CardTitle>
            <CardDescription>
              Selecione sua identidade como moderador. Você poderá visualizar e responder a <strong>TODOS os chats</strong> criados pela aplicação Flutter, independentemente dos participantes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Selecione seu usuário:
              </label>
              {availableUsers.length > 0 ? (
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Selecione um usuário --</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} (@{user.username}) - {user.user_role}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-600">Carregando usuários...</span>
                </div>
              )}
            </div>
            
            {selectedUserId && (
              <div className="p-3 bg-red-50 rounded-md border border-red-200">
                <p className="text-sm text-red-800">
                  <strong>🛡️ Moderador selecionado:</strong> {availableUsers.find(u => u.id === selectedUserId)?.name}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  ⚡ Modo Admin: Acesso completo a TODOS os chats do sistema Flutter
                </p>
              </div>
            )}
            
            <Button 
              onClick={setupUser} 
              disabled={isLoading || !selectedUserId}
              className="w-full"
            >
              {isLoading ? 'Entrando...' : 'Entrar no Sistema'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Notificação de Nova Mensagem */}
      {newMessageNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-bounce">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <div>
              <p className="text-sm font-medium">Nova mensagem!</p>
              <p className="text-xs opacity-90">{newMessageNotification.message}</p>
            </div>
            <button 
              onClick={() => setNewMessageNotification(null)}
              className="ml-2 text-white hover:text-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">🔥 Chat System - Painel Administrativo</h1>
            <p className="text-sm text-gray-600">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <strong>MODO ADMIN:</strong> Visualizando TODOS os chats do sistema
              </span>
              {currentChat && ` • Chat ativo: ${currentChat.title || 'Sem título'}`}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`} />
              <span className={`text-sm ${getConnectionStatusColor()}`}>
                {getConnectionStatusText()}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={resetSetup}>
              Trocar Usuário
            </Button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="h-[calc(100vh-80px)] flex">
        {/* Chat List Sidebar */}
        <ChatList
          chats={chats}
          currentChatId={currentChat?.id}
          currentUserId={currentUserId}
          onChatSelect={handleChatSelect}
          onRefresh={loadChats}
          isLoading={isLoadingChats}
          highlightedChats={highlightedChats}
        />

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {currentChat ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-medium">{currentChat.title || 'Chat'}</h2>
                    <p className="text-sm text-gray-500">
                      Participantes: {currentChat.participantCount} • {messages.length} mensagens
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <MessageList 
                messages={messages}
                currentUserId={currentUserId}
                isLoading={isLoading}
              />

              {/* Input */}
              <ChatInput 
                onSendMessage={sendMessage}
                placeholder="Digite sua mensagem..."
                disabled={connectionStatus !== 'connected'}
              />
            </>
          ) : (
            /* No Chat Selected */
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Selecione um chat para moderar</h3>
                <p className="text-gray-500">
                  {chats.length === 0 
                    ? '🔍 Aguardando criação de chats pelo Flutter...' 
                    : '👈 Escolha qualquer chat da lista para visualizar e responder mensagens'}
                </p>
                {chats.length === 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    ⚡ O sistema detectará automaticamente novos chats criados pela aplicação Flutter
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  )
} 