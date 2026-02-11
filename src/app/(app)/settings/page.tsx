'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/userService';
import { authService } from '@/services/authService';
import FirstAccessSetupModal from '@/components/FirstAccessSetupModal';
import toast from 'react-hot-toast';
import { Globe, Phone, Key, Copy, Trash2, Plus, Eye, EyeOff } from 'lucide-react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [timezone, setTimezone] = useState('UTC');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isDefaultHomepage, setIsDefaultHomepage] = useState(true);
  const [showNewApiKeyDialog, setShowNewApiKeyDialog] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setTimezone(user.timezone || 'UTC');
      setPhoneNumber(user.phoneNumber || '');
      setIsDefaultHomepage(!user.defaultHomepage || user.defaultHomepage === 'personal');
    }
  }, []);

  const updateSettingsMutation = useMutation({
    mutationFn: (data: { timezone?: string; phoneNumber?: string; defaultHomepage?: string }) => 
      userService.updateProfile(data),
    onSuccess: (updatedUser) => {
      // Update local storage with new user data
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        authService.setCurrentUser({ ...currentUser, ...updatedUser });
      }
      toast.success('Configurações atualizadas com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar configurações');
    },
  });

  const handleSetupComplete = () => {
    setShowSetupModal(false);
  };

  const handleSaveTimezone = () => {
    updateSettingsMutation.mutate({ timezone });
  };

  const handleSavePhoneNumber = () => {
    updateSettingsMutation.mutate({ phoneNumber });
  };

  const handleSetDefaultHomepage = (checked: boolean) => {
    setIsDefaultHomepage(checked);
    const defaultHomepage = checked ? 'personal' : undefined;
    updateSettingsMutation.mutate({ defaultHomepage });
  };

  // API Keys
  const { data: apiKeys = [], isLoading: isLoadingKeys } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: () => userService.listApiKeys(),
  });

  const createApiKeyMutation = useMutation({
    mutationFn: (name: string) => userService.createApiKey(name),
    onSuccess: (data) => {
      setCreatedApiKey(data.key);
      setNewApiKeyName('');
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast.success('API Key criada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar API Key');
    },
  });

  const deleteApiKeyMutation = useMutation({
    mutationFn: (id: number) => userService.deleteApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast.success('API Key removida com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao remover API Key');
    },
  });

  const handleCreateApiKey = () => {
    if (!newApiKeyName.trim()) {
      toast.error('Por favor, informe um nome para a API Key');
      return;
    }
    createApiKeyMutation.mutate(newApiKeyName);
  };

  const handleCopyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('API Key copiada!');
  };

  const handleCloseApiKeyDialog = () => {
    setShowNewApiKeyDialog(false);
    setCreatedApiKey(null);
    setNewApiKeyName('');
    setShowApiKey(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const timezones = [
    { value: 'America/Sao_Paulo', label: 'São Paulo (UTC-3)' },
    { value: 'America/Manaus', label: 'Manaus (UTC-4)' },
    { value: 'America/Rio_Branco', label: 'Rio Branco (UTC-5)' },
    { value: 'America/Noronha', label: 'Fernando de Noronha (UTC-2)' },
    { value: 'UTC', label: 'UTC (GMT+0)' },
    { value: 'America/New_York', label: 'New York (UTC-5/-4)' },
    { value: 'Europe/London', label: 'London (UTC+0/+1)' },
    { value: 'Europe/Paris', label: 'Paris (UTC+1/+2)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Configurações
        </h1>
      </div>

      {/* Timezone Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="text-blue-600 dark:text-blue-400" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Fuso Horário
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Selecione seu fuso horário para exibir datas e horários corretos
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fuso Horário
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSaveTimezone}
            disabled={updateSettingsMutation.isPending}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateSettingsMutation.isPending ? 'Salvando...' : 'Salvar Fuso Horário'}
          </button>
        </div>
      </div>

      {/* Phone Number Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <Phone className="text-blue-600 dark:text-blue-400" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Telefone
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure seu número de telefone
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Número de Telefone
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+55 11 98765-4321"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleSavePhoneNumber}
            disabled={updateSettingsMutation.isPending}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateSettingsMutation.isPending ? 'Salvando...' : 'Salvar Telefone'}
          </button>
        </div>
      </div>

      {/* Homepage Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Página Inicial
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Defina esta página como sua página inicial ao fazer login
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="defaultHomepage"
              checked={isDefaultHomepage}
              onChange={(e) => handleSetDefaultHomepage(e.target.checked)}
              disabled={updateSettingsMutation.isPending}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="defaultHomepage" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Usar minhas transações pessoais como página inicial
            </label>
          </div>
        </div>
      </div>

      {/* API Keys Management - Only visible to owners */}
      {currentUser?.isOwner && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Key className="text-blue-600 dark:text-blue-400" size={24} />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    API Keys
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Gerencie chaves de acesso para integração com aplicações externas
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewApiKeyDialog(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                <Plus size={20} />
                Nova API Key
              </button>
            </div>

          {isLoadingKeys ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Carregando...
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Nenhuma API Key criada ainda
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((apiKey) => (
                <div
                  key={apiKey.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {apiKey.name}
                      </h3>
                      <code className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                        {apiKey.keyPreview}
                      </code>
                    </div>
                    <div className="flex gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <span>Criada: {formatDate(apiKey.createdAt)}</span>
                      <span>Último uso: {formatDate(apiKey.lastUsedAt)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Tem certeza que deseja remover esta API Key?')) {
                        deleteApiKeyMutation.mutate(apiKey.id);
                      }
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Remover API Key"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      )}

      {/* Categories Management */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Gerenciar Categorias Padrão
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Adicione mais categorias e subcategorias padrão à sua conta
            </p>
          </div>

          <button
            onClick={() => setShowSetupModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Gerenciar Categorias Padrão
          </button>
        </div>
      </div>

      {/* New API Key Dialog */}
      {showNewApiKeyDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {createdApiKey ? 'API Key Criada' : 'Criar Nova API Key'}
            </h3>

            {createdApiKey ? (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                    ⚠️ Importante: Copie esta chave agora. Ela não será exibida novamente!
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sua API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={createdApiKey}
                      readOnly
                      className="w-full px-4 py-2 pr-20 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        title={showApiKey ? 'Ocultar' : 'Mostrar'}
                      >
                        {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <button
                        onClick={() => handleCopyApiKey(createdApiKey)}
                        className="p-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Copiar"
                      >
                        <Copy size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCloseApiKeyDialog}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome da API Key
                  </label>
                  <input
                    type="text"
                    value={newApiKeyName}
                    onChange={(e) => setNewApiKeyName(e.target.value)}
                    placeholder="Ex: Meu App Externo"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateApiKey();
                      }
                    }}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCloseApiKeyDialog}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateApiKey}
                    disabled={createApiKeyMutation.isPending || !newApiKeyName.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createApiKeyMutation.isPending ? 'Criando...' : 'Criar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Categories Management */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Gerenciar Categorias Padrão
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Adicione mais categorias e subcategorias padrão à sua conta
            </p>
          </div>

          <button
            onClick={() => setShowSetupModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Gerenciar Categorias Padrão
          </button>
        </div>
      </div>

      {showSetupModal && (
        <FirstAccessSetupModal 
          onComplete={handleSetupComplete}
          isResetup={true}
        />
      )}
    </div>
  );
}
