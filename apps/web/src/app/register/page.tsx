import { AuthCrossLink } from '@/components/auth/auth-cross-link';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <AuthPageShell
      title="Create account"
      description="Start managing your Resubuild CVs"
      footer={<AuthCrossLink variant="register" />}
    >
      <RegisterForm />
    </AuthPageShell>
  );
}
