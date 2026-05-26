import Link from 'next/link';

const copy = {
  login: {
    prefix: 'No account?',
    href: '/register',
    label: 'Register',
  },
  register: {
    prefix: 'Already have an account?',
    href: '/login',
    label: 'Sign in',
  },
} as const;

type AuthCrossLinkVariant = keyof typeof copy;

export function AuthCrossLink({ variant }: { variant: AuthCrossLinkVariant }) {
  const { prefix, href, label } = copy[variant];

  return (
    <p className="text-muted-foreground mt-4 text-sm">
      {prefix}{' '}
      <Link href={href} className="text-primary underline-offset-4 hover:underline">
        {label}
      </Link>
    </p>
  );
}
