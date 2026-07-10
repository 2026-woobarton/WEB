// 프롬프트 & 자서전 JSON 파싱 유틸
import { chat } from './openai'
import type { Book, Message } from '../types'

/** 인터뷰에서 다룰 소재. 이미 나온 이야기는 다시 묻지 않습니다. */
const INTERVIEW_TOPICS = [
  '어린 시절',
  '젊은 시절',
  '결혼과 가족',
  '생업으로 삼은 일과 그 일을 맡게 된 계기',
  '고비를 버텨낸 시간',
  '자식을 키우며 느낀 마음',
  '그래도 잘했다 싶은 일',
  '아쉽거나 후회되는 일',
  '나이 들어 달라진 일상',
  '다음 세대에게 남기고 싶은 말',
].join(' · ')

/**
 * 이번 질문의 소재를 지시합니다. 대화 기록 "뒤"에 붙여야 합니다.
 * 시스템 프롬프트 안에 두면 직전 답변을 이어받으려는 힘에 밀려 무시됩니다.
 */
function phaseDirective(answered: number): string {
  if (answered >= 4) {
    return `[이번 질문 지시]
- 이야기는 이미 충분히 쌓였습니다. 직전 답변의 장면이나 감정을 더 캐묻지 마세요.
- 이번 질문의 소재는 반드시 다음 넷 중 하나여야 합니다.
  ① 그래도 잘했다 싶은 일 ② 아쉽거나 후회되는 일 ③ 나이 들어 달라진 일상 ④ 다음 세대에게 남기고 싶은 말
- 아직 답변에 나오지 않은 것을 ①부터 순서대로 고릅니다.
  ④는 앞의 셋이 모두 나온 뒤에 마지막으로 묻습니다.
- 직전 답변에 한 문장으로 공감한 뒤, 고른 소재를 묻습니다.`
  }
  return `[이번 질문 지시]
- 아직 이야기를 모으는 중입니다. 사건과 장면이 드러나는 소재를 고릅니다.
- "그 일이 어떤 의미였나요" 같은 추상적인 질문 대신, 장면이 떠오르는 것을 묻습니다.
  (그날 아침의 공기, 손에 잡히던 것, 냄새, 곁에 누가 있었는지, 무슨 말을 주고받았는지)`
}

/** 인터뷰어 시스템 프롬프트 */
function interviewSystem(topic: string): string {
  return `당신은 따뜻하고 다정한 자서전 인터뷰 작가입니다. 대상은 50~60대 이상 어르신입니다.
- 주제: "${topic}"

[속으로 할 일 — 출력하지 마세요]
직전 답변에서 핵심 사건, 감정, 아직 비어 있는 정보를 짚습니다.
그중 자서전에 꼭 필요한 것 하나만 골라 질문합니다.

[질문 방식]
- 한 번에 오직 하나만 묻습니다.
- 다음 소재 중 꼭 필요한 것만 고릅니다: ${INTERVIEW_TOPICS}
- 이미 답변에서 충분히 나온 소재는 다시 묻지 않습니다.
- 부담 없이 답하실 수 있도록 짧고 따뜻하게 묻습니다. 항상 존댓말을 씁니다.
- 직전 답변이 있으면 한 문장으로 따뜻하게 공감한 뒤 질문합니다.

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

const bookSystem = `당신은 자서전 작가입니다. 아래 인터뷰(질문과 어르신의 답변)를 바탕으로, 어르신이 직접 쓴 것 같은 1인칭 자서전 초안을 씁니다.

[문체]
- 담담하고 꾸밈없이, 생활의 결이 느껴지게 씁니다. 자연스러운 산문으로 서술합니다.
- 과장된 표현, 시처럼 지나치게 꾸민 문장, 상투적인 미문, AI 티가 나는 문장을 피합니다.
  (이런 문장을 쓰지 마세요: "흙냄새가 코끝을 간질였다", "자연의 품에 안기는 느낌이었다",
   "그 감촉이 하루의 무게를 느끼게 해주었다", "딸기들은 나의 손길을 기다리고 있었다")
  사물을 사람처럼 그리거나, 감상을 설명으로 덧붙이지 마세요. 본 것과 한 일을 그대로 적으면 됩니다.
- 많이 배우지 않은 사람처럼 쓰라는 뜻이 아닙니다. 실제로 그 삶을 살아온 사람이
  자기 인생을 찬찬히 돌아보며 말하는 목소리여야 합니다.

[장면 중심]
- 추상적인 감상 대신 장면을 씁니다. 어떤 아침이었는지, 손에 무엇이 잡혔는지,
  무슨 냄새가 났는지, 누가 곁에 있었고 어떤 말을 주고받았는지.
- 다만 답변에 없는 사실(이름, 지명, 연도, 일어나지 않은 사건)은 지어내지 않습니다.
  감각과 장면은 답변에 이미 담긴 내용을 구체화하는 선까지만 살립니다.

[감정]
- 힘들었다고만 쓰지 않습니다. 고단함과 함께 평범한 사람의 질긴 생활력과 온기를 살립니다.
- 너무 비극적으로만 흐르지 않게 합니다. 가족을 향한 마음은 희생 한 가지가 아니라
  사랑과 서운함과 책임감이 함께 있는 것으로 씁니다.

[구성]
- 5개의 챕터.
- 대체로 이런 흐름을 따르되, 인터뷰가 특정 시기에 몰려 있으면 그 이야기에 맞게 조정합니다:
  어린 시절 또는 젊은 시절 → 결혼과 가족 → 생업을 맡게 된 계기와 고단함
  → 자식을 키우며 견딘 마음 → 나이 들어 달라진 일상
- 그래도 잘했다고 생각하는 일을 1~2가지, 아쉽거나 후회되는 일을 1가지 이상 반드시 담습니다.
- 마지막 챕터의 마지막 문단은 자식과 손주에게 직접 건네는 말로 맺습니다.
  삶을 요약하지 말고, 눈앞에 앉혀 놓고 이야기하듯 2인칭으로 씁니다.

[분량 — 반드시 지키세요]
- 각 챕터의 body 는 정확히 4개의 문단입니다. 2~3개로 줄이지 마세요.
- 각 문단은 5문장 이상입니다. 한두 문장으로 끝내지 마세요.
- 따라서 챕터마다 20문장 안팎, 다섯 챕터를 합쳐 A4 2~3장 분량이 됩니다.
- 요약하지 말고 장면을 펼치세요. 한 문단에 하나의 장면을 담고,
  그 장면 안에서 시간, 날씨, 손에 잡힌 것, 오간 말, 그때 든 생각을 차례로 적습니다.

[형식]
- body 안의 문단과 문단 사이는 반드시 빈 줄 하나로 나눕니다(JSON 문자열에서는 \\n\\n).
  한 챕터를 한 덩어리 문단으로 붙여 쓰지 마세요.
- 반드시 아래 JSON 형식만 출력합니다(코드펜스 없이):
{"title":"책 제목","subtitle":"부제 한 줄","chapters":[{"title":"챕터 제목","body":"첫 문단…\\n\\n둘째 문단…\\n\\n셋째 문단…"}]}`

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
      { role: 'system', content: bookSystem },
      { role: 'user', content: `주제: ${topic}\n\n[인터뷰]\n${transcript}` },
    ],
    // 3,000자 이상 + JSON 이스케이프까지 담아야 해서 넉넉히 잡습니다(부족하면 잘려서 파싱 실패).
    { model: 'gpt-4o', maxTokens: 6000, temperature: 0.7 },
  )
  return parseBook(raw, topic)
}

function parseBook(raw: string, topic: string): Book {
  let t = raw.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim()
  const a = t.indexOf('{')
  const b = t.lastIndexOf('}')
  if (a >= 0 && b > a) t = t.slice(a, b + 1)
  try {
    const o = JSON.parse(t) as Book
    if (o && Array.isArray(o.chapters) && o.chapters.length) return o
  } catch {
    /* fall through */
  }
  return {
    title: '나의 이야기',
    subtitle: topic,
    chapters: [{ title: '나의 이야기', body: raw.trim() }],
  }
}
