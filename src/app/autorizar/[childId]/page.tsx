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

  const loadChildProfile = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', childId)
        .single()

      if (error) throw error

      if (!data) {
        setError('Criança não encontrada.')
        return
      }

      if (data.authorized === true) {
        setError('Esta criança já foi autorizada.')
        return
      }

      setChildProfile(data)
    } catch (err) {
      setError('Erro ao carregar informações da criança.')
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }, [childId])

  // Carregar informações da criança
  useEffect(() => {
    loadChildProfile()
  }, [loadChildProfile])

  // Pré-preencher email e token a partir da URL se disponível
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const email = urlParams.get('email')
    const token = urlParams.get('token')
    
    if (email) {
      setFormData(prev => ({ ...prev, guardianEmail: email }))
    }
    
    if (token) {
      setApprovalToken(token)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (error && !childProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-green-600 text-6xl mb-4 success-checkmark">✓</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Autorização Concluída!</h1>
          <p className="text-gray-600 mb-6">
            A conta da criança foi autorizada com sucesso. O acesso será liberado em breve.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="form-container rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Autorização de Conta da Criança
          </h1>
          
          {childProfile && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h2 className="font-semibold text-blue-800 mb-2">Informações da Criança:</h2>
              <p className="text-blue-700">
                <strong>Nome:</strong> {childProfile.name || 'Não informado'}
              </p>
              <p className="text-blue-700">
                <strong>Username:</strong> {childProfile.username}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            <div className="form-field">
              <label htmlFor="guardianName" className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo do Responsável *
              </label>
              <input
                type="text"
                id="guardianName"
                name="guardianName"
                value={formData.guardianName}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="guardianEmail" className="block text-sm font-medium text-gray-700 mb-2">
                Email do Responsável *
              </label>
              <input
                type="email"
                id="guardianEmail"
                name="guardianEmail"
                value={formData.guardianEmail}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="guardianAddress" className="block text-sm font-medium text-gray-700 mb-2">
                Morada *
              </label>
              <input
                type="text"
                id="guardianAddress"
                name="guardianAddress"
                value={formData.guardianAddress}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                placeholder="Rua, número, bairro, cidade"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="guardianPostalCode" className="block text-sm font-medium text-gray-700 mb-2">
                Código Postal *
              </label>
              <input
                type="text"
                id="guardianPostalCode"
                name="guardianPostalCode"
                value={formData.guardianPostalCode}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                placeholder="0000-000"
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="termsOfUse"
                  name="termsOfUse"
                  checked={formData.termsOfUse}
                  onChange={handleInputChange}
                  className="mt-1 mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  required
                />
                <label htmlFor="termsOfUse" className="text-sm text-gray-700">
                  <strong>Aceito os termos de uso</strong> e confirmo que sou o responsável legal 
                  por esta criança, autorizando a criação da sua conta na plataforma. *
                </label>
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="gdprConsentDeclaration"
                  name="gdprConsentDeclaration"
                  checked={formData.gdprConsentDeclaration}
                  onChange={handleInputChange}
                  className="mt-1 mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  required
                />
                <label htmlFor="gdprConsentDeclaration" className="text-sm text-gray-700">
                  <strong>Declaro consentimento</strong> com o tratamento de dados pessoais de acordo com o RGPD 
                  (Regulamento Geral sobre a Proteção de Dados) para os fins da criação e gestão da conta da criança. *
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-primary text-white py-4 px-6 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Processando...' : 'Autorizar Criação da Conta'}
            </button>
          </form>

          <p className="text-xs text-gray-500 mt-4 text-center">
            * Campos obrigatórios
          </p>
        </div>
      </div>
    </div>
  )
} 