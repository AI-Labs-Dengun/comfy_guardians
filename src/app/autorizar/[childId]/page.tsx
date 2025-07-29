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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-6"></div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Carregando...</h2>
          <p className="text-gray-600">Validando informações de autorização</p>
        </div>
      </div>
    )
  }

  if (error && !childProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Erro de Acesso</h1>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-100">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-green-500 text-8xl mb-6">✓</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Autorização Concluída!</h1>
          <p className="text-gray-600 mb-8">
            A conta da criança foi autorizada com sucesso. O acesso será liberado em breve.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Autorização de Conta
          </h1>
          <p className="text-lg text-gray-600">
            Protegendo o futuro digital das crianças
          </p>
        </div>

        {/* Informações da Criança */}
        {childProfile && (
          <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Informações da Criança</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Nome</p>
                <p className="text-lg font-medium text-gray-800">{childProfile.name || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Username</p>
                <p className="text-lg font-medium text-gray-800">{childProfile.username}</p>
              </div>
            </div>
          </div>
        )}

        {/* Formulário */}
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {/* Nome do Responsável */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo do Responsável *
              </label>
              <input
                type="text"
                name="guardianName"
                value={formData.guardianName}
                onChange={handleInputChange}
                placeholder="Digite o nome completo"
                className="w-full px-4 py-3 border text-black !text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                style={{ color: 'black' }}
                required
              />
            </div>

            {/* Email do Responsável */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email do Responsável *
              </label>
              <input
                type="email"
                name="guardianEmail"
                value={formData.guardianEmail}
                onChange={handleInputChange}
                placeholder="exemplo@email.com"
                className="w-full px-4 py-3 border !text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                style={{ color: 'black' }}
                required
              />
            </div>

            {/* Aviso de Segurança */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Informação de Segurança:</strong> Precisamos da sua morada por motivos de segurança. 
                Esta só será partilhada com as autoridades ou profissionais competentes em situações de risco ou perigo iminente.
              </p>
            </div>

            {/* Morada */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Morada Completa *
                </label>
                <input
                  type="text"
                  name="guardianAddress"
                  value={formData.guardianAddress}
                  onChange={handleInputChange}
                  placeholder="Rua, número, bairro, cidade"
                  className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código Postal *
                </label>
                <input
                  type="text"
                  name="guardianPostalCode"
                  value={formData.guardianPostalCode}
                  onChange={handleInputChange}
                  placeholder="0000-000"
                  className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-4">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="termsOfUse"
                  name="termsOfUse"
                  checked={formData.termsOfUse}
                  onChange={handleInputChange}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  required
                />
                <label htmlFor="termsOfUse" className="ml-3 text-sm text-gray-700">
                  <strong>Aceito os termos de responsabilidade</strong> e confirmo que sou o responsável legal por esta criança, autorizando a criação da sua conta na plataforma.
                </label>
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="gdprConsentDeclaration"
                  name="gdprConsentDeclaration"
                  checked={formData.gdprConsentDeclaration}
                  onChange={handleInputChange}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  required
                />
                <label htmlFor="gdprConsentDeclaration" className="ml-3 text-sm text-gray-700">
                  <strong>Declaro consentimento RGPD</strong> com o tratamento de dados pessoais de acordo com o Regulamento Geral sobre a Proteção de Dados para os fins da criação e gestão da conta da criança.
                </label>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center">
              * Todos os campos são obrigatórios
            </p>
          </form>
        </div>

        {/* Botão de Autorizar - Sempre visível, fora do form */}
        <div className="mt-8">
          <button
            onClick={handleSubmit}
            disabled={submitting || !isFormComplete()}
            className={`w-full py-4 px-6 rounded-lg font-medium text-lg transition-colors ${
              isFormComplete() && !submitting
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processando...
              </div>
            ) : isFormComplete() ? (
              'Autorizar Criação da Conta'
            ) : (
              'Preencha todos os campos para continuar'
            )}
          </button>
        </div>
      </div>
    </div>
  )
} 