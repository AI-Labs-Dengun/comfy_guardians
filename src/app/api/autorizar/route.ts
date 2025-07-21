import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      childId,
      guardianName,
      guardianEmail,
      guardianAddress,
      guardianPostalCode,
      termsOfUse,
      gdprConsentDeclaration
    } = body

    // Validação dos dados recebidos
    if (!childId || !guardianName || !guardianEmail || !guardianAddress || !guardianPostalCode) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios.' },
        { status: 400 }
      )
    }

    if (!termsOfUse || !gdprConsentDeclaration) {
      return NextResponse.json(
        { error: 'Deve aceitar os termos de uso e a declaração de consentimento RGPD.' },
        { status: 400 }
      )
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(guardianEmail)) {
      return NextResponse.json(
        { error: 'Email inválido.' },
        { status: 400 }
      )
    }

    // Verificar se a criança existe e não está autorizada
    const { data: childProfile, error: childError } = await supabase
      .from('profiles')
      .select('id, name, username, guardian_email, authorized, approval_token')
      .eq('id', childId)
      .single()

    if (childError || !childProfile) {
      return NextResponse.json(
        { error: 'Criança não encontrada.' },
        { status: 404 }
      )
    }

    if (childProfile.authorized === true) {
      return NextResponse.json(
        { error: 'Esta criança já foi autorizada.' },
        { status: 409 }
      )
    }

    // Verificar se o email do responsável corresponde
    if (childProfile.guardian_email !== guardianEmail) {
      return NextResponse.json(
        { error: 'Email do responsável não corresponde ao registrado.' },
        { status: 403 }
      )
    }

    // Verificar se já existe um registro de responsável para este email
    const { data: existingGuardian } = await supabase
      .from('children_guardians')
      .select('id')
      .eq('guardian_email', guardianEmail)
      .single()

    if (existingGuardian) {
      return NextResponse.json(
        { error: 'Já existe um registro para este responsável.' },
        { status: 409 }
      )
    }

    // Usar a função nativa do Supabase para autorizar a conta
    const { data: authResult, error: authError } = await supabase
      .rpc('authorize_account', {
        approval_token_param: childProfile.approval_token,
        guardian_email_param: guardianEmail,
        guardian_ip: request.headers.get('x-forwarded-for') || null,
        guardian_user_agent: request.headers.get('user-agent') || null
      })

    if (authError || !authResult?.success) {
      console.error('Erro ao autorizar conta:', authError || authResult?.error)
      return NextResponse.json(
        { error: authResult?.error || 'Erro ao autorizar conta.' },
        { status: 500 }
      )
    }

    // Salvar dados do responsável na tabela children_guardians
    const { error: guardianError } = await supabase
      .from('children_guardians')
      .insert({
        child_name: childProfile.name,
        child_birth_date: new Date().toISOString().split('T')[0], // Data atual como fallback
        guardian_name: guardianName,
        guardian_email: guardianEmail,
        guardian_address: guardianAddress,
        guardian_postal_code: guardianPostalCode,
        terms_of_use: termsOfUse,
        gdpr_consent_declaration: gdprConsentDeclaration,
        account_creation_authorization_date: new Date().toISOString()
      })

    if (guardianError) {
      console.error('Erro ao salvar dados do responsável:', guardianError)
      return NextResponse.json(
        { error: 'Erro ao salvar dados do responsável.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Autorização processada com sucesso.',
        childName: childProfile.name,
        username: childProfile.username
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Erro na API de autorização:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
} 