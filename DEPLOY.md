# 🚀 GUIA DE DEPLOY - Sistema de Ponto EE Profa. Marlene Frattini

Guia completo para colocar o sistema em produção usando **Vercel** (hospedagem) + **Supabase** (banco de dados).

---

## 📋 Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [Configurar Supabase (Banco de Dados)](#2-configurar-supabase-banco-de-dados)
3. [Configurar Vercel (Hospedagem)](#3-configurar-vercel-hospedagem)
4. [Deploy Automático](#4-deploy-automático)
5. [Executar Seed (Dados Iniciais)](#5-executar-seed-dados-iniciais)
6. [Verificar o Sistema](#6-verificar-o-sistema)
7. [Credenciais Iniciais](#7-credenciais-iniciais)
8. [Manutenção e Backup](#8-manutenção-e-backup)

---

## 1. Pré-requisitos

Antes de começar, você precisará de:

- ✅ **Conta na Vercel** → https://vercel.com (grátis com GitHub)
- ✅ **Conta no Supabase** → https://supabase.com (grátis com limite generoso)
- ✅ **Conta no GitHub** → https://github.com (para versionar o código)
- ✅ **Git instalado** no seu computador
- ✅ **Node.js 18+** instalado
- ✅ **Editor de código** (VSCode recomendado)

---

## 2. Configurar Supabase (Banco de Dados)

### 2.1. Criar projeto no Supabase

1. Acesse https://supabase.com e faça login
2. Clique em **"New Project"**
3. Preencha:
   - **Name**: `ee-marlene-frattini-ponto`
   - **Database Password**: gere uma senha forte e **ANOTE ELA**
   - **Region**: Brazil (Southeast) - `sa-east-1` (mais rápido para usuários no Brasil)
   - **Pricing Plan**: Free (gratuito)
4. Clique em **"Create new project"**
5. Aguarde ~2 minutos até o projeto ficar pronto

### 2.2. Obter a string de conexão

1. No menu lateral, vá em **Settings** (ícone de engrenagem ⚙️)
2. Clique em **Database**
3. Role até **"Connection string"**
4. Selecione o formato **"Node.js"** ou **"Other"**
5. **Copie a string completa** (algo como):
   ```
   postgresql://postgres:SUASENHA@db.xxxxx.supabase.co:5432/postgres
   ```
6. **IMPORTANTE**: substitua `[YOUR-PASSWORD]` pela senha que você criou no passo 2.1

### 2.3. Criar as tabelas

1. No menu lateral do Supabase, clique em **SQL Editor** (ícone de código)
2. Clique em **"New query"**
3. **Abra o arquivo** `supabase/schema.sql` deste projeto
4. **Copie TODO o conteúdo** e **cole** no SQL Editor do Supabase
5. Clique em **"Run"** (botão verde no canto inferior direito)
6. Aguarde até aparecer "Success. No rows returned"
7. Verifique se tudo foi criado em **Table Editor** (menu lateral)

### 2.4. (Opcional) Recuperar senha do banco

Se perdeu a senha do banco:
- Settings → Database → "Reset database password"
- Crie uma nova senha e atualize sua string de conexão

---

## 3. Configurar Vercel (Hospedagem)

### 3.1. Subir código para GitHub

```bash
# No terminal, dentro da pasta do projeto:

# Se ainda não tem git inicializado:
git init

# Adicionar tudo (exceto arquivos sensíveis e de build):
git add .

# Commit inicial:
git commit -m "Deploy inicial - Sistema de Ponto EE Marlene Frattini"

# Criar repositório no GitHub (em github.com/new):
# Nome: ee-marlene-frattini-ponto
# Privado (recomendado)

# Conectar e enviar:
git remote add origin https://github.com/SEU_USUARIO/ee-marlene-frattini-ponto.git
git branch -M main
git push -u origin main
```

### 3.2. Importar projeto na Vercel

1. Acesse https://vercel.com e faça login (com sua conta GitHub)
2. Clique em **"Add New..." → "Project"**
3. Selecione o repositório `ee-marlene-frattini-ponto`
4. Clique em **"Import"**

### 3.3. Configurar variáveis de ambiente

Na tela de configuração do projeto, em **"Environment Variables"**, adicione:

| Nome | Valor |
|------|-------|
| `DATABASE_URL` | `postgresql://postgres:SUASENHA@db.xxxxx.supabase.co:5432/postgres` |
| `JWT_SECRET` | Gere em: https://www.random.org/strings/ (32 caracteres) |

**Como gerar JWT_SECRET seguro:**
```bash
# Opção 1: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Opção 2: Python
python3 -c "import secrets; print(secrets.token_hex(32))"

# Opção 3: Site online
# https://www.random.org/strings/
```

**Exemplo de JWT_SECRET (64 caracteres hex):**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3d4
```

### 3.4. Configurações de Framework

A Vercel detecta automaticamente que é um projeto Next.js. Confirme:
- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (automático)
- **Output Directory**: `.next` (automático)
- **Install Command**: `npm install` (automático)

### 3.5. Fazer o Deploy

1. Clique em **"Deploy"**
2. Aguarde ~3-5 minutos
3. Quando terminar, você verá sua URL pública:
   ```
   https://ee-marlene-frattini-ponto.vercel.app
   ```

---

## 4. Deploy Automático (Recomendado)

Após o primeiro deploy, a Vercel configura automaticamente:

✅ **Deploy automático**: toda vez que você fizer `git push`, a Vercel atualiza o site
✅ **Preview deployments**: branches criam URLs de preview antes de mergear
✅ **Domínio personalizado**: adicione seu próprio domínio em Settings → Domains

### 4.1. (Opcional) Domínio personalizado

Se quiser usar um domínio próprio (ex: `ponto.eemarlenefrattini.sp.gov.br`):

1. Na Vercel, vá em **Settings → Domains**
2. Clique em **"Add Domain"**
3. Digite o domínio: `ponto.eemarlenefrattini.sp.gov.br`
4. Siga as instruções para configurar DNS no provedor do domínio
5. Aguarde até o certificado SSL ser gerado (automático)

---

## 5. Executar Seed (Dados Iniciais)

Após o deploy, você precisa criar os usuários iniciais (admin RH + servidores).

### Opção 1: Via Script (recomendado)

No seu computador, com as variáveis configuradas:

```bash
# Criar arquivo .env com a URL do Supabase
echo 'DATABASE_URL=postgresql://postgres:SUASENHA@db.xxxxx.supabase.co:5432/postgres' > .env

# Rodar o script de seed
DATABASE_URL=postgresql://postgres:SUASENHA@db.xxxxx.supabase.co:5432/postgres npx tsx supabase/seed-supabase.ts
```

### Opção 2: Via SQL do Supabase

1. Vá em **SQL Editor** no Supabase
2. Crie um INSERT para cada usuário (com hashes bcrypt)
3. **OU** use a interface **Table Editor** para criar usuários manualmente

### Opção 3: Criar usuário manualmente

Se quiser criar um primeiro usuário sem script:

1. No Supabase, vá em **Authentication → Users** (não, isso é para auth nativo)
2. Use o **Table Editor** → tabela `users`
3. Clique em **"Insert new row"**
4. Preencha:
   - name: `Administrador RH`
   - email: `rh@eemarlenefrattini.edu.br`
   - password: (precisa ser um hash bcrypt - use ferramenta online como https://bcrypt-generator.com/)
   - role: `hr`
   - active: `true`

**Como gerar hash bcrypt online:**
1. Acesse https://bcrypt-generator.com/
2. Rounds: `10`
3. Password: `admin123`
4. Copie o hash gerado e cole no campo `password`

---

## 6. Verificar o Sistema

### 6.1. Testar o healthcheck

Acesse no navegador:
```
https://seu-projeto.vercel.app/api/health
```

Deve retornar:
```json
{ "status": "ok", "timestamp": "..." }
```

### 6.2. Testar o login

1. Acesse a URL principal
2. Use as credenciais do admin RH (veja seção 7)
3. Se conseguir logar, **tudo está funcionando!** ✅

---

## 7. Credenciais Iniciais

Após rodar o seed, você terá estes usuários:

### 👔 Administrador de RH
| Campo | Valor |
|-------|-------|
| **Email** | `rh@eemarlenefrattini.edu.br` |
| **Senha** | `admin123` |

> ⚠️ **IMPORTANTE**: Troque essa senha logo após o primeiro acesso!

### 👤 Servidores (exemplos)
Todos com senha padrão: `123456`

| Servidor | Email |
|----------|-------|
| Maria Aparecida Silva | `maria.silva@escola.sp.gov.br` |
| João Carlos Pereira | `joao.pereira@escola.sp.gov.br` |
| Ana Beatriz Santos | `ana.santos@escola.sp.gov.br` |
| Pedro Henrique Oliveira | `pedro.oliveira@escola.sp.gov.br` |
| Cláudia Regina Souza | `claudia.souza@escola.sp.gov.br` |

> 💡 Os servidores podem alterar suas próprias senhas após o primeiro login!

---

## 8. Manutenção e Backup

### 8.1. Fazer backup dos dados

O próprio sistema tem backup integrado!

1. Login como RH
2. Vá em **⚙️ Configurações**
3. Clique em **"Gerar e Baixar Backup"**
4. Um arquivo JSON com todos os dados será baixado

### 8.2. Restaurar backup

1. Em **⚙️ Configurações**, clique em **"Restauração de Dados"**
2. Selecione o arquivo JSON de backup
3. Confirme a operação
4. Todos os dados serão restaurados

### 8.3. Monitorar erros

- **Vercel Logs**: https://vercel.com/dashboard → seu projeto → **Logs**
- **Supabase Logs**: https://supabase.com/dashboard → seu projeto → **Logs**

### 8.4. Atualizar o sistema

```bash
# Faça as alterações no código
git add .
git commit -m "Atualização: descrição da mudança"
git push

# A Vercel atualiza automaticamente! ✅
```

---

## 💰 Custos Estimados

### Vercel (Hospedagem)
- ✅ **Plano Free**: até 100GB de banda/mês, deploys ilimitados
- **Para escola**: plano grátis é **mais que suficiente**

### Supabase (Banco de Dados)
- ✅ **Plano Free**: 500MB de banco, 2GB de banda/mês, 50.000 usuários ativos
- **Para escola**: plano grátis atende tranquilamente (escola tem poucos servidores)
- 💡 Upgrade para **$25/mês** só se precisar de mais recursos

**Custo total estimado**: **R$ 0,00/mês** (plano free atende perfeitamente)

---

## 🆘 Solução de Problemas

### Problema: "Erro de conexão com o banco"
- Verifique se `DATABASE_URL` está correta nas variáveis da Vercel
- Confirme que o projeto do Supabase está ativo
- Teste a conexão localmente

### Problema: "Não consigo logar"
- Verifique se o seed foi executado
- Confirme o email e senha
- Verifique nos logs da Vercel se há erro

### Problema: "Build falhou na Vercel"
- Vá em **Logs** da Vercel
- Procure pela mensagem de erro
- Geralmente é problema de variável de ambiente faltando

---

## 📞 Suporte

Para mais informações:
- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

## ✅ Checklist Final

Depois de tudo configurado, confira:

- [ ] Projeto Supabase criado
- [ ] Tabelas criadas (schema.sql executado)
- [ ] Repositório GitHub criado
- [ ] Projeto importado na Vercel
- [ ] Variáveis `DATABASE_URL` e `JWT_SECRET` configuradas
- [ ] Primeiro deploy realizado com sucesso
- [ ] Healthcheck retornando "ok"
- [ ] Login com admin RH funcionando
- [ ] Senha do admin RH alterada (segurança!)
- [ ] Servidores iniciais cadastrados
- [ ] Testado o registro de ponto (fluxo completo)
- [ ] Testada a geração da folha ponto (impressão A4)
- [ ] Testada a alteração de senha (servidor)

---

🎉 **PARABÉNS!** Seu sistema está em produção! 🚀

Sistema de Ponto Eletrônico - EE Profa. Marlene Frattini
