import { db } from './index';
import { users } from './schema';
import { hashPassword } from '../lib/password';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Verifica se já existem usuários
  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0) {
    console.log('⚠️  Banco já possui usuários. Pulando seed.');
    return;
  }

  // Criar admin de RH
  const hrPassword = await hashPassword('admin123');
  await db.insert(users).values({
    name: 'Administrador RH',
    email: 'rh@eemarlenefrattini.edu.br',
    password: hrPassword,
    role: 'hr',
    position: 'Gestor(a) de Recursos Humanos',
    registration: 'RH-001',
    active: true,
  });

  // Criar servidores de exemplo
  const serverPassword = await hashPassword('123456');
  
  await db.insert(users).values([
    {
      name: 'Maria Aparecida Silva',
      email: 'maria.silva@escola.sp.gov.br',
      password: serverPassword,
      role: 'server',
      position: 'Professora de Português',
      registration: '2024-001',
      active: true,
    },
    {
      name: 'João Carlos Pereira',
      email: 'joao.pereira@escola.sp.gov.br',
      password: serverPassword,
      role: 'server',
      position: 'Professor de Matemática',
      registration: '2024-002',
      active: true,
    },
    {
      name: 'Ana Beatriz Santos',
      email: 'ana.santos@escola.sp.gov.br',
      password: serverPassword,
      role: 'server',
      position: 'Professora de História',
      registration: '2024-003',
      active: true,
    },
    {
      name: 'Pedro Henrique Oliveira',
      email: 'pedro.oliveira@escola.sp.gov.br',
      password: serverPassword,
      role: 'server',
      position: 'Servente',
      registration: '2024-004',
      active: true,
    },
    {
      name: 'Cláudia Regina Souza',
      email: 'claudia.souza@escola.sp.gov.br',
      password: serverPassword,
      role: 'server',
      position: 'Diretora',
      registration: '2024-005',
      active: true,
    },
  ]);

  console.log('✅ Seed concluído com sucesso!');
  console.log('');
  console.log('📋 CREDENCIAIS DE ACESSO:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👔 RH (Admin):');
  console.log('   Email: rh@eemarlenefrattini.edu.br');
  console.log('   Senha: admin123');
  console.log('');
  console.log('👤 Servidores (exemplo):');
  console.log('   Email: maria.silva@escola.sp.gov.br');
  console.log('   Senha: 123456');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Erro no seed:', err);
    process.exit(1);
  });
