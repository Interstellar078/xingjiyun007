import sys
import os
import uuid
import random
import json
from datetime import datetime, timedelta

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.app.db import SessionLocal
from src.app.models import AppData

# --- HELPER FUNCTIONS ---
def generate_uuid():
    return str(uuid.uuid4())

def get_random_price(min_p, max_p):
    return random.randint(min_p, max_p)

# --- GLOBAL DATA (Simplified clone of seedData.ts) ---
GLOBAL_DATA = {
    "中国 (China)": {
        "cities": [
            ["北京", ["故宫博物院", "长城", "天坛", "颐和园"], ["王府半岛", "瑰丽"], ["京剧体验", "烤鸭品鉴晚宴"]],
            ["上海", ["东方明珠", "上海迪士尼", "豫园"], ["和平饭店", "宝格丽"], ["黄浦江游船", "沉浸式戏剧"]],
            ["西安", ["兵马俑", "大雁塔", "城墙"], ["索菲特传奇", "威斯汀"], ["长恨歌演出", "饺子宴制作"]],
            ["成都", ["熊猫基地", "都江堰"], ["博舍", "丽思卡尔顿"], ["川剧变脸VIP席", "火锅烹饪课"]],
            ["三亚", ["蜈支洲岛", "南山寺"], ["亚特兰蒂斯", "艾迪逊"], ["直升机观光", "豪华游艇出海", "尾波冲浪"]],
             ["丽江", ["玉龙雪山", "丽江古城"], ["安缦大研", "金茂"], ["印象丽江演出", "雪山下午茶"]]
        ]
    },
    "日本 (Japan)": {
         "cities": [
            ["东京", ["浅草寺", "东京塔", "TeamLab", "迪士尼"], ["安缦东京", "虹夕诺雅"], ["直升机夜游东京", "米其林怀石料理", "相扑观看"]],
            ["京都", ["清水寺", "金阁寺", "伏见稻荷"], ["丽思卡尔顿", "柏悦"], ["艺伎晚宴", "和服跟拍", "茶道体验"]],
            ["大阪", ["环球影城(USJ)", "大阪城"], ["瑞吉", "康莱德"], ["道顿堀游船", "神户牛铁板烧"]],
            ["北海道", ["旭山动物园", "白色恋人"], ["坐忘林", "星野"], ["破冰船体验", "滑雪私教", "雪地摩托"]]
        ]
    },
    "法国 (France)": {
        "cities": [
             ["巴黎", ["卢浮宫", "埃菲尔铁塔", "凡尔赛宫"], ["丽兹", "瑰丽"], ["塞纳河晚宴游船", "红磨坊表演", "马卡龙制作课", "老佛爷VIP导购"]],
            ["尼斯", ["蔚蓝海岸", "摩纳哥亲王宫"], ["内格雷斯科"], ["法拉利驾驶体验", "私人游艇出海"]]
        ]
    },
     "美国 (USA)": {
        "cities": [
            ["纽约", ["自由女神", "大都会", "帝国大厦"], ["广场酒店", "瑞吉"], ["百老汇VIP席", "直升机曼哈顿环游"]],
            ["洛杉矶", ["环球影城", "星光大道"], ["比佛利威希尔"], ["好莱坞标志骑马", "华纳兄弟片场VIP"]],
             ["拉斯维加斯", ["大峡谷", "赌场大道"], ["百乐宫", "威尼斯人"], ["太阳马戏团O秀", "直升机夜游Strip", "超跑赛道体验"]]
        ]
    }
}

def generate_seed_data():
    cars = []
    cities_list = []
    spots = []
    hotels = []
    activities = []
    
    for country, data in GLOBAL_DATA.items():
        # 1. Car for Country
        base_price = get_random_price(1500, 3500)
        cars.append({
            "id": generate_uuid(),
            "region": country,
            "carModel": '舒适7-9座专车',
            "serviceType": '包车',
            "passengers": 6,
            "priceLow": base_price,
            "priceHigh": int(base_price * 1.3)
        })
        cars.append({
            "id": generate_uuid(),
            "region": country,
            "carModel": '适配车型',
            "serviceType": '包车',
            "passengers": 4,
            "priceLow": 2000,
            "priceHigh": 2000
        })

        # 2. Cities & POIs
        for city_data in data["cities"]:
            city_name, city_spots, city_hotels, city_acts = city_data
            city_id = generate_uuid()
            cities_list.append({"id": city_id, "country": country, "name": city_name})
            
            for s_name in city_spots:
                spots.append({
                    "id": generate_uuid(), "cityId": city_id, "name": s_name, 
                    "price": get_random_price(50, 400)
                })
            
            for h_name in city_hotels:
                hotels.append({
                    "id": generate_uuid(), "cityId": city_id, "name": h_name, "roomType": '豪华大床房', 
                    "price": get_random_price(1500, 5000)
                })
                
            for a_name in city_acts:
                activities.append({
                    "id": generate_uuid(), "cityId": city_id, "name": a_name, 
                    "price": get_random_price(500, 3000)
                })

    return {
        "cars": cars,
        "cities": cities_list,
        "spots": spots,
        "hotels": hotels,
        "activities": activities
    }

def main():
    print("Connecting to database...")
    db = SessionLocal()
    
    try:
        print("Generating seed data...")
        seed = generate_seed_data()
        
        # Keys to map (Must match frontend/src/services/storageService.ts)
        mapping = {
            "travel_builder_db_cars": seed["cars"],
            "travel_builder_db_poi_cities": seed["cities"],
            "travel_builder_db_poi_spots": seed["spots"],
            "travel_builder_db_poi_hotels_v2": seed["hotels"],
            "travel_builder_db_poi_activities": seed["activities"],
            "travel_builder_db_country_files": [], # Initialize empty to avoid 404s
            "travel_builder_settings_global": {
                "day": 48, "date": 110, "route": 180, "transport": 140, "hotel": 140,
                "ticket": 140, "activity": 140, "description": 250, "rooms": 50,
                "transportCost": 90, "hotelPrice": 90, "hotelCost": 90,
                "ticketCost": 90, "activityCost": 90, "otherCost": 90
            }
        }
        
        for key, value in mapping.items():
            # Check if exists (using generic 'system' owner for shared public data)
            existing = db.query(AppData).filter(
                AppData.owner_id == "system",
                AppData.key == key
            ).first()
            
            if existing:
                print(f"Update key: {key} ...")
                # Merge logic? For script, maybe just overwrite or append
                # Let's simple overwrite for 'init' script
                existing.value = value
                existing.is_public = True
            else:
                print(f"Insert key: {key} ...")
                new_item = AppData(
                    owner_id="system",
                    key=key,
                    value=value,
                    is_public=True
                )
                db.add(new_item)
        
        # Note: We are NOT generating trips here to keep it simple, 
        # or we could port generateSeedTrips if strictly needed.
        # User said "Initialize Demo Data in business logic is not needed", 
        # implying resources mainly.
        
        db.commit()
        print("Done! Demo data initialized.")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
