import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Iniciando debug do sistema...')

    // 1. Testar conexão básica com Supabase
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profiles')
      .select('count(*)')
      .limit(1)

    if (connectionError) {
      console.error('❌ Erro de conexão Supabase:', connectionError)
      return NextResponse.json({ 
        error: 'Erro de conexão', 
        details: connectionError 
      }, { status: 500 })
    }

    // 2. Testar acesso à tabela chats
    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    console.log('📋 Chats encontrados:', chatsData?.length || 0)
    if (chatsError) {
      console.error('❌ Erro ao acessar chats:', chatsError)
    }

    // 3. Testar acesso à tabela messages
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    console.log('💬 Mensagens encontradas:', messagesData?.length || 0)
    if (messagesError) {
      console.error('❌ Erro ao acessar mensagens:', messagesError)
    }

    // 4. Testar acesso à tabela profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, username, user_role')
      .limit(10)

    console.log('👤 Perfis encontrados:', profilesData?.length || 0)
    if (profilesError) {
      console.error('❌ Erro ao acessar perfis:', profilesError)
    }

    // 5. Testar query complexa (mesma da API de chats)
    const { data: complexQuery, error: complexError } = await supabase
      .from('chats')
      .select(`
        *,
        messages!inner(
          id,
          content,
          created_at,
          sender_id,
          is_read
        )
      `)
      .eq('is_active', true)
      .order('last_message_at', { ascending: false })
      .limit(5)

    console.log('🔥 Query complexa resultado:', complexQuery?.length || 0)
    if (complexError) {
      console.error('❌ Erro na query complexa:', complexError)
    }

    // 6. Verificar dados mais recentes
    const { data: recentChats } = await supabase
      .from('chats')
      .select('id, user_id, psychologist_id, title, created_at, is_active')
      .order('created_at', { ascending: false })
      .limit(3)

    const { data: recentMessages } = await supabase
      .from('messages')
      .select('id, chat_id, sender_id, content, created_at')
      .order('created_at', { ascending: false })
      .limit(3)

    // Resultado do debug
    const debugResult = {
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
      connection: connectionError ? 'FAILED' : 'OK',
      data_access: {
        chats: {
          accessible: !chatsError,
          count: chatsData?.length || 0,
          error: chatsError?.message || null
        },
        messages: {
          accessible: !messagesError,
          count: messagesData?.length || 0,
          error: messagesError?.message || null
        },
        profiles: {
          accessible: !profilesError,
          count: profilesData?.length || 0,
          error: profilesError?.message || null
        },
        complex_query: {
          accessible: !complexError,
          count: complexQuery?.length || 0,
          error: complexError?.message || null
        }
      },
      recent_data: {
        chats: recentChats || [],
        messages: recentMessages || []
      },
      environment: {
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT_SET',
        supabase_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT_SET'
      }
    }

    console.log('✅ Debug concluído:', debugResult)

    return NextResponse.json(debugResult, { status: 200 })

  } catch (error) {
    console.error('💥 Erro crítico no debug:', error)
    return NextResponse.json({ 
      status: 'CRITICAL_ERROR',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Endpoint para testar criação de dados
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === 'test_create_chat') {
      // Testar criação de chat
      const { data, error } = await supabase
        .from('chats')
        .insert({
          user_id: 'test-user-debug',
          psychologist_id: 'test-psico-debug',
          title: 'Chat de Teste Debug',
          is_active: true
        })
        .select()
        .single()

      return NextResponse.json({
        action: 'test_create_chat',
        success: !error,
        data,
        error: error?.message
      })
    }

    if (action === 'test_create_message') {
      const { chat_id } = await request.json()
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chat_id || 'test-chat-id',
          sender_id: 'test-sender-debug',
          content: 'Mensagem de teste debug',
          message_type: 'text',
          is_read: false
        })
        .select()
        .single()

      return NextResponse.json({
        action: 'test_create_message',
        success: !error,
        data,
        error: error?.message
      })
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 })

  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }, { status: 500 })
  }
} 