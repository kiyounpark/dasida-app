import { ConsentScreenView } from '@/features/consent/components/consent-screen-view';
import { useConsentScreen } from '@/features/consent/hooks/use-consent-screen';

export default function ConsentScreen() {
  const screen = useConsentScreen();
  return <ConsentScreenView {...screen} />;
}
