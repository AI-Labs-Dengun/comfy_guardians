'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Profile } from '@/lib/supabase'
import { Shield, User, Mail, MapPin, FileText, CheckCircle, AlertCircle } from 'lucide-react'

interface FormData {
  guardianName: string
  guardianEmail: string
  guardianAddress: string
  guardianPostalCode: string
  termsOfUse: boolean
  gdprConsentDeclaration: boolean
}

export default function AutorizarCrianca() {
  const params = useParams()
  const router = useRouter()
  const childId = params.childId as string
  
  // Log para debug em produção
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🔍 Debug - URL atual:', window.location.href)
      console.log('🔍 Debug - Child ID:', childId)
      console.log('🔍 Debug - Params:', params)
      console.log('🔍 Debug - Search params:', window.location.search)
      
      // Validar formato do childId (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (childId && !uuidRegex.test(childId)) {
        console.warn('⚠️ Child ID não parece ser um UUID válido:', childId)
      }
    }
  }, [childId, params])
  
  const [childProfile, setChildProfile] = useState<Profile | null>(null)
  const [approvalToken, setApprovalToken] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    guardianName: '',
    guardianEmail: '',
    guardianAddress: '',
    guardianPostalCode: '',
    termsOfUse: false,
    gdprConsentDeclaration: false
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Função para verificar se o formulário está completo
  const isFormComplete = (): boolean => {
    return !!(
      formData.guardianName.trim() &&
      formData.guardianEmail.trim() &&
      formData.guardianAddress.trim() &&
      formData.guardianPostalCode.trim() &&
      formData.termsOfUse &&
      formData.gdprConsentDeclaration
    )
  }

  const loadChildProfile = useCallback(async () => {
    try {
      console.log('🔍 Carregando perfil da criança:', childId)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', childId)
        .single()

      if (error) {
        console.error('❌ Erro ao carregar perfil:', error)
        throw error
      }

      if (!data) {
        console.warn('⚠️ Nenhum perfil encontrado para ID:', childId)
        setError('Criança não encontrada.')
        return
      }

      console.log('✅ Perfil carregado:', { name: data.name, authorized: data.authorized })

      if (data.authorized === true) {
        setError('Esta criança já foi autorizada.')
        return
      }

      setChildProfile(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('❌ Erro ao carregar informações da criança:', errorMessage)
      setError('Erro ao carregar informações da criança. Verifique se o link está correto.')
    } finally {
      setLoading(false)
    }
  }, [childId])

  // Carregar informações da criança
  useEffect(() => {
    if (!childId) {
      console.error('❌ Child ID não fornecido')
      setError('ID da criança não fornecido na URL.')
      setLoading(false)
      return
    }

    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(childId)) {
      console.error('❌ Child ID com formato inválido:', childId)
      setError('Formato do ID da criança é inválido.')
      setLoading(false)
      return
    }

    loadChildProfile()
  }, [childId, loadChildProfile])

  // Pré-preencher email e token a partir da URL se disponível
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const email = urlParams.get('email')
      const token = urlParams.get('token')
      
      console.log('🔍 Parâmetros da URL:', { email, token })
      
      if (email) {
        // Decodificar o email se estiver URL encoded
        const decodedEmail = decodeURIComponent(email)
        console.log('📧 Email extraído da URL:', decodedEmail)
        setFormData(prev => ({ ...prev, guardianEmail: decodedEmail }))
      }
      
      if (token) {
        console.log('🔑 Token extraído da URL:', token)
        setApprovalToken(token)
      }
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleCheckboxChange = (field: 'termsOfUse' | 'gdprConsentDeclaration', checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked
    }))
  }

  const validateForm = (): string | null => {
    if (!formData.guardianName.trim()) {
      return 'Nome é obrigatório.'
    }
    if (!formData.guardianEmail.trim()) {
      return 'Email é obrigatório.'
    }
    if (!formData.guardianAddress.trim()) {
      return 'Morada é obrigatória.'
    }
    if (!formData.guardianPostalCode.trim()) {
      return 'Código postal é obrigatório.'
    }
    if (!formData.termsOfUse) {
      return 'Deve aceitar os termos de uso.'
    }
    if (!formData.gdprConsentDeclaration) {
      return 'Deve aceitar a declaração de consentimento RGPD.'
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.guardianEmail)) {
      return 'Email inválido.'
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/autorizar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          childId,
          approvalToken,
          guardianName: formData.guardianName,
          guardianEmail: formData.guardianEmail,
          guardianAddress: formData.guardianAddress,
          guardianPostalCode: formData.guardianPostalCode,
          termsOfUse: formData.termsOfUse,
          gdprConsentDeclaration: formData.gdprConsentDeclaration
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar autorização.')
      }

      setSuccess(true)
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar autorização.'
      setError(errorMessage)
      console.error('Erro:', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          maxWidth: '400px',
          width: '100%'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '10px' }}>
            Carregando...
          </h2>
          <p style={{ color: '#6b7280' }}>Validando informações de autorização</p>
        </div>
      </div>
    )
  }

  if (error && !childProfile) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #fee2e2 0%, #fca5a5 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          maxWidth: '400px',
          width: '100%'
        }}>
          <AlertCircle size={64} color="#ef4444" style={{ margin: '0 auto 20px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>
            Erro de Acesso
          </h1>
          <p style={{ color: '#ef4444', marginBottom: '24px' }}>{error}</p>
          <button
            onClick={() => router.push('/')}
            style={{
              background: '#ef4444',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          maxWidth: '400px',
          width: '100%'
        }}>
          <CheckCircle size={64} color="#10b981" style={{ margin: '0 auto 20px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>
            Autorização Concluída!
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            A conta da criança foi autorizada com sucesso. O acesso será liberado em breve.
          </p>
          <button
            onClick={() => router.push('/')}
            style={{
              background: '#10b981',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          color: 'white',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <Shield size={32} color="white" />
            <h1 style={{
              fontSize: '36px',
              fontWeight: 'bold',
              margin: 0
            }}>
              Autorização de Conta
            </h1>
          </div>
          <p style={{
            fontSize: '18px',
            opacity: 0.9,
            margin: 0
          }}>
            Protegendo o futuro digital das crianças com segurança e responsabilidade
          </p>
        </div>

        {/* Informações da Criança */}
        {childProfile && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <User size={20} color="#3b82f6" />
              <h2 style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#1f2937',
                margin: 0
              }}>
                Informações da Criança
              </h2>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px'
            }}>
              <div>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px 0' }}>Nome</p>
                <div style={{
                  background: '#f3f4f6',
                  color: '#1f2937',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>
                  {childProfile.name || 'Não informado'}
                </div>
              </div>
              <div>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px 0' }}>Username</p>
                <div style={{
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  border: '1px solid #dbeafe'
                }}>
                  {childProfile.username}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Formulário Principal */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px'
          }}>
            <FileText size={20} color="#3b82f6" />
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1f2937',
              margin: 0
            }}>
              Dados do Responsável Legal
            </h2>
          </div>
          <p style={{
            color: '#6b7280',
            marginBottom: '24px',
            fontSize: '16px'
          }}>
            Preencha todos os campos obrigatórios para autorizar a criação da conta
          </p>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={20} color="#ef4444" />
              <p style={{ color: '#dc2626', margin: 0, fontSize: '16px' }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Nome do Responsável */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '8px'
              }}>
                Nome Completo do Responsável *
              </label>
              <input
                type="text"
                name="guardianName"
                value={formData.guardianName}
                onChange={handleInputChange}
                placeholder="Digite o nome completo"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  color: '#1f2937',
                  background: 'white',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                required
              />
            </div>

            {/* Email do Responsável */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '8px'
              }}>
                Email do Responsável *
              </label>
              <input
                type="email"
                name="guardianEmail"
                value={formData.guardianEmail}
                onChange={handleInputChange}
                placeholder="exemplo@email.com"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  color: '#1f2937',
                  background: 'white',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                required
              />
            </div>

            {/* Aviso de Segurança */}
            <div style={{
              background: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <Shield size={20} color="#d97706" style={{ marginTop: '2px', flexShrink: 0 }} />
              <p style={{
                color: '#92400e',
                margin: 0,
                fontSize: '14px',
                lineHeight: '1.5'
              }}>
                <strong>Informação de Segurança:</strong> Precisamos da sua morada por motivos de segurança. 
                Esta só será partilhada com as autoridades ou profissionais competentes em situações de risco ou perigo iminente.
              </p>
            </div>

            {/* Morada */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '8px'
                }}>
                  Morada Completa *
                </label>
                <input
                  type="text"
                  name="guardianAddress"
                  value={formData.guardianAddress}
                  onChange={handleInputChange}
                  placeholder="Rua, número, bairro, cidade"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px',
                    color: '#1f2937',
                    background: 'white',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  required
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '8px'
                }}>
                  Código Postal *
                </label>
                <input
                  type="text"
                  name="guardianPostalCode"
                  value={formData.guardianPostalCode}
                  onChange={handleInputChange}
                  placeholder="0000-000"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px',
                    color: '#1f2937',
                    background: 'white',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  required
                />
              </div>
            </div>

            <div style={{ height: '1px', background: '#e5e7eb', margin: '16px 0' }}></div>

            {/* Checkboxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <input
                  type="checkbox"
                  id="termsOfUse"
                  checked={formData.termsOfUse}
                  onChange={(e) => handleCheckboxChange('termsOfUse', e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    marginTop: '2px',
                    accentColor: '#3b82f6'
                  }}
                />
                <label htmlFor="termsOfUse" style={{
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: '#1f2937'
                }}>
                  <strong>Aceito os termos de responsabilidade</strong> e confirmo que sou o responsável legal por esta criança, autorizando a criação da sua conta na plataforma.
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <input
                  type="checkbox"
                  id="gdprConsentDeclaration"
                  checked={formData.gdprConsentDeclaration}
                  onChange={(e) => handleCheckboxChange('gdprConsentDeclaration', e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    marginTop: '2px',
                    accentColor: '#3b82f6'
                  }}
                />
                <label htmlFor="gdprConsentDeclaration" style={{
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: '#1f2937'
                }}>
                  <strong>Declaro consentimento RGPD</strong> com o tratamento de dados pessoais de acordo com o Regulamento Geral sobre a Proteção de Dados para os fins da criação e gestão da conta da criança.
                </label>
              </div>
            </div>

            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              textAlign: 'center',
              margin: '16px 0 0 0'
            }}>
              * Todos os campos são obrigatórios
            </p>
          </form>
        </div>

        {/* Botão de Autorizar */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleSubmit}
            disabled={submitting || !isFormComplete()}
            style={{
              width: '100%',
              maxWidth: '500px',
              padding: '16px 24px',
              fontSize: '18px',
              fontWeight: '700',
              borderRadius: '12px',
              border: 'none',
              cursor: isFormComplete() && !submitting ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: isFormComplete() && !submitting 
                ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                : '#e5e7eb',
              color: isFormComplete() && !submitting ? 'white' : '#9ca3af',
              boxShadow: isFormComplete() && !submitting 
                ? '0 8px 20px rgba(59, 130, 246, 0.3)' 
                : 'none'
            }}
                         onMouseEnter={(e) => {
               if (isFormComplete() && !submitting) {
                 const target = e.target as HTMLButtonElement
                 target.style.transform = 'translateY(-2px)'
                 target.style.boxShadow = '0 12px 30px rgba(59, 130, 246, 0.4)'
               }
             }}
             onMouseLeave={(e) => {
               if (isFormComplete() && !submitting) {
                 const target = e.target as HTMLButtonElement
                 target.style.transform = 'translateY(0)'
                 target.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.3)'
               }
             }}
          >
            {submitting ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <span>Processando...</span>
              </>
            ) : isFormComplete() ? (
              <>
                <CheckCircle size={20} />
                <span>Autorizar Criação da Conta</span>
              </>
            ) : (
              <>
                <AlertCircle size={20} />
                <span>Preencha todos os campos para continuar</span>
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
} 