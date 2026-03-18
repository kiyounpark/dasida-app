import { SignInScreenView } from '@/features/auth/components/sign-in-screen-view';
import { useSignInScreen } from '@/features/auth/hooks/use-sign-in-screen';

export default function SignInScreen() {
  const screen = useSignInScreen();

  return <SignInScreenView {...screen} />;
}
