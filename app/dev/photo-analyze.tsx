import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// web-proto/app.js와 같은 엔드포인트 — 앱에서도 도는지 확인하는 게 이 화면의 목적
const ANALYZE_URL = 'https://asia-northeast3-dasida-app.cloudfunctions.net/analyzePhoto';
// functions/src/analyze-photo.ts의 MAX_IMAGE_DATA_URL_LENGTH와 같은 값 — 넘으면 서버가 400
const MAX_IMAGE_DATA_URL_LENGTH = 8_000_000;
// web-proto downscaleToDataUrl과 같은 값 (긴 변 1568px, JPEG 0.82)
const MAX_DIM = 1568;
const JPEG_QUALITY = 0.82;
// 서버 타임아웃(60s)보다 살짝 길게 — web-proto와 동일
const REQUEST_TIMEOUT_MS = 75_000;

type Measurement = {
  permission: string;
  originalSize: string;
  resizedSize: string;
  dataUrlLength: number;
  elapsedMs: number | null;
};

export default function DevPhotoAnalyzeScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'picking' | 'analyzing'>('idle');
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePick() {
    setStatus('picking');
    setResult(null);
    setError(null);
    setMeasurement(null);

    try {
      // 확인 대상 ①: 앱에서 사진첩 권한이 실제로 뚫리는가
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(`사진첩 권한 거부됨 (status: ${permission.status})`);
        setStatus('idle');
        return;
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1, // 축소·압축은 아래 manipulator가 한 번만 한다
      });
      if (picked.canceled) {
        setStatus('idle');
        return;
      }

      const asset = picked.assets[0];
      setImageUri(asset.uri);

      // 확인 대상 ②: 폰 카메라 원본이 서버 상한(약 8MB) 안으로 줄어드는가
      const scale = Math.min(1, MAX_DIM / Math.max(asset.width, asset.height));
      const context = ImageManipulator.manipulate(asset.uri);
      if (scale < 1) {
        // 긴 변만 지정하면 짧은 변은 비율대로 따라온다 (web-proto와 같은 규칙)
        context.resize(
          asset.width >= asset.height
            ? { width: Math.round(asset.width * scale) }
            : { height: Math.round(asset.height * scale) }
        );
      }
      const rendered = await context.renderAsync();
      const saved = await rendered.saveAsync({
        format: SaveFormat.JPEG,
        compress: JPEG_QUALITY,
        base64: true,
      });
      if (!saved.base64) {
        setError('축소는 됐는데 base64가 안 나왔어요.');
        setStatus('idle');
        return;
      }

      const imageDataUrl = `data:image/jpeg;base64,${saved.base64}`;
      const measured: Measurement = {
        permission: permission.status,
        originalSize: `${asset.width} × ${asset.height}`,
        resizedSize: `${rendered.width} × ${rendered.height}`,
        dataUrlLength: imageDataUrl.length,
        elapsedMs: null,
      };
      setMeasurement(measured);

      if (imageDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
        setError(`축소했는데도 상한 초과 — ${imageDataUrl.length} > ${MAX_IMAGE_DATA_URL_LENGTH}`);
        setStatus('idle');
        return;
      }

      // 확인 대상 ③: 폰 네트워크로 왕복이 몇 초 걸리는가 (실측 13초는 데스크톱 기준)
      setStatus('analyzing');
      const startedAt = Date.now();
      // AbortSignal.timeout은 브라우저에만 있다 (web-proto는 되지만 RN에는 없음) → 직접 만든다
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(ANALYZE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageDataUrl }),
          signal: abortController.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
      const elapsedMs = Date.now() - startedAt;
      setMeasurement({ ...measured, elapsedMs });

      if (!response.ok) {
        setError(`HTTP ${response.status} — ${await response.text()}`);
        setStatus('idle');
        return;
      }
      setResult(JSON.stringify(await response.json(), null, 2));
    } catch (caught) {
      setError(caught instanceof Error ? `${caught.name}: ${caught.message}` : String(caught));
    } finally {
      setStatus('idle');
    }
  }

  const busy = status !== 'idle';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.list}>
        <TouchableOpacity style={[styles.button, busy && styles.buttonBusy]} onPress={handlePick} disabled={busy}>
          <Text style={styles.buttonLabel}>{busy ? '기다리는 중…' : '사진 고르기'}</Text>
        </TouchableOpacity>

        {status === 'analyzing' && (
          <View style={styles.row}>
            <ActivityIndicator />
            <Text style={styles.desc}>서버에 보내는 중…</Text>
          </View>
        )}

        {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} contentFit="contain" />}

        {measurement && (
          <View style={styles.card}>
            <Text style={styles.title}>측정값</Text>
            <Text style={styles.desc} selectable>
              권한: {measurement.permission}
            </Text>
            <Text style={styles.desc} selectable>
              원본: {measurement.originalSize} → 축소: {measurement.resizedSize}
            </Text>
            <Text style={styles.desc} selectable>
              전송 크기: {measurement.dataUrlLength.toLocaleString()} / 상한{' '}
              {MAX_IMAGE_DATA_URL_LENGTH.toLocaleString()}
            </Text>
            <Text style={styles.desc} selectable>
              왕복: {measurement.elapsedMs === null ? '—' : `${(measurement.elapsedMs / 1000).toFixed(1)}초`}
            </Text>
          </View>
        )}

        {error && (
          <View style={[styles.card, styles.cardError]}>
            <Text style={styles.title}>실패</Text>
            <Text style={styles.desc} selectable>
              {error}
            </Text>
          </View>
        )}

        {result && (
          <View style={styles.card}>
            <Text style={styles.title}>서버 응답 (날것)</Text>
            <Text style={styles.code} selectable>
              {result}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9F7F4' },
  list: { padding: 16, gap: 12 },
  button: {
    backgroundColor: '#1D1B18',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  buttonBusy: { opacity: 0.5 },
  buttonLabel: { fontSize: 16, fontWeight: '600', color: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  preview: { width: '100%', height: 280, borderRadius: 16, backgroundColor: '#EDE9E3' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardError: { backgroundColor: '#FDECEC' },
  title: { fontSize: 16, fontWeight: '600', color: '#1D1B18' },
  desc: { fontSize: 13, color: '#4A453D' },
  code: { fontSize: 11, color: '#4A453D', fontFamily: 'Menlo' },
});
