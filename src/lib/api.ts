// JSONファイルからデータを取得するためのモジュール

export interface Question {
  id: number
  year: number
  question_number: number
  content: string
  option1: string
  option2: string
  option3: string
  option4: string
  correct_answer: number
  explanation: string | null
}

export async function fetchQuestions(): Promise<Question[]> {
  try {
    const res = await fetch('/takken_questions/questions.json')
    if (!res.ok) {
      throw new Error('Failed to fetch questions')
    }
    const data = await res.json()
    return data
  } catch (error) {
    console.error('Error fetching questions:', error)
    return []
  }
}

export async function fetchQuestionById(id: number): Promise<Question | null> {
  const questions = await fetchQuestions()
  return questions.find(q => q.id === id) || null
}
