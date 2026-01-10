export const QUESTIONS = [
  {
    id: 'matematica',
    name: 'Matemática',
    image: 'assets/bg_math.svg',
    questions: [
      {
        id: 'm1',
        image: 'assets/bg_math.svg',
        question: 'Quanto é 2 + 2?',
        options: ['3','4','5','6'],
        answerIndex: 1,
        rewardCardId: 'card_math_1'
      },
      {
        id: 'm2',
        image: 'assets/bg_math.svg',
        question: 'Qual é a tabuada de 3 para 3x3?',
        options: ['6','9','12','15'],
        answerIndex: 1,
        rewardCardId: 'card_math_2'
      }
    ]
  },
  {
    id: 'ciencias',
    name: 'Ciências',
    image: 'assets/bg_science.svg',
    questions: [
      {
        id: 's1',
        image: 'assets/bg_science.svg',
        question: 'Qual é o símbolo químico da água?',
        options: ['O2','H2O','CO2','NaCl'],
        answerIndex: 1,
        rewardCardId: 'card_science_1'
      }
    ]
  }
];