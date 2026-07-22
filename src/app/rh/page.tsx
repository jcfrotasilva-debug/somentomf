'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import {
  Users,
  Clock,
  FileText,
  AlertCircle,
  TrendingUp,
  Loader2,
  LogOut as LogOutIcon,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Eye,
  X,
  Search,
  UserCheck,
  UserX,
  BarChart3,
  Printer,
  Building2,
  Phone,
  BadgeCheck,
  IdCard,
  Settings,
  KeyRound,
} from 'lucide-react';
import { formatTimeInBrazil, formatDateBR, calculateWorkedHours, getCurrentBrazilTime } from '@/lib/timezone';

type ServerUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  position: string | null;
  registration: string | null;
  department: string | null;
  admissionDate: string | null;
  phone: string | null;
  active: boolean;
  createdAt: string | null;
};

type Stats = {
  totalServers: number;
  activeServers: number;
  inactiveServers: number;
  todayRecords: number;
  pendingJustifications: number;
  monthRecords: number;
};

function HrContent() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [servers, setServers] = useState<ServerUser[]>([]);
  const [filteredServers, setFilteredServers] = useState<ServerUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerUser | null>(null);
  const [viewingServer, setViewingServer] = useState<ServerUser | null>(null);
  const [currentTime, setCurrentTime] = useState(getCurrentBrazilTime());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(getCurrentBrazilTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'hr')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'hr') {
      fetchAll();
    }
  }, [user]);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = servers
      .filter((s) => s.role === 'server')
      .filter((s) => {
        if (filterStatus === 'active') return s.active;
        if (filterStatus === 'inactive') return !s.active;
        return true;
      })
      .filter((s) => {
        if (!term) return true;
        return (
          s.name.toLowerCase().includes(term) ||
          (s.email || '').toLowerCase().includes(term) ||
          (s.registration || '').toLowerCase().includes(term) ||
          (s.position || '').toLowerCase().includes(term)
        );
      });
    setFilteredServers(filtered);
  }, [servers, searchTerm, filterStatus]);

  async function fetchAll() {
    await Promise.all([fetchStats(), fetchServers()]);
  }

  async function fetchStats() {
    try {
      const res = await fetch('/api/hr/stats');
      if (res.ok) {
        const data = await res.json();
        // Conta ativos/inativos
        const serversList = await fetch('/api/employees').then(r => r.json());
        const serversOnly = serversList.users.filter((s: ServerUser) => s.role === 'server');
        setStats({
          ...data,
          activeServers: serversOnly.filter((s: ServerUser) => s.active).length,
          inactiveServers: serversOnly.filter((s: ServerUser) => !s.active).length,
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchServers() {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setServers(data.users);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function toggleActive(server: ServerUser) {
    if (!confirm(
      server.active
        ? `Deseja realmente DESATIVAR o servidor ${server.name}? Ele não poderá mais acessar o sistema.`
        : `Deseja ATIVAR o servidor ${server.name}?`
    )) return;

    try {
      const res = await fetch(`/api/employees/${server.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !server.active }),
      });
      if (res.ok) {
        await fetchAll();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteServer(server: ServerUser) {
    if (!confirm(`ATENÇÃO! Deseja realmente EXCLUIR permanentemente o servidor ${server.name} e todos os seus dados? Esta ação não pode ser desfeita!`)) return;

    try {
      const res = await fetch(`/api/employees/${server.id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchAll();
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (authLoading || !user || user.role !== 'hr') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-xl border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg sm:text-xl">Gestão de Recursos Humanos</h1>
                <p className="text-slate-400 text-xs sm:text-sm">EE Profa. Marlene Frattini · {currentTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-white text-sm font-medium">{user.name}</p>
                <p className="text-slate-400 text-xs">Administrador(a) RH</p>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition border border-white/20"
              >
                <LogOutIcon className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard
              label="Total de Servidores"
              value={stats.totalServers}
              icon={<Users className="w-6 h-6" />}
              color="blue"
            />
            <StatCard
              label="Servidores Ativos"
              value={stats.activeServers}
              icon={<UserCheck className="w-6 h-6" />}
              color="green"
            />
            <StatCard
              label="Servidores Inativos"
              value={stats.inactiveServers}
              icon={<UserX className="w-6 h-6" />}
              color="gray"
            />
            <StatCard
              label="Registros Hoje"
              value={stats.todayRecords}
              icon={<Clock className="w-6 h-6" />}
              color="purple"
            />
            <StatCard
              label="Justif. Pendentes"
              value={stats.pendingJustifications}
              icon={<AlertCircle className="w-6 h-6" />}
              color="amber"
            />
          </div>
        )}

        {/* Barra de ações e busca */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome, email, matrícula ou cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                    filterStatus === 'all' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterStatus('active')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                    filterStatus === 'active' ? 'bg-white shadow text-green-700' : 'text-slate-600'
                  }`}
                >
                  Ativos
                </button>
                <button
                  onClick={() => setFilterStatus('inactive')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                    filterStatus === 'inactive' ? 'bg-white shadow text-red-700' : 'text-slate-600'
                  }`}
                >
                  Inativos
                </button>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm shadow-md hover:shadow-lg transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Novo Servidor</span>
                <span className="sm:hidden">Novo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Lista de servidores */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Servidores Cadastrados</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {filteredServers.length} de {servers.filter(s => s.role === 'server').length} servidor(es)
              </p>
            </div>
          </div>

          {filteredServers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nenhum servidor encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredServers.map((server) => (
                <div
                  key={server.id}
                  className="p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${
                      server.active
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                        : 'bg-gradient-to-br from-slate-400 to-slate-500'
                    }`}>
                      {server.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900 truncate">{server.name}</p>
                        {!server.active && (
                          <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                            <UserX className="w-3 h-3" />
                            Inativo
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                        {server.position && (
                          <span className="flex items-center gap-1">
                            <BadgeCheck className="w-3 h-3" />
                            {server.position}
                          </span>
                        )}
                        {server.registration && (
                          <span className="flex items-center gap-1">
                            <IdCard className="w-3 h-3" />
                            {server.registration}
                          </span>
                        )}
                        {server.department && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {server.department}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 truncate">{server.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setViewingServer(server)}
                      title="Ver detalhes, horários e registros"
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-2 rounded-lg transition"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingServer(server)}
                      title="Editar dados"
                      className="bg-slate-50 hover:bg-slate-100 text-slate-700 p-2 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleActive(server)}
                      title={server.active ? 'Desativar' : 'Ativar'}
                      className={`p-2 rounded-lg transition ${
                        server.active
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                          : 'bg-green-50 hover:bg-green-100 text-green-700'
                      }`}
                    >
                      {server.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => deleteServer(server)}
                      title="Excluir permanentemente"
                      className="bg-red-50 hover:bg-red-100 text-red-700 p-2 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Seção de atalhos rápidos */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickActionCard
            icon={<Clock className="w-5 h-5" />}
            title="⏰ Horários"
            description="Cadastre horários de TODOS os servidores"
            onClick={() => router.push('/rh/horarios')}
            color="blue"
            highlight
          />
          <QuickActionCard
            icon={<Printer className="w-5 h-5" />}
            title="📄 Folha Ponto"
            description="Gere folha ponto A4 (frente + verso)"
            onClick={() => router.push('/rh/folha-ponto')}
            color="green"
            highlight
          />
          <QuickActionCard
            icon={<FileText className="w-5 h-5" />}
            title="📊 Justificativas"
            description="Analise e aprove/rejeite solicitações"
            onClick={() => router.push('/rh/justificativas')}
            color="amber"
          />
          <QuickActionCard
            icon={<Users className="w-5 h-5" />}
            title="📈 Relatórios"
            description="Estatísticas e histórico geral"
            onClick={() => router.push('/rh/relatorios')}
            color="purple"
          />
          <QuickActionCard
            icon={<Calendar className="w-5 h-5" />}
            title="📅 Calendário"
            description="Feriados, ponto facultativo, férias"
            onClick={() => router.push('/rh/calendario')}
            color="orange"
          />
          <QuickActionCard
            icon={<Edit2 className="w-5 h-5" />}
            title="📝 Retificações"
            description="Solicitações de correção de ponto"
            onClick={() => router.push('/rh/retificacoes')}
            color="amber"
          />
          <QuickActionCard
            icon={<Settings className="w-5 h-5" />}
            title="⚙️ Configurações"
            description="Brasão, backup e restauração"
            onClick={() => router.push('/rh/configuracoes')}
            color="slate"
          />
        </div>
      </main>

      {/* Modais */}
      {showCreateModal && (
        <ServerFormModal
          onClose={() => setShowCreateModal(false)}
          onSaved={async () => {
            setShowCreateModal(false);
            await fetchAll();
          }}
        />
      )}

      {editingServer && (
        <ServerFormModal
          server={editingServer}
          onClose={() => setEditingServer(null)}
          onSaved={async () => {
            setEditingServer(null);
            await fetchAll();
          }}
        />
      )}

      {viewingServer && (
        <ServerDetailsModal
          server={viewingServer}
          onClose={() => setViewingServer(null)}
          onEdit={() => {
            setViewingServer(null);
            setEditingServer(viewingServer);
          }}
          onViewRecords={() => {
            setViewingServer(null);
            router.push(`/rh/servidor/${viewingServer.id}`);
          }}
          onPrintReport={() => {
            setViewingServer(null);
            router.push(`/rh/folha-ponto/${viewingServer.id}`);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    amber: 'from-amber-500 to-amber-600',
    purple: 'from-purple-500 to-purple-600',
    gray: 'from-slate-500 to-slate-600',
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 relative overflow-hidden">
      <div className={`w-10 h-10 bg-gradient-to-br ${colors[color]} rounded-xl flex items-center justify-center text-white mb-3 shadow`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 font-medium mt-0.5">{label}</p>
    </div>
  );
}

function QuickActionCard({ icon, title, description, onClick, color, highlight }: { icon: React.ReactNode; title: string; description: string; onClick: () => void; color: string; highlight?: boolean }) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600',
    green: 'from-green-500 to-emerald-600',
    amber: 'from-amber-500 to-orange-600',
    purple: 'from-purple-500 to-pink-600',
    slate: 'from-slate-600 to-slate-800',
    orange: 'from-orange-500 to-red-600',
  };
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm border text-left hover:shadow-lg transition group ${
        highlight ? 'border-2 border-blue-400 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className={`w-10 h-10 bg-gradient-to-br ${colors[color]} rounded-xl flex items-center justify-center text-white mb-3 mx-5 mt-5 shadow-lg group-hover:scale-110 transition`}>
        {icon}
      </div>
      <div className="p-5 pt-3">
        <p className="font-bold text-slate-900">{title}</p>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      </div>
    </button>
  );
}

// ============ MODAL DE FORMULÁRIO DE SERVIDOR ============
function ServerFormModal({
  server,
  onClose,
  onSaved,
}: {
  server?: ServerUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: server?.name || '',
    email: server?.email || '',
    password: '',
    confirmPassword: '',
    position: server?.position || '',
    registration: server?.registration || '',
    department: server?.department || '',
    phone: server?.phone || '',
    admissionDate: server?.admissionDate || '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.email) {
      setError('Nome e email são obrigatórios');
      return;
    }

    if (!server && !form.password) {
      setError('Senha é obrigatória para novos servidores');
      return;
    }

    if (form.password && form.password !== form.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      const url = server ? `/api/employees/${server.id}` : '/api/employees';
      const method = server ? 'PUT' : 'POST';
      const body: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        position: form.position || null,
        registration: form.registration || null,
        department: form.department || null,
        phone: form.phone || null,
        admissionDate: form.admissionDate || null,
      };
      if (form.password) body.password = form.password;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar');
        setLoading(false);
        return;
      }
      onSaved();
    } catch {
      setError('Erro de conexão');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {server ? 'Editar Servidor' : 'Novo Servidor'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {server ? `Editando: ${server.name}` : 'Preencha os dados do novo servidor'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome Completo *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Institucional *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                {server ? 'Nova Senha (deixe vazio para manter)' : 'Senha Inicial *'}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirmar Senha</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cargo/Função</label>
              <input
                type="text"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                placeholder="Ex: Professor de Matemática"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Matrícula</label>
              <input
                type="text"
                value={form.registration}
                onChange={(e) => setForm({ ...form, registration: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Departamento/Setor</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Telefone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(11) 99999-9999"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Data de Admissão</label>
              <input
                type="date"
                value={form.admissionDate}
                onChange={(e) => setForm({ ...form, admissionDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {server ? 'Salvar Alterações' : 'Cadastrar Servidor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ MODAL DE DETALHES DO SERVIDOR ============
function ServerDetailsModal({
  server,
  onClose,
  onEdit,
  onViewRecords,
  onPrintReport,
}: {
  server: ServerUser;
  onClose: () => void;
  onEdit: () => void;
  onViewRecords: () => void;
  onPrintReport: () => void;
}) {
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('123456');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleResetPassword() {
    setResetLoading(true);
    setResetMessage(null);
    try {
      const res = await fetch(`/api/employees/${server.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResetMessage({ type: 'error', text: data.error || 'Erro ao resetar senha' });
      } else {
        setResetMessage({
          type: 'success',
          text: `✓ Senha redefinida para: ${data.newPassword}. Oriente o servidor a alterá-la no próximo acesso.`,
        });
      }
    } catch {
      setResetMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <h3 className="text-lg font-bold text-slate-900">Detalhes do Servidor</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto mb-3">
              {server.name.charAt(0)}
            </div>
            <h4 className="text-xl font-bold text-slate-900">{server.name}</h4>
            <p className="text-sm text-slate-500 mt-1">{server.position || 'Servidor'}</p>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full mt-2 font-medium ${
              server.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {server.active ? '● Ativo' : '● Inativo'}
            </span>
          </div>

          <div className="space-y-3">
            <InfoRow icon={<FileText className="w-4 h-4" />} label="Email" value={server.email} />
            {server.registration && <InfoRow icon={<IdCard className="w-4 h-4" />} label="Matrícula" value={server.registration} />}
            {server.department && <InfoRow icon={<Building2 className="w-4 h-4" />} label="Departamento" value={server.department} />}
            {server.phone && <InfoRow icon={<Phone className="w-4 h-4" />} label="Telefone" value={server.phone} />}
            {server.admissionDate && <InfoRow icon={<Calendar className="w-4 h-4" />} label="Admissão" value={formatDateBR(server.admissionDate)} />}
          </div>

          <div className="grid grid-cols-1 gap-2 mt-6">
            <button
              onClick={onViewRecords}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm"
            >
              <Eye className="w-4 h-4" />
              Ver Registros e Horários
            </button>
            <button
              onClick={onPrintReport}
              className="bg-green-50 hover:bg-green-100 text-green-700 font-medium py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm"
            >
              <Printer className="w-4 h-4" />
              Gerar Folha Ponto Mensal
            </button>
            <button
              onClick={onEdit}
              className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm"
            >
              <Edit2 className="w-4 h-4" />
              Editar Dados
            </button>
            <button
              onClick={() => { setShowResetPassword(true); setResetMessage(null); }}
              className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm"
            >
              <KeyRound className="w-4 h-4" />
              Resetar Senha do Servidor
            </button>
          </div>

          {/* Modal de reset de senha */}
          {showResetPassword && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <div className="flex items-start gap-2 mb-3">
                <KeyRound className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900">Resetar Senha</h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Define uma nova senha para {server.name.split(' ')[0]}. Oriente o servidor a alterá-la no próximo acesso.
                  </p>
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-semibold text-amber-900 mb-1">Nova Senha</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm"
                  placeholder="Digite a nova senha"
                />
              </div>

              {resetMessage && (
                <div className={`mb-3 p-2 rounded-lg text-xs ${
                  resetMessage.type === 'success'
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}>
                  {resetMessage.text}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setShowResetPassword(false)}
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-medium py-2 rounded-lg transition text-sm border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={resetLoading || newPassword.length < 6}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 rounded-lg transition text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                  {resetLoading ? '...' : 'Confirmar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
      <div className="text-slate-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900 truncate">{value}</p>
      </div>
    </div>
  );
}

export default function HrDashboardPage() {
  return (
    <AuthProvider>
      <HrContent />
    </AuthProvider>
  );
}
