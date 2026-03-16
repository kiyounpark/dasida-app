import { ProfileScreenView } from '@/features/profile/components/profile-screen-view';
import { useProfileScreen } from '@/features/profile/hooks/use-profile-screen';

export default function ProfileScreen() {
  const screen = useProfileScreen();

  return <ProfileScreenView {...screen} />;
}
