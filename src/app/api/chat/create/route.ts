import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { user_id, psychologist_id, title } = await request.json()

    if (!user_id) {
      return NextResponse.json({ error: 'User ID é obrigatório' }, { status: 400 })
    }

    // Verificar se já existe um chat ativo entre o usuário e psicólogo
    const { data: existingChat, error: checkError } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user_id)
      .eq('psychologist_id', psychologist_id || null)
      .eq('is_active', true)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = No rows returned
      console.error('Erro ao verificar chat existente:', checkError)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    if (existingChat) {
      return NextResponse.json({ 
        message: 'Chat já existe',
        chat: existingChat 
      }, { status: 200 })
    }

    // Criar novo chat
    const { data: newChat, error: createError } = await supabase
      .from('chats')
      .insert({
        user_id,
        psychologist_id: psychologist_id || null,
        title: title || `Chat com ${user_id}`,
        is_active: true
      })
      .select()
      .single()

    if (createError) {
      console.error('Erro ao criar chat:', createError)
      return NextResponse.json({ error: 'Erro ao criar chat' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Chat criado com sucesso',
      chat: newChat 
    }, { status: 201 })

  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
} 