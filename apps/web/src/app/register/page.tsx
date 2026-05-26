import { AuthCrossLink } from '@/components/auth/auth-cross-link';
import { RegisterForm } from '@/components/auth/register-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Start managing your Resumind CVs</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
          <AuthCrossLink variant="register" />
        </CardContent>
      </Card>
    </div>
  );
}
