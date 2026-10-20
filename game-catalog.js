// Fictional demo games. Skins in a family share the same documented demo rules.
export const gameCatalog=[
 ['EG-01','星際闖關','電子遊戲','progression','electronic',true],
 ['EG-02','烈焰階梯','電子遊戲','progression','electronic',false],
 ['EG-03','冰川探險','電子遊戲','progression','electronic',true],
 ['EG-04','極速穿越','電子遊戲','progression','electronic',false],
 ['SL-01','翡翠金礦','老虎機','slots','slots',true],
 ['SL-02','埃及祕寶','老虎機','slots','slots',true],
 ['SL-03','福運招財','老虎機','slots','slots',true],
 ['SL-04','雷霆之神','老虎機','slots','slots',false],
 ['SL-05','叢林寶藏','老虎機','slots','slots',false],
 ['FI-01','深海獵場','捕魚','fishing','fishing',true],
 ['FI-02','龍宮爭霸','捕魚','fishing','fishing',true],
 ['FI-03','海盜寶藏','捕魚','fishing','fishing',false],
 ['CA-01','經典 21 點','棋牌','blackjack','blackjack',true],
 ['CA-02','搶莊牛牛','棋牌','bull','bull',true],
 ['CA-03','經典鬥地主','棋牌','landlord','landlord',false],
 ['CA-04','極速 21 點','棋牌','blackjack','blackjack',false],
 ['CA-05','經典牛牛','棋牌','bull','bull',false],
 ['CA-06','歡樂鬥地主','棋牌','landlord','landlord',false]
].map(([id,name,type,family,cover,hasJackpot])=>({id,name,type,family,cover,hasJackpot}));
