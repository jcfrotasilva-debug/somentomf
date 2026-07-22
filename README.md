# 🏫 Sistema de Ponto Eletrônico - EE Profa. Marlene Frattini

Sistema profissional e completo de registro de ponto eletrônico para servidores da Escola Estadual Professora Marlene Frattini, desenvolvido com Next.js, TypeScript e PostgreSQL.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-blue)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black)

---

## 🎯 Funcionalidades

### 👤 Área do Servidor
- ✅ Registro de ponto em tempo real (4 marcações: entrada, saída almoço, retorno, saída)
- ✅ Relógio ao vivo com fuso horário de Brasília
- ✅ Histórico pessoal de registros
- ✅ Solicitação de justificativas de falta (dia anterior)
- ✅ Alteração de senha pessoal

### 👔 Área do RH (Gestão Completa)
- ✅ **CRUD completo** de servidores (cadastrar, editar, desativar, excluir)
- ✅ **Gestão de horários** de todos os servidores (entrada, almoço, retorno, saída)
- ✅ **Folha Ponto Mensal** em PDF A4 (frente: registros / verso: justificativas)
- ✅ **Calendário de feriados** e ponto facultativo (bloqueio automático de registros)
- ✅ **Controle de afastamentos** (férias, licenças, orientações técnicas)
- ✅ **Análise de justificativas** (aprovar/rejeitar com observações)
- ✅ **Relatórios e estatísticas** detalhadas
- ✅ **Upload de brasão** personalizado
- ✅ **Backup e restauração** do sistema completo

### 🛡️ Segurança
- ✅ Autenticação JWT com cookies httpOnly
- ✅ Senhas hasheadas com bcrypt (10 rounds)
- ✅ Bloqueio automático em feriados e afastamentos
- ✅ Validação de justificativas (apenas dia anterior)
- ✅ Validação rigorosa de dados em todas as APIs

---

## 🚀 Deploy na Nuvem

Este sistema está **100% pronto para deploy** na Vercel + Supabase!

📖 **Leia o guia completo**: [DEPLOY.md](./DEPLOY.md)

### Resumo do Deploy

1. **Supabase** (Banco de Dados):
   - Criar projeto gratuito
   - Executar `supabase/schema.sql` no SQL Editor
   - Copiar a string de conexão

2. **Vercel** (Hospedagem):
   - Fazer push do código para o GitHub
   - Importar o repositório na Vercel
   - Configurar variáveis: `DATABASE_URL` e `JWT_SECRET`
   - Deploy automático!

### Arquivos de Configuração Incluídos

| Arquivo | Descrição |
|---------|-----------|
| `vercel.json` | Configuração da Vercel |
| `.env.example` | Template de variáveis de ambiente |
| `.gitignore` | Ignora arquivos sensíveis |
| `supabase/schema.sql` | Cria todas as tabelas no Supabase |
| `supabase/seed.sql` | Script SQL com dados iniciais |
| `supabase/seed-supabase.ts` | Script TypeScript para seed |
| `DEPLOY.md` | **Guia completo de deploy** (leia aqui!) |

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- ⚛️ **Next.js 16** (App Router)
- 📘 **TypeScript**
- 🎨 **Tailwind CSS**
- 🎭 **Lucide React** (ícones)

### Backend
- 🐘 **PostgreSQL** (Supabase)
- 🗄️ **Drizzle ORM**
- 🔐 **jose** (JWT)
- 🔒 **bcryptjs** (hash de senhas)

### Deploy
- ▲ **Vercel** (hospedagem serverless)
- 🐘 **Supabase** (banco PostgreSQL gerenciado)

---

## 📦 Instalação Local (Desenvolvimento)

```bash
# Clonar o repositório
git clone https://github.com/SEU_USUARIO/ee-marlene-frattini-ponto.git
cd ee-marlene-frattini-ponto

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com sua DATABASE_URL e JWT_SECRET

# Rodar migrações (se necessário)
npx drizzle-kit push

# Executar seed
npx tsx src/db/seed.ts

# Iniciar servidor de desenvolvimento
npm run dev
```

Acesse: http://localhost:3000

---

## 🔑 Credenciais Iniciais (após seed)

### 👔 Administrador de RH
- **Email**: `rh@eemarlenefrattini.edu.br`
- **Senha**: `admin123`

### 👤 Servidores (exemplos - senha: `123456`)
- `maria.silva@escola.sp.gov.br`
- `joao.pereira@escola.sp.gov.br`
- `ana.santos@escola.sp.gov.br`
- `pedro.oliveira@escola.sp.gov.br`
- `claudia.souza@escola.sp.gov.br`

> ⚠️ **IMPORTANTE**: Troque as senhas padrão logo após o primeiro acesso!

---

## 📂 Estrutura do Projeto

```
.
├── src/
│   ├── app/                    # Páginas da aplicação
│   │   ├── api/                # APIs REST
│   │   │   ├── auth/           # Autenticação
│   │   │   ├── employees/      # CRUD de servidores
│   │   │   ├── time-entries/   # Registros de ponto
│   │   │   ├── justifications/ # Justificativas
│   │   │   ├── work-schedules/ # Horários
│   │   │   ├── settings/       # Configurações
│   │   │   ├── day-occurrences/# Feriados
│   │   │   ├── server-absences/# Afastamentos
│   │   │   └── reports/        # Relatórios
│   │   ├── dashboard/          # Área do servidor
│   │   ├── rh/                 # Área do RH
│   │   │   ├── calendario/     # Feriados e bloqueios
│   │   │   ├── configuracoes/  # Brasão, backup, restauração
│   │   │   ├── folha-ponto/    # Folha ponto A4
│   │   │   ├── horarios/       # Gestão de horários
│   │   │   ├── justificativas/ # Análise de justificativas
│   │   │   ├── relatorios/     # Estatísticas
│   │   │   └── servidor/       # Detalhes do servidor
│   │   └── login/              # Página de login
│   ├── components/             # Componentes React
│   ├── db/                     # Conexão com banco
│   └── lib/                    # Utilitários
├── supabase/                   # Scripts do Supabase
│   ├── schema.sql              # Schema do banco
│   ├── seed.sql                # Seed SQL
│   └── seed-supabase.ts        # Seed TypeScript
├── DEPLOY.md                   # 📖 GUIA DE DEPLOY
├── vercel.json                 # Configuração Vercel
└── package.json
```

---

## 🌐 Fuso Horário

O sistema utiliza o **fuso horário de Brasília (GMT-3)** para todas as operações:
- Registro de ponto
- Cálculo de horas trabalhadas
- Justificativas
- Folha ponto
- Relatórios

Isso garante que servidores em qualquer lugar do mundo registrem corretamente no horário oficial do Brasil.

---

## 📄 Folha Ponto A4

O sistema gera automaticamente a **Folha Ponto Mensal** em formato A4:

**Página 1 (Frente):**
- Cabeçalho oficial (Governo SP, Secretaria da Educação, Escola)
- Brasão personalizado (upload via RH)
- Dados do servidor
- Tabela com todos os registros do mês
- Totais e assinaturas

**Página 2 (Verso):**
- Justificativas de ausência (se houver)
- OU Declaração de ausência de justificativas + feriados + afastamentos

A folha é **imprimível em PDF** diretamente pelo navegador.

---

## 💰 Custos

| Serviço | Plano | Custo |
|---------|-------|-------|
| **Vercel** | Free | R$ 0,00/mês |
| **Supabase** | Free | R$ 0,00/mês |
| **GitHub** | Free | R$ 0,00/mês |
| **Total** | | **R$ 0,00/mês** |

O plano gratuito atende perfeitamente uma escola com poucos servidores!

---

## 🆘 Suporte

Para dúvidas sobre o deploy:
- 📖 Leia o guia completo: [DEPLOY.md](./DEPLOY.md)
- 📚 Vercel Docs: https://vercel.com/docs
- 📚 Supabase Docs: https://supabase.com/docs

---

## 📝 Licença

Este projeto foi desenvolvido para uso exclusivo da EE Profa. Marlene Frattini.

---

## ✨ Desenvolvido com ❤️ para a Educação Pública

Sistema de Ponto Eletrônico - EE Profa. Marlene Frattini  
Governo do Estado de São Paulo · Secretaria da Educação
