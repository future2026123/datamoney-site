// Read aggregate, identifiable AI-assistant referrals from GA4 for the site.
// The output is a session count, not a count of citations or individual people.
import {createSign} from 'node:crypto';
import {appendFile, mkdir, rename, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = resolve(ROOT, 'blog/ai-traffic.json');
const SCOPES = 'https://www.googleapis.com/auth/analytics.readonly';
const OAUTH = 'https://oauth2.googleapis.com/token';
const GA4 = 'https://analyticsdata.googleapis.com/v1beta/properties/';

function encoded(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export function makeAssertion(credentials, now = Date.now()) {
  const iat = Math.floor(now / 1000);
  const unsigned = `${encoded({alg:'RS256',typ:'JWT'})}.${encoded({iss:credentials.client_email,scope:SCOPES,aud:OAUTH,iat,exp:iat+3600})}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(credentials.private_key).toString('base64url')}`;
}

export function isAssistantSource(source, channel) {
  if (channel.trim().toLowerCase() === 'ai assistant') return true;
  const host = source.trim().toLowerCase().replace(/\.$/, '');
  return ['chatgpt.com','chat.openai.com','perplexity.ai','claude.ai','gemini.google.com','copilot.microsoft.com']
    .some(domain => host === domain || host.endsWith(`.${domain}`));
}

export function summarize(report) {
  if (report.metadata?.subjectToThresholding || report.metadata?.dataLossFromOtherRow) {
    throw new Error('GA4 returned incomplete or thresholded data');
  }
  const fields = report.dimensionHeaders?.map(item => item.name);
  const source = fields?.indexOf('sessionSource');
  const channel = fields?.indexOf('sessionDefaultChannelGroup');
  if (source == null || channel == null || source < 0 || channel < 0 || report.metricHeaders?.[0]?.name !== 'sessions') {
    throw new Error('Unexpected GA4 response');
  }
  if ((report.rowCount || 0) > (report.rows || []).length) throw new Error('GA4 response omitted rows');
  let count = 0;
  for (const row of report.rows || []) {
    const s = row.dimensionValues?.[source]?.value;
    const c = row.dimensionValues?.[channel]?.value;
    const n = row.metricValues?.[0]?.value;
    if (typeof s !== 'string' || typeof c !== 'string' || !/^\d+$/.test(n || '')) throw new Error('Unexpected GA4 row');
    if (isAssistantSource(s, c)) count += Number(n);
  }
  if (!Number.isSafeInteger(count)) throw new Error('Invalid session total');
  return count;
}

async function jsonRequest(fetcher, url, options) {
  const response = await fetcher(url, {...options, signal:AbortSignal.timeout(20000)});
  if (!response.ok) throw new Error(`Google API returned HTTP ${response.status}`);
  return response.json();
}

export async function collect({credentials, propertyId, fetcher = fetch}) {
  if (!credentials?.client_email || !credentials?.private_key || !/^\d+$/.test(propertyId || '')) {
    throw new Error('GA4 reporting credentials are not configured');
  }
  const access = await jsonRequest(fetcher, OAUTH, {
    method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:makeAssertion(credentials)})
  });
  if (!access.access_token) throw new Error('Google authentication returned no access token');
  const report = await jsonRequest(fetcher, `${GA4}${propertyId}:runReport`, {
    method:'POST', headers:{authorization:`Bearer ${access.access_token}`,'content-type':'application/json'},
    body:JSON.stringify({
      dateRanges:[{startDate:'29daysAgo',endDate:'2daysAgo'}],
      dimensions:[{name:'sessionSource'},{name:'sessionDefaultChannelGroup'}],
      metrics:[{name:'sessions'}],
      dimensionFilter:{filter:{fieldName:'hostName',stringFilter:{matchType:'EXACT',value:'datamoney.kr'}}},
      limit:'100000'
    })
  });
  return {sessions:summarize(report),updatedAt:new Date().toISOString(),periodDays:28,lagDays:2};
}

async function main() {
  const raw = process.env.GA4_SERVICE_ACCOUNT_JSON;
  const propertyId = process.env.GA4_PROPERTY_ID;
  let updated = false;
  // Preserve the last published aggregate if Google's API is temporarily down.
  try {
    const prior = await jsonRequest(fetch, 'https://datamoney.kr/blog/ai-traffic.json', {cache:'no-store'});
    if (Number.isSafeInteger(prior.sessions) && prior.sessions >= 0 && prior.periodDays === 28 &&
        Number.isFinite(Date.parse(prior.updatedAt))) {
      await mkdir(dirname(OUTPUT),{recursive:true});
      await writeFile(OUTPUT,JSON.stringify(prior)+'\n',{encoding:'utf8'});
    }
  } catch (_) { /* No earlier published snapshot. */ }
  if (!raw || !propertyId) {
    console.log('GA4 reporting not configured; no new AI traffic figure generated.');
  } else {
    try {
      const result = await collect({credentials:JSON.parse(raw),propertyId});
      const temporary = `${OUTPUT}.tmp`;
      await mkdir(dirname(OUTPUT),{recursive:true});
      await writeFile(temporary,JSON.stringify(result)+'\n',{encoding:'utf8'});
      await rename(temporary,OUTPUT);
      updated = true;
      console.log('GA4 AI-assistant referral totals updated.');
    } catch (error) {
      const reason = /^Google API returned HTTP \d{3}$/.test(error.message) ? ` (${error.message})` : '';
      console.error(`GA4 AI-assistant totals unavailable${reason}; check credentials and permissions.`);
    }
  }
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT,`updated=${updated}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
