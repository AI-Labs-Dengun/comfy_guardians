'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Profile } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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

  const handleCheckboxChange = (field: 'termsOfUse' | 'gdprConsentDeclaration', checked: boolean | string) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked === true
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Carregando...</h2>
            <p className="text-gray-600 text-center">Validando informações de autorização</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !childProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Erro de Acesso</h1>
            <p className="text-red-600 mb-6 text-center">{error}</p>
            <Button onClick={() => router.push('/')} variant="destructive">
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-100">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Autorização Concluída!</h1>
            <p className="text-gray-600 mb-6 text-center">
              A conta da criança foi autorizada com sucesso. O acesso será liberado em breve.
            </p>
            <Button onClick={() => router.push('/')} className="w-full">
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">
              Autorização de Conta
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Protegendo o futuro digital das crianças com segurança e responsabilidade
          </p>
        </div>

        {/* Informações da Criança */}
        {childProfile && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Informações da Criança</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Nome</Label>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-base px-3 py-1">
                      {childProfile.name || 'Não informado'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Username</Label>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-base px-3 py-1">
                      {childProfile.username}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulário Principal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Dados do Responsável Legal</span>
            </CardTitle>
            <CardDescription>
              Preencha todos os campos obrigatórios para autorizar a criação da conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Nome do Responsável */}
            <div className="space-y-2">
              <Label htmlFor="guardianName" className="text-base">
                Nome Completo do Responsável *
              </Label>
              <Input
                id="guardianName"
                name="guardianName"
                type="text"
                value={formData.guardianName}
                onChange={handleInputChange}
                placeholder="Digite o nome completo"
                className="text-base"
              />
            </div>

            {/* Email do Responsável */}
            <div className="space-y-2">
              <Label htmlFor="guardianEmail" className="text-base">
                Email do Responsável *
              </Label>
              <Input
                id="guardianEmail"
                name="guardianEmail"
                type="email"
                value={formData.guardianEmail}
                onChange={handleInputChange}
                placeholder="exemplo@email.com"
                className="text-base"
              />
            </div>

            {/* Aviso de Segurança */}
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Informação de Segurança:</strong> Precisamos da sua morada por motivos de segurança. 
                Esta só será partilhada com as autoridades ou profissionais competentes em situações de risco ou perigo iminente.
              </AlertDescription>
            </Alert>

            {/* Morada */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guardianAddress" className="text-base">
                  Morada Completa *
                </Label>
                <Input
                  id="guardianAddress"
                  name="guardianAddress"
                  type="text"
                  value={formData.guardianAddress}
                  onChange={handleInputChange}
                  placeholder="Rua, número, bairro, cidade"
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardianPostalCode" className="text-base">
                  Código Postal *
                </Label>
                <Input
                  id="guardianPostalCode"
                  name="guardianPostalCode"
                  type="text"
                  value={formData.guardianPostalCode}
                  onChange={handleInputChange}
                  placeholder="0000-000"
                  className="text-base"
                />
              </div>
            </div>

            <Separator />

            {/* Checkboxes */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                                 <Checkbox
                   id="termsOfUse"
                   checked={formData.termsOfUse}
                   onCheckedChange={(checked) => handleCheckboxChange('termsOfUse', checked)}
                 />
                <Label htmlFor="termsOfUse" className="text-sm leading-relaxed">
                  <strong>Aceito os termos de responsabilidade</strong> e confirmo que sou o responsável legal por esta criança, autorizando a criação da sua conta na plataforma.
                </Label>
              </div>

              <div className="flex items-start space-x-3">
                                 <Checkbox
                   id="gdprConsentDeclaration"
                   checked={formData.gdprConsentDeclaration}
                   onCheckedChange={(checked) => handleCheckboxChange('gdprConsentDeclaration', checked)}
                 />
                <Label htmlFor="gdprConsentDeclaration" className="text-sm leading-relaxed">
                  <strong>Declaro consentimento RGPD</strong> com o tratamento de dados pessoais de acordo com o Regulamento Geral sobre a Proteção de Dados para os fins da criação e gestão da conta da criança.
                </Label>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center">
              * Todos os campos são obrigatórios
            </p>
          </CardContent>
        </Card>

        {/* Botão de Autorizar */}
        <div className="flex justify-center">
          <Button
            onClick={handleSubmit}
            disabled={submitting || !isFormComplete()}
            size="lg"
            className={`w-full max-w-md text-lg py-6 ${
              isFormComplete() && !submitting
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Processando...</span>
              </div>
            ) : isFormComplete() ? (
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>Autorizar Criação da Conta</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5" />
                <span>Preencha todos os campos para continuar</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
} 