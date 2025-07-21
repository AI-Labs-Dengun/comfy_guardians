# Comfy Guardians - Sistema de Autorização

Sistema web para autorização de contas de crianças através de formulário para responsáveis, integrado com o schema existente do Supabase.

## Configuração Inicial

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo de exemplo e configure suas credenciais do Supabase:

```bash
cp .env.local.example .env.local
```

Edite o arquivo `.env.local` e adicione suas credenciais do Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

### 3. Schema do Banco de Dados
O sistema utiliza o schema existente do Supabase definido em `docs/schema_supabase.sql`. As principais tabelas são:

#### Tabela `profiles` (já existente)
- `id` - UUID (referência para auth.users)
- `name` - Nome da criança
- `username` - Username único
- `guardian_email` - Email do responsável
- `authorized` - Status de autorização (NULL = pendente, TRUE = autorizado, FALSE = rejeitado)
- `approval_token` - Token único para autorização
- `user_role` - Role do usuário ('app', 'cms', 'psicologos')

#### Tabela `children_guardians` (já existente)
- `child_name` - Nome da criança
- `child_birth_date` - Data de nascimento
- `guardian_name` - Nome do responsável
- `guardian_email` - Email do responsável (único)
- `guardian_address` - Endereço do responsável
- `guardian_postal_code` - Código postal
- `terms_of_use` - Aceitação dos termos de uso
- `gdpr_consent_declaration` - Consentimento RGPD

### 4. Executar em Desenvolvimento
```bash
npm run dev
```

### 5. Build para Produção
```bash
npm run build
npm start
```

## Como Funciona

### Fluxo de Autorização

1. **Aplicação Flutter** cria perfil da criança na tabela `profiles` com `authorized = NULL`
2. **Sistema** envia email para o responsável com link contendo `approval_token`
3. **Responsável** acessa: `/autorizar/[childId]?email=responsavel@email.com`
4. **Formulário** é preenchido com dados do responsável
5. **API** chama função `authorize_account()` do Supabase
6. **Sistema** salva dados na tabela `children_guardians`

### URL de Autorização
```
http://localhost:3000/autorizar/[ID_DA_CRIANCA]?email=[EMAIL_RESPONSAVEL]
```

### Exemplo
```
http://localhost:3000/autorizar/123e4567-e89b-12d3-a456-426614174000?email=responsavel@email.com
```

## Funcionalidades Implementadas

✅ **Integração com Schema Existente**
- Usa tabela `profiles` existente
- Usa tabela `children_guardians` existente
- Utiliza função `authorize_account()` nativa

✅ **Validações de Segurança**
- Verificação de email do responsável
- Validação de `approval_token`
- Prevenção de autorizações duplicadas
- Logs de auditoria automáticos

✅ **Formulário Completo**
- Nome do responsável
- Email (preenchido automaticamente)
- Morada completa
- Código postal
- Termos de uso
- Consentimento RGPD

✅ **Interface Moderna**
- Design responsivo
- Feedback visual
- Validação em tempo real
- Estados de carregamento

## Estrutura do Projeto

- `/src/app/autorizar/[childId]/page.tsx` - Página do formulário
- `/src/app/api/autorizar/route.ts` - API de autorização
- `/src/lib/supabase.ts` - Configuração e tipos
- `/docs/schema_supabase.sql` - Schema do banco de dados

## Integração com Flutter

### Criação de Perfil da Criança
```sql
INSERT INTO profiles (
  id, name, username, avatar_path, guardian_email, 
  authorized, user_role, approval_token
) VALUES (
  'uuid-da-crianca', 'Nome da Criança', 'username', '/avatar.jpg',
  'responsavel@email.com', NULL, 'app', gen_random_uuid()
);
```

### Monitoramento de Status
```sql
SELECT authorized FROM profiles WHERE id = 'uuid-da-crianca';
```

### Envio de Email
O sistema Flutter deve enviar email com link contendo:
- ID da criança
- Email do responsável
- `approval_token` para validação

## Segurança

### Validações Implementadas
1. **Email do Responsável** - Deve corresponder ao registrado
2. **Token de Aprovação** - Validação via função nativa
3. **Status de Autorização** - Apenas contas pendentes
4. **Duplicação** - Prevenção de registros duplicados
5. **Auditoria** - Logs automáticos de todas as ações

### Políticas de Segurança (RLS)
- Acesso controlado por email do responsável
- Funções com `SECURITY DEFINER`
- Validação de tokens únicos

## API Endpoints

### POST `/api/autorizar`
Processa a autorização usando a função nativa do Supabase.

**Body:**
```json
{
  "childId": "uuid-da-crianca",
  "guardianName": "Nome do Responsável",
  "guardianEmail": "responsavel@email.com",
  "guardianAddress": "Endereço completo",
  "guardianPostalCode": "0000-000",
  "termsOfUse": true,
  "gdprConsentDeclaration": true
}
```

**Respostas:**
- `200`: Autorização processada com sucesso
- `400`: Dados inválidos
- `403`: Email não corresponde
- `404`: Criança não encontrada
- `409`: Já autorizado ou responsável duplicado
- `500`: Erro interno

## Suporte

Para problemas e dúvidas, verifique:
1. Configuração das variáveis de ambiente
2. Schema do banco de dados em `docs/schema_supabase.sql`
3. Logs de erro no console
4. Políticas de segurança (RLS) no Supabase
