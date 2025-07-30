import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📝 Dados recebidos na API de rejeição:', JSON.stringify(body, null, 2))
    
    const {
      childId,
      approvalToken,
      guardianEmail
    } = body

    // Validação dos dados recebidos
    if (!childId || !guardianEmail) {
      console.log('❌ Validação falhou - campos obrigatórios:', { childId, guardianEmail })
      return NextResponse.json(
        { error: 'ID da criança e email do responsável são obrigatórios.' },
        { status: 400 }
      )
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(guardianEmail)) {
      console.log('❌ Email inválido:', guardianEmail)
      return NextResponse.json(
        { error: 'Email inválido.' },
        { status: 400 }
      )
    }

    console.log('🔍 Buscando perfil da criança:', childId)
    // Verificar se a criança existe
    const { data: childProfile, error: childError } = await supabase
      .from('profiles')
      .select('id, name, username, guardian_email, authorized, approval_token')
      .eq('id', childId)
      .single()

    if (childError) {
      console.error('❌ Erro ao buscar perfil da criança:', childError)
      return NextResponse.json(
        { error: 'Criança não encontrada.' },
        { status: 404 }
      )
    }

    if (!childProfile) {
      console.log('❌ Perfil da criança não encontrado')
      return NextResponse.json(
        { error: 'Criança não encontrada.' },
        { status: 404 }
      )
    }

    console.log('✅ Perfil da criança encontrado:', { name: childProfile.name, authorized: childProfile.authorized })

    if (childProfile.authorized === true) {
      console.log('❌ Criança já autorizada')
      return NextResponse.json(
        { error: 'Esta criança já foi autorizada.' },
        { status: 409 }
      )
    }

    if (childProfile.authorized === false) {
      console.log('❌ Criança já rejeitada')
      return NextResponse.json(
        { error: 'Esta criança já foi rejeitada anteriormente.' },
        { status: 409 }
      )
    }

    // Verificar se o email do responsável corresponde
    if (childProfile.guardian_email !== guardianEmail) {
      console.log('❌ Email não corresponde:', { 
        registered: childProfile.guardian_email, 
        provided: guardianEmail 
      })
      return NextResponse.json(
        { error: 'Email do responsável não corresponde ao registrado.' },
        { status: 403 }
      )
    }

    // Verificar se o token corresponde (se fornecido)
    if (approvalToken && childProfile.approval_token !== approvalToken) {
      console.log('❌ Token não corresponde:', { 
        registered: childProfile.approval_token, 
        provided: approvalToken 
      })
      return NextResponse.json(
        { error: 'Token de autorização inválido.' },
        { status: 403 }
      )
    }

    console.log('🔧 Atualizando status para rejeitado...')
    // Atualizar o status para rejeitado (false)
    const { data: updateResult, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        authorized: false,
        authorized_at: new Date().toISOString(),
        authorized_by: guardianEmail,
        rejection_reason: 'Rejeitado pelo responsável via formulário web'
      })
      .eq('id', childId)
      .select()

    if (updateError) {
      console.error('❌ Erro ao atualizar status:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Erro ao processar rejeição.' },
        { status: 500 }
      )
    }

    if (!updateResult || updateResult.length === 0) {
      console.error('❌ Nenhum registro foi atualizado')
      return NextResponse.json(
        { error: 'Erro ao processar rejeição.' },
        { status: 500 }
      )
    }

    console.log('✅ Rejeição processada com sucesso:', updateResult[0])

    return NextResponse.json(
      { 
        success: true, 
        message: 'Rejeição processada com sucesso.',
        childName: childProfile.name,
        username: childProfile.username
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ Erro geral na API de rejeição:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
} 