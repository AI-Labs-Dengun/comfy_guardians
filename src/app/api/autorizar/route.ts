import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📝 Dados recebidos na API:', JSON.stringify(body, null, 2))
    
    const {
      childId,
      approvalToken,
      guardianName,
      guardianEmail,
      guardianAddress,
      guardianPostalCode,
      termsOfUse,
      gdprConsentDeclaration
    } = body

    // Validação dos dados recebidos
    if (!childId || !guardianName || !guardianEmail || !guardianAddress || !guardianPostalCode) {
      console.log('❌ Validação falhou - campos obrigatórios:', { childId, guardianName, guardianEmail, guardianAddress, guardianPostalCode })
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios.' },
        { status: 400 }
      )
    }

    if (!termsOfUse || !gdprConsentDeclaration) {
      console.log('❌ Validação falhou - termos não aceitos:', { termsOfUse, gdprConsentDeclaration })
      return NextResponse.json(
        { error: 'Deve aceitar os termos de uso e a declaração de consentimento RGPD.' },
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
    // Verificar se a criança existe e não está autorizada
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

    console.log('🔍 Verificando se já existe responsável para este email:', guardianEmail)
    // A verificação de responsável existente será feita pela função save_guardian_data

    console.log('🔧 Chamando função authorize_account...')
    // Usar a função nativa do Supabase para autorizar a conta
    const { data: authResult, error: authError } = await supabase
      .rpc('authorize_account', {
        approval_token_param: childProfile.approval_token,
        guardian_email_param: guardianEmail,
        guardian_ip: request.headers.get('x-forwarded-for') || null,
        guardian_user_agent: request.headers.get('user-agent') || null
      })

    if (authError) {
      console.error('❌ Erro ao autorizar conta:', authError)
      return NextResponse.json(
        { error: authError.message || 'Erro ao autorizar conta.' },
        { status: 500 }
      )
    }

    if (!authResult?.success) {
      console.error('❌ Autorização falhou:', authResult)
      return NextResponse.json(
        { error: authResult?.error || 'Erro ao autorizar conta.' },
        { status: 500 }
      )
    }

    console.log('✅ Conta autorizada com sucesso, salvando dados do responsável...')

    // Salvar dados do responsável usando a função RPC
    console.log('🔧 Salvando dados do responsável via função RPC...')
    const { data: guardianResult, error: guardianError } = await supabase
      .rpc('save_guardian_data', {
        p_child_name: childProfile.name,
        p_guardian_name: guardianName,
        p_guardian_email: guardianEmail,
        p_guardian_address: guardianAddress,
        p_guardian_postal_code: guardianPostalCode,
        p_terms_of_use: termsOfUse,
        p_gdpr_consent: gdprConsentDeclaration
      })

    if (guardianError) {
      console.error('❌ Erro ao salvar dados do responsável:', guardianError)
      console.warn('⚠️ Aviso: Não foi possível salvar dados adicionais do responsável, mas a autorização foi processada com sucesso')
      
      // Tentar inserção direta como fallback
      console.log('🔧 Tentando inserção direta como fallback...')
      try {
        const guardianData = {
          child_name: childProfile.name,
          guardian_name: guardianName,
          guardian_email: guardianEmail,
          guardian_address: guardianAddress,
          guardian_postal_code: guardianPostalCode,
          terms_of_use: termsOfUse,
          gdpr_consent_declaration: gdprConsentDeclaration
        }

        const { data: insertResult, error: insertError } = await supabase
          .from('children_guardians')
          .insert(guardianData)
          .select()

        if (insertError) {
          console.error('❌ Erro na inserção direta:', insertError)
          console.warn('⚠️ Inserção direta também falhou, mas a autorização principal foi bem-sucedida')
        } else {
          console.log('✅ Dados salvos via inserção direta:', insertResult)
        }
      } catch (insertException) {
        console.error('❌ Exceção na inserção direta:', insertException)
        console.warn('⚠️ Inserção direta falhou, mas a autorização principal foi bem-sucedida')
      }
    } else {
      console.log('✅ Dados do responsável salvos com sucesso:', guardianResult)
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
    console.error('❌ Erro geral na API de autorização:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
} 