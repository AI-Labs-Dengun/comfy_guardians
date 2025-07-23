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
    // Verificar se já existe um registro de responsável para este email
    const { data: existingGuardian, error: existingError } = await supabase
      .from('children_guardians')
      .select('id')
      .eq('guardian_email', guardianEmail)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('❌ Erro ao verificar responsável existente:', existingError)
    }

    if (existingGuardian) {
      console.log('❌ Já existe responsável para este email')
      return NextResponse.json(
        { error: 'Já existe um registro para este responsável.' },
        { status: 409 }
      )
    }

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

    // Dados para inserção na tabela children_guardians
    const guardianData = {
      child_name: childProfile.name,
      child_birth_date: new Date().toISOString().split('T')[0], // Data atual como fallback
      guardian_name: guardianName,
      guardian_email: guardianEmail,
      guardian_address: guardianAddress,
      guardian_postal_code: guardianPostalCode,
      terms_of_use: termsOfUse,
      gdpr_consent_declaration: gdprConsentDeclaration,
      account_creation_authorization_date: new Date().toISOString()
    }

    console.log('📝 Dados do responsável para inserção:', JSON.stringify(guardianData, null, 2))

    // Verificar se a tabela children_guardians existe e tem a estrutura correta
    console.log('🔍 Verificando estrutura da tabela children_guardians...')
    try {
      const { data: tableInfo, error: tableError } = await supabase
        .from('children_guardians')
        .select('*')
        .limit(1)

      if (tableError) {
        console.error('❌ Erro ao verificar tabela children_guardians:', tableError)
        console.warn('⚠️ Pulando inserção na tabela children_guardians - tabela não acessível')
      } else {
        console.log('✅ Tabela children_guardians acessível')
      }
    } catch (tableCheckException) {
      console.error('❌ Exceção ao verificar tabela:', tableCheckException)
      console.warn('⚠️ Pulando inserção na tabela children_guardians - erro na verificação')
    }

    // Tentar inserir dados do responsável na tabela children_guardians
    let insertResult = null
    let guardianError = null

    try {
      console.log('🔧 Tentando inserção na tabela children_guardians...')
      const { data, error } = await supabase
        .from('children_guardians')
        .insert(guardianData)
        .select()

      insertResult = data
      guardianError = error
      
      if (guardianError) {
        console.error('❌ Erro na inserção:', guardianError)
        console.error('❌ Código do erro:', guardianError.code)
        console.error('❌ Mensagem do erro:', guardianError.message)
        console.error('❌ Detalhes do erro:', guardianError.details)
        console.error('❌ Dica do erro:', guardianError.hint)
      } else {
        console.log('✅ Inserção bem-sucedida:', insertResult)
      }
    } catch (insertException) {
      console.error('❌ Exceção ao inserir dados do responsável:', insertException)
      guardianError = {
        code: 'INSERT_EXCEPTION',
        message: insertException instanceof Error ? insertException.message : 'Erro desconhecido na inserção',
        details: null,
        hint: null
      }
    }

    // Por enquanto, não vamos falhar se a inserção na tabela children_guardians falhar
    // A autorização principal já foi feita com sucesso
    if (guardianError) {
      console.warn('⚠️ Aviso: Não foi possível salvar dados adicionais do responsável, mas a autorização foi processada com sucesso')
      console.warn('⚠️ Dados que não foram salvos:', guardianData)
      
      // Tentar uma abordagem alternativa usando RPC
      console.log('🔧 Tentando abordagem alternativa via RPC...')
      try {
        const { data: rpcResult, error: rpcError } = await supabase
          .rpc('save_guardian_data', {
            p_child_name: childProfile.name,
            p_guardian_name: guardianName,
            p_guardian_email: guardianEmail,
            p_guardian_address: guardianAddress,
            p_guardian_postal_code: guardianPostalCode,
            p_terms_of_use: termsOfUse,
            p_gdpr_consent: gdprConsentDeclaration
          })
        
        if (rpcError) {
          console.error('❌ Erro na função RPC:', rpcError)
          console.warn('⚠️ Função RPC também falhou, mas a autorização principal foi bem-sucedida')
        } else {
          console.log('✅ Dados salvos via RPC:', rpcResult)
        }
      } catch (rpcException) {
        console.error('❌ Exceção na função RPC:', rpcException)
        console.warn('⚠️ Função RPC falhou, mas a autorização principal foi bem-sucedida')
      }
      
      // Retornar sucesso mesmo com erro na inserção da tabela children_guardians
      // pois a autorização principal foi bem-sucedida
    } else {
      console.log('✅ Dados do responsável salvos com sucesso:', insertResult)
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