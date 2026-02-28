'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';

export default function HomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  // Chama a rota /health usando a URL da API do .env
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';
  fetch(`${apiBaseUrl.replace(/\/$/, '')}/health`)
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao conectar ao servidor');
        return res.ok;
      })
      .then(() => {
        setLoading(false);
        const isAuthenticated = authService.isAuthenticated();
        if (isAuthenticated) {
          const user = authService.getCurrentUser();
          
          // Redirect based on user's default homepage setting
          if (user?.defaultHomepage) {
            if (user.defaultHomepage.startsWith('group:')) {
              const groupId = user.defaultHomepage.split(':')[1];
              router.push(`/groups/${groupId}/transactions`);
            } else if (user.defaultHomepage === 'personal') {
              router.push('/transactions');
            } else {
              router.push('/transactions');
            }
          } else {
            // Default to personal transactions if no preference set
            router.push('/transactions');
          }
        } else {
          router.push('/auth/login');
        }
      })
      .catch(() => {
        setLoading(false);
        setError('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
      });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      {loading && (
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      )}
      {error && (
        <div className="text-center text-red-600 dark:text-red-400 mt-4">
          {error}
        </div>
      )}
    </div>
  );
}
