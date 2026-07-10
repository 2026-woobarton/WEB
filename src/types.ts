export type Screen = 'topic' | 'chat' | 'book'

export type Role = 'ai' | 'user'

export interface Message {
  role: Role
  text: string
}

export interface Topic {
  id: number
  title: string
}

export interface Chapter {
  title: string
  body: string
}

export interface Book {
  title: string
  subtitle: string
  chapters: Chapter[]
  /** 표지 삽화. data:image/webp;base64,… (그림 생성 실패 시 없음) */
  cover?: string
}

// localStorage 에 저장/복원하는 형태
export interface PersistedState {
  screen: Screen
  topicId: number | null
  customTopic: string
  messages: Message[]
  book: Book | null
  bookPage: number
}
