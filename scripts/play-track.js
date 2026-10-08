const { GoogleAuth } = require('/Users/baggiyun/dev/dasida-app/functions/node_modules/google-auth-library');
const PKG = 'com.dasida.app';
const BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`;
async function main() {
  const auth = new GoogleAuth({ keyFile: '/Users/baggiyun/dev/dasida-app/google-play-service-account.json', scopes: ['https://www.googleapis.com/auth/androidpublisher'] });
  const client = await auth.getClient();
  const req = (method, path, data) => client.request({ url: BASE + path, method, data }).then(r => r.data);
  const edit = await req('POST', '/edits', {});
  const id = edit.id;
  const mode = process.argv[2];
  try {
    const details = await req('GET', `/edits/${id}/details`);
    const tracks = await req('GET', `/edits/${id}/tracks`);
    console.log('defaultLanguage', details.defaultLanguage);
    for (const t of tracks.tracks) if (['production','internal'].includes(t.track)) console.log(t.track, JSON.stringify(t.releases));
    if (mode === 'promote') {
      const text = require('fs').readFileSync(process.argv[3], 'utf8').trim();
      const [name, code] = [process.argv[4], process.argv[5]]; // 예: promote notes.txt 1.0.13 14
      if (!name || !code) throw new Error('usage: promote <notes> <versionName> <versionCode>');
      const body = { track: 'production', releases: [{ name, versionCodes: [code], status: 'completed', releaseNotes: [{ language: details.defaultLanguage, text }] }] };
      const put = await req('PUT', `/edits/${id}/tracks/production`, body);
      console.log('put', JSON.stringify(put));
      const c = await req('POST', `/edits/${id}:commit`);
      console.log('committed', JSON.stringify(c));
    } else {
      await req('DELETE', `/edits/${id}`);
      console.log('read only — edit deleted');
    }
  } catch (e) { console.log('ERR', e.response ? JSON.stringify(e.response.data) : e.message); try { await req('DELETE', `/edits/${id}`); } catch {} }
}
main().catch(e => console.log('FATAL', e.message));
