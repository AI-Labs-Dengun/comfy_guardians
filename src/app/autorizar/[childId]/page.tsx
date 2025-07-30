'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Profile } from '@/lib/supabase'
import { Shield, User, Mail, MapPin, FileText, CheckCircle, AlertCircle, Lock, Heart, Sparkles, ArrowRight, Loader2 } from 'lucide-react'

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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-2xl max-w-md w-full border border-white/20">
          <div className="text-center">
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-600 animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Carregando...
            </h2>
            <p className="text-gray-600">Validando informações de autorização</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !childProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-6">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl max-w-md w-full border border-white/20">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Erro de Acesso
            </h1>
            <p className="text-red-600 mb-6">{error}</p>
            <button 
              onClick={() => router.push('/')}
              className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg"
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-6">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl max-w-md w-full border border-white/20">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Autorização Concluída!
            </h1>
            <p className="text-gray-600 mb-6">
              A conta da criança foi autorizada com sucesso. O acesso será liberado em breve.
            </p>
            <button 
              onClick={() => router.push('/')}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-200/30 to-pink-300/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-200/30 to-cyan-300/30 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Autorização de Conta
              </h1>
              <p className="text-lg text-gray-600 mt-2">
                Protegendo o futuro digital das crianças com segurança e responsabilidade
              </p>
            </div>
          </div>
          
          {/* Feature badges */}
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-full border border-purple-200 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span className="font-medium">Seguro</span>
            </div>
            <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full border border-blue-200 flex items-center gap-2">
              <Heart className="w-4 h-4" />
              <span className="font-medium">Protegido</span>
            </div>
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full border border-green-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">Moderno</span>
            </div>
          </div>
        </div>

        {/* Informações da Criança */}
        {childProfile && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Informações da Criança
                </h2>
                <p className="text-gray-600">
                  Dados da conta que será autorizada
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-2">Nome</label>
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 py-3 px-4 rounded-xl font-semibold border border-gray-200">
                  {childProfile.name || 'Não informado'}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-2">Username</label>
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 py-3 px-4 rounded-xl font-semibold border border-blue-200 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {childProfile.username}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Formulário Principal */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Dados do Responsável Legal
              </h2>
              <p className="text-gray-600">
                Preencha todos os campos obrigatórios para autorizar a criação da conta
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl text-gray-800 bg-white focus:border-purple-500 focus:outline-none transition-colors duration-200"
                required
              />
            </div>

            {/* Email do Responsável */}
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-2">
                Email do Responsável *
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="guardianEmail"
                  value={formData.guardianEmail}
                  onChange={handleInputChange}
                  placeholder="exemplo@email.com"
                  className="w-full h-12 pl-12 pr-4 border-2 border-gray-200 rounded-xl text-gray-800 bg-white focus:border-purple-500 focus:outline-none transition-colors duration-200"
                  required
                />
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Aviso de Segurança */}
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-amber-800">
                <p className="font-semibold">Informação de Segurança:</p>
                <p className="text-sm mt-1">
                  Precisamos da sua morada por motivos de segurança. Esta só será partilhada com as autoridades ou profissionais competentes em situações de risco ou perigo iminente.
                </p>
              </div>
            </div>

            {/* Morada */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-base font-semibold text-gray-800 mb-2">
                  Morada Completa *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="guardianAddress"
                    value={formData.guardianAddress}
                    onChange={handleInputChange}
                    placeholder="Rua, número, bairro, cidade"
                    className="w-full h-12 pl-12 pr-4 border-2 border-gray-200 rounded-xl text-gray-800 bg-white focus:border-purple-500 focus:outline-none transition-colors duration-200"
                    required
                  />
                  <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
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
                  className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl text-gray-800 bg-white focus:border-purple-500 focus:outline-none transition-colors duration-200"
                  required
                />
              </div>
            </div>

            <div className="h-px bg-gray-300 my-8"></div>

            {/* Checkboxes */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <input
                  type="checkbox"
                  id="termsOfUse"
                  checked={formData.termsOfUse}
                  onChange={(e) => handleCheckboxChange('termsOfUse', e.target.checked)}
                  className="w-5 h-5 mt-1 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="termsOfUse" className="text-sm text-gray-800 cursor-pointer">
                  <span className="font-semibold">Aceito os termos de responsabilidade</span> e confirmo que sou o responsável legal por esta criança, autorizando a criação da sua conta na plataforma.
                </label>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <input
                  type="checkbox"
                  id="gdprConsentDeclaration"
                  checked={formData.gdprConsentDeclaration}
                  onChange={(e) => handleCheckboxChange('gdprConsentDeclaration', e.target.checked)}
                  className="w-5 h-5 mt-1 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="gdprConsentDeclaration" className="text-sm text-gray-800 cursor-pointer">
                  <span className="font-semibold">Declaro consentimento RGPD</span> com o tratamento de dados pessoais de acordo com o Regulamento Geral sobre a Proteção de Dados para os fins da criação e gestão da conta da criança.
                </label>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center">
              * Todos os campos são obrigatórios
            </p>
          </form>
        </div>

        {/* Botão de Autorizar */}
        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={submitting || !isFormComplete()}
            className={`w-full max-w-lg h-16 text-lg font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 ${
              isFormComplete() && !submitting 
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-1' 
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processando...</span>
              </>
            ) : isFormComplete() ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Autorizar Criação da Conta</span>
                <ArrowRight className="w-5 h-5" />
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5" />
                <span>Preencha todos os campos para continuar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
} 