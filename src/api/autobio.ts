// 프롬프트 & 자서전 JSON 파싱 유틸
import { chat } from './openai'
import type { Book, Message } from '../types'

/** 인터뷰어 시스템 프롬프트 */
function interviewSystem(topic: string): string {
  return `당신은 따뜻하고 다정한 자서전 인터뷰어입니다. 대상은 60대 이상 어르신입니다.
- 주제: "${topic}"
- 한 번에 오직 하나의 질문만 합니다.
- 항상 존댓말을 쓰고, 짧고 구체적이며 대답하기 쉬운 질문을 합니다.
- 직전 답변이 있으면 한 문장으로 따뜻하게 공감한 뒤 다음 질문을 이어갑니다.
- 답변은 2~3문장을 넘기지 않습니다(음성으로 읽어 드리기 때문입니다).
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
  return chat([{ role: 'system', content: interviewSystem(topic) }, ...history], {
    maxTokens: 400,
  })
}

const bookSystem = `당신은 따뜻한 문체를 지닌 전문 자서전 작가입니다. 아래 인터뷰(질문과 어르신의 답변)를 바탕으로 1인칭 시점의 자서전을 씁니다.
- 어르신이 직접 쓴 것처럼 진솔하고 문학적인 한국어로 서술합니다(구술을 정돈된 글로).
- 답변에 없는 사실을 지어내지 말고, 주신 이야기를 자연스럽게 확장·연결합니다.
- 5개의 챕터로 구성합니다. 각 챕터는 3~4개의 문단으로 넉넉히 씁니다.
- 반드시 아래 JSON 형식만 출력합니다(코드펜스 없이):
{"title":"책 제목","subtitle":"부제 한 줄","chapters":[{"title":"챕터 제목","body":"문단들을 \\n\\n 으로 구분"}]}`

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
    { model: 'gpt-4o', maxTokens: 4000, temperature: 0.7 },
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
