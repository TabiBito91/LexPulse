import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-sm text-gray-500">Sign in with GitHub to continue.</p>
      <SignIn />
    </div>
  );
}
