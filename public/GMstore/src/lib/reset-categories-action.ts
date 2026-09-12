"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const CATEGORIES: any[] = [
  {name:"إلكترونيات",nameEn:"Electronics",children:[
    {name:"هواتف ذكية",nameEn:"Smartphones",children:[
      {name:"هواتف مميزة",nameEn:"Feature Phones"},
      {name:"جرابات جوال",nameEn:"Phone Cases"},
      {name:"حمايات شاشة",nameEn:"Screen Protectors"},
      {name:"شواحن جوال",nameEn:"Phone Chargers"},
      {name:"باور بانك",nameEn:"Power Banks"},
      {name:"شواحن لاسلكية",nameEn:"Wireless Chargers"},
    ]},
    {name:"سماعات أذن",nameEn:"Earbuds"},
    {name:"سماعات رأس",nameEn:"Headphones"},
    {name:"مكبرات صوت",nameEn:"Speakers"},
    {name:"ساعات ذكية",nameEn:"Smart Watches"},
    {name:"أساور للياقة",nameEn:"Fitness Trackers"},
    {name:"أجهزة لوحية",nameEn:"Tablets",children:[
      {name:"إكسسوارات أجهزة لوحية",nameEn:"Tablet Accessories"},
    ]},
    {name:"لابتوب",nameEn:"Laptops",children:[
      {name:"لابتوب ألعاب",nameEn:"Gaming Laptops"},
    ]},
    {name:"أجهزة مكتبية",nameEn:"Desktop Computers"},
    {name:"شاشات عرض",nameEn:"Monitors"},
    {name:"لوحات مفاتيح",nameEn:"Computer Keyboards"},
    {name:"فئران كمبيوتر",nameEn:"Computer Mice"},
    {name:"باد ماوس",nameEn:"Mouse Pads"},
    {name:"كاميرات ويب",nameEn:"Webcams"},
    {name:"طابعات",nameEn:"Printers",children:[
      {name:"خراطيش حبر",nameEn:"Ink Cartridges"},
    ]},
    {name:"راوتر",nameEn:"Routers",children:[
      {name:"سويتشات شبكة",nameEn:"Network Switches"},
    ]},
    {name:"أقراص صلبة",nameEn:"Hard Drives",children:[
      {name:"SSD",nameEn:"SSDs"},
      {name:"فلاش USB",nameEn:"USB Flash Drives"},
      {name:"بطاقات ذاكرة",nameEn:"Memory Cards"},
    ]},
    {name:"بطاقات رسوميات",nameEn:"Graphics Cards"},
    {name:"لوحات أم",nameEn:"Motherboards"},
    {name:"معالجات",nameEn:"Processors"},
    {name:"ذاكرة RAM",nameEn:"RAM"},
    {name:"مراوح تبريد",nameEn:"Cooling Fans"},
    {name:"علب كمبيوتر",nameEn:"Computer Cases"},
    {name:"درون",nameEn:"Drones"},
    {name:"كاميرات",nameEn:"Cameras",children:[
      {name:"عدسات كاميرا",nameEn:"Camera Lenses"},
      {name:"حوامل ثلاثية",nameEn:"Tripods"},
    ]},
    {name:"كاميرات مراقبة",nameEn:"CCTV Cameras"},
    {name:"أجهزة منزل ذكي",nameEn:"Smart Home Devices"},
    {name:"بوكسات تلفزيون",nameEn:"TV Boxes"},
    {name:"بروجيكتور",nameEn:"Projectors"},
    {name:"تلفزيونات",nameEn:"Televisions",children:[
      {name:"مساند تلفزيون",nameEn:"TV Mounts"},
    ]},
    {name:"كابلات HDMI",nameEn:"HDMI Cables"},
    {name:"إضاءة ذكية",nameEn:"Smart Lighting"},
    {name:"نظارات واقع افتراضي",nameEn:"VR Headsets"},
    {name:"أجهزة GPS",nameEn:"GPS Devices"},
  ]},
  {name:"موضة",nameEn:"Fashion",children:[
    {name:"ملابس رجالية",nameEn:"Men's Clothing"},
    {name:"ملابس نسائية",nameEn:"Women's Clothing"},
    {name:"ملابس أطفال",nameEn:"Kids Clothing"},
    {name:"ملابس رضع",nameEn:"Baby Clothing"},
    {name:"هوديز",nameEn:"Hoodies"},
    {name:"جواكت",nameEn:"Jackets"},
    {name:"تيشيرتات",nameEn:"T-Shirts"},
    {name:"قمصان",nameEn:"Shirts"},
    {name:"جينز",nameEn:"Jeans"},
    {name:"بناطيل",nameEn:"Pants"},
    {name:"شورتات",nameEn:"Shorts"},
    {name:"فساتين",nameEn:"Dresses"},
    {name:"تنانير",nameEn:"Skirts"},
    {name:"عباءات",nameEn:"Abayas"},
    {name:"حجاب",nameEn:"Hijabs"},
    {name:"بدلات",nameEn:"Suits"},
    {name:"ملابس داخلية",nameEn:"Underwear"},
    {name:"جوارب",nameEn:"Socks"},
    {name:"ملابس نوم",nameEn:"Sleepwear"},
    {name:"ملابس رياضية",nameEn:"Sportswear"},
    {name:"ملابس سباحة",nameEn:"Swimwear"},
    {name:"أحذية",nameEn:"Shoes",children:[
      {name:"حذاء رياضي",nameEn:"Sneakers"},
      {name:"صنادل",nameEn:"Sandals"},
      {name:"بوت",nameEn:"Boots"},
      {name:"شباشب",nameEn:"Slippers"},
      {name:"كعب عالي",nameEn:"High Heels"},
    ]},
    {name:"حقائب يد",nameEn:"Handbags"},
    {name:"محافظ",nameEn:"Wallets"},
    {name:"حقائب ظهر",nameEn:"Backpacks"},
    {name:"شنط سفر",nameEn:"Luggage"},
    {name:"ساعات",nameEn:"Watches"},
    {name:"نظارات شمسية",nameEn:"Sunglasses"},
    {name:"قبعات",nameEn:"Hats"},
    {name:"أحزمة",nameEn:"Belts"},
    {name:"قفازات",nameEn:"Gloves"},
    {name:"أوشحة",nameEn:"Scarves"},
    {name:"مجوهرات",nameEn:"Jewelry",children:[
      {name:"خواتم",nameEn:"Rings"},
      {name:"قلادات",nameEn:"Necklaces"},
      {name:"أقراط",nameEn:"Earrings"},
      {name:"أساور",nameEn:"Bracelets"},
      {name:"خلاخيل",nameEn:"Anklets"},
    ]},
    {name:"إكسسوارات شعر",nameEn:"Hair Accessories"},
    {name:"أربطة عنق",nameEn:"Ties"},
    {name:"أزرار أكمام",nameEn:"Cufflinks"},
    {name:"مظلات",nameEn:"Umbrellas"},
    {name:"إكسسوارات موضة",nameEn:"Fashion Accessories"},
    {name:"فساتين زفاف",nameEn:"Wedding Dresses"},
    {name:"ملابس تقليدية",nameEn:"Traditional Clothing"},
  ]},
  {name:"المنزل والمطبخ",nameEn:"Home & Kitchen",children:[
    {name:"كنب",nameEn:"Sofas"},{name:"أسرة",nameEn:"Beds"},
    {name:"مراتب",nameEn:"Mattresses"},{name:"وسائد",nameEn:"Pillows"},
    {name:"أغطية",nameEn:"Blankets"},{name:"ستائر",nameEn:"Curtains"},
    {name:"سجاد",nameEn:"Carpets"},{name:"طاولات",nameEn:"Tables"},
    {name:"كراسي",nameEn:"Chairs"},{name:"خزائن",nameEn:"Cabinets"},
    {name:"دواليب",nameEn:"Wardrobes"},{name:"رفوف",nameEn:"Shelves"},
    {name:"مرايا",nameEn:"Mirrors"},{name:"إضاءة",nameEn:"Lighting"},
    {name:"ديكور حائط",nameEn:"Wall Decor"},{name:"ساعات حائط",nameEn:"Clocks"},
    {name:"أجهزة مطبخ",nameEn:"Kitchen Appliances",children:[
      {name:"ثلاجات",nameEn:"Refrigerators"},{name:"غسالات",nameEn:"Washing Machines"},
      {name:"ميكروويف",nameEn:"Microwaves"},{name:"أفران",nameEn:"Ovens"},
      {name:"ماكينات قهوة",nameEn:"Coffee Machines"},{name:"مقلايات هواء",nameEn:"Air Fryers"},
      {name:"خلاطات",nameEn:"Blenders"},{name:"عجانات",nameEn:"Mixers"},
      {name:"عصارات",nameEn:"Juicers"},
    ]},
    {name:"أواني طبخ",nameEn:"Cookware",children:[
      {name:"مقالي",nameEn:"Frying Pans"},{name:"قدور",nameEn:"Pots"},
      {name:"حلل ضغط",nameEn:"Pressure Cookers"},{name:"سكاكين",nameEn:"Knives"},
      {name:"ألواح تقطيع",nameEn:"Cutting Boards"},
    ]},
    {name:"أطباق",nameEn:"Plates"},{name:"سلطانيات",nameEn:"Bowls"},
    {name:"أكواب",nameEn:"Cups"},{name:"كاسات",nameEn:"Glasses"},
    {name:"قوارير ماء",nameEn:"Water Bottles"},{name:"علب غداء",nameEn:"Lunch Boxes"},
    {name:"حاويات تخزين",nameEn:"Storage Containers"},
    {name:"مستلزمات تنظيف",nameEn:"Cleaning Supplies",children:[
      {name:"مكانس كهربائية",nameEn:"Vacuum Cleaners"},{name:"مماسح",nameEn:"Mops"},
      {name:"مكانس يدوية",nameEn:"Brooms"},{name:"مستلزمات غسيل",nameEn:"Laundry Supplies"},
    ]},
    {name:"مستلزمات حمام",nameEn:"Bathroom Accessories"},{name:"مناشف",nameEn:"Towels"},
    {name:"أغطية سرير",nameEn:"Bed Sheets"},{name:"مكيفات هواء",nameEn:"Air Conditioners"},
    {name:"مراوح",nameEn:"Fans"},{name:"دفايات",nameEn:"Heaters"},
  ]},
  {name:"تجميل",nameEn:"Beauty",children:[
    {name:"مكياج",nameEn:"Makeup",children:[
      {name:"أحمر شفاه",nameEn:"Lipstick"},{name:"فاونديشن",nameEn:"Foundation"},
      {name:"ماسكرا",nameEn:"Mascara"},{name:"آيلاينر",nameEn:"Eyeliner"},
    ]},
    {name:"عناية بالبشرة",nameEn:"Skincare",children:[
      {name:"غسول وجه",nameEn:"Face Wash"},{name:"مرطبات",nameEn:"Moisturizers"},
      {name:"واقي شمس",nameEn:"Sunscreen"},{name:"ماسكات وجه",nameEn:"Face Masks"},
      {name:"سيروم",nameEn:"Serums"},{name:"تونر",nameEn:"Toners"},
    ]},
    {name:"عناية بالشعر",nameEn:"Hair Care",children:[
      {name:"شامبو",nameEn:"Shampoo"},{name:"بلسم",nameEn:"Conditioner"},
      {name:"زيت شعر",nameEn:"Hair Oil"},{name:"مجففات شعر",nameEn:"Hair Dryers"},
      {name:"مكواة شعر",nameEn:"Hair Straighteners"},{name:"مكواة تجعيد",nameEn:"Hair Curlers"},
    ]},
    {name:"عطور",nameEn:"Perfumes"},{name:"بودي سبراي",nameEn:"Body Spray"},
    {name:"مزيل عرق",nameEn:"Deodorants"},{name:"طلاء أظافر",nameEn:"Nail Polish"},
    {name:"عناية بالأظافر",nameEn:"Nail Care"},{name:"ماكينة حلاقة",nameEn:"Shaving"},
    {name:"عناية باللحية",nameEn:"Beard Care"},
    {name:"عناية بالفم",nameEn:"Oral Care",children:[
      {name:"فرش أسنان",nameEn:"Toothbrushes"},{name:"معجون أسنان",nameEn:"Toothpaste"},
      {name:"فرش أسنان كهربائية",nameEn:"Electric Toothbrushes"},
    ]},
  ]},
  {name:"صحة",nameEn:"Health",children:[
    {name:"فيتامينات",nameEn:"Vitamins"},{name:"مكملات غذائية",nameEn:"Supplements"},
    {name:"معدات طبية",nameEn:"Medical Equipment",children:[
      {name:"أجهزة ضغط",nameEn:"Blood Pressure Monitors"},{name:"ترمومترات",nameEn:"Thermometers"},
      {name:"حقائب إسعافات",nameEn:"First Aid Kits"},
    ]},
    {name:"كمامات وجه",nameEn:"Face Masks"},{name:"قفازات طبية",nameEn:"Gloves"},
    {name:"كراسي متحركة",nameEn:"Wheelchairs"},{name:"عكازات",nameEn:"Walking Canes"},
    {name:"سماعات أذن طبية",nameEn:"Hearing Aids"},{name:"أجهزة مساج",nameEn:"Massagers"},
    {name:"دعامات ظهر",nameEn:"Back Support"},{name:"دعامات ركبة",nameEn:"Knee Support"},
    {name:"عناية بالعيون",nameEn:"Eye Care",children:[
      {name:"عدسات لاصقة",nameEn:"Contact Lenses"},
    ]},
    {name:"مسكنات ألم",nameEn:"Pain Relief"},{name:"كمادات ماء ساخن",nameEn:"Hot Water Bags"},
    {name:"مرطبات جو",nameEn:"Humidifiers"},{name:"منقيات هواء",nameEn:"Air Purifiers"},
  ]},
  {name:"رياضة",nameEn:"Sports",children:[
    {name:"كرة قدم",nameEn:"Football"},{name:"كرة سلة",nameEn:"Basketball"},
    {name:"كرة طائرة",nameEn:"Volleyball"},{name:"تنس",nameEn:"Tennis"},
    {name:"ريشة طائرة",nameEn:"Badminton"},{name:"سباحة",nameEn:"Swimming"},
    {name:"دراجات",nameEn:"Cycling"},{name:"جري",nameEn:"Running"},
    {name:"تخييم",nameEn:"Camping"},{name:"تنزه",nameEn:"Hiking"},
    {name:"صيد",nameEn:"Fishing"},
    {name:"معدات جيم",nameEn:"Gym Equipment",children:[
      {name:"دمبلز",nameEn:"Dumbbells"},{name:"سجادة يوجا",nameEn:"Yoga Mats"},
      {name:"أحزمة مقاومة",nameEn:"Resistance Bands"},
    ]},
    {name:"ملاكمة",nameEn:"Boxing"},{name:"فنون قتالية",nameEn:"Martial Arts"},
    {name:"سكيت بورد",nameEn:"Skateboards"},{name:"سكوتر",nameEn:"Scooters"},
    {name:"زلاجات",nameEn:"Roller Skates"},
  ]},
  {name:"سيارات",nameEn:"Automotive",children:[
    {name:"إكسسوارات سيارة",nameEn:"Car Accessories"},{name:"إطارات",nameEn:"Tires"},
    {name:"بطاريات سيارة",nameEn:"Car Batteries"},{name:"زيت محرك",nameEn:"Engine Oil"},
    {name:"إلكترونيات السيارة",nameEn:"Car Electronics",children:[
      {name:"ملاحة GPS",nameEn:"GPS Navigation"},{name:"كاميرات داش",nameEn:"Dash Cameras"},
    ]},
    {name:"أغطية مقاعد",nameEn:"Seat Covers"},{name:"فرش سيارة",nameEn:"Car Mats"},
    {name:"منظفات سيارة",nameEn:"Car Cleaning"},{name:"دراجات نارية",nameEn:"Motorcycles"},
    {name:"خوذ دراجات",nameEn:"Motorcycle Helmets"},{name:"إكسسوارات دراجات",nameEn:"Bicycle Accessories"},
    {name:"أدوات سيارة",nameEn:"Car Tools",children:[
      {name:"ضواغط هواء",nameEn:"Air Compressors"},{name:"أجهزة تشغيل",nameEn:"Jump Starters"},
      {name:"مساحات زجاج",nameEn:"Wiper Blades"},
    ]},
    {name:"إضاءة سيارة",nameEn:"Car Lights"},{name:"حوامل سقف",nameEn:"Roof Racks"},
    {name:"منظمات سيارة",nameEn:"Car Organizers"},
  ]},
  {name:"ألعاب وأطفال",nameEn:"Toys & Baby",children:[
    {name:"ألعاب",nameEn:"Toys",children:[
      {name:"ألعاب تعليمية",nameEn:"Educational Toys"},{name:"دمى",nameEn:"Dolls"},
      {name:"مكعبات بناء",nameEn:"Building Blocks"},{name:"ألعاب تحكم",nameEn:"RC Toys"},
      {name:"ألغاز",nameEn:"Puzzles"},
    ]},
    {name:"عربيات أطفال",nameEn:"Baby Strollers"},{name:"كراسي سيارة",nameEn:"Baby Car Seats"},
    {name:"رضاعة",nameEn:"Baby Feeding",children:[
      {name:"رضاعات",nameEn:"Baby Bottles"},{name:"حفاضات",nameEn:"Baby Diapers"},
      {name:"مناديل مبللة",nameEn:"Baby Wipes"},
    ]},
    {name:"سلامة الطفل",nameEn:"Baby Safety"},{name:"مراقبة الطفل",nameEn:"Baby Monitors"},
    {name:"أثاث أطفال",nameEn:"Baby Furniture"},{name:"مشايات أطفال",nameEn:"Baby Walkers"},
    {name:"حمالات أطفال",nameEn:"Baby Carriers"},{name:"استحمام الطفل",nameEn:"Baby Bath"},
    {name:"عناية بشرة الطفل",nameEn:"Baby Skincare"},{name:"فراش أطفال",nameEn:"Baby Bedding"},
  ]},
  {name:"كتب وأدوات مكتبية",nameEn:"Books & Office",children:[
    {name:"كتب",nameEn:"Books",children:[
      {name:"كتب إلكترونية",nameEn:"E-books"},
    ]},
    {name:"دفاتر",nameEn:"Notebooks"},{name:"أقلام حبر",nameEn:"Pens"},
    {name:"أقلام رصاص",nameEn:"Pencils"},{name:"ماركر",nameEn:"Markers"},
    {name:"كراسي مكتب",nameEn:"Office Chairs"},{name:"مكاتب",nameEn:"Office Desks"},
    {name:"ورق",nameEn:"Paper"},{name:"طابعات",nameEn:"Printers"},
    {name:"مستلزمات مكتبية",nameEn:"Office Supplies"},{name:"آلات حاسبة",nameEn:"Calculators"},
    {name:"سبورات بيضاء",nameEn:"Whiteboards"},{name:"ملفات ومجلدات",nameEn:"Files & Folders"},
    {name:"ملاحظات لاصقة",nameEn:"Sticky Notes"},{name:"دباسات",nameEn:"Staplers"},
    {name:"شنط مدرسية",nameEn:"School Bags"},
    {name:"مستلزمات فنية",nameEn:"Art Supplies",children:[
      {name:"فرش رسم",nameEn:"Paint Brushes"},
    ]},
    {name:"مستلزمات حرفية",nameEn:"Craft Supplies"},
  ]},
  {name:"مستلزمات حيوانات",nameEn:"Pet Supplies",children:[
    {name:"طعام كلاب",nameEn:"Dog Food"},{name:"طعام قطط",nameEn:"Cat Food"},
    {name:"طعام طيور",nameEn:"Bird Food"},{name:"طعام أسماك",nameEn:"Fish Food"},
    {name:"ألعاب حيوانات",nameEn:"Pet Toys"},{name:"أسرة حيوانات",nameEn:"Pet Beds"},
    {name:"عناية بالحيوانات",nameEn:"Pet Grooming"},{name:"حاملات حيوانات",nameEn:"Pet Carriers"},
    {name:"رمل قطط",nameEn:"Cat Litter"},{name:"أحواض أسماك",nameEn:"Aquariums"},
  ]},
  {name:"طعام وبقالة",nameEn:"Food & Grocery",children:[
    {name:"أرز",nameEn:"Rice"},{name:"مكرونة",nameEn:"Pasta"},
    {name:"زيت طبخ",nameEn:"Cooking Oil"},{name:"دقيق",nameEn:"Flour"},
    {name:"سكر",nameEn:"Sugar"},{name:"ملح",nameEn:"Salt"},
    {name:"شاي",nameEn:"Tea"},{name:"قهوة",nameEn:"Coffee"},
    {name:"بهارات",nameEn:"Spices"},
    {name:"وجبات خفيفة",nameEn:"Snacks",children:[
      {name:"شوكولاتة",nameEn:"Chocolate"},{name:"بسكويت",nameEn:"Biscuits"},
    ]},
    {name:"معلبات",nameEn:"Canned Food"},{name:"أغذية مجمدة",nameEn:"Frozen Food"},
    {name:"منتجات ألبان",nameEn:"Dairy Products",children:[
      {name:"جبن",nameEn:"Cheese"},{name:"زبدة",nameEn:"Butter"},
    ]},
    {name:"بيض",nameEn:"Eggs"},{name:"عسل",nameEn:"Honey"},{name:"مربى",nameEn:"Jam"},
  ]},
  {name:"أثاث",nameEn:"Furniture",children:[
    {name:"أثاث غرفة المعيشة",nameEn:"Living Room Furniture"},
    {name:"أثاث غرفة النوم",nameEn:"Bedroom Furniture"},
    {name:"أثاث غرفة الطعام",nameEn:"Dining Room Furniture"},
    {name:"أثاث مكتبي",nameEn:"Office Furniture"},{name:"أثاث خارجي",nameEn:"Outdoor Furniture"},
    {name:"طاولات تلفزيون",nameEn:"TV Stands"},{name:"رفوف كتب",nameEn:"Bookshelves"},
    {name:"رفوف أحذية",nameEn:"Shoe Racks"},{name:"طاولات زينة",nameEn:"Vanity Tables"},
    {name:"طاولات تسريحة",nameEn:"Dressing Tables"},
  ]},
  {name:"حديقة",nameEn:"Garden",children:[
    {name:"نباتات",nameEn:"Plants"},{name:"بذور",nameEn:"Seeds"},
    {name:"أصص زرع",nameEn:"Flower Pots"},{name:"أدوات حديقة",nameEn:"Garden Tools"},
    {name:"جزازات عشب",nameEn:"Lawn Mowers"},{name:"خراطيم مياه",nameEn:"Water Hoses"},
    {name:"إضاءة خارجية",nameEn:"Outdoor Lighting"},{name:"شوايات",nameEn:"BBQ Grills"},
    {name:"أثاث حديقة",nameEn:"Garden Furniture"},{name:"أسمدة",nameEn:"Fertilizers"},
  ]},
  {name:"صناعي",nameEn:"Industrial",children:[
    {name:"أدوات كهربائية",nameEn:"Power Tools"},{name:"أدوات يدوية",nameEn:"Hand Tools"},
    {name:"معدات سلامة",nameEn:"Safety Equipment"},{name:"معدات لحام",nameEn:"Welding Equipment"},
    {name:"مولدات",nameEn:"Generators"},{name:"ضواغط هواء",nameEn:"Air Compressors"},
    {name:"مضخات",nameEn:"Pumps"},{name:"أدوات قياس",nameEn:"Measuring Tools"},
    {name:"مواد بناء",nameEn:"Construction Materials"},{name:"مستلزمات كهربائية",nameEn:"Electrical Supplies"},
  ]},
  {name:"ألعاب إلكترونية",nameEn:"Gaming",children:[
    {name:"أجهزة ألعاب",nameEn:"Gaming Consoles"},{name:"ألعاب بلايستيشن",nameEn:"PlayStation Games"},
    {name:"ألعاب إكس بوكس",nameEn:"Xbox Games"},{name:"ألعاب نينتندو",nameEn:"Nintendo Games"},
    {name:"ألعاب كمبيوتر",nameEn:"PC Games"},{name:"كراسي ألعاب",nameEn:"Gaming Chairs"},
    {name:"كيبورد ألعاب",nameEn:"Gaming Keyboards"},{name:"ماوس ألعاب",nameEn:"Gaming Mice"},
    {name:"شاشات ألعاب",nameEn:"Gaming Monitors"},{name:"إكسسوارات ألعاب",nameEn:"Gaming Accessories"},
  ]},
  {name:"منتجات رقمية",nameEn:"Digital Products",children:[
    {name:"برامج",nameEn:"Software",children:[
      {name:"أنتي فيروس",nameEn:"Antivirus"},{name:"أنظمة تشغيل",nameEn:"Operating Systems"},
    ]},
    {name:"دورات أونلاين",nameEn:"Online Courses"},{name:"كتب إلكترونية",nameEn:"E-books"},
    {name:"بطاقات هدايا",nameEn:"Gift Cards"},{name:"موسيقى رقمية",nameEn:"Digital Music"},
    {name:"قوالب فيديو",nameEn:"Video Templates"},{name:"ثيمات مواقع",nameEn:"Website Themes"},
    {name:"إضافات",nameEn:"Plugins"},
  ]},
  {name:"متنوعات",nameEn:"Miscellaneous",children:[
    {name:"هدايا",nameEn:"Gifts"},{name:"مستلزمات حفلات",nameEn:"Party Supplies"},
    {name:"ديكورات موسمية",nameEn:"Seasonal Decorations",children:[
      {name:"ديكورات كريسماس",nameEn:"Christmas Decorations"},{name:"ديكورات هالووين",nameEn:"Halloween Decorations"},
    ]},
    {name:"مستلزمات زفاف",nameEn:"Wedding Supplies"},{name:"مواد دينية",nameEn:"Religious Items"},
    {name:"تحف",nameEn:"Collectibles"},{name:"آلات موسيقية",nameEn:"Musical Instruments"},
    {name:"إكسسوارات موسيقية",nameEn:"Musical Accessories"},{name:"مستلزمات سفر",nameEn:"Travel Accessories"},
    {name:"مستلزمات خياطة",nameEn:"Sewing Supplies"},{name:"أقمشة",nameEn:"Fabrics"},
    {name:"مواد نسيج",nameEn:"Textile Materials"},{name:"منتجات جلدية",nameEn:"Leather Goods"},
    {name:"مستلزمات حرفية",nameEn:"Craft Kits"},{name:"مستلزمات تدخين",nameEn:"Smoking Accessories"},
    {name:"أدوات إصلاح جوال",nameEn:"Phone Repair Tools"},{name:"أدوات إصلاح كمبيوتر",nameEn:"Computer Repair Tools"},
    {name:"معدات مختبر",nameEn:"Lab Equipment"},{name:"مستلزمات تعليمية",nameEn:"Educational Supplies"},
    {name:"مستلزمات مطاعم",nameEn:"Restaurant Supplies"},{name:"مستلزمات فنادق",nameEn:"Hotel Supplies"},
    {name:"معدات صالونات",nameEn:"Beauty Salon Equipment"},{name:"معدات حلاقة",nameEn:"Barbershop Equipment"},
    {name:"مستلزمات تغليف",nameEn:"Packaging Supplies"},{name:"منتجات جملة",nameEn:"Wholesale Products"},
    {name:"تخفيضات",nameEn:"Clearance Items"},{name:"وصل حديثاً",nameEn:"New Arrivals"},
    {name:"الأكثر مبيعاً",nameEn:"Best Sellers"},
  ]},
];

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

async function createTree(items: any[], parentId: string | null = null) {
  for (const item of items) {
    const slug = slugify(item.nameEn);
    const cat = await prisma.category.create({
      data: {
        name: item.name,
        nameEn: item.nameEn,
        slug,
        parentId,
        image: `https://placehold.co/400x300/EEE/999?text=${encodeURIComponent(item.nameEn)}`,
      },
    });
    if (item.children) {
      await createTree(item.children, cat.id);
    }
  }
}

export async function resetCategories() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    throw new Error("غير مصرح");
  }
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await createTree(CATEGORIES);
  revalidatePath("/admin/categories");
  revalidatePath("/");
}
