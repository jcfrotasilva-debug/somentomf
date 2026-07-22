'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import {
  ArrowLeft,
  Printer,
  Loader2,
  Search,
  User,
} from 'lucide-react';

type ServerUser = {
  id: number;
  name: string;
  role: string;
  position: string | null;
  registration: string | null;
  active: boolean;
};

function SelectServerContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [servers, setServers] = useState<ServerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'hr')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'hr') {
      fetchServers();
    }
  }, [user]);

  async function fetchServers() {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setServers(data.users.filter((s: ServerUser) => s.role === 'server' && s.active));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const filtered = servers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.registration || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-xl border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/rh')}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-white font-bold text-lg sm:text-xl">Gerar Folha Ponto Mensal</h1>
              <p className="text-slate-400 text-xs sm:text-sm">Selecione o servidor e o mês de referência</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Instruções destacadas */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-3xl p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0">
              <Printer className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 text-lg">Gerar Folha Ponto Mensal em PDF (A4)</h3>
              <p className="text-sm text-slate-700 mt-1 leading-relaxed">
                Selecione o <strong>mês de referência</strong> abaixo, escolha o servidor e clique em <strong>"Gerar"</strong>.
                Na próxima tela, clique no botão <strong>"Imprimir / PDF"</strong> para salvar como PDF ou enviar para a impressora.
              </p>
              <div className="mt-3 text-xs text-slate-600">
                📄 <strong>Frente:</strong> Cabeçalho da escola + dados do servidor + tabela com todos os registros do mês
                <br />
                📄 <strong>Verso:</strong> Todas as justificativas de ausência do período
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar servidor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-semibold">📅 Mês de Referência</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Selecione o Servidor</h2>
            <p className="text-sm text-slate-500 mt-0.5">{filtered.length} servidor(es) encontrado(s)</p>
          </div>

          <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
            {filtered.map((server) => (
              <div
                key={server.id}
                className="p-4 hover:bg-slate-50 transition flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {server.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{server.name}</p>
                  <p className="text-xs text-slate-500">
                    {server.position} {server.registration ? `· Matrícula ${server.registration}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/rh/folha-ponto/${server.id}?month=${selectedMonth}`)}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Gerar
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nenhum servidor encontrado</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SelectServerPage() {
  return (
    <AuthProvider>
      <SelectServerContent />
    </AuthProvider>
  );
}
