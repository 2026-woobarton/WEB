// OpenAI API 래퍼: 질문 생성(Chat) · 받아쓰기(Whisper) · 읽어주기(TTS)
// 키는 .env 의 VITE_OPENAI_API_KEY 또는 사용자의 브라우저 localStorage 에서 옵니다. (서버 없음)
//
// ⚠️ 브라우저에서 직접 OpenAI 를 호출하므로 키가 클라이언트에 노출됩니다.
//    .env 에 넣더라도 Vite 가 빌드 시 번들에 그대로 박아 넣으므로 비밀이 되지 않습니다.
//    개인용/시연용에는 충분하지만, 여러 사람에게 공개하는 서비스라면
//    키를 감추는 서버(서버리스 함수)를 두고 그쪽을 호출하도록 바꾸세요.

const KEY_STORAGE = 'autobio:openai_key'
const OPENAI_BASE = 'https://api.openai.com/v1'

/** .env 로 주입된 기본 키 (빌드 시점에 고정) */
const ENV_KEY = (import.meta.env.VITE_OPENAI_API_KEY ?? '').trim()

/** 설정창에서 사용자가 직접 저장한 키. 없으면 빈 문자열 */
export function getStoredApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) || ''
  } catch {
    return ''
  }
}

/** 실제 호출에 쓰이는 키. 사용자가 저장한 키가 .env 기본값보다 우선합니다. */
export function getApiKey(): string {
  return getStoredApiKey() || ENV_KEY
}

/** .env 만으로 키가 채워져 있는지 (설정창 안내용) */
export function hasEnvKey(): boolean {
  return ENV_KEY.length > 0
}

export function setApiKey(key: string): void {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key.trim())
    else localStorage.removeItem(KEY_STORAGE)
  } catch {
    /* ignore */
  }
}

export function hasApiKey(): boolean {
  return getApiKey().length > 0
}

export class MissingKeyError extends Error {
  constructor() {
    super('OPENAI_API_KEY_MISSING')
    this.name = 'MissingKeyError'
  }
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

function authHeaders(): Record<string, string> {
  const key = getApiKey()
  if (!key) throw new MissingKeyError()
  return { Authorization: `Bearer ${key}` }
}

/** 질문 생성 / 자서전 작성용 Chat Completions 호출 */
export async function chat(
  messages: ChatMessage[],
  opts: { model?: string; maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      model: opts.model ?? 'gpt-4o-mini',
      messages,
      max_tokens: opts.maxTokens ?? 600,
      temperature: opts.temperature ?? 0.8,
    }),
  })
  if (!res.ok) throw new Error(`Chat API 오류 (${res.status}): ${await res.text()}`)
  const data = await res.json()
  return (data.choices?.[0]?.message?.content ?? '').trim()
}

/** 녹음 오디오 → 한국어 텍스트 (Whisper) */
export async function transcribe(audio: Blob): Promise<string> {
  const form = new FormData()
  form.append('file', audio, 'recording.webm')
  form.append('model', 'whisper-1')
  form.append('language', 'ko')
  const res = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })
  if (!res.ok) throw new Error(`받아쓰기 오류 (${res.status}): ${await res.text()}`)
  const data = await res.json()
  return (data.text ?? '').trim()
}

/** 텍스트 → 음성 mp3 objectURL (TTS). 재생은 호출부에서 <audio> 로 처리 */
export async function speak(text: string): Promise<string> {
  const res = await fetch(`${OPENAI_BASE}/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      model: 'tts-1',
      voice: 'nova',
      input: text,
      response_format: 'mp3',
    }),
  })
  if (!res.ok) throw new Error(`음성 합성 오류 (${res.status}): ${await res.text()}`)
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
