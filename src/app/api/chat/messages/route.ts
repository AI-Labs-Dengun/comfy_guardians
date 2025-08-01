import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const chat_id = searchParams.get('chat_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')

    if (!chat_id) {
      return NextResponse.json({ error: 'Chat ID é obrigatório' }, { status: 400 })
    }

    // Verificar se o chat existe
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chat_id)
      .single()

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Chat não encontrado' }, { status: 404 })
    }

    // Buscar mensagens do chat com paginação
    const offset = (page - 1) * limit
    const { data: messages, error: messagesError, count } = await supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('chat_id', chat_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (messagesError) {
      console.error('Erro ao buscar mensagens:', messagesError)
      return NextResponse.json({ error: 'Erro ao buscar mensagens' }, { status: 500 })
    }

    // Buscar informações dos remetentes
    const senderIds = [...new Set(messages?.map(msg => msg.sender_id) || [])]
    const { data: senders } = await supabase
      .from('profiles')
      .select('id, name, username, avatar_path')
      .in('id', senderIds)

    // Mapear mensagens com informações dos remetentes
    const messagesWithSenders = messages?.map(message => ({
      ...message,
      sender: senders?.find(sender => sender.id === message.sender_id)
    })) || []

    return NextResponse.json({ 
      messages: messagesWithSenders.reverse(), // Reverter para ordem cronológica
      chat,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user_id } = await request.json()

    if (!user_id) {
      return NextResponse.json({ error: 'User ID é obrigatório' }, { status: 400 })
    }

    // Buscar todos os chats do usuário
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select(`
        *,
        messages!inner(
          id,
          content,
          message_type,
          is_read,
          created_at,
          sender_id
        )
      `)
      .or(`user_id.eq.${user_id},psychologist_id.eq.${user_id}`)
      .eq('is_active', true)
      .order('last_message_at', { ascending: false })

    if (chatsError) {
      console.error('Erro ao buscar chats:', chatsError)
      return NextResponse.json({ error: 'Erro ao buscar chats' }, { status: 500 })
    }

    return NextResponse.json({ 
      chats: chats || []
    }, { status: 200 })

  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
} 