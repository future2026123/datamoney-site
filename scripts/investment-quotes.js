(() => {
  "use strict";
  // Original excerpts marked sourceVerified=false still need original-source confirmation.
  const quotes = [
  {
    "text": "주식을 살 때는 그 기업을 제대로 이해해야 한다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Living Legends",
    "original": "You have to really understand the businesses that you’re buying through the medium of stocks. And unless you’re willing to put a lot into that, you shouldn’t expect to get much out of it.",
    "sourceVerified": true
  },
  {
    "text": "나는 시장을 예측하지 않는다. 저평가된 증권을 찾는 데 힘을 쓴다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Partnership Letters – PDF",
    "original": "I make no attempt to forecast the general market — my efforts are devoted to finding undervalued securities.",
    "sourceVerified": true
  },
  {
    "text": "값이 싸더라도 더 떨어질 수 있다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Partnership Letters – PDF",
    "original": "Just because something is cheap does not mean it is not going to go down.",
    "sourceVerified": true
  },
  {
    "text": "잘 팔 수 있다는 기대에 의존하지 말고 무난하게 팔아도 좋은 결과를 낼 가격에 사라.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Partnership Letters – PDF",
    "original": "Never count on making a good sale. Have the purchase price be so attractive that even a mediocre sale gives good results. The better sales will be the frosting on the cake.",
    "sourceVerified": true
  },
  {
    "text": "작은 수익률 차이도 오랜 시간 복리로 쌓이면 큰 차이가 된다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Partnership Letters – PDF",
    "original": "It is obvious that a variation of merely a few percentage points has an enormous effect on the success of a compounding (investment) program. It is also obvious that this effect mushrooms as the period lengthens.",
    "sourceVerified": true
  },
  {
    "text": "여론조사가 스스로 생각하는 일을 대신할 수는 없다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Partnership Letters – PDF",
    "original": "A public opinion poll is no substitute for thought.",
    "sourceVerified": true
  },
  {
    "text": "남들의 시장 전망이 아니라 기업의 전망을 보고 주식을 사고판다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Partnership Letters – PDF",
    "original": "We don’t buy and sell stocks based upon what other people think the stock market is going to do (I never have an opinion) but rather upon what we think the company is going to do.",
    "sourceVerified": true
  },
  {
    "text": "증권과 기업을 평가할 때는 정량적 요소와 정성적 요소가 함께 작용한다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Partnership Letters – PDF",
    "original": "The evaluation of securities and businesses for investment purposes has always involved a mixture of qualitative and quantitative factors.",
    "sourceVerified": true
  },
  {
    "text": "가격은 내가 내는 돈이고 가치는 그 돈으로 얻는 것이다.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Partnership Letters – PDF",
    "original": "Price is what you pay. Value is what you get.",
    "sourceVerified": true
  },
  {
    "text": "남들이 탐욕을 부릴 때 두려워하고 남들이 두려워할 때 탐욕을 부려라.",
    "author": "워런 버핏",
    "source": "https://wealthawesome.com/investor-wisdom/investor/warren-buffett",
    "work": "Charlie Rose Interview 10-1-2008",
    "original": "You want to be greedy when others are fearful. You want to be fearful when others are greedy. It’s that simple.",
    "sourceVerified": true
  },
  {
    "text": "흥분에 휩쓸려 재무 상태와 이익에 비해 터무니없이 높은 가격을 지불하지 말라.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "The New Era of Discrimination in the Selection of Securities",
    "original": "It is important to make sure that one is not lured by rash enthusiasm into commitments at levels greatly above those soundly warranted by the financial set-up and the earnings record.",
    "sourceVerified": true
  },
  {
    "text": "기업의 수익 창출력은 장부상 자산보다 주가에 훨씬 큰 영향을 미친다.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "The Riddle of U.S. Steel’s Book Value",
    "original": "All experienced investors know that earning power exerts a far more potent influence over stock prices than does property value.",
    "sourceVerified": true
  },
  {
    "text": "기업 가치는 투입한 돈이 아니라 그 기업에서 얻을 수 있는 것으로 판단한다.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "The Riddle of U.S. Steel’s Book Value",
    "original": "The worth of a business is measured not by what has been put into it, but by what can be taken out of it.",
    "sourceVerified": true
  },
  {
    "text": "현재 이익과 미래 전망, 경영진, 매매의 용이성 등 여러 요소가 기업의 내재 가치에 영향을 준다.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "Mr. Shareholder",
    "original": "Current earnings, future prospects, management, marketability are all factors more or less independent of assets which contribute their share to the intrinsic value.",
    "sourceVerified": true
  },
  {
    "text": "시장 가격은 일시적이고 사소한 일에도 비합리적으로 움직일 수 있다.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "The Riddle of U.S. Steel’s Book Value",
    "original": "Quotations fluctuate constantly, reacting often illogically to all sorts of temporary and even trivial influences.",
    "sourceVerified": true
  },
  {
    "text": "개별 종목을 고르는 데는 분석 훈련과 판단력이 함께 필요하다.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "Banker as an Investment Counselor",
    "original": "My own opinion is that the selection of individual securities is a matter partly of a special kind of judgment and insight, and partly of a good deal of security analysis training.",
    "sourceVerified": false
  },
  {
    "text": "좋은 기업을 고르는 것과 지금 가격에 살 만한 주식을 고르는 것은 다르다.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "Banker as an Investment Counselor",
    "original": "It is easy, of course, to pick out good companies, companies that are better than other companies. But that is not the same thing as picking out good stocks to buy at their current prices.",
    "sourceVerified": false
  },
  {
    "text": "누가 하든 주식시장의 미래를 예측한다는 말은 믿기 어렵다.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "Banker as an Investment Counselor",
    "original": "I am skeptical about stock market forecasting by anybody, and particularly by bankers.",
    "sourceVerified": false
  },
  {
    "text": "투자 방식은 재산의 크기보다 투자자의 지식과 준비에 맞춰야 한다.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "Banker as an Investment Counselor",
    "original": "The only sound distinction in investment policies for one type of investor or another is based not on his financial position but on his financial competence and financial preparation.",
    "sourceVerified": false
  },
  {
    "text": "증권 가치를 분석하는 데 반드시 복잡한 수학이 필요한 것은 아니다.",
    "author": "벤저민 그레이엄",
    "source": "https://wealthawesome.com/investor-wisdom/investor/benjamin-graham",
    "work": "Arithmetic and Stock Values",
    "original": "The analysis of security values is not an abstruse science. While in essence mathematical, it does not soar into the realms of calculus — in fact, it rarely gets as far as algebra.",
    "sourceVerified": true
  },
  {
    "text": "나는 물살을 예측하기보다 그 물살에 맞서 최대한 잘 헤엄치려 한다.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "2022 Daily Journal Annual Meeting",
    "original": "I figure that I want to swim as well as I can against the tides. I’m not trying to predict the tides.",
    "sourceVerified": true
  },
  {
    "text": "장기 전망은 어느 정도 내다볼 수 있지만 단기 시장이 어떻게 움직일지는 전혀 모르겠다.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "2023 Daily Journal Annual Meeting",
    "original": "I think I’m pretty good at long run expectations, but I don’t think I’m good at short-term wobbles. I don’t have the faintest idea what’s going to happen short term.",
    "sourceVerified": true
  },
  {
    "text": "어떤 사람들은 주식시장을 도박장처럼 이용한다.",
    "author": "찰리 멍거",
    "source": "https://sungcap.com/charlie-munger-daily-journal-2022-transcript/",
    "work": "2022 Daily Journal Annual Meeting",
    "original": "We have a stock market that some people use as a gambling parlor.",
    "sourceVerified": true
  },
  {
    "text": "아무리 좋은 것이라도 값을 끝없이 치를 만한 가치는 없다.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "2022 Daily Journal Annual Meeting",
    "original": "I’ve always believed that nothing was worth an infinite price.",
    "sourceVerified": true
  },
  {
    "text": "세상을 움직이는 것은 탐욕이 아니라 질투다.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "2022 Daily Journal Annual Meeting",
    "original": "The world is not driven by greed. It’s driven by envy.",
    "sourceVerified": true
  },
  {
    "text": "나는 기본을 중시한다. 그저 어리석은 실수를 피하려고 한다.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "A Conversation with Distinguished Alumnus Charles T. Munger",
    "original": "I’m a very blocking and tackling kind of a thinker. I just try and avoid being stupid.",
    "sourceVerified": true
  },
  {
    "text": "성공적인 투자는 지불하는 가격보다 가치가 큰 것을 찾는 일이다.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "A Conversation with Distinguished Alumnus Charles T. Munger",
    "original": "All successful investment involves trying to get into something where it’s worth more than you’re paying.",
    "sourceVerified": true
  },
  {
    "text": "똑똑한 사람이라도 자신의 능력을 과신하면 어리석은 사람보다 성과가 나쁠 수 있다.",
    "author": "찰리 멍거",
    "source": "https://worldlypartners.com/wp-content/uploads/2024/01/2020-charlie-munger-at-caltech.pdf",
    "work": "A Conversation with Distinguished Alumnus Charles T. Munger",
    "original": "A lot of smart people think they’re way smarter than they are, and therefore they do worse than dumb people.",
    "sourceVerified": true
  },
  {
    "text": "여러 분야의 중요한 생각을 익혀 판단에 활용하라.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "A Conversation with Distinguished Alumnus Charles T. Munger",
    "original": "I’m a big fan of knowing the big ideas in pretty much all the disciplines — the ones that are pretty easy to assimilate — and then using those routinely in your judgments. That’s just my system.",
    "sourceVerified": true
  },
  {
    "text": "좋은 투자에는 인내와 과감함이 함께 필요하다.",
    "author": "찰리 멍거",
    "source": "https://wealthawesome.com/investor-wisdom/investor/charlie-munger",
    "work": "A Conversation with Distinguished Alumnus Charles T. Munger",
    "original": "Good investing requires a weird combination of patience and aggression. And not many people have it.",
    "sourceVerified": true
  },
  {
    "text": "장기 수익은 기업의 경제적 성과가 좌우하고 단기 감정은 지나간다.",
    "author": "존 보글",
    "source": "https://boglecenter.net/wp-content/uploads/CFA_DC_Society_6-13-12.pdf",
    "work": "Thinking About What Lies Ahead For Investors, 2012",
    "original": "Over the very long run, it is the economics of investing—enterprise—that has determined total return; the evanescent emotions of investing—speculation—so important over the short run, have ultimately proven to be virtually meaningless.",
    "sourceVerified": true
  },
  {
    "text": "필요 이상으로 자주 거래하면 투자자들은 스스로에게 해를 끼친다.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Black Monday and Black Swans",
    "original": "When investors — individual and institutional alike — engage in far more trading –inevitably with one another — than is necessary for market efficiency and ample liquidity, they become, collectively, their own worst enemies.",
    "sourceVerified": true
  },
  {
    "text": "우리는 위험이라는 말은 너무 쉽게 쓰고 불확실성이라는 말은 너무 드물게 쓴다.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Black Monday and Black Swans",
    "original": "We use the term risk all too casually, and the term uncertainty all too rarely.",
    "sourceVerified": true
  },
  {
    "text": "과거의 수익률 흐름만으로 미래를 예측할 수 있다고 믿는 것은 착각이다.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Black Monday and Black Swans",
    "original": "We deceive ourselves when we believe that past stock market return patterns provide the bounds by which we can predict the future.",
    "sourceVerified": true
  },
  {
    "text": "때로는 통계만으로 보이지 않는 것을 상식이 알려 준다.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Putting the Shareholder First: A Lifetime Ideal",
    "original": "Sometimes common sense tells us what statistics cannot.",
    "sourceVerified": true
  },
  {
    "text": "주식을 오래 보유하던 투자 업계가 이제는 잠깐 빌리듯 거래하는 곳이 됐다.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Putting the Shareholder First: A Lifetime Ideal",
    "original": "It’s now a rent-a-stock industry, compared with the old own-a-stock industry when turnover was 16 percent and the average holding period was six years.",
    "sourceVerified": true
  },
  {
    "text": "투기는 비용 때문에 투자자에게 불리한 게임이 될 수밖에 없다.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Putting the Shareholder First: A Lifetime Ideal",
    "original": "Speculation is a loser’s game. Because of the costs, it has to be a loser’s game.",
    "sourceVerified": true
  },
  {
    "text": "투자할 때는 무작정 움직이기보다 가만히 기다려라.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Putting the Shareholder First: A Lifetime Ideal",
    "original": "We all know that the best rule for investors — the clients of the investment business — is, “Don’t just do something — stand there.",
    "sourceVerified": true
  },
  {
    "text": "운용 펀드를 고른다면 비용 부담이 큰 펀드보다 적은 펀드를 택하라.",
    "author": "존 보글",
    "source": "https://lhajohzwizrsjmumhpjg.supabase.co/storage/v1/object/public/wealth-awesome/investor-library/putting-shareholder-first.pdf",
    "work": "Putting the Shareholder First: A Lifetime Ideal",
    "original": "If your preference is for managed funds, you want a managed fund that, one might put it, is like a sailboat fighting not a typhoon of costs but only a breeze.",
    "sourceVerified": true
  },
  {
    "text": "시장이 얼마나 효율적인지 논쟁해도 비용이 중요하다는 사실은 변하지 않는다.",
    "author": "존 보글",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-bogle",
    "work": "Putting the Shareholder First: A Lifetime Ideal",
    "original": "I’ve often said that the efficient market hypothesis, or EMH, has a lot of truth to it, but the CMH — or “cost matters hypothesis” — is eternally truthful to the last penny.",
    "sourceVerified": true
  },
  {
    "text": "주식은 복권이 아니다. 모든 주식 뒤에는 실제 기업이 있다.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Lessons from an Investing Legend",
    "original": "Stocks aren’t lottery tickets. Behind every stock is a company.",
    "sourceVerified": true
  },
  {
    "text": "1~2년 안에 써야 할 돈이라면 주식을 사지 말아야 한다.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Lessons from an Investing Legend",
    "original": "The stock market’s been the best place to be over the last 10 years, 30 years, 100 years. But if you need the money in 1 or 2 years, you shouldn’t be buying stocks.",
    "sourceVerified": true
  },
  {
    "text": "주식 투자에서 가장 중요한 것은 머리가 아니라 배짱이다.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Lessons from an Investing Legend",
    "original": "In the stock market, the most important organ is the stomach. It’s not the brain.",
    "sourceVerified": true
  },
  {
    "text": "사람들은 전자레인지를 살 때는 꼼꼼히 조사하면서 주식은 버스에서 들은 말만 믿고 산다.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Wall Street Week 1980",
    "original": "People go to the library and they do incredible research on a microwave oven. And then they’ll go out and spend $10,000 on a stock because they heard a tip on the bus.",
    "sourceVerified": false
  },
  {
    "text": "경제도 주식시장도 예측할 수 없다.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Wall Street Week with Peter Lynch and John Templeton",
    "original": "You never can predict the economy. You can’t predict the stock market.",
    "sourceVerified": true
  },
  {
    "text": "이해하고 믿으며 계속 보유할 생각이 있는 것만 사라. 남들이 새 유행을 쫓을 때도 마찬가지다.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "A Collection of Articles by Peter Lynch",
    "original": "Buy only what you understand, believe in, and intend to stick with — even when others are chasing the next miracle.",
    "sourceVerified": true
  },
  {
    "text": "더 많은 기업을 살펴볼수록 관심을 가질 만한 기회를 만날 수 있다.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Betting on the Market",
    "original": "I always thought if you looked at ten companies, you’d find one that’s interesting, if you’d look at 20, you’d find two, or if you look at hundred you’ll find ten. The person that turns over the most rocks wins the game.",
    "sourceVerified": true
  },
  {
    "text": "내 판단이 맞으면 얼마나 벌고 틀리면 얼마나 잃을지 따져 보라.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Charlie Rose Transcript 1997",
    "original": "You have to say to yourself, “If I’m right, how much am I going to make? If I’m wrong, how much am I going to lose?” That’s the risk/reward ratio.",
    "sourceVerified": true
  },
  {
    "text": "열 살 아이에게 2분 안에 설명하지 못할 기업이라면 주식을 사지 마라.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Charlie Rose Transcript 1993",
    "original": "If you don’t understand a company, if you can’t explain it to a 10-year-old in 2 minutes or less, don’t own it.",
    "sourceVerified": true
  },
  {
    "text": "투자를 잘해도 열 번 중 여섯 번 맞힌다. 아홉 번은 맞힐 수 없다.",
    "author": "피터 린치",
    "source": "https://wealthawesome.com/investor-wisdom/investor/peter-lynch",
    "work": "Betting on the Market",
    "original": "In this business, if you’re good, you’re right six times out of ten. You’re never going to be right nine times out of ten.",
    "sourceVerified": true
  },
  {
    "text": "평균을 넘어서려면 군중과 다른 선택을 해야 한다.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "Talks at GS",
    "original": "In order to outperform, by definition, you have to depart from the crowd. You have to hold a different position.",
    "sourceVerified": true
  },
  {
    "text": "평균보다 높은 성과를 노리면 평균보다 낮은 성과를 낼 위험도 감수해야 한다.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "Talks at GS",
    "original": "There’s nothing you can do in the interest of being above average that does not expose you to the risk of being below average.",
    "sourceVerified": true
  },
  {
    "text": "시장을 따라 오를 때 사고 떨어질 때 파는 행동은 흔하면서도 큰 실수다.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "The Human Side of Investing",
    "original": "Pro-cyclical behavior is one of the greatest and one of the most frequent mistakes.",
    "sourceVerified": true
  },
  {
    "text": "미래를 내다보는 자신의 능력에 지나친 기대를 걸지 말라.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "The Human Side of Investing",
    "original": "We should be very cautious in what we expect of our prescience.",
    "sourceVerified": true
  },
  {
    "text": "미래를 생각할 때 여러 가능성이 있다는 사실을 놓치기 쉽다.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "The Human Side of Investing",
    "original": "When most people think about the future, they ignore that the future is a distribution of possibilities.",
    "sourceVerified": true
  },
  {
    "text": "투자 심리는 낙관과 비관, 탐욕과 두려움 사이를 오간다.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "The Human Side of Investing",
    "original": "The pendulum of investment psychology is constantly fluctuating between optimism and pessimism, between greed and fear, between credulousness and skepticism, between risk tolerance and risk aversion.",
    "sourceVerified": true
  },
  {
    "text": "시장은 감정과 불안을 가진 사람들로 이루어져 있어 때로 극단으로 치닫는다.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "The Human Side of Investing",
    "original": "The truth is markets are made up of people, with their emotions, insecurities, their tendency to go to extremes, and their other foibles. Thus, they often make mistakes and swing to erroneous extremes.",
    "sourceVerified": true
  },
  {
    "text": "투자자는 인내하며 기다려야 하고 행동할 때는 과감히 움직여야 한다.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "Why You May Be Your Own Worst Enemy as an Investor",
    "original": "Waiting patiently is an essential part of being an investor. And when you do take action, do it dynamically, forcefully.",
    "sourceVerified": true
  },
  {
    "text": "투자를 쉽게 보이게 하려고 글을 쓰지 않는다. 투자자가 섣부른 요령에 기대지 않도록 그 어려움을 보여 주고 싶다.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "Why You May Be Your Own Worst Enemy as an Investor",
    "original": "I don’t write to make investing easy. I write to show how hard it is so that people won’t try tricks that they can’t do.",
    "sourceVerified": true
  },
  {
    "text": "탁월한 투자는 다른 사람의 실수를 이용하는 일이다.",
    "author": "하워드 막스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/howard-marks",
    "work": "Why You May Be Your Own Worst Enemy as an Investor",
    "original": "Superior investing is taking advantage of the errors of others.",
    "sourceVerified": true
  },
  {
    "text": "다른 사람들이 관심을 두지 않는 곳에서 큰 기회를 찾기도 한다.",
    "author": "존 템플턴",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-templeton",
    "work": "Living Legends",
    "original": "I have learned that the great opportunities are the places that have been neglected, where other people are not looking.",
    "sourceVerified": true
  },
  {
    "text": "주가를 움직이는 요인은 복잡해서 시장 방향을 꾸준히 맞히기 어렵다.",
    "author": "존 템플턴",
    "source": "https://lhajohzwizrsjmumhpjg.supabase.co/storage/v1/object/public/wealth-awesome/investor-library/b5470-templetonletter1954.pdf",
    "work": "Templeton Letter 1954",
    "original": "The influences on stock prices are so numerous and so complex that no person has ever been able to predict the trend of stock prices with consistent success.",
    "sourceVerified": true
  },
  {
    "text": "사람들이 필사적으로 팔 때 나는 산다. 필사적으로 살 때는 판다.",
    "author": "존 템플턴",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-templeton",
    "work": "Transcript: Adam Smith’s Money Game 1998",
    "original": "When people are desperately trying to sell, I buy. When people are desperately trying to buy, I sell. It has worked out very well over the years.",
    "sourceVerified": false
  },
  {
    "text": "분산은 내 판단이 틀릴 수 있음을 인정하는 데서 시작한다.",
    "author": "존 템플턴",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-templeton",
    "work": "The Eternal Optimist",
    "original": "Diversification is a safety factor that is essential because we should be humble enough to admit we can be wrong.",
    "sourceVerified": false
  },
  {
    "text": "투자 기회는 넓은 바다에 있다. 같은 돈으로 더 큰 가치를 찾으라.",
    "author": "존 템플턴",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-templeton",
    "work": "After the Bubble Burst",
    "original": "See the investment world as an ocean and buy where you get the most value for your money.",
    "sourceVerified": false
  },
  {
    "text": "마음에 들어서가 아니라 다른 비슷한 주식보다 싸다고 판단해 주식을 샀다.",
    "author": "존 템플턴",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-templeton",
    "work": "After the Bubble Burst",
    "original": "I never in all my life bought a stock because I liked it. I bought it because it was a cheaper bargain than any similar stock I would buy anywhere in the rest of the world.",
    "sourceVerified": false
  },
  {
    "text": "다음 주나 다음 달의 시장 전망을 믿고 따를 만한 사람은 만나지 못했다.",
    "author": "존 템플턴",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-templeton",
    "work": "After the Bubble Burst",
    "original": "In all my 60 years in the stock market, I never found anyone whose opinion of what the stock market would do next week or next month was worth heeding.",
    "sourceVerified": false
  },
  {
    "text": "시장이 지나치게 오르면 이후 조정 때 대개 정상 수준보다 한참 아래로 떨어진다.",
    "author": "존 템플턴",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-templeton",
    "work": "After the Bubble Burst",
    "original": "Whenever you get a wild excess on the upside, the following correction doesn’t just go back to normal; it almost always falls way below normal.",
    "sourceVerified": false
  },
  {
    "text": "세금을 피하려고 매도를 미루다 이익 자체를 잃을 수도 있다.",
    "author": "존 템플턴",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-templeton",
    "work": "Capital Gains",
    "original": "Through reluctance to sell, more than one investor has avoided the capital gains tax but lost the capital gain itself.",
    "sourceVerified": false
  },
  {
    "text": "평생 투자 연구를 하면서 예측에 대해 점점 더 겸손해졌다.",
    "author": "존 템플턴",
    "source": "https://wealthawesome.com/investor-wisdom/investor/john-templeton",
    "work": "The Bubble Will Burst",
    "original": "A lifetime of investment research has taught me to become more and more humble about making predictions.",
    "sourceVerified": false
  },
  {
    "text": "변화는 성장의 기회를 주지만 동시에 뒤처질 위험도 만든다.",
    "author": "필립 피셔",
    "source": "https://wealthawesome.com/investor-wisdom/investor/philip-fisher",
    "work": "The Money Men",
    "original": "Change creates opportunities to grow, but it also creates opportunities to slip.",
    "sourceVerified": true
  },
  {
    "text": "특별한 기업을 찾은 뒤에는 그 가격이 지나치게 높지 않은지 살핀다.",
    "author": "필립 피셔",
    "source": "https://wealthawesome.com/investor-wisdom/investor/philip-fisher",
    "work": "The Money Men",
    "original": "It’s my job to find unusual companies and then judge whether the price they’re selling at is too high.",
    "sourceVerified": true
  },
  {
    "text": "제대로 된 기업에 투자하면 잠재 상승 폭이 커서 다른 조건이 부차적일 수 있다.",
    "author": "필립 피셔",
    "source": "https://wealthawesome.com/investor-wisdom/investor/philip-fisher",
    "work": "The Money Men",
    "original": "If you are in the right companies, the potential rise can be so enormous that everything else is secondary.",
    "sourceVerified": true
  },
  {
    "text": "아무리 훌륭한 기업도 인기가 지나치면 가격이 너무 높을 수 있다.",
    "author": "필립 피셔",
    "source": "https://wealthawesome.com/investor-wisdom/investor/philip-fisher",
    "work": "The Money Men",
    "original": "Even a great company can be priced too high if there’s a lot of glamour attached to it.",
    "sourceVerified": true
  },
  {
    "text": "기업을 볼 때 경영진이 가장 중요하다.",
    "author": "필립 피셔",
    "source": "https://wealthawesome.com/investor-wisdom/investor/philip-fisher",
    "work": "The Money Men",
    "original": "I have stressed management, but even so, I haven’t stressed it enough. It is the most important ingredient.",
    "sourceVerified": true
  },
  {
    "text": "어떤 업종에 있느냐보다 경쟁사가 아직 해내지 못한 일을 제대로 하고 있느냐가 중요하다.",
    "author": "필립 피셔",
    "source": "https://wealthawesome.com/investor-wisdom/investor/philip-fisher",
    "work": "The Money Men",
    "original": "It’s not what industry you’re in, it’s what you’re doing right that your rivals haven’t yet figured out.",
    "sourceVerified": true
  },
  {
    "text": "큰 성과에는 오랜 계획과 기다림, 관찰이 필요했다.",
    "author": "필립 피셔",
    "source": "https://wealthawesome.com/investor-wisdom/investor/philip-fisher",
    "work": "The Money Men",
    "original": "The big profits I have made were through very long planning, waiting and watching.",
    "sourceVerified": false
  },
  {
    "text": "장기적으로 꾸준히 발전하고 경쟁 우위가 있는 기업에 투자하는 편이 더 보수적일 수 있다.",
    "author": "필립 피셔",
    "source": "https://wealthawesome.com/investor-wisdom/investor/philip-fisher",
    "work": "Maybe It’s 1928 Again",
    "original": "I think it is more conservative in the long run to be in a company that is really progressing and really has an edge.",
    "sourceVerified": true
  },
  {
    "text": "기업 규모가 크다는 사실만으로 미래의 생존이 보장되지는 않는다.",
    "author": "필립 피셔",
    "source": "https://wealthawesome.com/investor-wisdom/investor/philip-fisher",
    "work": "Maybe It’s 1928 Again",
    "original": "I am vitally interested in companies that are going to survive, but I don’t think a big cap company is necessarily one that will.",
    "sourceVerified": true
  },
  {
    "text": "경영진을 비판해도 불이익을 주지 않고 다른 의견을 환영하는 기업을 찾으라.",
    "author": "필립 피셔",
    "source": "https://wealthawesome.com/investor-wisdom/investor/philip-fisher",
    "work": "The Money Men",
    "original": "I want companies that welcome dissent, rather than stifle it, that don’t penalize people who criticize what management is doing.",
    "sourceVerified": true
  },
  {
    "text": "안전마진이란 내 판단이 틀려도 버틸 여지를 남기는 것이다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "Talks at GS",
    "original": "Margin of safety is simply the idea that you want room to be wrong.",
    "sourceVerified": true
  },
  {
    "text": "투자 관리자는 수익을 내는 것뿐 아니라 투자자가 본능적 실수를 피하도록 도울 수도 있다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "Talks at GS",
    "original": "People think they’re hiring a manager to make them money. But probably, they’re hiring a manager to keep them out of trouble and maybe fight their own instincts sometimes.",
    "sourceVerified": true
  },
  {
    "text": "강제 매도 압박을 피하고 공포에 휩쓸리지 않으면 장기 수익률에 도움이 된다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "Talks at GS",
    "original": "The ability to not be getting margin calls, not be having redemptions, not be scared out of your mind when something’s gone against you is probably the most enhancing thing to long term returns.",
    "sourceVerified": true
  },
  {
    "text": "시장이 돌아설 때 크게 흔들리지 않을 자산인지도 살펴야 한다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "Talks at GS",
    "original": "The challenge is whether you can invest in things that won’t be too bad on the day when the market turns.",
    "sourceVerified": true
  },
  {
    "text": "마땅한 기회가 없을 때 현금을 보유하는 것도 합리적인 선택이다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "What I’ve learned from Warren Buffett",
    "original": "Holding cash in the absence of opportunity makes sense.",
    "sourceVerified": true
  },
  {
    "text": "전례 없는 일도 생각보다 자주 일어나므로 대비해야 한다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "What I’ve learned from Warren Buffett",
    "original": "Unprecedented events occur with some regularity, so be prepared.",
    "sourceVerified": true
  },
  {
    "text": "일관성과 인내가 있어야 복리가 쌓일 시간을 벌 수 있다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "What I’ve learned from Warren Buffett",
    "original": "Consistency and patience are crucial. Most investors are their own worst enemies. Endurance enables compounding.",
    "sourceVerified": true
  },
  {
    "text": "지나치게 좁은 영역에만 머물면 변화하는 세상에 적응하기 어렵다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "Baupost Letters",
    "original": "Investors who find an overly narrow niche to inhabit, prosper for a time but then usually stagnate. Those who move on when the world changes at least have the chance to adapt successfully.",
    "sourceVerified": true
  },
  {
    "text": "좋을 때 더 버는 대신 가끔 큰 손실을 감수할지, 하락을 막는 대신 상승장에서 덜 벌지 선택해야 한다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "Opportunities for Patient Investors",
    "original": "Investors need to pick their poison: Either make more money when times are good and have a really ugly year every so often, or protect on the downside and don’t be at the party so long when things are good.",
    "sourceVerified": true
  },
  {
    "text": "단기간에 큰 손실을 입거나 수익을 다시 잃는 일을 피해야 오래 투자할 수 있다.",
    "author": "세스 클라먼",
    "source": "https://wealthawesome.com/investor-wisdom/investor/seth-klarman",
    "work": "Opportunities for Patient Investors",
    "original": "Avoiding round trips and short-term devastation enables you to be around for the long term.",
    "sourceVerified": true
  },
  {
    "text": "과열된 기대는 가격을 밀어 올리고 공포는 건전한 은행도 흔들 수 있다.",
    "author": "조지 소로스",
    "source": "https://storage.googleapis.com/ni_library_storage/Investors/Soros-Crisis-Is-Endemic-to-the-Financial-System-2009.pdf",
    "work": "Crisis Is Endemic to the Financial System",
    "original": "Euphoria can lift housing and dot.com prices; panic can send sound banks tumbling.",
    "sourceVerified": true
  },
  {
    "text": "세상은 우리가 모두 이해할 수 없을 만큼 복잡하다.",
    "author": "조지 소로스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/george-soros",
    "work": "Fallibility, Reflexivity, and the Human Uncertainty Principle",
    "original": "The complexity of the world in which we live exceeds our capacity to comprehend it.",
    "sourceVerified": true
  },
  {
    "text": "호황과 붕괴는 시장 가격이 기초 여건에 영향을 미칠 때만 나타난다.",
    "author": "조지 소로스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/george-soros",
    "work": "George Soros on Investing",
    "original": "A boom/bust process occurs only when market prices find a way to influence the so-called fundamentals that are supposed to be reflected in market prices.",
    "sourceVerified": true
  },
  {
    "text": "나는 시장이 늘 틀렸다는 가정에서 출발한다. 가끔 그 가정이 틀리더라도 말이다.",
    "author": "조지 소로스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/george-soros",
    "work": "George Soros on Investing",
    "original": "I assume that markets are always wrong. Even if my assumption is occasionally wrong, I use it as a working hypothesis.",
    "sourceVerified": true
  },
  {
    "text": "금융시장은 본래 불안정하다. 안정을 유지하려면 이를 정책의 목표로 삼아야 한다.",
    "author": "조지 소로스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/george-soros",
    "work": "After Black Monday",
    "original": "Financial markets are inherently unstable; stability can be maintained only if it is made an objective of public policy. Moreover, instability is cumulative.",
    "sourceVerified": true
  },
  {
    "text": "시장은 투자자의 기대를 비추는 동시에 그 기대를 만들어 가기도 한다.",
    "author": "조지 소로스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/george-soros",
    "work": "After Black Monday",
    "original": "Analysts generally regard the stock market as the passive reflection of investors’ expectations. But in fact, it is an active force in shaping them.",
    "sourceVerified": true
  },
  {
    "text": "금융시장에는 알 수 없는 변수가 많아 단순한 균형으로 설명하기 어렵다.",
    "author": "조지 소로스",
    "source": "https://www.nybooks.com/articles/1999/01/14/the-international-crisis-an-interview/",
    "work": "The International Financial Crisis",
    "original": "Equilibrium applies best only to markets which deal with known quantities. But financial markets deal with quantities that are not only largely unknown but unknowable.",
    "sourceVerified": true
  },
  {
    "text": "시장은 때때로 스스로 불안정을 키우며 균형에서 멀어진다.",
    "author": "조지 소로스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/george-soros",
    "work": "Crisis Is Endemic to the Financial System",
    "original": "The reality is that financial markets are self-destabilizing; occasionally they tend toward disequilibrium, not equilibrium.",
    "sourceVerified": true
  },
  {
    "text": "과학이 발전했다고 해서 사람의 행동까지 언제나 합리적인 것은 아니다.",
    "author": "조지 소로스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/george-soros",
    "work": "Fallibility, Reflexivity, and the Human Uncertainty Principle",
    "original": "The achievements of natural science stand as convincing testimony to man’s ability to use reason. Unfortunately, these achievements do not ensure that human behavior is always governed by reason.",
    "sourceVerified": true
  },
  {
    "text": "거품에는 실제로 존재하는 흐름과 그 흐름을 둘러싼 오해가 함께 있다.",
    "author": "조지 소로스",
    "source": "https://wealthawesome.com/investor-wisdom/investor/george-soros",
    "work": "Fallibility, Reflexivity, and the Human Uncertainty Principle",
    "original": "Every bubble has two components: an underlying trend that prevails in reality and a misconception relating to that trend.",
    "sourceVerified": true
  }
];
  const text = document.getElementById("investment-quote-text");
  const author = document.getElementById("investment-quote-author");
  const original = document.getElementById("investment-quote-original");
  const reviewNote = document.getElementById("investment-quote-review-note");
  const button = document.getElementById("investment-quote-next");
  if (!text || !author || !original || !reviewNote || !button || quotes.length < 2) return;

  let current = -1;
  function showAnotherQuote() {
    const available = current < 0 ? quotes.length : quotes.length - 1;
    let index = Math.floor(Math.random() * available);
    if (current >= 0 && index >= current) index += 1;
    current = index;
    const quote = quotes[index];
    text.textContent = quote.text;
    original.textContent = quote.original;
    reviewNote.hidden = quote.sourceVerified;
    author.textContent = quote.author;
  }

  // Reserve the height of the longest quote at the current width so the button
  // stays put without truncating or adding an inner scrollbar to the text.
  const quoteBody = text.closest(".quote-current");
  function reserveQuoteHeight() {
    if (!quoteBody || !quoteBody.isConnected) return;
    const width = quoteBody.getBoundingClientRect().width;
    if (!width) return;
    const ruler = document.createElement("div");
    ruler.setAttribute("aria-hidden", "true");
    Object.assign(ruler.style, {
      position: "absolute", left: "-10000px", top: "0", width: `${width}px`,
      visibility: "hidden", pointerEvents: "none"
    });
    const samples = quotes.map(quote => {
      const sample = quoteBody.cloneNode(true);
      sample.removeAttribute("aria-live");
      sample.removeAttribute("aria-atomic");
      sample.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
      sample.style.minHeight = "0";
      sample.style.height = "auto";
      sample.querySelector("blockquote").textContent = quote.text;
      sample.querySelector(".quote-original").textContent = quote.original;
      sample.querySelector(".quote-review-note").hidden = quote.sourceVerified;
      sample.querySelector(".quote-meta span").textContent = quote.author;
      ruler.appendChild(sample);
      return sample;
    });
    quoteBody.parentElement.appendChild(ruler);
    const height = Math.ceil(Math.max(...samples.map(sample => sample.getBoundingClientRect().height)));
    ruler.remove();
    quoteBody.style.minHeight = `${height}px`;
  }
  let measurementFrame = 0;
  function scheduleQuoteHeight() {
    if (measurementFrame) cancelAnimationFrame(measurementFrame);
    measurementFrame = requestAnimationFrame(() => { measurementFrame = 0; reserveQuoteHeight(); });
  }
  button.addEventListener("click", showAnotherQuote);
  showAnotherQuote();
  reserveQuoteHeight();
  if (quoteBody && window.ResizeObserver) {
    let previousWidth = 0;
    new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      if (Math.abs(width - previousWidth) > .5) { previousWidth = width; scheduleQuoteHeight(); }
    }).observe(quoteBody);
  } else {
    window.addEventListener("resize", scheduleQuoteHeight);
  }
  if (document.fonts) document.fonts.ready.then(scheduleQuoteHeight).catch(() => {});
})();
