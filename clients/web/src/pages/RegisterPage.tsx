import React from 'react';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const RegisterPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-dark-bg dark:to-dark-surface p-4">
      <RegisterForm />
    </div>
  );
};
