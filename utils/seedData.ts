
import { CarCostEntry, PoiCity, PoiSpot, PoiHotel, PoiActivity, SavedTrip, DayRow } from '../types';
import { addDays, generateUUID } from './dateUtils';

// --- Helpers ---
const getRandomPrice = (min: number, max: number) => Math.floor(Math.random() * (max - min)) + min;
const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomSubset = <T>(arr: T[], count: number): T[] => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

// --- DATA STRUCTURE ---
// Format: [CityName, [Spots(Tickets)], [Hotels], [PaidActivities]]
type CityData = [string, string[], string[], string[]];
type CountryData = { tier: 1 | 2 | 3; cities: CityData[] };

// --- GLOBAL DESTINATIONS (~80 Countries) ---
// Tier 1: Super Popular (8-10 trips), Tier 2: Popular (5-7 trips), Tier 3: Niche (3-4 trips)
const GLOBAL_DATA: Record<string, CountryData> = {
  // === ASIA (20) ===
  "中国 (China)": { tier: 1, cities: [
      ["北京", ["故宫博物院", "长城", "天坛", "颐和园"], ["王府半岛", "瑰丽"], ["京剧体验", "烤鸭品鉴晚宴"]],
      ["上海", ["东方明珠", "上海迪士尼", "豫园"], ["和平饭店", "宝格丽"], ["黄浦江游船", "沉浸式戏剧"]],
      ["西安", ["兵马俑", "大雁塔", "城墙"], ["索菲特传奇", "威斯汀"], ["长恨歌演出", "饺子宴制作"]],
      ["成都", ["熊猫基地", "都江堰"], ["博舍", "丽思卡尔顿"], ["川剧变脸VIP席", "火锅烹饪课"]],
      ["三亚", ["蜈支洲岛", "南山寺"], ["亚特兰蒂斯", "艾迪逊"], ["直升机观光", "豪华游艇出海", "尾波冲浪"]],
      ["丽江", ["玉龙雪山", "丽江古城"], ["安缦大研", "金茂"], ["印象丽江演出", "雪山下午茶"]]
  ]},
  "日本 (Japan)": { tier: 1, cities: [
      ["东京", ["浅草寺", "东京塔", "TeamLab", "迪士尼"], ["安缦东京", "虹夕诺雅"], ["直升机夜游东京", "米其林怀石料理", "相扑观看"]],
      ["京都", ["清水寺", "金阁寺", "伏见稻荷"], ["丽思卡尔顿", "柏悦"], ["艺伎晚宴", "和服跟拍", "茶道体验"]],
      ["大阪", ["环球影城(USJ)", "大阪城"], ["瑞吉", "康莱德"], ["道顿堀游船", "神户牛铁板烧"]],
      ["北海道", ["旭山动物园", "白色恋人"], ["坐忘林", "星野"], ["破冰船体验", "滑雪私教", "雪地摩托"]]
  ]},
  "泰国 (Thailand)": { tier: 1, cities: [
      ["曼谷", ["大皇宫", "郑王庙"], ["文华东方", "半岛"], ["湄南河游轮晚宴", "泰拳VIP座", "泰式按摩SPA"]],
      ["普吉岛", ["皮皮岛", "攀牙湾"], ["瑞吉", "瑰丽"], ["豪华双体帆船出海", "深潜体验", "人妖秀VIP"]],
      ["清迈", ["双龙寺", "塔佩门"], ["四季", "安纳塔拉"], ["大象保育体验", "泰菜烹饪课", "丛林飞跃"]]
  ]},
  "新加坡 (Singapore)": { tier: 2, cities: [
      ["新加坡", ["环球影城", "滨海湾花园", "动物园"], ["莱佛士", "金沙"], ["F1赛道超跑体验", "夜间动物园探险", "新加坡司令制作"]]
  ]},
  "韩国 (South Korea)": { tier: 2, cities: [
      ["首尔", ["景福宫", "南山塔"], ["新罗", "四季"], ["韩服摄影", "乱打秀", "K-pop舞蹈课"]],
      ["济州岛", ["城山日出峰", "牛岛"], ["乐天", "君悦"], ["潜水艇体验", "海女表演", "游艇海钓"]]
  ]},
  "印度尼西亚 (Indonesia)": { tier: 1, cities: [
      ["巴厘岛", ["海神庙", "乌布皇宫"], ["安缦", "宝格丽"], ["阿勇河漂流", "海边日落骑马", "火山吉普车", "顶级SPA"]]
  ]},
  "马尔代夫 (Maldives)": { tier: 1, cities: [
      ["马累", ["居民岛"], ["白马庄园", "瑞吉"], ["水上飞机", "深海垂钓", "无人岛野餐", "海底餐厅"]]
  ]},
  "阿联酋 (UAE)": { tier: 2, cities: [
      ["迪拜", ["哈利法塔", "未来博物馆"], ["帆船酒店", "阿玛尼"], ["高空跳伞", "沙漠冲沙", "直升机观光", "热气球"]]
  ]},
  
  // === EUROPE ===
  "法国 (France)": { tier: 1, cities: [
      ["巴黎", ["卢浮宫", "埃菲尔铁塔", "凡尔赛宫"], ["丽兹", "瑰丽"], ["塞纳河晚宴游船", "红磨坊表演", "马卡龙制作课", "老佛爷VIP导购"]],
      ["尼斯", ["蔚蓝海岸", "摩纳哥亲王宫"], ["内格雷斯科"], ["法拉利驾驶体验", "私人游艇出海"]],
      ["普罗旺斯", ["薰衣草花田"], ["修道院酒店"], ["松露寻找体验", "红酒品鉴"]]
  ]},
  "意大利 (Italy)": { tier: 1, cities: [
      ["罗马", ["斗兽场", "梵蒂冈博物馆"], ["华尔道夫", "瑞吉"], ["角斗士学校体验", "复古Fiat500自驾"]],
      ["威尼斯", ["圣马可广场", "总督宫"], ["丹尼利", "安曼"], ["贡多拉包船(伴奏)", "面具制作工坊"]],
      ["佛罗伦萨", ["乌菲齐美术馆", "百花大教堂"], ["四季"], ["托斯卡纳酒庄游", "皮革制作"]]
  ]},
  "英国 (UK)": { tier: 1, cities: [
      ["伦敦", ["大英博物馆", "伦敦眼", "温莎城堡"], ["萨沃伊", "丽兹"], ["西区音乐剧VIP", "泰晤士河下午茶", "哈利波特片场VIP"]],
      ["爱丁堡", ["爱丁堡城堡"], ["巴尔莫勒尔"], ["苏格兰威士忌品鉴", "幽灵巴士之旅"]]
  ]},
  "瑞士 (Switzerland)": { tier: 1, cities: [
      ["因特拉肯", ["少女峰", "布里恩茨湖"], ["维多利亚少女峰"], ["滑翔伞飞行", "直升机登雪山", "黄金列车一等座"]],
      ["苏黎世", ["班霍夫大街"], ["多尔德大酒店"], ["巧克力工坊", "湖畔游艇"]]
  ]},

  // === AMERICAS ===
  "美国 (USA)": { tier: 1, cities: [
      ["纽约", ["自由女神", "大都会", "帝国大厦"], ["广场酒店", "瑞吉"], ["百老汇VIP席", "直升机曼哈顿环游"]],
      ["洛杉矶", ["环球影城", "星光大道"], ["比佛利威希尔"], ["好莱坞标志骑马", "华纳兄弟片场VIP"]],
      ["拉斯维加斯", ["大峡谷", "赌场大道"], ["百乐宫", "威尼斯人"], ["太阳马戏团O秀", "直升机夜游Strip", "超跑赛道体验"]]
  ]},
  
  // === OCEANIA ===
  "澳大利亚 (Australia)": { tier: 1, cities: [
      ["悉尼", ["歌剧院", "海港大桥"], ["柏悦", "香格里拉"], ["攀爬海港大桥", "歌剧院后台导览", "水上飞机"]],
      ["凯恩斯", ["大堡礁"], ["香格里拉"], ["大堡礁直升机", "深潜体验", "热气球"]],
      ["墨尔本", ["大洋路"], ["朗廷"], ["普芬比利蒸汽火车", "菲利普岛企鹅归巢VIP"]]
  ]},
  "新西兰 (New Zealand)": { tier: 1, cities: [
      ["皇后镇", ["瓦卡蒂普湖"], ["玛塔考瑞"], ["高空跳伞", "蹦极", "蒸汽船晚宴", "喷射快艇"]],
      ["奥克兰", ["天空塔"], ["柏悦"], ["霍比特人村导览", "萤火虫洞"]]
  ]}
};

export const generateSeedData = () => {
  const cars: CarCostEntry[] = [];
  const cities: PoiCity[] = [];
  const spots: PoiSpot[] = [];
  const hotels: PoiHotel[] = [];
  const activities: PoiActivity[] = [];

  Object.entries(GLOBAL_DATA).forEach(([country, data]) => {
      // 1. Car for Country (Updated for Service/Pax/Low/High)
      const basePrice = getRandomPrice(1500, 3500);
      cars.push({
          id: generateUUID(),
          region: country,
          carModel: '舒适7-9座专车',
          serviceType: '包车',
          passengers: 6,
          priceLow: basePrice,
          priceHigh: Math.floor(basePrice * 1.3)
      });
      // ADD Standard '适配车型'
      cars.push({
          id: generateUUID(),
          region: country,
          carModel: '适配车型',
          serviceType: '包车',
          passengers: 4,
          priceLow: 2000,
          priceHigh: 2000
      });

      // 2. Cities & POIs
      data.cities.forEach(([cityName, citySpots, cityHotels, cityActs]) => {
          const cityId = generateUUID();
          cities.push({ id: cityId, country, name: cityName });

          // Spots (Tickets - Lower Price)
          citySpots.forEach(spotName => {
              spots.push({ 
                  id: generateUUID(), cityId, name: spotName, price: getRandomPrice(50, 400) 
              });
          });

          // Hotels
          cityHotels.forEach(hotelName => {
              hotels.push({ id: generateUUID(), cityId, name: hotelName, roomType: '豪华大床房', price: getRandomPrice(1500, 5000) });
              hotels.push({ id: generateUUID(), cityId, name: hotelName, roomType: '行政套房', price: getRandomPrice(3000, 10000) });
          });

          // Activities (Paid Experiences - Higher Price)
          cityActs.forEach(actName => {
              activities.push({
                  id: generateUUID(),
                  cityId,
                  name: actName,
                  price: getRandomPrice(500, 3000) // Paid activities are expensive
              });
          });
      });
  });

  return { cars, cities, spots, hotels, activities };
};

export const generateSeedTrips = (
    poiData: { cars: CarCostEntry[], cities: PoiCity[], spots: PoiSpot[], hotels: PoiHotel[], activities: PoiActivity[] }
): SavedTrip[] => {
    const trips: SavedTrip[] = [];
    const { cars, cities, spots, hotels, activities } = poiData;

    // Helper to find data by city ID
    const getSpots = (cityId: string) => spots.filter(s => s.cityId === cityId);
    const getHotels = (cityId: string) => hotels.filter(h => h.cityId === cityId);
    const getActs = (cityId: string) => activities.filter(a => a.cityId === cityId);
    const getCitiesByCountry = (country: string) => cities.filter(c => c.country === country);

    // Create a generic trip generator
    const createTrip = (name: string, countryName: string, days: number, people: number): SavedTrip | null => {
        const countryCities = getCitiesByCountry(countryName);
        if (countryCities.length < 1) return null;

        const rows: DayRow[] = [];
        const startDate = new Date();
        
        let currentCity = countryCities[0]; // Start at first city
        
        for (let i = 0; i < days; i++) {
            // Logic to move between cities every 2-3 days
            if (i > 0 && i % 2 === 0 && (i / 2) < countryCities.length) {
                currentCity = countryCities[Math.floor(i / 2)];
            }
            const nextCity = (i < days - 1 && (i + 1) % 2 === 0 && ((i + 1) / 2) < countryCities.length) 
                             ? countryCities[Math.floor((i + 1) / 2)] 
                             : currentCity;

            const cityId = currentCity.id;
            const citySpots = getSpots(cityId);
            const cityHotels = getHotels(cityId);
            const cityActs = getActs(cityId);

            // Select random resources
            const selectedSpots = getRandomSubset(citySpots, getRandomPrice(1, 2));
            const selectedHotel = cityHotels.length > 0 ? getRandomItem(cityHotels) : null;
            const selectedActs = getRandomSubset(cityActs, i % 3 === 0 ? 1 : 0); // Occasional activity

            // Calculate costs
            const ticketCost = selectedSpots.reduce((sum, s) => sum + s.price, 0) * people;
            const activityCost = selectedActs.reduce((sum, a) => sum + a.price, 0) * people;
            const hotelPrice = selectedHotel ? selectedHotel.price : 0;
            const rooms = Math.ceil(people / 2);
            const hotelCost = hotelPrice * rooms;
            const transportCost = 1500; // Base daily car cost

            // Route String
            // Day 1: Origin (Home) -> City
            // Day X: City A -> City B
            let route = '';
            if (i === 0) {
                route = `国内-${currentCity.name}`;
            } else if (currentCity.id !== nextCity.id) {
                route = `${currentCity.name}-${nextCity.name}`;
            } else {
                route = `${currentCity.name}市内`;
            }

            rows.push({
                id: generateUUID(),
                dayIndex: i + 1,
                date: addDays(startDate.toISOString(), i),
                route: route,
                transport: ['包车'],
                hotelName: selectedHotel ? selectedHotel.name : '',
                ticketName: selectedSpots.map(s => s.name),
                activityName: selectedActs.map(a => a.name),
                description: `游览${currentCity.name}精华景点`,
                rooms: rooms,
                transportCost,
                hotelPrice,
                hotelCost,
                ticketCost,
                activityCost,
                otherCost: 0,
                customCosts: {}
            });
        }

        return {
            id: generateUUID(),
            name,
            timestamp: Date.now() - Math.floor(Math.random() * 1000000000), // Random past time
            settings: {
                plannerName: 'Admin',
                customerName: 'Guest',
                peopleCount: people,
                roomCount: Math.ceil(people / 2),
                currency: 'CNY',
                exchangeRate: 1,
                destinations: [countryName],
                startDate: startDate.toISOString().split('T')[0],
                marginPercent: 15,
                tipPerDay: 50
            },
            rows,
            customColumns: []
        };
    };

    // Generate specific seed trips
    const trip1 = createTrip("日本本州7日经典游", "日本 (Japan)", 7, 4);
    if (trip1) trips.push(trip1);

    const trip2 = createTrip("法国浪漫巴黎尼斯6日", "法国 (France)", 6, 2);
    if (trip2) trips.push(trip2);
    
    const trip3 = createTrip("中国经典5日游", "中国 (China)", 5, 2);
    if (trip3) trips.push(trip3);

    return trips;
};
