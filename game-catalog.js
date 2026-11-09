// Stable seed identities keep the original demonstration records reproducible.
// Display names and supplied artwork are applied to gameCatalog below.
export const baseGameCatalog=[
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


const additionalNames={
 電子遊戲:['銀河遠征','蒼穹之翼','時空旅人','幻境迷城','雷霆突襲','極地曙光','黃金航線','星雲探索','熔岩之巔','森林奇旅','沙漠疾行','天空之城','秘境之門','流星追逐','深淵探索','晶石傳說','機甲遠征','月光階梯','鳳凰之路','龍焰試煉','光速挑戰'],
 老虎機:['黃金帝國','海神寶庫','月夜神殿','幸運熊貓','霓虹都會','鑽石盛宴','財神報喜','神龍秘寶','水果狂歡','極地寶石','海盜金庫','王牌富豪','烈焰寶鑽','仙境花園','招財貓','古墓探險','蒸汽奇城','七彩糖果','鳳凰寶珠','銀河財富'],
 捕魚:['珊瑚王國','巨鯨傳說','怒海狂潮','海底奇兵','冰海巨獸','黃金漁港','深淵巨鯊','碧海尋寶','海神之怒','寶石水域','熱帶漁樂','極光冰洋','龍王秘境','遠洋探險','水晶海灣','狂暴章魚','黃金鯨王','幽藍深淵','海洋嘉年華','幻彩海域','風暴漁場','珍珠海岸'],
 棋牌:['皇家 21 點','鑽石 21 點','幸運 21 點','競技牛牛','黃金牛牛','至尊牛牛','歡樂牛牛','休閒鬥地主','王牌鬥地主','皇家鬥地主','競技鬥地主','黃金鬥地主','休閒 21 點','翡翠牛牛','星光 21 點','巔峰鬥地主','極速牛牛','金牌 21 點','歡聚鬥地主']
};
const families={電子遊戲:['progression'],老虎機:['slots'],捕魚:['fishing'],棋牌:['blackjack','bull','landlord']};
const prefixes={電子遊戲:'EG',老虎機:'SL',捕魚:'FI',棋牌:'CA'};
const additions=Object.entries(additionalNames).flatMap(([type,names])=>{
 const existing=baseGameCatalog.filter(game=>game.type===type);
 return names.map((name,index)=>{
  const family=type==='棋牌'?(name.includes('21 點')?'blackjack':name.includes('牛牛')?'bull':'landlord'):families[type][0];
  const template=existing.find(game=>game.family===family);
  return {...template,id:prefixes[type]+'-'+String(existing.length+index+1).padStart(2,'0'),name,hasJackpot:index%3!==2&&family!=='landlord'};
 });
});
// Supplied primary slot titles. IDs retain their existing demo wagers and configuration.
export const featuredSlotGames=[
 ["SL-01", "Golden Legacy", "A01"],
 ["SL-02", "Panda Fist", "B01"],
 ["SL-03", "Taste of Empire", "B02"],
 ["SL-04", "Ebisu Fortune", "B03"],
 ["SL-05", "Lucky Cat", "C01"],
 ["SL-06", "Poker Wars", "C02"],
 ["SL-07", "Fitness Lady", "C03"],
 ["SL-08", "Glory of the Colosseum", "D01"],
 ["SL-09", "Dragon King", "D02"],
 ["SL-10", "Mafia Legacy", "D03"],
 ["SL-11", "Goddess of Eternal Gold", "E01"],
 ["SL-12", "Legends of Lubu & Diaochan", "E02"],
 ["SL-13", "Royal Pirates", "E03"],
].map(([id,name,assetCode],featuredOrder)=>({id,name,assetCode,cover:'rr-'+assetCode.toLowerCase(),featuredOrder}));
const featuredById=new Map(featuredSlotGames.map(game=>[game.id,game]));
export const gameCatalog=[...baseGameCatalog,...additions].map(game=>({...game,cover:game.id.toLowerCase()})).map(game=>{const featured=featuredById.get(game.id);return featured?{...game,...featured,legacyName:game.name}:game;}).map(game=>game.type==='老虎機'?{...game,slotGameplay:['classic','paylines','ways','cascade','megaways'][(Number(game.id.slice(3))-1)%5]}:game);
