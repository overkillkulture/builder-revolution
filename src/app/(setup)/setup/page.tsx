import { EditProfileForm } from '@/components/EditProfileForm';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';

export const metadata = {
  title: 'Builder Revolution Chat | Setup Profile',
};

export default function Page() {
  return (
    <ResponsiveContainer className="mx-auto my-4 px-4 md:px-0">
      <h1 className="mb-1 text-3xl font-bold">Welcome to Builder Revolution Chat</h1>
      <p className="mb-4 text-muted-foreground">
        Tell us who you are and what you build. Only <b>name</b> and <b>username</b> are required — fill out everything else to join the Operator Network and marketplace.
      </p>
      <EditProfileForm redirectTo="/feed" />
      <p className="mt-4 text-center text-xs text-muted-foreground">
        By joining, you agree to our{' '}
        <a href="/terms" className="text-primary hover:underline" target="_blank">
          Terms of Service
        </a>
      </p>
    </ResponsiveContainer>
  );
}
