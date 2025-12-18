import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/store/authStore';
import { apiService } from '@/services/api';
import { socketService } from '@/services/socket';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { setUser, setTokens } = useAuthStore();
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response: any = await apiService.post('/api/auth/login', formData);

      if (response.success) {
        setTokens(response.data.tokens);
        setUser(response.data.user);
        socketService.connect(response.data.tokens.accessToken);
        navigate('/');
      } else {
        setError(response.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white dark:bg-dark-surface rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-2">
          Welcome Back
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Sign in to continue to SUP Messenger
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <Input
          label="Phone or Email"
          type="text"
          placeholder="Enter your phone or email"
          value={formData.identifier}
          onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" />
            <span className="text-gray-600 dark:text-gray-400">Remember me</span>
          </label>
          <a
            href="/forgot-password"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            Forgot password?
          </a>
        </div>

        <Button type="submit" fullWidth isLoading={isLoading}>
          Sign In
        </Button>

        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <a
            href="/register"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
          >
            Sign up
          </a>
        </div>
      </form>
    </div>
  );
};
