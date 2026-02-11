"use client";

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import { createInUserTimezone, getUserTimezone } from '@/lib/timezone';
import utc from 'dayjs/plugin/utc';
dayjs.extend(timezone);
dayjs.extend(utc);

import { useEffect, useState, useRef } from 'react';
import { accountService } from '@/services/accountService';
import { groupService } from '@/services/groupService';
import { categoryService } from '@/services/categoryService';
import { subcategoryService } from '@/services/subcategoryService';
import { Account, AccountBalance, AccountType } from '@/types';
import { GroupMember } from '@/types';
import { Category, Subcategory } from '@/types';
import { Plus, Pencil, Trash2, Wallet, CreditCard, DollarSign, X, Info, Settings, PlusCircle, MinusCircle } from 'lucide-react';
import Popover from '@mui/material/Popover';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';

interface AccountManagerProps {
  groupId?: number;
  canManage?: boolean;
  canView?: boolean;
  title?: string;
  currentUserId?: number;
  canManageOwn?: boolean;
  canManageAll?: boolean;
}

export default function AccountManager({
  groupId,
  canManage = true,
  canView = true,
  title,
  currentUserId,
  canManageOwn = false,
  canManageAll = false,
}: AccountManagerProps) {
  const router = useRouter();
  const [infoAnchorEl, setInfoAnchorEl] = useState<HTMLElement | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleInfoClick = (e: React.MouseEvent<HTMLElement>) => {
    setInfoAnchorEl(e.currentTarget);
  };
  const handleInfoClose = () => setInfoAnchorEl(null);
  const infoOpen = Boolean(infoAnchorEl);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [balances, setBalances] = useState<Record<number, AccountBalance | null>>({});
  const [loading, setLoading] = useState(true);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [deleteTxCount, setDeleteTxCount] = useState<number>(0);
  const [deleteTargetAccountId, setDeleteTargetAccountId] = useState<number | null>(null);

  const [balanceFormData, setBalanceFormData] = useState({
    amount: '0,00',
    dateTime: createInUserTimezone(), // Dayjs object
  });


  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (canView) {
      loadAccounts();
    }
    if (groupId) {
      groupService.getMembers(groupId).then((members: GroupMember[]) => setGroupMembers(members));
    }
  }, [canView, groupId]);

  // Load categories for prepaid selection
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await categoryService.getAll(groupId ? groupId : undefined);
        setCategories(cats);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, [groupId]);

  // Load all subcategories (then filter client-side like TransactionForm)
  useEffect(() => {
    const loadSubcategories = async () => {
      try {
        const subs = await subcategoryService.getAll(groupId ? groupId : undefined);
        setSubcategories(subs);
      } catch (err) {
        console.error('Failed to load subcategories:', err);
      }
    };
    loadSubcategories();
  }, [groupId]);

  useEffect(() => {
    const updateDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    updateDarkMode();
    window.addEventListener('storage', updateDarkMode);
    const observer = new MutationObserver(updateDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      window.removeEventListener('storage', updateDarkMode);
      observer.disconnect();
    };
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await accountService.getAll(groupId ? { groupId } : undefined);
      setAccounts(data);

      // Load balances for all accounts
      const balancePromises = data.map(async (account) => {
        const balance = await accountService.getCurrentBalance(account.id);
        return { accountId: account.id, balance };
      });

      const balanceResults = await Promise.all(balancePromises);
      const balanceMap: Record<number, AccountBalance | null> = {};
      balanceResults.forEach(({ accountId, balance }) => {
        balanceMap[accountId] = balance;
      });
      setBalances(balanceMap);
    } catch (error) {
      console.error('Failed to load accounts:', error);
      toast.error('Erro ao carregar contas');
    } finally {
      setLoading(false);
    }
  };

  const canEditAccount = (account: Account): boolean => {
    if (!groupId) return canManage; // Personal accounts

    // Group accounts
    if (canManageAll) return true;
    if (canManageOwn && currentUserId && account.userId === currentUserId) return true;
    return false;
  };

  // Calculate closing and due dates for credit cards
  const getCreditCardDates = (account: Account) => {
    if (account.type !== 'CREDIT' || !account.creditClosingDay || !account.creditDueDay) {
      return null;
    }

    const now = dayjs();
    const currentDay = now.date();
    const currentMonth = now.month();
    const currentYear = now.year();

    // Calculate closing date
    let closingDate = dayjs().date(account.creditClosingDay);
    if (currentDay > account.creditClosingDay) {
      closingDate = closingDate.add(1, 'month');
    }

    // Calculate due date
    let dueDate = dayjs().date(account.creditDueDay);
    
    // Due date is typically in the next month after closing
    if (account.creditDueDay <= account.creditClosingDay) {
      dueDate = dueDate.add(1, 'month');
    }
    
    // If we're past closing, both dates move to next cycle
    if (currentDay > account.creditClosingDay) {
      dueDate = dueDate.add(1, 'month');
    }

    return {
      closingDate,
      dueDate
    };
  };

  // Check if account is in closing period (should have yellow background)
  const isInClosingPeriod = (account: Account): boolean => {
    const dates = getCreditCardDates(account);
    if (!dates) return false;

    const now = dayjs();
    return now.isSame(dates.closingDate, 'day') || 
           (now.isAfter(dates.closingDate, 'day') && now.isBefore(dates.dueDate, 'day'));
  };

  const handleBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) return;

    try {
      const amountNumber = Number(String(balanceFormData.amount).replace(/\./g, '').replace(',', '.'));
      await accountService.addBalance({
        accountId: selectedAccountId,
        amount: amountNumber,
        date: balanceFormData.dateTime.toDate(),
      });
      toast.success('Saldo atualizado com sucesso!');
      setShowBalanceModal(false);
      resetBalanceForm();
      loadAccounts();
    } catch (error) {
      console.error('Failed to update balance:', error);
      toast.error('Erro ao atualizar saldo');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const count = await accountService.getTransactionCount(id);
      if (count === 0) {
        if (!confirm('Tem certeza que deseja excluir esta conta?')) return;
        await accountService.delete(id);
        toast.success('Conta excluída com sucesso!');
        loadAccounts();
        return;
      }

      // Has transactions -> show modal with options
      const acc = accounts.find(a => a.id === id) || null;
      setAccountToDelete(acc);
      setDeleteTxCount(count);
      setDeleteTargetAccountId(null);
      setShowDeleteModal(true);
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error('Erro ao excluir conta');
    }
  };

  const performForceDelete = async () => {
    if (!accountToDelete) return;
    try {
      await accountService.deleteWithForce(accountToDelete.id);
      toast.success('Conta e transações excluídas com sucesso!');
      setShowDeleteModal(false);
      setAccountToDelete(null);
      loadAccounts();
    } catch (error) {
      console.error('Failed to force delete account:', error);
      toast.error('Erro ao excluir conta');
    }
  };

  const performMoveAndDelete = async () => {
    if (!accountToDelete || !deleteTargetAccountId) {
      toast.error('Selecione uma conta destino para mover as transações');
      return;
    }
    try {
      await accountService.moveTransactions(accountToDelete.id, deleteTargetAccountId);
      // After moving, delete account (no need to force but use force to ensure clean deletion)
      await accountService.deleteWithForce(accountToDelete.id);
      toast.success('Transações movidas e conta excluída com sucesso!');
      setShowDeleteModal(false);
      setAccountToDelete(null);
      loadAccounts();
    } catch (error) {
      console.error('Failed to move transactions and delete account:', error);
      toast.error('Erro ao mover transações ou excluir conta');
    }
  };



  const resetBalanceForm = () => {
    setBalanceFormData({
      amount: '0,00',
      dateTime: createInUserTimezone(),
    });
    setSelectedAccountId(null);
  };

  const toggleBalanceSign = () => {
    const isNegative = balanceFormData.amount.startsWith('-');
    const newValue = isNegative ? balanceFormData.amount.substring(1) : `-${balanceFormData.amount}`;
    setBalanceFormData({ ...balanceFormData, amount: newValue });
  };

  const openEditPage = (accountId: number) => {
    if (groupId) {
      router.push(`/groups/${groupId}/accounts/${accountId}/edit`);
    } else {
      router.push(`/accounts/${accountId}/edit`);
    }
  };

  const openBalanceModal = (accountId: number) => {
    const currentBalance = balances[accountId];
    setSelectedAccountId(accountId);
    setBalanceFormData({
      amount: (currentBalance?.amount ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      dateTime: createInUserTimezone(),
    });
    setShowBalanceModal(true);
  };

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case 'CREDIT':
        return <CreditCard className="w-6 h-6" />;
      case 'CASH':
        return <DollarSign className="w-6 h-6" />;
      case 'PREPAID':
        return <Wallet className="w-6 h-6" />;
      default:
        return <Wallet className="w-6 h-6" />;
    }
  };

  const getAccountTypeLabel = (type: AccountType) => {
    switch (type) {
      case 'CREDIT':
        return 'Crédito';
      case 'CASH':
        return 'Dinheiro';
      case 'PREPAID':
        return 'Pré-pago';
      default:
        return type;
    }
  };

  const getAccountTypeEmoji = (type: AccountType) => {
    switch (type) {
      case 'CREDIT':
        return '💳';
      case 'CASH':
        return '💵';
      case 'PREPAID':
        return '💰';
      default:
        return '🏦';
    }
  };

  if (!canView) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            Você não tem permissão para visualizar as contas{groupId ? ' deste grupo' : ''}.
          </p>
        </div>
      </div>
    );
  }

  const showCreateButton = groupId ? (canManageOwn || canManageAll) : canManage;

  const muiTheme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: isDarkMode ? '#ffffffff' : '#000000ff',
      },
    },
  });


  return (
    <div className="p-6 max-w-7xl mx-auto pb-24">
      <div className="mb-6 relative">
        <div className="absolute top-0 right-0 flex items-center gap-2">
          <button
            onClick={handleInfoClick}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Ajuda sobre tipos de conta"
          >
            <Info size={18} />
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Configurações"
          >
            <Settings size={18} />
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {title || 'Minhas Contas'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Gerencie suas contas e acompanhe seus saldos
        </p>
      </div>

      <Popover
        open={infoOpen}
        anchorEl={infoAnchorEl}
        onClose={handleInfoClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <div style={{ padding: 12, maxWidth: 340, whiteSpace: 'pre-line' }}>
          <strong>Tipos de conta</strong>
          <div style={{ marginTop: 8 }}>
            {/* Dinheiro (padrão): gastos e ganhos são registrados imediatamente, no momento em que acontecem.
Crédito: você pode escolher se os gastos serão contabilizados conforme as compras acontecem ou apenas quando a fatura for paga.
Pré-pago: o valor é descontado ao transferir dinheiro para a conta; as transações de gasto não entram no total de gastos. */}
            Dinheiro (padrão): gastos e ganhos são descontados imediatamente.
          </div>
          <div style={{ marginTop: 8 }}>
            Crédito: Os gastos podem ser contabilizados conforme as compras acontecem ou apenas quando a fatura for paga.
          </div>
          <div style={{ marginTop: 8 }}>
            Pré-pago: O valor é descontado ao transferir dinheiro para a conta.
          </div>
        </div>
      </Popover>

      {/* Settings modal (placeholder) */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Configurações</h3>
              <button onClick={() => setShowSettingsModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X size={18} />
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-400">Configurações da conta — implementação futura.</p>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowSettingsModal(false)} className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando contas...</p>
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Nenhuma conta cadastrada
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Comece criando sua primeira conta para gerenciar seu dinheiro
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Group accounts by type and calculate totals */}
          {(() => {
            const accountsByType: Record<AccountType, Account[]> = {
              CASH: [],
              CREDIT: [],
              PREPAID: []
            };

            accounts.forEach(account => {
              accountsByType[account.type].push(account);
            });

            const typeOrder: AccountType[] = ['CASH', 'CREDIT', 'PREPAID'];

            return typeOrder.map(type => {
              const typeAccounts = accountsByType[type];
              if (typeAccounts.length === 0) return null;

              // Calculate total for this type
              const total = typeAccounts.reduce((sum, account) => {
                const balance = balances[account.id];
                return sum + (balance?.amount ?? 0);
              }, 0);

              return (
                <div key={type}>
                  {/* Type Header with Total */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-gray-300 dark:border-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getAccountTypeEmoji(type)}</span>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {getAccountTypeLabel(type)}
                      </h2>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Accounts Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {typeAccounts.map((account) => {
                      const balance = balances[account.id];
                      const canEdit = canEditAccount(account);
                      const creditDates = getCreditCardDates(account);
                      const inClosingPeriod = isInClosingPeriod(account);

                      // Buscar nome do dono
                      let ownerFirstName = '';
                      if (groupId) {
                        const owner = groupMembers.find(m => m.userId === account.userId);
                        ownerFirstName = owner?.user?.firstName || '';
                      }
                      return (
                        <div
                          key={account.id}
                          onClick={(e) => {
                            // avoid navigating when clicking action buttons
                            if ((e.target as HTMLElement).closest('button')) return;
                            if (groupId) {
                              router.push(`/groups/${groupId}/accounts/${account.id}/history`);
                            } else {
                              router.push(`/accounts/${account.id}/history`);
                            }
                          }}
                          className={`rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer ${
                            inClosingPeriod 
                              ? 'bg-yellow-50 dark:bg-yellow-900/20' 
                              : 'bg-white dark:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="text-4xl">{getAccountTypeEmoji(account.type)}</div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {account.name}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {getAccountTypeLabel(account.type)}
                                </p>
                                {groupId && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Dono: {ownerFirstName}
                                  </p>
                                )}
                              </div>
                            </div>
                            {canEdit && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openEditPage(account.id)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                  title="Editar conta"
                                >
                                  <Pencil size={18} />
                                </button>
                                <button
                                  onClick={() => handleDelete(account.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                  title="Excluir conta"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Saldo Atual</span>
                              {canEdit && (
                                <button
                                  onClick={() => openBalanceModal(account.id)}
                                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                  Atualizar
                                </button>
                              )}
                            </div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                              R$ {balance?.amount?.toFixed(2) || '0.00'}
                            </div>
                            {balance && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Atualizado em {new Date(balance.date).toLocaleString('pt-BR')}
                              </p>
                            )}
                            
                            {/* Show credit card dates */}
                            {creditDates && (
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-gray-600 dark:text-gray-400">Fechamento:</span>
                                  <span className={`font-medium ${
                                    inClosingPeriod ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {creditDates.closingDate.format('DD/MM/YYYY')}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600 dark:text-gray-400">Vencimento:</span>
                                  <span className={`font-medium ${
                                    inClosingPeriod ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {creditDates.dueDate.format('DD/MM/YYYY')}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }).filter(Boolean);
          })()}
        </div>
      )}

      {/* Floating Add Button */}
      {showCreateButton && (
        <button
          onClick={() => {
            if (groupId) {
              router.push(`/groups/${groupId}/accounts/create`);
            } else {
              router.push('/accounts/create');
            }
          }}
          className="fixed bottom-6 right-6 z-40 p-4 bg-blue-600 dark:bg-blue-700 text-white rounded-full shadow-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all hover:scale-110 active:scale-95"
          title="Criar nova conta"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Update Balance Modal */}
      {
        showBalanceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Atualizar Saldo
                  </h3>
                  <button
                    onClick={() => {
                      setShowBalanceModal(false);
                      resetBalanceForm();
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <X size={20} />
                  </button>
                </div>


                <form onSubmit={handleBalanceSubmit} className="space-y-4">
                  <ThemeProvider theme={muiTheme}>
                    <FormControl focused fullWidth required margin="normal">
                      <div className="relative">
                        <TextField
                          label="Novo Saldo"
                          type="text"
                          inputMode="numeric"
                          value={balanceFormData.amount}
                          onChange={(e) => {
                            const raw = e.target.value || '';
                            const negative = raw.trim().startsWith('-');
                            const digits = raw.replace(/\D/g, '');
                            const cents = Number(digits || '0');
                            const formattedNumber = (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            const formatted = negative ? `-${formattedNumber}` : formattedNumber;
                            setBalanceFormData({ ...balanceFormData, amount: formatted });
                          }}
                          onKeyDown={(e) => {
                            const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
                            if (allowed.includes(e.key)) return;
                            if (e.key === '-' || e.key === 'Subtract') return;
                            if (!/^\d$/.test(e.key)) e.preventDefault();
                          }}
                          placeholder="0,00"
                          required
                          focused
                        />
                        <button
                          type="button"
                          onClick={toggleBalanceSign}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Alternar sinal"
                        >
                          {balanceFormData.amount.startsWith('-') ? (
                            <MinusCircle size={20} className="text-red-600 dark:text-red-400" />
                          ) : (
                            <PlusCircle size={20} className="text-green-600 dark:text-green-400" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormControl fullWidth required margin="normal">
                      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                        <DateTimePicker
                          label="Data e Hora"
                          value={balanceFormData.dateTime}
                          onChange={(newValue: Dayjs | null) => {
                            if (newValue) {
                              setBalanceFormData({ ...balanceFormData, dateTime: newValue });
                            }
                          }}
                          format="DD/MM/YYYY HH:mm"
                          ampm={false}
                          slotProps={{
                            textField: {
                              focused: true,
                              required: true,
                              fullWidth: true,
                            },
                          }}
                        />
                      </LocalizationProvider>
                    </FormControl>
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowBalanceModal(false);
                          resetBalanceForm();
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Atualizar
                      </button>
                    </div>
                  </ThemeProvider>
                </form>
              </div>
            </div>
          </div>
        )
      }
      {/* Delete Account Modal (move or delete transactions) */}
      {showDeleteModal && accountToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Conta possui transações vinculadas
                </h3>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setAccountToDelete(null);
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                A conta "{accountToDelete.name}" possui {deleteTxCount} transação(ões) vinculada(s).
                Você pode deletar todas as transações ou movê-las para outra conta.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Selecionar conta destino</label>
                  <select
                    value={deleteTargetAccountId ?? ''}
                    onChange={(e) => setDeleteTargetAccountId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full border rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">-- Escolha uma conta --</option>
                    {accounts.filter(a => a.id !== accountToDelete.id).map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({getAccountTypeLabel(a.type)})</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setAccountToDelete(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={performForceDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Deletar todas as transações
                  </button>
                  <button
                    type="button"
                    onClick={performMoveAndDelete}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Mover e deletar conta
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div >
  );
}
