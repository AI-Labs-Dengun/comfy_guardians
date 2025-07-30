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
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 flex items-center justify-center p-5">
        <div className="bg-white rounded-2xl p-10 text-center shadow-2xl max-w-md w-full">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-5"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2.5">
            Carregando...
          </h2>
          <p className="text-gray-500">Validando informações de autorização</p>
        </div>
      </div>
    )
  }

  if (error && !childProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-100 to-red-300 flex items-center justify-center p-5">
        <div className="bg-white rounded-2xl p-10 text-center shadow-2xl max-w-md w-full">
          <AlertCircle size={64} className="text-red-500 mx-auto mb-5" />
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Erro de Acesso
          </h1>
          <p className="text-red-500 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-red-500 text-white py-3 px-6 rounded-lg border-none text-base font-semibold cursor-pointer w-full hover:bg-red-600 transition-colors"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 to-green-300 flex items-center justify-center p-5">
        <div className="bg-white rounded-2xl p-10 text-center shadow-2xl max-w-md w-full">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-5" />
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Autorização Concluída!
          </h1>
          <p className="text-gray-500 mb-6">
            A conta da criança foi autorizada com sucesso. O acesso será liberado em breve.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-green-500 text-white py-3 px-6 rounded-lg border-none text-base font-semibold cursor-pointer w-full hover:bg-green-600 transition-colors"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 p-5 font-sans">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="text-center text-white mb-5">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield size={32} className="text-white" />
            <h1 className="text-4xl font-bold m-0">
              Autorização de Conta
            </h1>
          </div>
          <p className="text-lg opacity-90 m-0">
            Protegendo o futuro digital das crianças com segurança e responsabilidade
          </p>
        </div>

        {/* Informações da Criança */}
        {childProfile && (
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <User size={20} className="text-blue-500" />
              <h2 className="text-xl font-bold text-gray-800 m-0">
                Informações da Criança
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Nome</p>
                <div className="bg-gray-100 text-gray-800 py-2 px-3 rounded-lg text-base font-semibold">
                  {childProfile.name || 'Não informado'}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Username</p>
                <div className="bg-blue-50 text-blue-700 py-2 px-3 rounded-lg text-base font-semibold border border-blue-200">
                  {childProfile.username}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Formulário Principal */}
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={20} className="text-blue-500" />
            <h2 className="text-2xl font-bold text-gray-800 m-0">
              Dados do Responsável Legal
            </h2>
          </div>
          <p className="text-gray-500 mb-6 text-base">
            Preencha todos os campos obrigatórios para autorizar a criação da conta
          </p>

          {error && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-6 flex items-center gap-2">
              <AlertCircle size={20} className="text-red-500" />
              <p className="text-red-600 m-0 text-base">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Nome do Responsável */}
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-2">
                Nome Completo do Responsável *
              </label>
              <input
                type="text"
                name="guardianName"
                value={formData.guardianName}
                onChange={handleInputChange}
                placeholder="Digite o nome completo"
                className="w-full py-3 px-4 border-2 border-gray-300 rounded-lg text-base text-gray-800 bg-white outline-none transition-colors focus:border-blue-500"
                required
              />
            </div>

            {/* Email do Responsável */}
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-2">
                Email do Responsável *
              </label>
              <input
                type="email"
                name="guardianEmail"
                value={formData.guardianEmail}
                onChange={handleInputChange}
                placeholder="exemplo@email.com"
                className="w-full py-3 px-4 border-2 border-gray-300 rounded-lg text-base text-gray-800 bg-white outline-none transition-colors focus:border-blue-500"
                required
              />
            </div>

            {/* Aviso de Segurança */}
            <div className="bg-yellow-50 border border-yellow-400 rounded-lg p-4 flex items-start gap-2">
              <Shield size={20} className="text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-yellow-800 m-0 text-sm leading-6">
                <strong>Informação de Segurança:</strong> Precisamos da sua morada por motivos de segurança. 
                Esta só será partilhada com as autoridades ou profissionais competentes em situações de risco ou perigo iminente.
              </p>
            </div>

            {/* Morada */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-base font-semibold text-gray-800 mb-2">
                  Morada Completa *
                </label>
                <input
                  type="text"
                  name="guardianAddress"
                  value={formData.guardianAddress}
                  onChange={handleInputChange}
                  placeholder="Rua, número, bairro, cidade"
                  className="w-full py-3 px-4 border-2 border-gray-300 rounded-lg text-base text-gray-800 bg-white outline-none transition-colors focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-base font-semibold text-gray-800 mb-2">
                  Código Postal *
                </label>
                <input
                  type="text"
                  name="guardianPostalCode"
                  value={formData.guardianPostalCode}
                  onChange={handleInputChange}
                  placeholder="0000-000"
                  className="w-full py-3 px-4 border-2 border-gray-300 rounded-lg text-base text-gray-800 bg-white outline-none transition-colors focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="h-px bg-gray-300 my-4"></div>

            {/* Checkboxes */}
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="termsOfUse"
                  checked={formData.termsOfUse}
                  onChange={(e) => handleCheckboxChange('termsOfUse', e.target.checked)}
                  className="w-5 h-5 mt-0.5 accent-blue-500"
                />
                <label htmlFor="termsOfUse" className="text-sm leading-6 text-gray-800">
                  <strong>Aceito os termos de responsabilidade</strong> e confirmo que sou o responsável legal por esta criança, autorizando a criação da sua conta na plataforma.
                </label>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="gdprConsentDeclaration"
                  checked={formData.gdprConsentDeclaration}
                  onChange={(e) => handleCheckboxChange('gdprConsentDeclaration', e.target.checked)}
                  className="w-5 h-5 mt-0.5 accent-blue-500"
                />
                <label htmlFor="gdprConsentDeclaration" className="text-sm leading-6 text-gray-800">
                  <strong>Declaro consentimento RGPD</strong> com o tratamento de dados pessoais de acordo com o Regulamento Geral sobre a Proteção de Dados para os fins da criação e gestão da conta da criança.
                </label>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4 mb-0">
              * Todos os campos são obrigatórios
            </p>
          </form>
        </div>

        {/* Botão de Autorizar */}
        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={submitting || !isFormComplete()}
            className={`w-full max-w-lg py-4 px-6 text-lg font-bold rounded-xl border-none transition-all duration-300 flex items-center justify-center gap-2 ${
              isFormComplete() && !submitting 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5 hover:from-blue-600 hover:to-blue-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
    </div>
  )
} 