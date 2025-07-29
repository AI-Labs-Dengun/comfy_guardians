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
        className="min-h-screen flex items-center justify-center relative"
        style={{
          backgroundImage: "url('/colored_background.svg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-white/20 backdrop-blur-sm"></div>
        <div className="relative z-10 text-center max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto"></div>
          <p className="mt-6 text-gray-800 font-medium text-lg">Carregando informações...</p>
          <p className="mt-2 text-sm text-gray-600">
            Validando token de autorização...
          </p>
        </div>
      </div>
    )
  }

  if (error && !childProfile) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center relative"
        style={{
          backgroundImage: "url('/colored_background.svg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-white/20 backdrop-blur-sm"></div>
        <div className="relative z-10 text-center max-w-md mx-auto p-8 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Erro de Acesso</h1>
          <p className="text-red-600 text-lg font-medium">{error}</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center relative"
        style={{
          backgroundImage: "url('/colored_background.svg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-white/20 backdrop-blur-sm"></div>
        <div className="relative z-10 text-center max-w-md mx-auto p-8 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl">
          <div className="text-green-500 text-8xl mb-6">✓</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Autorização Concluída!</h1>
          <p className="text-gray-600 mb-8 text-lg">
            A conta da criança foi autorizada com sucesso. O acesso será liberado em breve.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 font-medium text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen relative flex items-center justify-center py-8 px-4"
      style={{
        backgroundImage: "url('/colored_background.svg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay para melhor legibilidade */}
      <div className="absolute inset-0 bg-white/30 backdrop-blur-sm"></div>
      
      <div className="relative z-10 w-full max-w-lg mx-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/50">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Autorização de Conta
          </h1>
          
          {childProfile && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8">
              <h2 className="font-semibold text-blue-800 mb-3 text-lg">Informações da Criança:</h2>
              <div className="space-y-2">
                <p className="text-blue-700">
                  <strong>Nome:</strong> {childProfile.name || 'Não informado'}
                </p>
                <p className="text-blue-700">
                  <strong>Username:</strong> {childProfile.username}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-pulse">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Nome do Responsável */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 block">
                Nome Completo do Responsável *
              </label>
              <div className="relative">
                <div className="flex items-center border-2 border-gray-300 rounded-xl bg-white px-4 py-4 focus-within:border-purple-500 focus-within:ring-4 focus-within:ring-purple-100 transition-all duration-200 shadow-sm hover:shadow-md">
                  <svg className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="flex-1 text-black placeholder-gray-400 focus:outline-none font-medium"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Email do Responsável */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 block">
                Email do Responsável *
              </label>
              <div className="relative">
                <div className="flex items-center border-2 border-gray-300 rounded-xl bg-white px-4 py-4 focus-within:border-purple-500 focus-within:ring-4 focus-within:ring-purple-100 transition-all duration-200 shadow-sm hover:shadow-md">
                  <svg className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="flex-1 text-black placeholder-gray-400 focus:outline-none font-medium"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Aviso de Segurança */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L2.732 14.5c-.77.833-.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-amber-800 mb-1">Informação de Segurança</p>
                  <p className="text-sm text-amber-700">
                    Precisamos da sua morada por motivos de segurança. Esta só será partilhada com as autoridades ou profissionais competentes em situações de risco ou perigo iminente.
                  </p>
                </div>
              </div>
            </div>

            {/* Morada */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 block">
                Morada Completa *
              </label>
              <div className="relative">
                <div className={`flex items-center border-2 rounded-xl bg-white px-4 py-4 transition-all duration-200 shadow-sm hover:shadow-md ${
                  focusedField === 'guardianAddress' 
                    ? 'border-purple-500 ring-4 ring-purple-100' 
                    : 'border-dashed border-gray-300'
                }`}>
                  <svg className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="flex-1 text-black placeholder-gray-400 focus:outline-none font-medium"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Código Postal */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 block">
                Código Postal *
              </label>
              <div className="relative">
                <div className="flex items-center border-2 border-gray-300 rounded-xl bg-white px-4 py-4 focus-within:border-purple-500 focus-within:ring-4 focus-within:ring-purple-100 transition-all duration-200 shadow-sm hover:shadow-md">
                  <svg className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="flex-1 text-black placeholder-gray-400 focus:outline-none font-medium"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-6 pt-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="termsOfUse"
                    name="termsOfUse"
                    checked={formData.termsOfUse}
                    onChange={handleInputChange}
                    className="mt-1 h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer"
                    required
                  />
                  <label htmlFor="termsOfUse" className="text-sm text-gray-800 cursor-pointer flex-1">
                    <strong className="text-gray-900">Aceito os termos de responsabilidade</strong> e confirmo que sou o responsável legal por esta criança, autorizando a criação da sua conta na plataforma.
                  </label>
                </div>

                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="gdprConsentDeclaration"
                    name="gdprConsentDeclaration"
                    checked={formData.gdprConsentDeclaration}
                    onChange={handleInputChange}
                    className="mt-1 h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer"
                    required
                  />
                  <label htmlFor="gdprConsentDeclaration" className="text-sm text-gray-800 cursor-pointer flex-1">
                    <strong className="text-gray-900">Declaro consentimento RGPD</strong> com o tratamento de dados pessoais de acordo com o Regulamento Geral sobre a Proteção de Dados para os fins da criação e gestão da conta da criança.
                  </label>
                </div>
              </div>
            </div>

            {/* Botão de Autorizar */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={submitting || !isFormComplete()}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 transform ${
                  isFormComplete() && !submitting
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 hover:scale-105 shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                } focus:outline-none focus:ring-4 focus:ring-purple-100`}
              >
                {submitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processando...</span>
                  </div>
                ) : isFormComplete() ? (
                  'Autorizar Criação da Conta'
                ) : (
                  'Preencha todos os campos para continuar'
                )}
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              * Todos os campos são obrigatórios para completar a autorização
            </p>
          </form>
        </div>
      </div>
    </div>
  )
} 