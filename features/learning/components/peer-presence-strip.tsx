import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { BrandTypography } from '@/constants/typography';
import type { PeerPresenceState } from '@/features/learning/home-state';

type PeerPresenceStripProps = {
  state: PeerPresenceState;
};

const avatarPalette = ['#DCECD7', '#E7E1F7', '#F4E3D4', '#DDEAF1', '#F1E1E7'];

function getAvatarBackground(seed?: string) {
  if (!seed) {
    return avatarPalette[0];
  }

  const index = [...seed].reduce((total, letter) => total + letter.charCodeAt(0), 0);
  return avatarPalette[index % avatarPalette.length];
}

function getInitial(nickname: string) {
  return nickname.trim().slice(0, 1) || '?';
}

export function PeerPresenceStrip({ state }: PeerPresenceStripProps) {
  const { width } = useWindowDimensions();
  const cardWidth = width < 390 ? 188 : 208;

  if (state.mode === 'fallback') {
    return (
      <View style={styles.fallbackWrap}>
        <View style={styles.fallbackIconWrap}>
          <IconSymbol name="checkmark.circle.fill" size={18} color={BrandColors.primarySoft} />
        </View>
        <View style={styles.fallbackCopy}>
          <Text selectable style={styles.fallbackTitle}>
            {state.title}
          </Text>
          {state.subtitle ? (
            <Text selectable style={styles.fallbackSubtitle}>
              {state.subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.liveWrap}>
      <View style={styles.liveHeader}>
        <View style={styles.liveTitleRow}>
          <View style={styles.liveBadge}>
            <Text selectable style={styles.liveBadgeText}>
              함께
            </Text>
          </View>
          <Text selectable style={styles.liveTitle}>
            {state.title}
          </Text>
        </View>
        <Text selectable style={styles.liveSubtitle}>
          지금도 같은 방식으로 틀린 문제를 정리하고 있어요.
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.liveScrollContent}>
        {state.peers.map((peer) => (
          <View key={peer.id} style={[styles.peerCard, { width: cardWidth }]}>
            <View style={styles.peerTopRow}>
              <View
                style={[styles.avatarWrap, { backgroundColor: getAvatarBackground(peer.avatarSeed) }]}>
                {peer.avatarUrl ? (
                  <Image source={peer.avatarUrl} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <Text selectable style={styles.avatarInitial}>
                    {getInitial(peer.nickname)}
                  </Text>
                )}
              </View>
              <View style={styles.peerHeaderCopy}>
                <Text selectable style={styles.peerName}>
                  {peer.nickname}
                </Text>
                <Text selectable style={styles.peerStatus}>
                  {peer.statusText}
                </Text>
              </View>
            </View>
            <View style={styles.peerFooter}>
              <View style={styles.peerDot} />
              <Text selectable style={styles.peerFooterText}>
                같이 정리하고 있어요
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BrandSpacing.sm,
    borderWidth: 1,
    borderColor: '#DCE4D6',
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: '#FBF8F1',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  fallbackIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF4E9',
  },
  fallbackCopy: {
    flex: 1,
    gap: 2,
  },
  fallbackTitle: {
    ...BrandTypography.bodyStrong,
    color: BrandColors.text,
  },
  fallbackSubtitle: {
    ...BrandTypography.meta,
    color: BrandColors.mutedText,
  },
  liveWrap: {
    gap: BrandSpacing.sm,
    borderWidth: 1,
    borderColor: '#DCE4D6',
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: '#FBF8F1',
    paddingVertical: 16,
    boxShadow: '0 16px 28px rgba(24, 40, 22, 0.05)',
  },
  liveHeader: {
    paddingHorizontal: BrandSpacing.lg,
    gap: 6,
  },
  liveTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#EAF1E3',
  },
  liveBadgeText: {
    ...BrandTypography.tiny,
    color: BrandColors.primaryDark,
  },
  liveTitle: {
    ...BrandTypography.bodyStrong,
    color: BrandColors.text,
  },
  liveSubtitle: {
    ...BrandTypography.meta,
    color: BrandColors.mutedText,
  },
  liveScrollContent: {
    paddingHorizontal: BrandSpacing.lg,
    gap: BrandSpacing.sm,
  },
  peerCard: {
    gap: BrandSpacing.sm,
    borderWidth: 1,
    borderColor: '#E4EADF',
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 14,
    boxShadow: '0 12px 24px rgba(25, 40, 23, 0.05)',
  },
  peerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BrandSpacing.sm,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
  },
  avatarInitial: {
    ...BrandTypography.cardTitle,
    color: BrandColors.primaryDark,
  },
  peerHeaderCopy: {
    flex: 1,
    gap: 3,
  },
  peerName: {
    ...BrandTypography.bodyStrong,
    color: BrandColors.text,
  },
  peerStatus: {
    ...BrandTypography.meta,
    color: BrandColors.mutedText,
  },
  peerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEF2EA',
    paddingTop: 10,
  },
  peerDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: BrandColors.primarySoft,
  },
  peerFooterText: {
    flex: 1,
    ...BrandTypography.tiny,
    color: BrandColors.primarySoft,
  },
});
