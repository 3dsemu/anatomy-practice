export interface Label {
  letter: string;
  answer: string;
}

export interface PracticeSet {
  id: string;
  name: string;
  description?: string;
  image: string; // base64 encoded
  labels: Label[];
  createdAt: number;
  updatedAt: number;
}

export interface TestAnswer {
  letter: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface TestResult {
  answers: TestAnswer[];
  score: number;
  total: number;
  completedAt: number;
}
