export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  data: Record<string, unknown>;
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function sendExpoPushChunk(
  messages: ExpoPushMessage[],
): Promise<{ data?: { status: string; details?: { error?: string } }[] }> {
  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });
  if (!response.ok) {
    throw new Error(`Expo push failed: ${response.status}`);
  }
  return (await response.json()) as {
    data?: { status: string; details?: { error?: string } }[];
  };
}
