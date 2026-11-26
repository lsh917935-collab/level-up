// 영역 × 수준별 기본 과제 은행. 교사가 직접 수정/추가한 과제(items)가 있으면 그것이 우선합니다.
// item: { type: 'mc' | 'short' | 'fix', q, options?, answer, exp }

const mc = (q, options, answer, exp) => ({ type: 'mc', q, options, answer, exp })
const short = (q, answer, exp) => ({ type: 'short', q, answer, exp })
const fix = (q, answer, exp) => ({ type: 'fix', q: `다음 문장을 바르게 고쳐 쓰세요: ${q}`, answer, exp })

export const BANK = {
  '일반동사 과거형': {
    보충: {
      goal: '규칙 동사의 과거형(-ed) 만드는 규칙을 익힌다.',
      items: [
        short('Write the past form of "walk".', 'walked', '대부분의 규칙 동사는 원형에 -ed를 붙입니다.'),
        mc('She ____ the piano yesterday.', ['play', 'plays', 'played', 'playing'], 'played', 'yesterday가 있으므로 과거형 played를 씁니다.'),
        short('Write the past form of "stop".', 'stopped', '단모음+단자음으로 끝나는 동사는 자음을 한 번 더 쓰고 -ed를 붙입니다.'),
      ],
    },
    기본: {
      goal: '과거 시간 표현과 함께 알맞은 과거형 문장을 쓴다.',
      items: [
        mc('He ____ his room yesterday.', ['clean', 'cleans', 'cleaned', 'cleaning'], 'cleaned', '과거를 나타내는 yesterday → cleaned.'),
        fix('I visit my uncle last week.', 'I visited my uncle last week.', 'last week은 과거 표현이므로 visit → visited.'),
        short('Write the past form of "try".', 'tried', '자음+y로 끝나면 y를 i로 바꾸고 -ed를 붙입니다.'),
      ],
    },
    심화: {
      goal: '한 문장 안의 여러 동사를 문맥에 맞게 과거형으로 쓴다.',
      items: [
        fix('Yesterday, she cry after the movie and call her mom.', 'Yesterday, she cried after the movie and called her mom.', 'cry → cried(y→i+ed), call → called.'),
        mc('Which sentence is correct?', ['He studyed hard.', 'He studied hard.', 'He studied hardly.', 'He study hard.'], 'He studied hard.', 'study → studied. hardly는 "거의 ~않다"라는 뜻입니다.'),
        fix('They enjoy the party last night.', 'They enjoyed the party last night.', 'last night이 있으므로 enjoy → enjoyed.'),
      ],
    },
  },
  '불규칙 동사': {
    보충: {
      goal: '자주 쓰는 불규칙 동사의 과거형을 외운다.',
      items: [
        short('Write the past form of "eat".', 'ate', 'eat - ate - eaten'),
        mc('I ____ a cake yesterday. (make)', ['make', 'maked', 'made', 'making'], 'made', 'make의 과거형은 made입니다.'),
        short('Write the past form of "have".', 'had', 'have - had - had'),
      ],
    },
    기본: {
      goal: '불규칙 동사의 과거형을 문장 속에서 정확히 사용한다.',
      items: [
        mc('She ____ me a gift last week. (give)', ['give', 'gived', 'gave', 'given'], 'gave', 'give - gave - given'),
        fix('He goed to school by bus yesterday.', 'He went to school by bus yesterday.', 'go의 과거형은 went입니다(goed ✗).'),
        short('Write the past form of "take".', 'took', 'take - took - taken'),
      ],
    },
    심화: {
      goal: '여러 불규칙 동사가 섞인 문장을 바르게 고치고 구분한다.',
      items: [
        fix('I buyed a book and readed it all night.', 'I bought a book and read it all night.', 'buy → bought, read → read(철자는 같고 발음만 [red]로 바뀝니다).'),
        mc('Which sentence is correct?', ['She teached English last year.', 'She taught English last year.', 'She tought English last year.', 'She teach English last year.'], 'She taught English last year.', 'teach - taught - taught'),
        short('Write the past form of "swim".', 'swam', 'swim - swam - swum'),
      ],
    },
  },
  '의문문 구성': {
    보충: {
      goal: '과거 일반동사 의문문은 Did로 시작함을 익힌다.',
      items: [
        mc('____ you do your homework last night?', ['Do', 'Did', 'Does', 'Were'], 'Did', '과거 의문문은 Did + 주어 + 동사원형입니다.'),
        short('Complete: ____ she go to school yesterday?', 'Did', '과거 시제 의문문이므로 Did를 씁니다.'),
        fix('Did you saw him?', 'Did you see him?', 'Did 뒤에는 동사원형(see)을 씁니다.'),
      ],
    },
    기본: {
      goal: 'Did 의문문에서 동사원형을 정확히 사용한다.',
      items: [
        fix('Did she visited Busan last year?', 'Did she visit Busan last year?', 'Did 뒤에는 동사원형 visit.'),
        mc('Choose the correct question.', ['Did he went home?', 'Did he go home?', 'Does he went home?', 'He did go home?'], 'Did he go home?', 'Did + 주어 + 동사원형.'),
        short('You watched TV. → ____ you watch TV?', 'Did', '평서문을 의문문으로 바꿀 때 Did를 문장 앞에 둡니다.'),
      ],
    },
    심화: {
      goal: '의문사가 있는 과거 의문문을 올바른 어순으로 만든다.',
      items: [
        fix('What time you got up this morning?', 'What time did you get up this morning?', '의문사 + did + 주어 + 동사원형 순서입니다.'),
        mc('____ did they meet yesterday? — At the library.', ['Where', 'Who', 'When', 'Why'], 'Where', '장소(At the library)를 묻는 의문사는 Where.'),
        fix('Where did she went last Sunday?', 'Where did she go last Sunday?', 'did 뒤에는 동사원형 go.'),
      ],
    },
  },
  '부정문 구성': {
    보충: {
      goal: '과거 부정문은 didn\'t + 동사원형임을 익힌다.',
      items: [
        mc('I ____ eat breakfast this morning.', ["don't", "didn't", "wasn't", 'not'], "didn't", "과거 부정문은 didn't + 동사원형입니다."),
        short('He did not ____ the door. (open)', 'open', 'did not 뒤에는 동사원형을 씁니다.'),
        fix("She didn't liked it.", "She didn't like it.", "didn't 뒤에는 동사원형(like)을 씁니다."),
      ],
    },
    기본: {
      goal: "didn't 뒤에 동사원형을 쓰는 규칙을 문장에 적용한다.",
      items: [
        fix("He didn't went home.", "He didn't go home.", "didn't 뒤에는 동사원형 go."),
        mc('Choose the correct sentence.', ["They didn't played soccer.", "They didn't play soccer.", 'They not played soccer.', "They don't played soccer."], "They didn't play soccer.", "didn't + 동사원형."),
        short('Make it negative: I called him. → I ____ call him.', "didn't|did not", "과거 부정은 didn't(did not) + 동사원형."),
      ],
    },
    심화: {
      goal: '여러 동사가 있는 부정문의 오류를 찾아 바르게 고친다.',
      items: [
        fix("She didn't bought anything and didn't said goodbye.", "She didn't buy anything and didn't say goodbye.", "두 개의 didn't 뒤 모두 동사원형이 필요합니다."),
        fix('We not visited the museum yesterday.', "We didn't visit the museum yesterday.|We did not visit the museum yesterday.", '일반동사 과거 부정문은 not이 아니라 did not(didn\'t)을 씁니다.'),
        mc('Which is correct?', ["He didn't ate lunch.", "He didn't eat lunch.", 'He not eat lunch.', "He doesn't ate lunch."], "He didn't eat lunch.", "didn't + 동사원형(eat)."),
      ],
    },
  },
}

// 과제에 사용할 문항 목록: 교사가 지정한 items → 기본 은행 → 평가 문항(해당 영역) 순서
export function resolveItems(asg, questions = []) {
  if (Array.isArray(asg.items) && asg.items.length) return asg.items
  const bank = BANK[asg.area]?.[asg.level]
  if (bank) return bank.items
  const pool = [
    ...questions.filter((q) => q.purpose === 'retest' && q.area === asg.area),
    ...questions.filter((q) => q.purpose === 'main' && q.area === asg.area),
  ]
  return pool.map((q) => ({ type: q.qtype, q: q.content, options: q.options, answer: q.answer, exp: q.explanation }))
}

export function goalOf(asg) {
  if (asg.goal) return asg.goal
  const g = BANK[asg.area]?.[asg.level]?.goal
  if (g) return g
  const lv = { 보충: '기초 개념을 다시 확인한다.', 기본: '배운 내용을 문제에 적용한다.', 심화: '응용 문제로 실력을 확장한다.' }
  return `${asg.area} 영역: ${lv[asg.level] || ''}`
}
