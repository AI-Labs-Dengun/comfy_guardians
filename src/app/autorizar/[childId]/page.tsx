'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Profile } from '@/lib/supabase'

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
  const [focusedField, setFocusedField] = useState<string | null>(null)

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
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleInputFocus = (fieldName: string) => {
    setFocusedField(fieldName)
  }

  const handleInputBlur = () => {
    setFocusedField(null)
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
      <div 
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-blue-300/15 rounded-full blur-2xl animate-pulse delay-500"></div>
        </div>

        <div className="relative z-10 text-center max-w-md mx-auto p-8">
          <div className="relative">
            {/* Outer rotating ring */}
            <div className="w-24 h-24 mx-auto mb-8 relative">
              <div className="absolute inset-0 border-4 border-white/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-white rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-2 border-transparent border-r-white/60 rounded-full animate-spin animation-delay-150" style={{ animationDirection: 'reverse' }}></div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Carregando</h2>
            <p className="text-white/80 text-lg leading-relaxed">
              Validando informações de autorização...
            </p>
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !childProfile) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%)',
        }}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 text-center max-w-lg mx-auto p-8">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/50 transform hover:scale-105 transition-all duration-300">
            <div className="text-red-500 text-7xl mb-6 animate-bounce">⚠️</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Erro de Acesso</h1>
            <p className="text-red-600 text-lg font-medium leading-relaxed mb-8">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-4 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        }}
      >
        {/* Celebratory floating elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-white/40 rounded-full animate-ping delay-100"></div>
          <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-yellow-300/60 rounded-full animate-ping delay-300"></div>
          <div className="absolute bottom-1/4 left-1/3 w-5 h-5 bg-green-300/50 rounded-full animate-ping delay-500"></div>
          <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-purple-300/70 rounded-full animate-ping delay-700"></div>
          <div className="absolute bottom-1/3 right-1/5 w-4 h-4 bg-pink-300/50 rounded-full animate-ping delay-900"></div>
        </div>

        <div className="relative z-10 text-center max-w-lg mx-auto p-8">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-12 border border-white/50 transform hover:scale-105 transition-all duration-300">
            <div className="relative mb-8">
              <div className="text-green-500 text-8xl animate-bounce">✓</div>
              <div className="absolute inset-0 text-green-300 text-8xl animate-ping opacity-30">✓</div>
            </div>
            
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-6">
              Autorização Concluída!
            </h1>
            
            <p className="text-gray-600 mb-10 text-lg leading-relaxed">
              A conta da criança foi autorizada com sucesso. O acesso será liberado em breve.
            </p>
            
            <button
              onClick={() => router.push('/')}
              className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-10 py-4 rounded-xl hover:from-green-600 hover:to-blue-600 transition-all duration-300 font-medium text-lg shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-1"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen relative flex items-center justify-center py-8 px-4 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-300/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-blue-300/8 rounded-full blur-2xl animate-pulse delay-500"></div>
        <div className="absolute bottom-1/3 left-1/5 w-32 h-32 bg-indigo-300/6 rounded-full blur-xl animate-pulse delay-700"></div>
      </div>
      
      <div className="relative z-10 w-full max-w-2xl mx-auto">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50 transition-all duration-500">
          
          {/* Header com gradiente */}
          <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Autorização de Conta
              </h1>
              <p className="text-white/90 text-lg">
                Protegendo o futuro digital das crianças
              </p>
            </div>
          </div>

          <div className="p-8">
            {childProfile && (
              <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/50 rounded-2xl p-6 mb-10 transform transition-all duration-300 shadow-lg">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h2 className="font-bold text-gray-800 text-xl">Informações da Criança</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/70 rounded-xl p-4 backdrop-blur-sm">
                    <p className="text-sm text-gray-600 mb-1">Nome</p>
                    <p className="text-gray-800 font-semibold text-lg">{childProfile.name || 'Não informado'}</p>
                  </div>
                  <div className="bg-white/70 rounded-xl p-4 backdrop-blur-sm">
                    <p className="text-sm text-gray-600 mb-1">Username</p>
                    <p className="text-gray-800 font-semibold text-lg">{childProfile.username}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200/50 rounded-2xl p-6 animate-shake">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <p className="text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* Seção de Informações Pessoais */}
              <div className="space-y-8">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <svg className="w-6 h-6 mr-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Informações do Responsável
                  </h3>
                  
                  {/* Nome do Responsável */}
                  <div className="space-y-3 mb-8">
                    <label className="text-sm font-bold text-gray-700 block flex items-center">
                      <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Nome Completo do Responsável *
                    </label>
                    <div className={`relative group`}>
                      <div className={`flex items-center border-2 rounded-2xl bg-white px-5 py-4 transition-all duration-300 shadow-sm group-hover:shadow-md ${
                        focusedField === 'guardianName' 
                          ? 'border-purple-500 ring-4 ring-purple-100 shadow-lg' 
                          : 'border-gray-200 hover:border-purple-300'
                      }`}>
                        <svg className={`w-5 h-5 mr-3 transition-colors duration-200 ${
                          focusedField === 'guardianName' ? 'text-purple-500' : 'text-gray-400'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <input
                          type="text"
                          name="guardianName"
                          value={formData.guardianName}
                          onChange={handleInputChange}
                          onFocus={() => handleInputFocus('guardianName')}
                          onBlur={handleInputBlur}
                          placeholder="Digite o nome completo"
                          className="flex-1 text-gray-800 placeholder-gray-400 focus:outline-none font-medium text-lg"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email do Responsável */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-700 block flex items-center">
                      <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email do Responsável *
                    </label>
                    <div className="relative group">
                      <div className={`flex items-center border-2 rounded-2xl bg-white px-5 py-4 transition-all duration-300 shadow-sm group-hover:shadow-md ${
                        focusedField === 'guardianEmail' 
                          ? 'border-purple-500 ring-4 ring-purple-100 shadow-lg' 
                          : 'border-gray-200 hover:border-purple-300'
                      }`}>
                        <svg className={`w-5 h-5 mr-3 transition-colors duration-200 ${
                          focusedField === 'guardianEmail' ? 'text-purple-500' : 'text-gray-400'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <input
                          type="email"
                          name="guardianEmail"
                          value={formData.guardianEmail}
                          onChange={handleInputChange}
                          onFocus={() => handleInputFocus('guardianEmail')}
                          onBlur={handleInputBlur}
                          placeholder="exemplo@email.com"
                          className="flex-1 text-gray-800 placeholder-gray-400 focus:outline-none font-medium text-lg"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Aviso de Segurança */}
                <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border border-amber-200/50 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L2.732 14.5c-.77.833-.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-800 mb-2">🔒 Informação de Segurança</p>
                      <p className="text-sm text-amber-700 leading-relaxed">
                        Precisamos da sua morada por motivos de segurança. Esta só será partilhada com as autoridades ou profissionais competentes em situações de risco ou perigo iminente.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Seção de Endereço */}
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <svg className="w-6 h-6 mr-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Informações de Endereço
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Morada */}
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-gray-700 block flex items-center">
                        <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Morada Completa *
                      </label>
                      <div className="relative group">
                        <div className={`flex items-center border-2 rounded-2xl bg-white px-5 py-4 transition-all duration-300 shadow-sm group-hover:shadow-md ${
                          focusedField === 'guardianAddress' 
                            ? 'border-purple-500 ring-4 ring-purple-100 shadow-lg' 
                            : 'border-gray-200 hover:border-purple-300'
                        }`}>
                          <svg className={`w-5 h-5 mr-3 transition-colors duration-200 ${
                            focusedField === 'guardianAddress' ? 'text-purple-500' : 'text-gray-400'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          <input
                            type="text"
                            name="guardianAddress"
                            value={formData.guardianAddress}
                            onChange={handleInputChange}
                            onFocus={() => handleInputFocus('guardianAddress')}
                            onBlur={handleInputBlur}
                            placeholder="Rua, número, bairro, cidade"
                            className="flex-1 text-gray-800 placeholder-gray-400 focus:outline-none font-medium"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Código Postal */}
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-gray-700 block flex items-center">
                        <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Código Postal *
                      </label>
                      <div className="relative group">
                        <div className={`flex items-center border-2 rounded-2xl bg-white px-5 py-4 transition-all duration-300 shadow-sm group-hover:shadow-md ${
                          focusedField === 'guardianPostalCode' 
                            ? 'border-purple-500 ring-4 ring-purple-100 shadow-lg' 
                            : 'border-gray-200 hover:border-purple-300'
                        }`}>
                          <svg className={`w-5 h-5 mr-3 transition-colors duration-200 ${
                            focusedField === 'guardianPostalCode' ? 'text-purple-500' : 'text-gray-400'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <input
                            type="text"
                            name="guardianPostalCode"
                            value={formData.guardianPostalCode}
                            onChange={handleInputChange}
                            onFocus={() => handleInputFocus('guardianPostalCode')}
                            onBlur={handleInputBlur}
                            placeholder="0000-000"
                            className="flex-1 text-gray-800 placeholder-gray-400 focus:outline-none font-medium"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Checkboxes melhorados */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <svg className="w-6 h-6 mr-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Termos e Condições
                  </h3>
                  
                  <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-6 space-y-6 border border-gray-100">
                    <div className="group">
                      <label className="flex items-start space-x-4 cursor-pointer group-hover:bg-white/50 p-4 rounded-xl transition-all duration-200">
                        <div className="relative mt-1">
                          <input
                            type="checkbox"
                            id="termsOfUse"
                            name="termsOfUse"
                            checked={formData.termsOfUse}
                            onChange={handleInputChange}
                            className="w-6 h-6 text-purple-600 bg-white border-2 border-gray-300 rounded-lg focus:ring-purple-500 focus:ring-2 cursor-pointer transition-all duration-200"
                            required
                          />
                          {formData.termsOfUse && (
                            <svg className="absolute inset-0 w-6 h-6 text-purple-600 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-800 font-medium leading-relaxed">
                            <strong className="text-gray-900">Aceito os termos de responsabilidade</strong> e confirmo que sou o responsável legal por esta criança, autorizando a criação da sua conta na plataforma.
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="group">
                      <label className="flex items-start space-x-4 cursor-pointer group-hover:bg-white/50 p-4 rounded-xl transition-all duration-200">
                        <div className="relative mt-1">
                          <input
                            type="checkbox"
                            id="gdprConsentDeclaration"
                            name="gdprConsentDeclaration"
                            checked={formData.gdprConsentDeclaration}
                            onChange={handleInputChange}
                            className="w-6 h-6 text-purple-600 bg-white border-2 border-gray-300 rounded-lg focus:ring-purple-500 focus:ring-2 cursor-pointer transition-all duration-200"
                            required
                          />
                          {formData.gdprConsentDeclaration && (
                            <svg className="absolute inset-0 w-6 h-6 text-purple-600 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-800 font-medium leading-relaxed">
                            <strong className="text-gray-900">Declaro consentimento RGPD</strong> com o tratamento de dados pessoais de acordo com o Regulamento Geral sobre a Proteção de Dados para os fins da criação e gestão da conta da criança.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão de Autorizar - Sempre visível */}
              <div className="pt-8 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={submitting || !isFormComplete()}
                  className={`w-full py-5 px-8 rounded-2xl font-bold text-lg transition-all duration-300 transform relative overflow-hidden ${
                    isFormComplete() && !submitting
                      ? 'bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white hover:from-purple-700 hover:via-blue-700 hover:to-indigo-700 hover:scale-105 shadow-lg hover:shadow-2xl hover:-translate-y-1'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  } focus:outline-none focus:ring-4 focus:ring-purple-200`}
                >
                  {/* Shimmer effect para botão ativo */}
                  {isFormComplete() && !submitting && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full animate-shimmer"></div>
                  )}
                  
                  <div className="relative z-10 flex items-center justify-center space-x-3">
                    {submitting ? (
                      <>
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Processando Autorização...</span>
                      </>
                    ) : isFormComplete() ? (
                      <>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Autorizar Criação da Conta</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Preencha todos os campos para continuar</span>
                      </>
                    )}
                  </div>
                </button>
              </div>

              <div className="text-center pt-4">
                <p className="text-sm text-gray-500 flex items-center justify-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Todos os campos são obrigatórios para completar a autorização
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        .animation-delay-150 {
          animation-delay: 150ms;
        }
      `}</style>
    </div>
  )
} 