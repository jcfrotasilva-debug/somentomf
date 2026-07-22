'use client';

import { useEffect, useState, ChangeEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Upload,
  Download,
  RotateCcw,
  Image as ImageIcon,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Shield,
  Database,
  FileJson,
} from 'lucide-react';

type SettingsData = {
  brasaoUrl: string | null;
  escolaNome: string | null;
  secretariaNome: string | null;
  governoNome: string | null;
  [key: string]: string | null;
};

function ConfigContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [settings, setSettings] = useState<SettingsData>({
    brasaoUrl: null,
    escolaNome: null,
    secretariaNome: null,
    governoNome: null,
  });
  const [brasaoPreview, setBrasaoPreview] = useState<string | null>(null);
  const [brasaoFile, setBrasaoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [generatingBackup, setGeneratingBackup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'hr')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'hr') {
      fetchSettings();
    }
  }, [user]);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        if (data.settings.brasaoUrl) {
          setBrasaoPreview(data.settings.brasaoUrl);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function saveSetting(key: string, value: string | null) {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  function handleBrasaoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validações
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'O arquivo precisa ser uma imagem (PNG, JPG, SVG)' });
      setTimeout(() => setMessage(null), 4000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'A imagem deve ter no máximo 5MB' });
      setTimeout(() => setMessage(null), 4000);
      return;
    }

    setBrasaoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setBrasaoPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function saveBrasao() {
    if (!brasaoFile && !brasaoPreview) return;
    setSaving(true);
    try {
      // Converter imagem para base64
      let base64 = brasaoPreview;
      if (brasaoFile && !base64) {
        base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(brasaoFile);
        });
      }

      const ok = await saveSetting('brasaoUrl', base64);
      if (ok) {
        setMessage({ type: 'success', text: '✓ Brasão atualizado com sucesso!' });
        setBrasaoFile(null);
        setSettings((prev) => ({ ...prev, brasaoUrl: base64 }));
      } else {
        setMessage({ type: 'error', text: 'Erro ao salvar brasão' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Erro ao salvar' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  }

  async function removeBrasao() {
    if (!confirm('Deseja remover o brasão atual? O logo padrão do sistema será usado.')) return;
    setSaving(true);
    try {
      const ok = await saveSetting('brasaoUrl', null);
      if (ok) {
        setMessage({ type: 'success', text: '✓ Brasão removido. Usando logo padrão.' });
        setBrasaoPreview(null);
        setBrasaoFile(null);
        setSettings((prev) => ({ ...prev, brasaoUrl: null }));
      }
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  }

  async function handleBackup() {
    setGeneratingBackup(true);
    try {
      const res = await fetch('/api/settings/backup');
      if (!res.ok) throw new Error('Erro ao gerar backup');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().split('T')[0];
      a.download = `backup-ee-marlene-frattini-${today}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: '✓ Backup gerado e baixado com sucesso!' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Erro ao gerar backup' });
    } finally {
      setGeneratingBackup(false);
      setTimeout(() => setMessage(null), 4000);
    }
  }

  async function handleRestore(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('ATENÇÃO! A restauração irá SOBRESCREVER todos os dados atuais com os dados do arquivo de backup. Deseja continuar?')) {
      e.target.value = '';
      return;
    }

    setRestoring(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const res = await fetch('/api/settings/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `✓ Restauração concluída! ${data.restored.users} usuários, ${data.restored.timeEntries} registros, ${data.restored.justifications} justificativas, ${data.restored.workSchedules} horários, ${data.restored.settings} configurações. ${data.warning}`,
        });
        setTimeout(() => fetchSettings(), 2000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao restaurar' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao processar arquivo: arquivo inválido ou corrompido' });
    } finally {
      setRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setMessage(null), 8000);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 pb-12">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-xl border-b border-slate-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/rh')}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <SettingsIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg sm:text-xl">Configurações do Sistema</h1>
                <p className="text-slate-400 text-xs sm:text-sm">Personalização, backup e restauração</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Mensagem */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm font-medium flex-1">{message.text}</p>
          </div>
        )}

        {/* Brasão */}
        <section className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 mb-6">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900">Brasão da Escola</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Personalize o brasão que aparece nas folhas de ponto e documentos oficiais
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Preview */}
            <div className="flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-6">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                Preview do Brasão
              </p>
              <div className="w-40 h-40 flex items-center justify-center bg-white border border-slate-200 rounded-xl shadow-sm">
                {brasaoPreview ? (
                  <img src={brasaoPreview} alt="Brasão" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-center px-4">
                    <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">Nenhum brasão carregado</p>
                    <p className="text-[10px] text-slate-400 mt-1">Usando logo padrão do sistema</p>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-3 text-center">
                Formatos aceitos: PNG, JPG, SVG<br />
                Tamanho máximo: 5MB<br />
                Recomendado: 400x400px
              </p>
            </div>

            {/* Upload */}
            <div className="space-y-3">
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 rounded-2xl p-8 text-center transition">
                  <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="font-medium text-slate-700">Clique para enviar uma imagem</p>
                  <p className="text-xs text-slate-500 mt-1">ou arraste o arquivo aqui</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBrasaoUpload}
                  className="hidden"
                />
              </label>

              <div className="flex gap-2">
                <button
                  onClick={saveBrasao}
                  disabled={saving || !brasaoPreview}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Salvar Brasão
                </button>
                {brasaoPreview && (
                  <button
                    onClick={removeBrasao}
                    disabled={saving}
                    className="bg-red-50 hover:bg-red-100 text-red-700 font-medium py-2.5 px-4 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                    title="Remover brasão"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {brasaoFile && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm">
                  <p className="font-medium text-blue-900">Arquivo selecionado:</p>
                  <p className="text-xs text-blue-700">{brasaoFile.name} ({(brasaoFile.size / 1024).toFixed(1)} KB)</p>
                  <p className="text-[10px] text-blue-600 mt-1">Clique em "Salvar Brasão" para aplicar</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Backup */}
        <section className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 mb-6">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white shadow">
              <Database className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900">Backup do Sistema</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Gere um arquivo com todos os dados do sistema (servidores, registros, horários, justificativas)
              </p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-green-900 mb-2">Backup Completo e Seguro</p>
                <ul className="text-sm text-green-800 space-y-1.5">
                  <li>✓ Todos os servidores (sem as senhas, por segurança)</li>
                  <li>✓ Todos os registros de ponto</li>
                  <li>✓ Todas as justificativas</li>
                  <li>✓ Todos os horários de trabalho</li>
                  <li>✓ Configurações personalizadas (incluindo brasão)</li>
                </ul>
                <div className="mt-3 text-xs text-green-700 italic">
                  ⚠️ As senhas NÃO estão inclusas no backup. Após restauração, todos os servidores terão a senha padrão "123456".
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleBackup}
            disabled={generatingBackup}
            className="mt-4 w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3.5 rounded-xl transition shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generatingBackup ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gerando backup...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Gerar e Baixar Backup
              </>
            )}
          </button>
        </section>

        {/* Restauração */}
        <section className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-white shadow">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900">Restauração de Dados</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Importe dados de um arquivo de backup anterior
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-amber-900 mb-2">⚠️ ATENÇÃO - Operação Irreversível</p>
                <ul className="text-sm text-amber-800 space-y-1.5">
                  <li>• A restauração vai <strong>SOBRESCREVER</strong> todos os dados atuais</li>
                  <li>• Se um usuário existir, será atualizado; se não existir, será criado</li>
                  <li>• <strong>Todas as senhas serão redefinidas para "123456"</strong></li>
                  <li>• Após a restauração, oriente os servidores a alterar suas senhas</li>
                  <li>• Recomendamos fazer um backup ANTES de restaurar</li>
                </ul>
              </div>
            </div>
          </div>

          <label className="block">
            <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer ${
              restoring
                ? 'border-slate-300 bg-slate-50 cursor-not-allowed opacity-50'
                : 'border-amber-300 hover:border-amber-500 hover:bg-amber-50'
            }`}>
              {restoring ? (
                <>
                  <Loader2 className="w-10 h-10 text-amber-600 mx-auto mb-2 animate-spin" />
                  <p className="font-medium text-slate-700">Restaurando dados...</p>
                  <p className="text-xs text-slate-500 mt-1">Aguarde, isso pode levar alguns segundos</p>
                </>
              ) : (
                <>
                  <FileJson className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                  <p className="font-medium text-slate-700">Clique para selecionar o arquivo de backup (.json)</p>
                  <p className="text-xs text-slate-500 mt-1">Será exibida uma confirmação antes de restaurar</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleRestore}
              disabled={restoring}
              className="hidden"
            />
          </label>
        </section>

        {/* Informações adicionais */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
            <SettingsIcon className="w-5 h-5 text-blue-600" />
            Sobre o Sistema
          </h3>
          <ul className="text-sm text-slate-700 space-y-1.5 ml-7 list-disc">
            <li><strong>Sistema:</strong> Registro de Ponto Eletrônico</li>
            <li><strong>Instituição:</strong> EE Profa. Marlene Frattini</li>
            <li><strong>Fuso horário:</strong> Horário de Brasília (GMT-3)</li>
            <li><strong>Versão:</strong> 1.0</li>
            <li><strong>Banco de dados:</strong> PostgreSQL com Drizzle ORM</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default function ConfigPage() {
  return (
    <AuthProvider>
      <ConfigContent />
    </AuthProvider>
  );
}
