import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { chat_id, sender_id, content, message_type = 'text', metadata } = await request.json()

    console.log('📤 Recebendo request de envio de mensagem:', {
      chat_id,
      sender_id,
      content: content?.substring(0, 50) + '...',
      message_type
    })

    if (!chat_id || !sender_id || !content) {
      console.log('❌ Dados obrigatórios faltando:', { chat_id, sender_id, content: !!content })
      return NextResponse.json({ 
        error: 'Chat ID, sender ID e conteúdo são obrigatórios' 
      }, { status: 400 })
    }

    // Verificar se o chat existe e está ativo
    console.log('🔍 Verificando se chat existe:', chat_id)
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chat_id)
      .eq('is_active', true)
      .single()

    if (chatError || !chat) {
      console.log('❌ Chat não encontrado:', { chatError, chat })
      return NextResponse.json({ 
        error: 'Chat não encontrado ou inativo',
        chatError: chatError?.message 
      }, { status: 404 })
    }

    console.log('✅ Chat encontrado:', {
      id: chat.id,
      user_id: chat.user_id,
      psychologist_id: chat.psychologist_id,
      is_active: chat.is_active
    })

    // Log dos dados que serão inseridos
    console.log('🔍 Tentando inserir mensagem:', {
      chat_id,
      sender_id,
      content: content.substring(0, 50) + '...',
      message_type,
      metadata
    })

    // Buscar nome do remetente para compatibilidade
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('name, username')
      .eq('id', sender_id)
      .single()

    const senderName = senderProfile?.name || senderProfile?.username || sender_id

    console.log('👤 Sender info:', { sender_id, senderName, senderProfile })

    // Criar a mensagem (incluindo sender_name para compatibilidade)
    const { data: newMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        chat_id,
        sender_id,
        sender_name: senderName, // Adicionado para compatibilidade
        content,
        message_type,
        metadata,
        is_read: false
      })
      .select()
      .single()

    if (messageError) {
      console.error('💥 ERRO DETALHADO ao criar mensagem:', {
        error: messageError,
        message: messageError.message,
        details: messageError.details,
        hint: messageError.hint,
        code: messageError.code
      })
      
      // Retornar erro específico para debugging
      return NextResponse.json({ 
        error: `Erro ao criar mensagem: ${messageError.message}`,
        details: messageError.details,
        hint: messageError.hint,
        code: messageError.code
      }, { status: 500 })
    }

    console.log('✅ Mensagem criada com sucesso:', {
      id: newMessage.id,
      chat_id: newMessage.chat_id,
      sender_id: newMessage.sender_id
    })

    // Atualizar o último horário de mensagem do chat
    console.log('🔄 Atualizando last_message_at do chat...')
    const { error: updateError } = await supabase
      .from('chats')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', chat_id)

    if (updateError) {
      console.error('⚠️ Erro ao atualizar chat (não crítico):', updateError)
    } else {
      console.log('✅ Chat atualizado com sucesso')
    }

    console.log('🎉 Operação completa - mensagem enviada!')
    return NextResponse.json({ 
      message: 'Mensagem enviada com sucesso',
      data: newMessage 
    }, { status: 201 })

  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { message_id, is_read } = await request.json()

    if (!message_id) {
      return NextResponse.json({ error: 'Message ID é obrigatório' }, { status: 400 })
    }

    // Marcar mensagem como lida
    const { data: updatedMessage, error } = await supabase
      .from('messages')
      .update({ is_read: is_read ?? true })
      .eq('id', message_id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar mensagem:', error)
      return NextResponse.json({ error: 'Erro ao atualizar mensagem' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Mensagem atualizada com sucesso',
      data: updatedMessage 
    }, { status: 200 })

  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
} 