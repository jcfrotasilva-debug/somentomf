'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Lock, Mail, GraduationCap, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      // Lê a resposta como texto primeiro para evitar erros de parsing
      const responseText = await res.text();
      let data: { error?: string; user?: { role: string } };

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = { error: 'Resposta inválida do servidor' };
      }

      if (!res.ok) {
        // Tratamento explícito para cada código HTTP
        if (res.status === 401) {
          setError('Email ou senha incorretos. Verifique suas credenciais.');
        } else if (res.status === 403) {
          setError('Usuário desativado. Entre em contato com o RH.');
        } else if (res.status === 400) {
          setError(data.error || 'Dados inválidos. Verifique email e senha.');
        } else {
          setError(data.error || 'Erro ao fazer login. Tente novamente.');
        }
        setLoading(false);
        return;
      }

      // Redireciona baseado no papel
      if (data.user?.role === 'hr') {
        router.push('/rh');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      // Tratamento de erros de rede (sem conexão)
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Erro de conexão com o servidor. Verifique sua internet.');
      } else {
        setError('Erro inesperado. Tente novamente.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Painel lateral esquerdo - Identidade Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-yellow-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-8">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 mb-6">
              <GraduationCap className="w-10 h-10 text-yellow-400" />
            </div>
            <p className="text-yellow-400 font-semibold text-sm tracking-widest uppercase mb-3">
              Governo do Estado de São Paulo
            </p>
            <h1 className="text-5xl font-bold leading-tight mb-4">
              EE Profa.
              <br />
              Marlene Frattini
            </h1>
            <p className="text-xl text-blue-100 font-light">
              Sistema Oficial de Registro de Ponto Eletrônico
            </p>
          </div>
          <div className="mt-12 pt-8 border-t border-white/20">
            <p className="text-blue-100 text-sm leading-relaxed max-w-md">
              Plataforma digital segura e eficiente para registro de jornada de trabalho dos servidores da nossa instituição de ensino.
            </p>
          </div>
        </div>
      </div>

      {/* Painel direito - Formulário */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-900 to-indigo-900 rounded-2xl flex items-center justify-center shadow-lg">
              <GraduationCap className="w-7 h-7 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">EE Profa. Marlene Frattini</h1>
              <p className="text-xs text-slate-600">Registro de Ponto Eletrônico</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-10 border border-slate-200">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl mb-4 shadow-lg">
                <LogIn className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Acesso ao Sistema</h2>
              <p className="text-slate-500 text-sm">Digite suas credenciais para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email Institucional
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="servidor@escola.sp.gov.br"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-semibold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Acessar Sistema
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-xs text-center text-slate-500 leading-relaxed">
                Em caso de problemas com acesso, entre em contato com o setor de Recursos Humanos.
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-slate-500 mt-6">
            © {new Date().getFullYear()} EE Profa. Marlene Frattini. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
