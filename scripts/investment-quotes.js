(() => {
  "use strict";
  // Korean paraphrases of sourced investor remarks; source titles aid verification.
  const quotes = [
  {
    "text": "주식을 살 때는 그 기업을 제대로 이해해야 한다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Living Legends"
  },
  {
    "text": "나는 시장을 예측하지 않는다. 저평가된 증권을 찾는 데 힘을 쓴다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Partnership Letters – PDF"
  },
  {
    "text": "값이 싸더라도 더 떨어질 수 있다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Partnership Letters – PDF"
  },
  {
    "text": "잘 팔 수 있다는 기대에 의존하지 말고 무난하게 팔아도 좋은 결과를 낼 가격에 사라.",
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
    "text": "여론조사가 스스로 생각하는 일을 대신할 수는 없다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Partnership Letters – PDF"
  },
  {
    "text": "남들의 시장 전망이 아니라 기업의 전망을 보고 주식을 사고판다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Partnership Letters – PDF"
  },
  {
    "text": "증권과 기업을 평가할 때는 정량적 요소와 정성적 요소가 함께 작용한다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Partnership Letters – PDF"
  },
  {
    "text": "가격은 내가 내는 돈이고 가치는 그 돈으로 얻는 것이다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Partnership Letters – PDF"
  },
  {
    "text": "남들이 탐욕을 부릴 때 두려워하고 남들이 두려워할 때 탐욕을 부려라.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Charlie Rose Interview 10-1-2008"
  },
  {
    "text": "흥분에 휩쓸려 재무 상태와 이익에 비해 터무니없이 높은 가격을 지불하지 말라.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "The New Era of Discrimination in the Selection of Securities"
  },
  {
    "text": "기업의 수익 창출력은 장부상 자산보다 주가에 훨씬 큰 영향을 미친다.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "The Riddle of U.S. Steel’s Book Value"
  },
  {
    "text": "기업 가치는 투입한 돈이 아니라 그 기업에서 얻을 수 있는 것으로 판단한다.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "The Riddle of U.S. Steel’s Book Value"
  },
  {
    "text": "현재 이익과 미래 전망, 경영진, 매매의 용이성 등 여러 요소가 기업의 내재 가치에 영향을 준다.",
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
    "text": "누가 하든 주식시장의 미래를 예측한다는 말은 믿기 어렵다.",
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
    "text": "증권 가치를 분석하는 데 반드시 복잡한 수학이 필요한 것은 아니다.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "Arithmetic and Stock Values"
  },
  {
    "text": "나는 물살을 예측하기보다 그 물살에 맞서 최대한 잘 헤엄치려 한다.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "2022 Daily Journal Annual Meeting"
  },
  {
    "text": "장기 전망은 어느 정도 내다볼 수 있지만 단기 시장이 어떻게 움직일지는 전혀 모르겠다.",
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
    "text": "아무리 좋은 것이라도 값을 끝없이 치를 만한 가치는 없다.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "2022 Daily Journal Annual Meeting"
  },
  {
    "text": "세상을 움직이는 것은 탐욕이 아니라 질투다.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "2022 Daily Journal Annual Meeting"
  },
  {
    "text": "나는 기본을 중시한다. 그저 어리석은 실수를 피하려고 한다.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "A Conversation with Distinguished Alumnus Charles T. Munger"
  },
  {
    "text": "성공적인 투자는 지불하는 가격보다 가치가 큰 것을 찾는 일이다.",
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
    "text": "여러 분야의 중요한 생각을 익혀 판단에 활용하라.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "A Conversation with Distinguished Alumnus Charles T. Munger"
  },
  {
    "text": "좋은 투자에는 인내와 과감함이 함께 필요하다.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "A Conversation with Distinguished Alumnus Charles T. Munger"
  },
  {
    "text": "장기 수익은 기업의 경제적 성과가 좌우하고 단기 감정은 지나간다.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Black Monday and Black Swans"
  },
  {
    "text": "필요 이상으로 자주 거래하면 투자자들은 스스로에게 해를 끼친다.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Black Monday and Black Swans"
  },
  {
    "text": "우리는 위험이라는 말은 너무 쉽게 쓰고 불확실성이라는 말은 너무 드물게 쓴다.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Black Monday and Black Swans"
  },
  {
    "text": "과거의 수익률 흐름만으로 미래를 예측할 수 있다고 믿는 것은 착각이다.",
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
    "text": "주식을 오래 보유하던 투자 업계가 이제는 잠깐 빌리듯 거래하는 곳이 됐다.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Putting the Shareholder First: A Lifetime Ideal"
  },
  {
    "text": "투기는 비용 때문에 투자자에게 불리한 게임이 될 수밖에 없다.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Putting the Shareholder First: A Lifetime Ideal"
  },
  {
    "text": "투자할 때는 무작정 움직이기보다 가만히 기다려라.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Putting the Shareholder First: A Lifetime Ideal"
  },
  {
    "text": "운용 펀드를 고른다면 비용 부담이 큰 펀드보다 적은 펀드를 택하라.",
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
    "text": "1~2년 안에 써야 할 돈이라면 주식을 사지 말아야 한다.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Lessons from an Investing Legend"
  },
  {
    "text": "주식 투자에서 가장 중요한 것은 머리가 아니라 배짱이다.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Lessons from an Investing Legend"
  },
  {
    "text": "사람들은 전자레인지를 살 때는 꼼꼼히 조사하면서 주식은 버스에서 들은 말만 믿고 산다.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Wall Street Week 1980"
  },
  {
    "text": "경제도 주식시장도 예측할 수 없다.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Wall Street Week with Peter Lynch and John Templeton"
  },
  {
    "text": "이해하고 믿으며 계속 보유할 생각이 있는 것만 사라. 남들이 새 유행을 쫓을 때도 마찬가지다.",
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
    "text": "내 판단이 맞으면 얼마나 벌고 틀리면 얼마나 잃을지 따져 보라.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Charlie Rose Transcript 1997"
  },
  {
    "text": "열 살 아이에게 2분 안에 설명하지 못할 기업이라면 주식을 사지 마라.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Charlie Rose Transcript 1993"
  },
  {
    "text": "투자를 잘해도 열 번 중 여섯 번 맞힌다. 아홉 번은 맞힐 수 없다.",
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
    "text": "평균보다 높은 성과를 노리면 평균보다 낮은 성과를 낼 위험도 감수해야 한다.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "Talks at GS"
  },
  {
    "text": "시장을 따라 오를 때 사고 떨어질 때 파는 행동은 흔하면서도 큰 실수다.",
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
    "text": "미래를 생각할 때 여러 가능성이 있다는 사실을 놓치기 쉽다.",
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
    "text": "시장은 감정과 불안을 가진 사람들로 이루어져 있어 때로 극단으로 치닫는다.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "The Human Side of Investing"
  },
  {
    "text": "투자자는 인내하며 기다려야 하고 행동할 때는 과감히 움직여야 한다.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "Why You May Be Your Own Worst Enemy as an Investor"
  },
  {
    "text": "투자를 쉽게 보이게 하려고 글을 쓰지 않는다. 투자자가 섣부른 요령에 기대지 않도록 그 어려움을 보여 주고 싶다.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "Why You May Be Your Own Worst Enemy as an Investor"
  },
  {
    "text": "탁월한 투자는 다른 사람의 실수를 이용하는 일이다.",
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
    "text": "사람들이 필사적으로 팔 때 나는 산다. 필사적으로 살 때는 판다.",
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
    "text": "마음에 들어서가 아니라 다른 비슷한 주식보다 싸다고 판단해 주식을 샀다.",
    "author": "존 템플턴",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-templeton",
    "work": "After the Bubble Burst"
  },
  {
    "text": "다음 주나 다음 달의 시장 전망을 믿고 따를 만한 사람은 만나지 못했다.",
    "author": "존 템플턴",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-templeton",
    "work": "After the Bubble Burst"
  },
  {
    "text": "시장이 지나치게 오르면 이후 조정 때 대개 정상 수준보다 한참 아래로 떨어진다.",
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
    "text": "평생 투자 연구를 하면서 예측에 대해 점점 더 겸손해졌다.",
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
    "text": "제대로 된 기업에 투자하면 잠재 상승 폭이 커서 다른 조건이 부차적일 수 있다.",
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
    "text": "기업을 볼 때 경영진이 가장 중요하다.",
    "author": "필립 피셔",
    "source": "https://wealthawesome.com/investor-wisdom/investor/philip-fisher",
    "work": "The Money Men"
  },
  {
    "text": "어떤 업종에 있느냐보다 경쟁사가 아직 해내지 못한 일을 제대로 하고 있느냐가 중요하다.",
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
    "text": "장기적으로 꾸준히 발전하고 경쟁 우위가 있는 기업에 투자하는 편이 더 보수적일 수 있다.",
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
    "text": "경영진을 비판해도 불이익을 주지 않고 다른 의견을 환영하는 기업을 찾으라.",
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
    "text": "투자 관리자는 수익을 내는 것뿐 아니라 투자자가 본능적 실수를 피하도록 도울 수도 있다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "Talks at GS"
  },
  {
    "text": "강제 매도 압박을 피하고 공포에 휩쓸리지 않으면 장기 수익률에 도움이 된다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "Talks at GS"
  },
  {
    "text": "시장이 돌아설 때 크게 흔들리지 않을 자산인지도 살펴야 한다.",
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
    "text": "일관성과 인내가 있어야 복리가 쌓일 시간을 벌 수 있다.",
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
    "text": "좋을 때 더 버는 대신 가끔 큰 손실을 감수할지, 하락을 막는 대신 상승장에서 덜 벌지 선택해야 한다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "Opportunities for Patient Investors"
  },
  {
    "text": "단기간에 큰 손실을 입거나 수익을 다시 잃는 일을 피해야 오래 투자할 수 있다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "Opportunities for Patient Investors"
  },
  {
    "text": "과열된 기대는 가격을 밀어 올리고 공포는 건전한 은행도 흔들 수 있다.",
    "author": "조지 소로스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/george-soros",
    "work": "Crisis Is Endemic to the Financial System"
  },
  {
    "text": "세상은 우리가 모두 이해할 수 없을 만큼 복잡하다.",
    "author": "조지 소로스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/george-soros",
    "work": "Fallibility, Reflexivity, and the Human Uncertainty Principle"
  },
  {
    "text": "호황과 붕괴는 시장 가격이 기초 여건에 영향을 미칠 때만 나타난다.",
    "author": "조지 소로스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/george-soros",
    "work": "George Soros on Investing"
  },
  {
    "text": "나는 시장이 늘 틀렸다는 가정에서 출발한다. 가끔 그 가정이 틀리더라도 말이다.",
    "author": "조지 소로스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/george-soros",
    "work": "George Soros on Investing"
  },
  {
    "text": "금융시장은 본래 불안정하다. 안정을 유지하려면 이를 정책의 목표로 삼아야 한다.",
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
  const button = document.getElementById("investment-quote-next");
  if (!text || !author || !button || quotes.length < 2) return;

  let current = -1;
  function showAnotherQuote() {
    const available = current < 0 ? quotes.length : quotes.length - 1;
    let index = Math.floor(Math.random() * available);
    if (current >= 0 && index >= current) index += 1;
    current = index;
    const quote = quotes[index];
    text.textContent = quote.text;
    author.textContent = quote.author;
  }

  button.addEventListener("click", showAnotherQuote);
  showAnotherQuote();
})();
