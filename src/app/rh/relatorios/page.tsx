'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import {
  ArrowLeft,
  BarChart3,
  Loader2,
  Calendar,
  Clock,
  Users,
  FileText,
} from 'lucide-react';
import { getCurrentBrazilDate } from '@/lib/timezone';

function ReportsContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<{
    totalServers: number;
    todayRecords: number;
    pendingJustifications: number;
    monthRecords: number;
  } | null>(null);

  const [month, setMonth] = useState(() => {
    const today = getCurrentBrazilDate();
    return `${today.slice(0, 4)}-${today.slice(5, 7)}`;
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'hr')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'hr') {
      fetchStats();
    }
  }, [user, month]);

  async function fetchStats() {
    try {
      const res = await fetch('/api/hr/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

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
              <h1 className="text-white font-bold text-lg sm:text-xl">Relatórios de Ponto</h1>
              <p className="text-slate-400 text-xs sm:text-sm">Estatísticas e históricos da instituição</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Servidores Ativos"
            value={stats.totalServers}
            icon={<Users className="w-6 h-6" />}
            color="blue"
          />
          <StatCard
            label="Registros Hoje"
            value={stats.todayRecords}
            icon={<Clock className="w-6 h-6" />}
            color="green"
          />
          <StatCard
            label="Registros no Mês"
            value={stats.monthRecords}
            icon={<Calendar className="w-6 h-6" />}
            color="purple"
          />
          <StatCard
            label="Justif. Pendentes"
            value={stats.pendingJustifications}
            icon={<FileText className="w-6 h-6" />}
            color="amber"
          />
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">Relatórios Disponíveis</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReportCard
              title="Folha Ponto Individual"
              description="Gere a folha ponto mensal de um servidor específico em formato A4"
              icon={<FileText className="w-5 h-5" />}
              color="green"
              onClick={() => router.push('/rh/folha-ponto')}
            />
            <ReportCard
              title="Histórico por Servidor"
              description="Visualize todos os registros de um servidor com detalhes completos"
              icon={<Users className="w-5 h-5" />}
              color="blue"
              onClick={() => router.push('/rh')}
            />
            <ReportCard
              title="Justificativas do Mês"
              description="Veja todas as justificativas registradas no período selecionado"
              icon={<Calendar className="w-5 h-5" />}
              color="amber"
              onClick={() => router.push('/rh/justificativas')}
            />
            <ReportCard
              title="Horários de Trabalho"
              description="Consulte e edite os horários de trabalho de cada servidor"
              icon={<Clock className="w-5 h-5" />}
              color="purple"
              onClick={() => router.push('/rh')}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    amber: 'from-amber-500 to-amber-600',
    purple: 'from-purple-500 to-purple-600',
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

function ReportCard({ title, description, icon, color, onClick }: { title: string; description: string; icon: React.ReactNode; color: string; onClick: () => void }) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600',
    green: 'from-green-500 to-emerald-600',
    amber: 'from-amber-500 to-orange-600',
    purple: 'from-purple-500 to-pink-600',
  };
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200 p-5 text-left hover:shadow-lg hover:border-slate-300 transition group"
    >
      <div className={`w-12 h-12 bg-gradient-to-br ${colors[color]} rounded-xl flex items-center justify-center text-white mb-3 shadow group-hover:scale-110 transition`}>
        {icon}
      </div>
      <p className="font-bold text-slate-900">{title}</p>
      <p className="text-sm text-slate-500 mt-1">{description}</p>
    </button>
  );
}

export default function ReportsPage() {
  return (
    <AuthProvider>
      <ReportsContent />
    </AuthProvider>
  );
}
