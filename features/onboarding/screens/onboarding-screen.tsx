import { OnboardingScreenView } from '@/features/onboarding/components/onboarding-screen-view';
import { useOnboardingScreen } from '@/features/onboarding/hooks/use-onboarding-screen';

export default function OnboardingScreen() {
  const screen = useOnboardingScreen();
  return <OnboardingScreenView {...screen} />;
}
