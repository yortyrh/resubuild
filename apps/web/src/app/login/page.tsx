import { AuthCrossLink } from '@/components/auth/auth-cross-link';
import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Access your Resubuild dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <AuthCrossLink variant="login" />
        </CardContent>
      </Card>
    </div>
  );
}
