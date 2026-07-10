// 프롬프트 & 자서전 JSON 파싱 유틸
import { chat, generateImage } from './openai'
import type { Book, Message } from '../types'

/** 기억 하나를 입체적으로 만드는 각도들. 이미 답변에 나온 것은 다시 묻지 않습니다. */
const SCENE_ANGLES = [
  '그때가 언제였는지, 계절과 날씨',
  '어디였는지, 그곳의 모습',
  '곁에 누가 있었는지',
  '무슨 말을 주고받았는지',
  '손에 잡히던 것, 들리던 소리, 나던 냄새',
  '그때 마음속으로 든 생각',
  '그 일이 있고 나서 달라진 것',
].join(' · ')

/**
 * 이번 질문의 소재를 지시합니다. 대화 기록 "뒤"에 붙여야 합니다.
 * 시스템 프롬프트 안에 두면 직전 답변을 이어받으려는 힘에 밀려 무시됩니다.
 */
function phaseDirective(answered: number): string {
  // 1단계: 주제는 넓습니다. 어떤 기억 하나를 이야기할지 먼저 좁힙니다.
  if (answered === 0) {
    return `[이번 질문 지시]
- 주제는 아직 넓습니다. 어떤 기억 하나를 들려주실지 고르시게 하는 질문을 하세요.
- 이 주제 안에서 "특별히 떠오르는 일", "지금도 생생한 장면"이 있는지 여쭙습니다.
- 아직 자세히 캐묻지 마세요. 이야기의 문을 여는 한 마디면 충분합니다.`
  }

  // 3단계: 장면이 충분히 모였습니다. 의미로 맺습니다.
  if (answered >= 4) {
    return `[이번 질문 지시]
- 장면은 이미 충분히 모였습니다. 새로운 사실을 더 캐묻지 마세요.
- 이번 질문의 소재는 반드시 다음 둘 중 하나여야 합니다.
  ① 그 기억이 지금의 나에게 어떤 자리로 남아 있는지
  ② 이 이야기를 누구에게 들려주고 싶은지, 그에게 무슨 말을 건네고 싶은지
- ①이 아직 안 나왔으면 ①을, 나왔으면 ②를 묻습니다.
- 직전 답변에 한 문장으로 공감한 뒤, 고른 소재를 묻습니다.`
  }

  // 2단계: 고른 기억 하나를 장면으로 채웁니다.
  return `[이번 질문 지시]
- 어르신이 고르신 그 기억 하나에 머무릅니다. 다른 시기나 다른 사건으로 옮겨가지 마세요.
- 아직 나오지 않은 각도 하나를 골라 묻습니다: ${SCENE_ANGLES}
- "그 일이 어떤 의미였나요" 같은 추상적인 질문 대신, 장면이 떠오르는 것을 묻습니다.`
}

/** 인터뷰어 시스템 프롬프트 */
function interviewSystem(topic: string): string {
  return `당신은 따뜻하고 다정한 자서전 인터뷰 작가입니다. 대상은 50~60대 이상 어르신입니다.
- 주제: "${topic}"
- 이 대화가 끝나면 어르신의 기억 한 토막을 한 편의 짧은 글로 엮습니다.
  그러므로 여러 사건을 넓게 훑지 말고, 기억 하나를 골라 그 안을 채워 갑니다.

[속으로 할 일 — 출력하지 마세요]
직전 답변에서 핵심 사건, 감정, 아직 비어 있는 정보를 짚습니다.
그중 글로 옮길 때 꼭 필요한 것 하나만 골라 질문합니다.

[질문 방식]
- 한 번에 오직 하나만 묻습니다.
- 이미 답변에서 나온 것은 다시 묻지 않습니다.
- 직전 답변이 있으면 한 문장으로 따뜻하게 공감한 뒤 질문합니다.
- 항상 존댓말을 쓰고, 짧고 부드럽게 여쭙니다.

[캐묻지 않기 — 중요]
- 취조하듯 물으면 안 됩니다. 질문은 권유에 가깝게 합니다.
- "왜 그러셨어요" 처럼 이유를 따지지 않습니다. 대신 그때 무엇이 보이고 들렸는지를 여쭙니다.
- 한 질문에 여러 가지를 한꺼번에 묻지 않습니다.
- 잘 기억나지 않으시면 편히 넘어가도 된다는 여지를 남깁니다.
- 아프거나 슬픈 대목이 나오면 더 파고들지 말고, 어르신이 말한 만큼만 받아 적습니다.

[형식]
- 2~3문장을 넘기지 않습니다(음성으로 읽어 드리기 때문입니다).
- 오직 어르신께 들려드릴 말만 출력하고, 설명이나 따옴표는 붙이지 않습니다.`
}

/** 다음 질문 한 개를 생성 */
export async function askNextQuestion(
  topic: string,
  messages: Message[],
): Promise<string> {
  const history = messages.map((m) => ({
    role: (m.role === 'ai' ? 'assistant' : 'user') as 'assistant' | 'user',
    content: m.text,
  }))
  if (history.length === 0) {
    history.push({
      role: 'user',
      content: `"${topic}" 주제로 자서전을 만들려고 합니다. 첫 질문을 부드럽게 건네 주세요.`,
    })
  }
  const answered = messages.filter((m) => m.role === 'user').length
  return chat(
    [
      { role: 'system', content: interviewSystem(topic) },
      ...history,
      { role: 'system', content: phaseDirective(answered) },
    ],
    { maxTokens: 400 },
  )
}

const episodeSystem = `당신은 50~60대 시니어들의 소중한 한 토막 기억을 생생한 일화로 풀어내는 전문 에세이 작가입니다. AI가 질문하고 유저가 답변하며 수집된 '키워드와 내용'을 바탕으로, 유저가 직접 쓴 것 같은 1인칭 에세이(일화) 초안을 씁니다.

[문체]
- 담담하고 꾸밈없이, 생활의 결이 느껴지게 씁니다. 자연스러운 산문으로 서술합니다.
- 과장된 표현, 시처럼 지나치게 꾸민 문장, 상투적인 미문, AI 티가 나는 문장을 피합니다.
  (이런 문장을 쓰지 마세요: "흙냄새가 코끝을 간질였다", "자연의 품에 안기는 느낌이었다", "딸기들은 나의 손길을 기다리고 있었다")
  사물을 사람처럼 그리거나, 감상을 설명으로 덧붙이지 마세요. 본 것과 한 일을 그대로 적으면 됩니다.
- 많이 배우지 않은 사람처럼 쓰라는 뜻이 아닙니다. 실제로 그 삶을 살아온 사람이 자신의 소중한 추억 하나를 찬찬히 돌아보며 말하는 목소리여야 합니다.

[장면 중심]
- 추상적인 감상 대신 장면을 씁니다. 어떤 날씨였는지, 손에 무엇이 잡혔는지, 무슨 냄새가 났는지, 누가 곁에 있었고 어떤 말을 주고받았는지 구체적으로 묘사합니다.
- 답변에 없는 사실(이름, 지명, 연도, 일어나지 않은 사건)은 지어내지 않습니다. 감각과 장면은 답변과 수집된 키워드에 이미 담긴 내용을 구체화하는 선까지만 살립니다.

[감정]
- 에피소드에 담긴 평범한 사람의 연륜과 따뜻함을 살립니다. 
- 특정 주제(예: 힘들었던 기억)라도 너무 비극적으로만 흐르지 않게 하며, 그 안에서 얻은 깨달음이나 사람 사이의 온기가 자연스럽게 묻어나게 씁니다.

[구성]
- 전체 1개의 에피소드(일화)로 구성합니다.
- 아래의 자연스러운 기승전결 흐름을 따릅니다:
  도입(기억의 배경과 시작) → 전개(핵심 사건과 구체적 장면) → 절정(가장 인상 깊었던 순간이나 오간 대화) → 결말(현재 시점에서 돌아본 의미와 소회)
- 글의 마지막 문단은 이 기억을 나누고 싶은 대상(자식, 배우자, 친구, 혹은 자신)에게 눈앞에 앉혀 놓고 이야기하듯 건네는 따뜻한 2인칭의 맺음말로 마무리합니다.

[분량 — 반드시 지키세요]
- 글은 4~5개의 문단으로 구성합니다. 1~2개로 짧게 압축하지 마세요.
- 각 문단은 6문장 이상, 250자 이상입니다. 한두 문장으로 성급하게 끝내지 마세요.
- 전체는 1,000자 이상이 되도록 씁니다.
- 짧은 문장을 나열하지 마세요. 한 문장 안에 본 것과 그때 마음을 함께 담아 길게 풉니다.
- 다만 분량을 채우려고 없는 사실을 지어내지는 마세요.
  재료가 모자라면 어르신이 말한 장면을 더 천천히, 더 자세히 들여다보며 늘립니다.
- 요약하지 말고 장면을 천천히 펼치세요. 한 문단 안에서 시간, 날씨, 행동, 오간 말, 그때 든 생각을 차례로 적어 분량을 충분히 확보합니다.

[형식]
- 문단과 문단 사이는 반드시 빈 줄 하나로 나눕니다(JSON 문자열에서는 \\n\\n). 전체를 한 덩어리로 붙여 쓰지 마세요.
- 반드시 아래 JSON 형식만 출력합니다(코드펜스 없이):
{"title":"에피소드 제목","subtitle":"기억을 요약하는 부제 한 줄","content":"첫 문단…\\n\\n둘째 문단…\\n\\n셋째 문단…"}
`

/** 인터뷰 전체 → 완성된 자서전(JSON) */
export async function generateBook(
  topic: string,
  messages: Message[],
): Promise<Book> {
  const transcript = messages
    .map((m) => (m.role === 'ai' ? '질문: ' : '답변: ') + m.text)
    .join('\n')
  const raw = await chat(
    [
      { role: 'system', content: episodeSystem },
      { role: 'user', content: `주제: ${topic}\n\n[인터뷰]\n${transcript}` },
    ],
    // 3,000자 이상 + JSON 이스케이프까지 담아야 해서 넉넉히 잡습니다(부족하면 잘려서 파싱 실패).
    { model: 'gpt-4o', maxTokens: 6000, temperature: 0.7 },
  )
  return parseBook(raw, topic)
}

/** 본문을 문단으로 나눕니다. */
export function contentParagraphs(content: string): string[] {
  return String(content || '')
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** 한 페이지에 담을 문단 수 */
const PARAGRAPHS_PER_PAGE = 2

/** 본문을 페이지 단위로 묶습니다. 페이지 하나에 문단 두 개가 들어갑니다. */
export function contentPages(content: string): string[][] {
  const paragraphs = contentParagraphs(content)
  const pages: string[][] = []
  for (let i = 0; i < paragraphs.length; i += PARAGRAPHS_PER_PAGE) {
    pages.push(paragraphs.slice(i, i + PARAGRAPHS_PER_PAGE))
  }
  return pages
}

function parseBook(raw: string, topic: string): Book {
  let t = raw.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim()
  const a = t.indexOf('{')
  const b = t.lastIndexOf('}')
  if (a >= 0 && b > a) t = t.slice(a, b + 1)
  try {
    const o = JSON.parse(t) as Partial<Book>
    if (o && typeof o.content === 'string' && o.content.trim()) {
      return {
        title: o.title?.trim() || '나의 이야기',
        subtitle: o.subtitle?.trim() || topic,
        content: o.content.trim(),
      }
    }
  } catch {
    /* JSON 이 아니면 아래에서 본문 그대로 씁니다 */
  }
  // 모델이 형식을 못 지킨 경우. 받은 글을 그대로 본문으로 씁니다.
  return { title: '나의 이야기', subtitle: topic, content: raw.trim() }
}

// ---------------------------------------------------------------- 삽화

/**
 * 모든 삽화에 공통으로 붙이는 화풍 지시.
 * 책 페이지 배경(theme.page = #fdfaf1)과 섞이도록 밝은 크림 바탕에 옅은 세피아로 그립니다.
 */
const IMAGE_STYLE = `부드러운 수채화 삽화.
크림색 종이(#fdfaf1) 위에 옅게 번진 그림. 바랜 세피아, 흐린 황토, 낮은 채도의 올리브 톤만 사용한다.
윤곽선은 흐릿하고 여백이 넉넉하다. 가장자리로 갈수록 색이 옅어져 종이에 스미듯 사라진다.
전체적으로 밝고 은은하며, 어두운 검정이나 강한 원색을 쓰지 않는다.
사람은 멀리서 본 실루엣으로만 그리고 얼굴을 또렷하게 그리지 않는다.
글자, 문자, 숫자, 서명, 워터마크, 액자, 테두리를 절대 넣지 않는다.`

/** 표지: 이 에세이 전체를 아우르는 한 장면 */
function coverPrompt(book: Book): string {
  return `한 사람의 자서전 표지에 들어갈 그림.
제목: "${book.title}" / 부제: "${book.subtitle}"
이 글이 담고 있는 기억: ${book.content.slice(0, 900)}

이 기억 전체를 대표하는 조용한 풍경 하나를 그린다. 사건을 나열하지 말고 한 장면에 담는다.

${IMAGE_STYLE}`
}

/**
 * 표지 삽화 한 장을 그립니다. 실패하면 null 을 돌려줍니다.
 * 그림은 없어도 책은 읽을 수 있어야 하므로 예외를 밖으로 던지지 않습니다.
 */
export async function generateCover(book: Book): Promise<string | null> {
  try {
    return await generateImage(coverPrompt(book))
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('표지 그림 생성 실패', e)
    return null
  }
}
