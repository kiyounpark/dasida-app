import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import type { HomeLearningState } from '@/features/learning/home-state';
import { WeaknessProgressItem } from '@/features/quiz/components/weakness-progress-item';

function PeerChip({ peers }: { peers: HomeLearningState['peerPresence'] }) {
  if (peers.mode !== 'live' || peers.peers.length === 0) {
    return null;
  }

  const displayPeers = peers.peers.slice(0, 3);
  const AVATAR_COLORS = ['#D4E8C2', '#C2D4E8', '#E8D4C2', '#E8C2D4'];

  return (
    <View style={styles.peerChip}>
      <View style={styles.avatars}>
        {displayPeers.map((peer, i) => (
          <View
            key={peer.id}
            style={[
              styles.avatar,
              { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] },
              i > 0 && styles.avatarOverlap,
            ]}>
            <Text style={styles.avatarText}>{peer.nickname.charAt(0)}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.peerText}>
        <Text style={styles.peerTextBold}>{peers.peers.length}명</Text>이 지금 같이 복습 중
      </Text>
    </View>
  );
}

export function HomeWeaknessSection({
  homeState,
}: {
  homeState: HomeLearningState;
}) {
  if (!homeState.latestDiagnosticSummary) {
    return null;
  }

  const { weaknessProgressItems, peerPresence } = homeState;

  return (
    <View style={styles.section}>
      <View style={styles.divider} />
      <View style={styles.content}>
        <PeerChip peers={peerPresence} />

        {weaknessProgressItems.length > 0 ? (
          <View style={styles.weaknessList}>
            <Text style={styles.sectionLabel}>내 약점</Text>
            {weaknessProgressItems.map((item) => (
              <WeaknessProgressItem key={item.weaknessId} item={item} />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(41, 59, 39, 0.08)',
  },
  content: {
    paddingTop: 10,
    paddingBottom: 16,
    gap: 8,
  },
  peerChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 252, 247, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.1)',
    borderRadius: 99,
    paddingVertical: 4,
    paddingLeft: 6,
    paddingRight: 10,
  },
  avatars: {
    flexDirection: 'row',
  },
  avatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#F6F2E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlap: {
    marginLeft: -4,
  },
  avatarText: {
    fontFamily: FontFamilies.bold,
    fontSize: 8,
    color: '#1C2C19',
  },
  peerText: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    color: 'rgba(72, 67, 58, 0.7)',
  },
  peerTextBold: {
    fontFamily: FontFamilies.bold,
    color: '#1C2C19',
  },
  weaknessList: {
    gap: 5,
  },
  sectionLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: '#1C2C19',
    marginBottom: 1,
  },
});
