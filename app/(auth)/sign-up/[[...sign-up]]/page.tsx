import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-4xl font-semibold text-primary mb-2">NutriLog</h1>
          <p className="text-muted">Start your nutrition journey today</p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'shadow-card-lg rounded-2xl border-0',
              headerTitle: 'font-heading text-2xl text-foreground',
              formButtonPrimary: 'btn-primary w-full',
              footerActionLink: 'text-primary hover:text-primary-dark',
            },
          }}
        />
      </div>
    </div>
  );
}
