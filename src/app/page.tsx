import { Shield, Heart, Sparkles, Lock, Users, Star } from 'lucide-react'

export default function Home() {
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
                Comfy Guardians
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

        {/* Informações Principais */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Bem-vindo ao Comfy Guardians
              </h2>
              <p className="text-gray-600">
                A plataforma que garante a segurança digital das crianças
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <Shield className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Proteção Garantida</h3>
                  <p className="text-sm text-gray-600">Sistema de autorização parental robusto e seguro</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <Heart className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Cuidado Responsável</h3>
                  <p className="text-sm text-gray-600">Foco no bem-estar e segurança das crianças</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Tecnologia Moderna</h3>
                  <p className="text-sm text-gray-600">Interface intuitiva e experiência de usuário excepcional</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <Star className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Conformidade Legal</h3>
                  <p className="text-sm text-gray-600">Totalmente em conformidade com RGPD e regulamentações</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Informações Adicionais */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Sistema de Autorização Parental
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              O Comfy Guardians implementa um sistema rigoroso de autorização parental que garante que apenas responsáveis legais 
              possam autorizar a criação de contas para crianças. Cada solicitação é cuidadosamente validada e processada 
              com total transparência e segurança.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>© 2024 Comfy Guardians. Todos os direitos reservados.</p>
          <p className="mt-1">Protegendo o futuro digital, uma criança de cada vez.</p>
        </div>
      </div>
    </div>
  )
}
