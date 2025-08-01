import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const current_user_id = searchParams.get('current_user_id')
    const admin_mode = searchParams.get('admin_mode') === 'true'

    // MODO ADMINISTRATIVO: Buscar TODOS os chats do sistema
    let query = supabase
      .from('chats')
      .select(`
        *,
        messages(
          id,
          content,
          created_at,
          sender_id,
          is_read
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    // Se NÃO for modo admin E tiver current_user_id, filtrar apenas chats do usuário
    if (!admin_mode && current_user_id) {
      query = query.or(`user_id.eq.${current_user_id},psychologist_id.eq.${current_user_id}`)
    }

    console.log(`🔍 Buscando chats - Admin Mode: ${admin_mode}, User: ${current_user_id || 'Todos'}`)

    // TESTE: Primeiro buscar todos os chats simples para debug
    const { data: simpleChats, error: simpleError } = await supabase
      .from('chats')
      .select('id, user_id, psychologist_id, title, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    console.log(`🔍 TESTE SIMPLES: ${simpleChats?.length || 0} chats encontrados`)
    if (simpleChats && simpleChats.length > 0) {
      console.log('📋 Chats simples encontrados:')
      simpleChats.slice(0, 3).forEach((chat, index) => {
        console.log(`  ${index + 1}. ID: ${chat.id}, Active: ${chat.is_active}, Created: ${chat.created_at}`)
      })
    }

    const { data: chats, error: chatsError } = await query

    if (chatsError) {
      console.error('❌ Erro ao buscar chats:', chatsError)
      console.error('Query usada:', query)
      return NextResponse.json({ 
        error: 'Erro ao buscar chats', 
        details: chatsError,
        query_info: { admin_mode, current_user_id }
      }, { status: 500 })
    }

    console.log(`📊 Query executada com sucesso. Chats encontrados: ${chats?.length || 0}`)
    
    if (chats && chats.length > 0) {
      console.log('📋 Primeiros chats encontrados:')
      chats.slice(0, 3).forEach((chat, index) => {
        console.log(`  ${index + 1}. ID: ${chat.id}, Title: ${chat.title || 'Sem título'}, Active: ${chat.is_active}`)
      })
    } else {
      console.log('⚠️ Nenhum chat encontrado - verificar:')
      console.log('  1. Se há chats na tabela chats')
      console.log('  2. Se is_active = true')
      console.log('  3. Se há mensagens associadas (inner join)')
    }

    // Buscar informações dos participantes
    const userIds = new Set<string>()
    chats?.forEach(chat => {
      if (chat.user_id) userIds.add(chat.user_id)
      if (chat.psychologist_id) userIds.add(chat.psychologist_id)
      // Adicionar sender_ids das mensagens também
      chat.messages?.forEach((msg: any) => {
        if (msg.sender_id) userIds.add(msg.sender_id)
      })
    })

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, username, avatar_path, user_role')
      .in('id', Array.from(userIds))

    // Mapear chats com informações dos participantes e última mensagem
    const chatsWithDetails = chats?.map(chat => {
      const user = profiles?.find(p => p.id === chat.user_id)
      const psychologist = profiles?.find(p => p.id === chat.psychologist_id)
      
      // Ordenar mensagens por data (mais recente primeiro)
      const sortedMessages = chat.messages ? 
        [...chat.messages].sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ) : []
      
      // Buscar última mensagem
      const lastMessage = sortedMessages[0]
      const lastMessageSender = lastMessage ? profiles?.find(p => p.id === lastMessage.sender_id) : null

      // Contar mensagens não lidas
      let unreadCount = 0
      if (admin_mode) {
        // No modo admin, contar TODAS as mensagens não lidas
        unreadCount = sortedMessages.filter((msg: any) => !msg.is_read).length || 0
      } else if (current_user_id) {
        // No modo usuário, contar apenas as não lidas de outros
        unreadCount = sortedMessages.filter((msg: any) => 
          msg.sender_id !== current_user_id && !msg.is_read
        ).length || 0
      }

      console.log(`📝 Chat ${chat.id}: ${sortedMessages.length} mensagens, ${unreadCount} não lidas`)

      return {
        ...chat,
        user,
        psychologist,
        lastMessage: lastMessage ? {
          ...lastMessage,
          sender: lastMessageSender
        } : null,
        unreadCount,
        participantCount: [chat.user_id, chat.psychologist_id].filter(Boolean).length,
        isAdminMode: admin_mode,
        messageCount: sortedMessages.length
      }
    }) || []

    console.log(`📊 Encontrados ${chatsWithDetails.length} chats (Admin: ${admin_mode})`)

    return NextResponse.json({ 
      chats: chatsWithDetails,
      total: chatsWithDetails.length
    }, { status: 200 })

  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Buscar todos os usuários disponíveis para criar chats
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, name, username, avatar_path, user_role, authorized')
      .eq('authorized', true)
      .order('name')

    if (error) {
      console.error('Erro ao buscar perfis:', error)
      return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 })
    }

    // Separar por roles
    const users = profiles?.filter(p => p.user_role === 'app') || []
    const psychologists = profiles?.filter(p => p.user_role === 'psicologo') || []
    const admins = profiles?.filter(p => p.user_role === 'cms') || []

    return NextResponse.json({ 
      users: {
        app: users,
        psicologo: psychologists,
        cms: admins,
        all: profiles || []
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
} 