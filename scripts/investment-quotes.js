(() => {
  "use strict";
  // Korean paraphrases of sourced investor remarks; source titles aid verification.
  const quotes = [
  {
    "text": "주식을 산다는 것은 기업의 일부를 사는 일이다. 그 기업부터 이해해야 한다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Living Legends"
  },
  {
    "text": "시장을 예측하기보다 가치보다 싸게 거래되는 자산을 찾는 데 힘을 쓴다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Partnership Letters – PDF"
  },
  {
    "text": "싸 보인다는 이유만으로 더 떨어지지 않는 것은 아니다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Partnership Letters – PDF"
  },
  {
    "text": "훌륭한 매도를 기대하기보다 매수가격부터 신중하게 고른다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Partnership Letters – PDF"
  },
  {
    "text": "작은 수익률 차이도 오랜 시간 복리로 쌓이면 큰 차이가 된다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Partnership Letters – PDF"
  },
  {
    "text": "여론조사는 스스로 생각하는 일을 대신해 주지 않는다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Partnership Letters – PDF"
  },
  {
    "text": "다른 사람들이 시장을 어떻게 볼지보다 기업이 무엇을 할지 살펴본다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Partnership Letters – PDF"
  },
  {
    "text": "기업을 평가할 때는 숫자와 함께 숫자로 다 담기지 않는 요소도 살핀다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Partnership Letters – PDF"
  },
  {
    "text": "가격은 지불하는 것이고, 가치는 그 대가로 얻는 것이다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Partnership Letters – PDF"
  },
  {
    "text": "다른 사람들이 탐욕스러울 때는 경계하고, 두려워할 때는 기회를 살핀다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Charlie Rose Interview 10-1-2008"
  },
  {
    "text": "흥분에 휩쓸려 재무 상태와 이익이 뒷받침하지 못하는 가격을 지불하지 말라.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "The New Era of Discrimination in the Selection of Securities"
  },
  {
    "text": "기업의 수익 창출력은 장부상의 자산만큼이나 주가에 큰 영향을 미친다.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "The Riddle of U.S. Steel’s Book Value"
  },
  {
    "text": "기업의 가치는 투입한 돈보다 앞으로 얻을 수 있는 것을 보고 판단한다.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "The Riddle of U.S. Steel’s Book Value"
  },
  {
    "text": "현재 이익과 미래 전망, 경영진 등 여러 요소가 기업의 가치에 영향을 준다.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "Mr. Shareholder"
  },
  {
    "text": "시장 가격은 일시적이고 사소한 일에도 비합리적으로 움직일 수 있다.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "The Riddle of U.S. Steel’s Book Value"
  },
  {
    "text": "개별 종목을 고르는 데는 분석 훈련과 판단력이 함께 필요하다.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "Banker as an Investment Counselor"
  },
  {
    "text": "좋은 기업을 고르는 것과 지금 가격에 살 만한 주식을 고르는 것은 다르다.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "Banker as an Investment Counselor"
  },
  {
    "text": "누가 하든 주식시장의 미래를 정확히 예측한다는 말에는 신중해야 한다.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "Banker as an Investment Counselor"
  },
  {
    "text": "투자 방식은 재산의 크기보다 투자자의 지식과 준비에 맞춰야 한다.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "Banker as an Investment Counselor"
  },
  {
    "text": "기업 가치를 분석하는 데 반드시 복잡한 수학이 필요한 것은 아니다.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "Arithmetic and Stock Values"
  },
  {
    "text": "흐름을 예언하기보다 그 안에서 내가 할 수 있는 일을 잘하려 한다.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "2022 Daily Journal Annual Meeting"
  },
  {
    "text": "장기적인 가능성은 생각해도 단기 시장의 흔들림은 알기 어렵다.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "2023 Daily Journal Annual Meeting"
  },
  {
    "text": "어떤 사람들은 주식시장을 도박장처럼 이용한다.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "2022 Daily Journal Annual Meeting"
  },
  {
    "text": "아무리 좋은 것에도 무한한 가격을 지불할 수는 없다.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "2022 Daily Journal Annual Meeting"
  },
  {
    "text": "사람의 행동은 탐욕뿐 아니라 남을 부러워하는 마음에도 흔들린다.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "2022 Daily Journal Annual Meeting"
  },
  {
    "text": "대단히 영리해지려 하기 전에 어리석은 실수를 피하려 한다.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "A Conversation with Distinguished Alumnus Charles T. Munger"
  },
  {
    "text": "투자는 지불하는 가격보다 가치가 큰 것을 찾는 일이다.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "A Conversation with Distinguished Alumnus Charles T. Munger"
  },
  {
    "text": "똑똑한 사람도 자신의 능력을 지나치게 믿으면 잘못 판단할 수 있다.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "A Conversation with Distinguished Alumnus Charles T. Munger"
  },
  {
    "text": "여러 분야의 중요한 생각을 익혀 판단할 때 함께 활용하라.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "A Conversation with Distinguished Alumnus Charles T. Munger"
  },
  {
    "text": "좋은 투자에는 기다리는 인내와 행동할 결단력이 함께 필요하다.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "A Conversation with Distinguished Alumnus Charles T. Munger"
  },
  {
    "text": "장기 수익은 기업의 경제적 성과가 좌우하고, 단기 감정은 지나간다.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Black Monday and Black Swans"
  },
  {
    "text": "필요 이상으로 자주 거래하면 투자자 전체가 비용을 치른다.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Black Monday and Black Swans"
  },
  {
    "text": "위험이라는 말만큼이나 불확실성이라는 말도 중요하게 다뤄야 한다.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Black Monday and Black Swans"
  },
  {
    "text": "과거의 수익률 범위가 미래에도 그대로 지켜진다고 믿어서는 안 된다.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Black Monday and Black Swans"
  },
  {
    "text": "때로는 통계만으로 보이지 않는 것을 상식이 알려 준다.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Putting the Shareholder First: A Lifetime Ideal"
  },
  {
    "text": "주식을 잠깐 빌리는 마음보다 기업을 소유하는 마음으로 바라보라.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Putting the Shareholder First: A Lifetime Ideal"
  },
  {
    "text": "잦은 투기는 비용 때문에 투자자 전체에게 불리한 게임이 된다.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Putting the Shareholder First: A Lifetime Ideal"
  },
  {
    "text": "투자에서는 무언가를 하기보다 가만히 있는 편이 나을 때도 있다.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Putting the Shareholder First: A Lifetime Ideal"
  },
  {
    "text": "운용 펀드를 고를 때는 수익률만큼 비용의 무게도 살펴야 한다.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Putting the Shareholder First: A Lifetime Ideal"
  },
  {
    "text": "시장이 얼마나 효율적인지 논쟁해도 비용이 중요하다는 사실은 변하지 않는다.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Putting the Shareholder First: A Lifetime Ideal"
  },
  {
    "text": "주식은 복권이 아니다. 모든 주식 뒤에는 실제 기업이 있다.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Lessons from an Investing Legend"
  },
  {
    "text": "1~2년 안에 쓸 돈이라면 주식에 넣기 전에 그 필요 시점을 생각해야 한다.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Lessons from an Investing Legend"
  },
  {
    "text": "주식 투자에는 머리만큼이나 변동을 견디는 배짱이 필요하다.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Lessons from an Investing Legend"
  },
  {
    "text": "생활용품을 살 때처럼 주식을 살 때도 충분히 조사하라.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Wall Street Week 1980"
  },
  {
    "text": "경제와 주식시장의 단기 움직임은 예측하기 어렵다.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Wall Street Week with Peter Lynch and John Templeton"
  },
  {
    "text": "이해하고 믿으며 다른 유행이 와도 지킬 수 있는 것에 투자하라.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "A Collection of Articles by Peter Lynch"
  },
  {
    "text": "더 많은 기업을 살펴볼수록 관심을 가질 만한 기회를 만날 수 있다.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Betting on the Market"
  },
  {
    "text": "내 판단이 맞을 때의 이익과 틀릴 때의 손실을 모두 따져 보라.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Charlie Rose Transcript 1997"
  },
  {
    "text": "기업의 사업을 쉽게 설명할 수 없다면 그 기업을 충분히 이해했는지 돌아보라.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Charlie Rose Transcript 1993"
  },
  {
    "text": "훌륭한 투자자도 열 번 중 아홉 번을 맞힐 수는 없다.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Betting on the Market"
  },
  {
    "text": "평균을 넘어서려면 군중과 다른 선택을 해야 한다.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "Talks at GS"
  },
  {
    "text": "평균보다 높은 성과를 노리는 선택에는 평균보다 낮을 위험도 따른다.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "Talks at GS"
  },
  {
    "text": "시장의 움직임을 그대로 따라가는 행동은 자주 반복되는 실수다.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "The Human Side of Investing"
  },
  {
    "text": "미래를 내다보는 자신의 능력에 지나친 기대를 걸지 말라.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "The Human Side of Investing"
  },
  {
    "text": "미래는 하나의 정답이 아니라 여러 가능성으로 생각해야 한다.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "The Human Side of Investing"
  },
  {
    "text": "투자 심리는 낙관과 비관, 탐욕과 두려움 사이를 오간다.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "The Human Side of Investing"
  },
  {
    "text": "시장은 감정을 가진 사람들로 이루어져 때로는 극단으로 움직인다.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "The Human Side of Investing"
  },
  {
    "text": "투자에는 참을성 있게 기다리는 시간과 결단해야 할 순간이 있다.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "Why You May Be Your Own Worst Enemy as an Investor"
  },
  {
    "text": "투자가 어렵다는 사실을 알면 섣부른 요령에 기대지 않게 된다.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "Why You May Be Your Own Worst Enemy as an Investor"
  },
  {
    "text": "뛰어난 투자는 다른 사람들의 판단 오류에서 기회를 찾는 일이기도 하다.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "Why You May Be Your Own Worst Enemy as an Investor"
  },
  {
    "text": "다른 사람들이 관심을 두지 않는 곳에서 큰 기회를 찾기도 한다.",
    "author": "존 템플턴",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-templeton",
    "work": "Living Legends"
  },
  {
    "text": "주가를 움직이는 요인은 복잡해서 시장 방향을 꾸준히 맞히기 어렵다.",
    "author": "존 템플턴",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-templeton",
    "work": "Templeton Letter 1954"
  },
  {
    "text": "모두가 급하게 사고팔 때 그 열기에 휩쓸리지 않는 시각이 필요하다.",
    "author": "존 템플턴",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-templeton",
    "work": "Transcript: Adam Smith’s Money Game 1998"
  },
  {
    "text": "분산은 내 판단이 틀릴 수 있음을 인정하는 데서 시작한다.",
    "author": "존 템플턴",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-templeton",
    "work": "The Eternal Optimist"
  },
  {
    "text": "투자 기회는 넓은 바다에 있다. 같은 돈으로 더 큰 가치를 찾으라.",
    "author": "존 템플턴",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-templeton",
    "work": "After the Bubble Burst"
  },
  {
    "text": "마음에 드는 기업인지뿐 아니라 다른 대안보다 가격이 싼지도 살핀다.",
    "author": "존 템플턴",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-templeton",
    "work": "After the Bubble Burst"
  },
  {
    "text": "다음 주나 다음 달의 시장을 정확히 맞힌다는 의견에는 신중하라.",
    "author": "존 템플턴",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-templeton",
    "work": "After the Bubble Burst"
  },
  {
    "text": "시장의 극단적인 상승 뒤에는 하락도 정상 수준을 넘어설 수 있다.",
    "author": "존 템플턴",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-templeton",
    "work": "After the Bubble Burst"
  },
  {
    "text": "세금을 피하려고 매도를 미루다 이익 자체를 잃을 수도 있다.",
    "author": "존 템플턴",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-templeton",
    "work": "Capital Gains"
  },
  {
    "text": "오래 투자할수록 예측 앞에서 더욱 겸손해질 필요가 있다.",
    "author": "존 템플턴",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-templeton",
    "work": "The Bubble Will Burst"
  },
  {
    "text": "변화는 성장의 기회를 주지만 동시에 뒤처질 위험도 만든다.",
    "author": "필립 피셔",
    "source": "https://wealthawesome.com/investor-wisdom/investor/philip-fisher",
    "work": "The Money Men"
  },
  {
    "text": "특별한 기업을 찾은 뒤에는 그 가격이 지나치게 높지 않은지 살핀다.",
    "author": "필립 피셔",
    "source": "https://wealthawesome.com/investor-wisdom/investor/philip-fisher",
    "work": "The Money Men"
  },
  {
    "text": "올바른 기업의 장기 성장 가능성은 다른 조건을 압도할 수 있다.",
    "author": "필립 피셔",
    "source": "https://wealthawesome.com/investor-wisdom/investor/philip-fisher",
    "work": "The Money Men"
  },
  {
    "text": "아무리 훌륭한 기업도 인기가 지나치면 가격이 너무 높을 수 있다.",
    "author": "필립 피셔",
    "source": "https://wealthawesome.com/investor-wisdom/investor/philip-fisher",
    "work": "The Money Men"
  },
  {
    "text": "기업을 볼 때 경영진의 역량은 아무리 강조해도 지나치지 않다.",
    "author": "필립 피셔",
    "source": "https://wealthawesome.com/investor-wisdom/investor/philip-fisher",
    "work": "The Money Men"
  },
  {
    "text": "어느 산업에 속했는지만큼 경쟁사가 하지 못하는 일을 하는지도 중요하다.",
    "author": "필립 피셔",
    "source": "https://wealthawesome.com/investor-wisdom/investor/philip-fisher",
    "work": "The Money Men"
  },
  {
    "text": "큰 성과에는 오랜 계획과 기다림, 관찰이 필요했다.",
    "author": "필립 피셔",
    "source": "https://wealthawesome.com/investor-wisdom/investor/philip-fisher",
    "work": "The Money Men"
  },
  {
    "text": "장기적으로는 꾸준히 발전하고 경쟁 우위를 가진 기업이 더 보수적인 선택일 수 있다.",
    "author": "필립 피셔",
    "source": "https://wealthawesome.com/investor-wisdom/investor/philip-fisher",
    "work": "Maybe It’s 1928 Again"
  },
  {
    "text": "기업 규모가 크다는 사실만으로 미래의 생존이 보장되지는 않는다.",
    "author": "필립 피셔",
    "source": "https://wealthawesome.com/investor-wisdom/investor/philip-fisher",
    "work": "Maybe It’s 1928 Again"
  },
  {
    "text": "비판을 막기보다 다른 의견을 환영하는 기업을 찾으라.",
    "author": "필립 피셔",
    "source": "https://wealthawesome.com/investor-wisdom/investor/philip-fisher",
    "work": "The Money Men"
  },
  {
    "text": "안전마진이란 내 판단이 틀려도 버틸 여지를 남기는 것이다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "Talks at GS"
  },
  {
    "text": "좋은 투자 관리자는 수익뿐 아니라 투자자가 본능적 실수를 피하도록 돕는다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "Talks at GS"
  },
  {
    "text": "강제 매도와 공포에 몰리지 않을 여유가 장기 투자에 도움이 된다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "Talks at GS"
  },
  {
    "text": "시장이 방향을 바꿨을 때 내 자산이 어떻게 될지도 생각해야 한다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "Talks at GS"
  },
  {
    "text": "마땅한 기회가 없을 때 현금을 보유하는 것도 합리적인 선택이다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "What I’ve learned from Warren Buffett"
  },
  {
    "text": "전례 없는 일도 생각보다 자주 일어나므로 대비해야 한다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "What I’ve learned from Warren Buffett"
  },
  {
    "text": "일관성과 인내가 복리가 이어질 시간을 만들어 준다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "What I’ve learned from Warren Buffett"
  },
  {
    "text": "지나치게 좁은 영역에만 머물면 변화하는 세상에 적응하기 어렵다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "Baupost Letters"
  },
  {
    "text": "좋을 때 더 버는 것과 나쁠 때 손실을 줄이는 것 사이에는 선택이 따른다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "Opportunities for Patient Investors"
  },
  {
    "text": "큰 손실을 피해야 장기전에 계속 참여할 수 있다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "Opportunities for Patient Investors"
  },
  {
    "text": "과열된 기대는 가격을 밀어 올리고, 공포는 건전한 자산도 떨어뜨릴 수 있다.",
    "author": "조지 소로스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/george-soros",
    "work": "Crisis Is Endemic to the Financial System"
  },
  {
    "text": "세상은 우리가 완전히 이해할 수 있는 것보다 더 복잡하다.",
    "author": "조지 소로스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/george-soros",
    "work": "Fallibility, Reflexivity, and the Human Uncertainty Principle"
  },
  {
    "text": "시장 가격은 현실을 반영할 뿐 아니라 현실 자체에 영향을 주기도 한다.",
    "author": "조지 소로스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/george-soros",
    "work": "George Soros on Investing"
  },
  {
    "text": "시장이 언제나 정확하다고 가정하기보다 틀릴 가능성을 살펴본다.",
    "author": "조지 소로스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/george-soros",
    "work": "George Soros on Investing"
  },
  {
    "text": "금융시장은 스스로 안정된 상태를 유지한다고 단정하기 어렵다.",
    "author": "조지 소로스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/george-soros",
    "work": "After Black Monday"
  },
  {
    "text": "시장은 투자자의 기대를 비추는 동시에 그 기대를 만들어 가기도 한다.",
    "author": "조지 소로스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/george-soros",
    "work": "After Black Monday"
  },
  {
    "text": "금융시장에는 알 수 없는 변수가 많아 단순한 균형으로 설명하기 어렵다.",
    "author": "조지 소로스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/george-soros",
    "work": "The International Financial Crisis"
  },
  {
    "text": "시장은 때때로 스스로 불안정을 키우며 균형에서 멀어진다.",
    "author": "조지 소로스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/george-soros",
    "work": "Crisis Is Endemic to the Financial System"
  },
  {
    "text": "과학이 발전했다고 해서 사람의 행동까지 언제나 합리적인 것은 아니다.",
    "author": "조지 소로스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/george-soros",
    "work": "Fallibility, Reflexivity, and the Human Uncertainty Principle"
  },
  {
    "text": "거품에는 실제로 존재하는 흐름과 그 흐름을 둘러싼 오해가 함께 있다.",
    "author": "조지 소로스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/george-soros",
    "work": "Fallibility, Reflexivity, and the Human Uncertainty Principle"
  }
];
  const text = document.getElementById("investment-quote-text");
  const author = document.getElementById("investment-quote-author");
  const source = document.getElementById("investment-quote-source");
  const button = document.getElementById("investment-quote-next");
  if (!text || !author || !source || !button || quotes.length < 2) return;

  let current = -1;
  function showAnotherQuote() {
    const available = current < 0 ? quotes.length : quotes.length - 1;
    let index = Math.floor(Math.random() * available);
    if (current >= 0 && index >= current) index += 1;
    current = index;
    const quote = quotes[index];
    text.textContent = quote.text;
    author.textContent = quote.author;
    source.href = quote.source;
    source.title = quote.work;
  }

  button.addEventListener("click", showAnotherQuote);
  showAnotherQuote();
})();
