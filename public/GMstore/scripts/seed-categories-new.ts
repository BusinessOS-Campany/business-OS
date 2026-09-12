import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  // ── MAIN CATEGORIES (22) ──
  { name: "إلكترونيات", nameEn: "Electronics", slug: "electronics", parent: null },
  { name: "أزياء", nameEn: "Fashion", slug: "fashion", parent: null },
  { name: "الجمال والعناية الشخصية", nameEn: "Beauty & Personal Care", slug: "beauty-personal-care", parent: null },
  { name: "المنزل والمطبخ", nameEn: "Home & Kitchen", slug: "home-kitchen", parent: null },
  { name: "بقالة", nameEn: "Grocery", slug: "grocery", parent: null },
  { name: "الصحة", nameEn: "Health", slug: "health", parent: null },
  { name: "الرياضة والأنشطة الخارجية", nameEn: "Sports & Outdoors", slug: "sports-outdoors", parent: null },
  { name: "السيارات", nameEn: "Automotive", slug: "automotive", parent: null },
  { name: "الطفل", nameEn: "Baby", slug: "baby", parent: null },
  { name: "الألعاب والترفيه", nameEn: "Toys & Games", slug: "toys-games", parent: null },
  { name: "الكتب", nameEn: "Books", slug: "books", parent: null },
  { name: "اللوازم المكتبية", nameEn: "Office Supplies", slug: "office-supplies", parent: null },
  { name: "مستلزمات الحيوانات الأليفة", nameEn: "Pet Supplies", slug: "pet-supplies", parent: null },
  { name: "الصناعة والعلوم", nameEn: "Industrial & Scientific", slug: "industrial-scientific", parent: null },
  { name: "الفنون والحرف اليدوية", nameEn: "Arts & Crafts", slug: "arts-crafts", parent: null },
  { name: "الآلات الموسيقية", nameEn: "Musical Instruments", slug: "musical-instruments", parent: null },
  { name: "الحديقة والهواء الطلق", nameEn: "Garden & Outdoor", slug: "garden-outdoor", parent: null },
  { name: "مجوهرات", nameEn: "Jewelry", slug: "jewelry", parent: null },
  { name: "ساعات", nameEn: "Watches", slug: "watches", parent: null },
  { name: "المنتجات الرقمية", nameEn: "Digital Products", slug: "digital-products", parent: null },
  { name: "خدمات", nameEn: "Services", slug: "services", parent: null },
  { name: "للبالغين", nameEn: "Adult", slug: "adult", parent: null },

  // ── ELECTRONICS (24) ──
  { name: "هواتف ذكية", nameEn: "Smartphones", slug: "smartphones", parent: "electronics" },
  { name: "أجهزة لوحية", nameEn: "Tablets", slug: "tablets", parent: "electronics" },
  { name: "حواسيب محمولة", nameEn: "Laptops", slug: "laptops", parent: "electronics" },
  { name: "حواسيب مكتبية", nameEn: "Desktop Computers", slug: "desktop-computers", parent: "electronics" },
  { name: "شاشات", nameEn: "Monitors", slug: "monitors", parent: "electronics" },
  { name: "مكونات كمبيوتر", nameEn: "Computer Components", slug: "computer-components", parent: "electronics" },
  { name: "ألعاب الكمبيوتر", nameEn: "PC Gaming", slug: "pc-gaming", parent: "electronics" },
  { name: "ملحقات كمبيوتر", nameEn: "Computer Accessories", slug: "computer-accessories", parent: "electronics" },
  { name: "شبكات", nameEn: "Networking", slug: "networking", parent: "electronics" },
  { name: "طابعات وماسحات ضوئية", nameEn: "Printers & Scanners", slug: "printers-scanners", parent: "electronics" },
  { name: "أجهزة تخزين", nameEn: "Storage Devices", slug: "storage-devices", parent: "electronics" },
  { name: "برمجيات", nameEn: "Software", slug: "software", parent: "electronics" },
  { name: "كاميرات", nameEn: "Cameras", slug: "cameras", parent: "electronics" },
  { name: "ملحقات الكاميرا", nameEn: "Camera Accessories", slug: "camera-accessories", parent: "electronics" },
  { name: "طائرات درون", nameEn: "Drones", slug: "drones", parent: "electronics" },
  { name: "صوتيات", nameEn: "Audio", slug: "audio", parent: "electronics" },
  { name: "سماعات رأس", nameEn: "Headphones", slug: "headphones", parent: "electronics" },
  { name: "سماعات", nameEn: "Speakers", slug: "speakers", parent: "electronics" },
  { name: "المنزل الذكي", nameEn: "Smart Home", slug: "smart-home", parent: "electronics" },
  { name: "التكنولوجيا القابلة للارتداء", nameEn: "Wearable Technology", slug: "wearable-technology", parent: "electronics" },
  { name: "الواقع الافتراضي والواقع المعزز", nameEn: "VR & AR", slug: "vr-ar", parent: "electronics" },
  { name: "أجهزة عرض", nameEn: "Projectors", slug: "projectors", parent: "electronics" },
  { name: "تلفزيون ومسرح منزلي", nameEn: "TV & Home Theater", slug: "tv-home-theater", parent: "electronics" },
  { name: "هواتف", nameEn: "Telephones", slug: "telephones", parent: "electronics" },

  // ── FASHION (15) ──
  { name: "ملابس رجالية", nameEn: "Men's Clothing", slug: "mens-clothing", parent: "fashion" },
  { name: "ملابس نسائية", nameEn: "Women's Clothing", slug: "womens-clothing", parent: "fashion" },
  { name: "ملابس أطفال", nameEn: "Kids Clothing", slug: "kids-clothing", parent: "fashion" },
  { name: "ملابس رضع", nameEn: "Baby Clothing", slug: "baby-clothing", parent: "fashion" },
  { name: "أحذية", nameEn: "Shoes", slug: "shoes", parent: "fashion" },
  { name: "حقائب", nameEn: "Bags", slug: "bags", parent: "fashion" },
  { name: "ساعات أزياء", nameEn: "Watches", slug: "watches-fashion", parent: "fashion" },
  { name: "مجوهرات أزياء", nameEn: "Jewelry", slug: "jewelry-fashion", parent: "fashion" },
  { name: "نظارات شمسية", nameEn: "Sunglasses", slug: "sunglasses", parent: "fashion" },
  { name: "قبعات وطواقي", nameEn: "Hats & Caps", slug: "hats-caps", parent: "fashion" },
  { name: "أحزمة", nameEn: "Belts", slug: "belts", parent: "fashion" },
  { name: "محافظ", nameEn: "Wallets", slug: "wallets", parent: "fashion" },
  { name: "أوشحة", nameEn: "Scarves", slug: "scarves", parent: "fashion" },
  { name: "إكسسوارات أزياء", nameEn: "Fashion Accessories", slug: "fashion-accessories", parent: "fashion" },
  { name: "ملابس تقليدية", nameEn: "Traditional Clothing", slug: "traditional-clothing", parent: "fashion" },

  // ── BEAUTY & PERSONAL CARE (10) ──
  { name: "مكياج", nameEn: "Makeup", slug: "makeup", parent: "beauty-personal-care" },
  { name: "العناية بالبشرة", nameEn: "Skincare", slug: "skincare", parent: "beauty-personal-care" },
  { name: "العناية بالشعر", nameEn: "Hair Care", slug: "hair-care", parent: "beauty-personal-care" },
  { name: "عطور", nameEn: "Fragrances", slug: "fragrances", parent: "beauty-personal-care" },
  { name: "الاستحمام والعناية بالجسم", nameEn: "Bath & Body", slug: "bath-body", parent: "beauty-personal-care" },
  { name: "العناية بالفم", nameEn: "Oral Care", slug: "oral-care", parent: "beauty-personal-care" },
  { name: "العناية بالرجال", nameEn: "Men's Grooming", slug: "mens-grooming", parent: "beauty-personal-care" },
  { name: "حلاقة", nameEn: "Shaving", slug: "shaving", parent: "beauty-personal-care" },
  { name: "أدوات تجميل", nameEn: "Beauty Tools", slug: "beauty-tools", parent: "beauty-personal-care" },
  { name: "العناية بالأظافر", nameEn: "Nail Care", slug: "nail-care", parent: "beauty-personal-care" },

  // ── HOME & KITCHEN (13) ──
  { name: "أثاث", nameEn: "Furniture", slug: "furniture", parent: "home-kitchen" },
  { name: "ديكور المنزل", nameEn: "Home Decor", slug: "home-decor", parent: "home-kitchen" },
  { name: "إضاءة", nameEn: "Lighting", slug: "lighting", parent: "home-kitchen" },
  { name: "أجهزة مطبخ", nameEn: "Kitchen Appliances", slug: "kitchen-appliances", parent: "home-kitchen" },
  { name: "أواني الطبخ", nameEn: "Cookware", slug: "cookware", parent: "home-kitchen" },
  { name: "أواني الخبز", nameEn: "Bakeware", slug: "bakeware", parent: "home-kitchen" },
  { name: "أطقم الطعام", nameEn: "Dinnerware", slug: "dinnerware", parent: "home-kitchen" },
  { name: "تخزين وتنظيم", nameEn: "Storage & Organization", slug: "storage-organization", parent: "home-kitchen" },
  { name: "مفروشات", nameEn: "Bedding", slug: "bedding", parent: "home-kitchen" },
  { name: "الحمام", nameEn: "Bathroom", slug: "bathroom", parent: "home-kitchen" },
  { name: "مستلزمات التنظيف", nameEn: "Cleaning Supplies", slug: "cleaning-supplies", parent: "home-kitchen" },
  { name: "الغسيل", nameEn: "Laundry", slug: "laundry", parent: "home-kitchen" },
  { name: "تحسين المنزل", nameEn: "Home Improvement", slug: "home-improvement", parent: "home-kitchen" },

  // ── GROCERY (13) ──
  { name: "وجبات خفيفة", nameEn: "Snacks", slug: "snacks", parent: "grocery" },
  { name: "مشروبات", nameEn: "Beverages", slug: "beverages", parent: "grocery" },
  { name: "قهوة وشاي", nameEn: "Coffee & Tea", slug: "coffee-tea", parent: "grocery" },
  { name: "أرز وحبوب", nameEn: "Rice & Grains", slug: "rice-grains", parent: "grocery" },
  { name: "باستا", nameEn: "Pasta", slug: "pasta", parent: "grocery" },
  { name: "أغذية معلبة", nameEn: "Canned Food", slug: "canned-food", parent: "grocery" },
  { name: "إفطار", nameEn: "Breakfast", slug: "breakfast", parent: "grocery" },
  { name: "مستلزمات الخبز", nameEn: "Baking Supplies", slug: "baking-supplies", parent: "grocery" },
  { name: "بهارات", nameEn: "Spices", slug: "spices", parent: "grocery" },
  { name: "زيوت", nameEn: "Oils", slug: "oils", parent: "grocery" },
  { name: "ألبان", nameEn: "Dairy", slug: "dairy", parent: "grocery" },
  { name: "أغذية مجمدة", nameEn: "Frozen Foods", slug: "frozen-foods", parent: "grocery" },
  { name: "طعام عضوي", nameEn: "Organic Food", slug: "organic-food", parent: "grocery" },

  // ── HEALTH (7) ──
  { name: "فيتامينات", nameEn: "Vitamins", slug: "vitamins", parent: "health" },
  { name: "مكملات غذائية", nameEn: "Supplements", slug: "supplements", parent: "health" },
  { name: "مستلزمات طبية", nameEn: "Medical Supplies", slug: "medical-supplies", parent: "health" },
  { name: "إسعافات أولية", nameEn: "First Aid", slug: "first-aid", parent: "health" },
  { name: "تغذية اللياقة البدنية", nameEn: "Fitness Nutrition", slug: "fitness-nutrition", parent: "health" },
  { name: "وسائل المساعدة على الحركة", nameEn: "Mobility Aids", slug: "mobility-aids", parent: "health" },
  { name: "أجهزة العناية الشخصية", nameEn: "Personal Care Devices", slug: "personal-care-devices", parent: "health" },

  // ── SPORTS & OUTDOORS (13) ──
  { name: "معدات التمارين", nameEn: "Exercise Equipment", slug: "exercise-equipment", parent: "sports-outdoors" },
  { name: "تخييم", nameEn: "Camping", slug: "camping", parent: "sports-outdoors" },
  { name: "تنزه", nameEn: "Hiking", slug: "hiking", parent: "sports-outdoors" },
  { name: "ركوب الدراجات", nameEn: "Cycling", slug: "cycling", parent: "sports-outdoors" },
  { name: "جري", nameEn: "Running", slug: "running", parent: "sports-outdoors" },
  { name: "كرة قدم", nameEn: "Football", slug: "football", parent: "sports-outdoors" },
  { name: "كرة سلة", nameEn: "Basketball", slug: "basketball", parent: "sports-outdoors" },
  { name: "سباحة", nameEn: "Swimming", slug: "swimming", parent: "sports-outdoors" },
  { name: "صيد", nameEn: "Fishing", slug: "fishing", parent: "sports-outdoors" },
  { name: "صيد بري", nameEn: "Hunting", slug: "hunting", parent: "sports-outdoors" },
  { name: "ترفيه خارجي", nameEn: "Outdoor Recreation", slug: "outdoor-recreation", parent: "sports-outdoors" },
  { name: "يوجا", nameEn: "Yoga", slug: "yoga", parent: "sports-outdoors" },
  { name: "رياضات جماعية", nameEn: "Team Sports", slug: "team-sports", parent: "sports-outdoors" },

  // ── AUTOMOTIVE (8) ──
  { name: "إكسسوارات سيارات", nameEn: "Car Accessories", slug: "car-accessories", parent: "automotive" },
  { name: "إلكترونيات السيارات", nameEn: "Car Electronics", slug: "car-electronics", parent: "automotive" },
  { name: "إطارات", nameEn: "Tires", slug: "tires", parent: "automotive" },
  { name: "زيوت وسوائل", nameEn: "Oils & Fluids", slug: "oils-fluids", parent: "automotive" },
  { name: "قطع دراجات نارية", nameEn: "Motorcycle Parts", slug: "motorcycle-parts", parent: "automotive" },
  { name: "أدوات", nameEn: "Tools", slug: "tools", parent: "automotive" },
  { name: "نظام تحديد المواقع", nameEn: "GPS", slug: "gps", parent: "automotive" },
  { name: "العناية بالسيارة", nameEn: "Car Care", slug: "car-care", parent: "automotive" },

  // ── BABY (8) ──
  { name: "معدات الطفل", nameEn: "Baby Gear", slug: "baby-gear", parent: "baby" },
  { name: "حفاضات", nameEn: "Diapers", slug: "diapers", parent: "baby" },
  { name: "تغذية الطفل", nameEn: "Baby Feeding", slug: "baby-feeding", parent: "baby" },
  { name: "ألعاب الطفل", nameEn: "Baby Toys", slug: "baby-toys", parent: "baby" },
  { name: "سلامة الطفل", nameEn: "Baby Safety", slug: "baby-safety", parent: "baby" },
  { name: "صحة الطفل", nameEn: "Baby Health", slug: "baby-health", parent: "baby" },
  { name: "عربات أطفال", nameEn: "Strollers", slug: "strollers", parent: "baby" },
  { name: "مقاعد سيارة", nameEn: "Car Seats", slug: "car-seats", parent: "baby" },

  // ── TOYS & GAMES (8) ──
  { name: "ألعاب تعليمية", nameEn: "Educational Toys", slug: "educational-toys", parent: "toys-games" },
  { name: "مكعبات بناء", nameEn: "Building Blocks", slug: "building-blocks", parent: "toys-games" },
  { name: "دمى", nameEn: "Dolls", slug: "dolls", parent: "toys-games" },
  { name: "ألعاب التحكم عن بعد", nameEn: "Remote Control Toys", slug: "remote-control-toys", parent: "toys-games" },
  { name: "ألعاب لوحية", nameEn: "Board Games", slug: "board-games", parent: "toys-games" },
  { name: "ألغاز", nameEn: "Puzzles", slug: "puzzles", parent: "toys-games" },
  { name: "ألعاب فيديو", nameEn: "Video Games", slug: "video-games", parent: "toys-games" },
  { name: "ألعاب خارجية", nameEn: "Outdoor Toys", slug: "outdoor-toys", parent: "toys-games" },

  // ── BOOKS (7) ──
  { name: "روايات", nameEn: "Fiction", slug: "fiction", parent: "books" },
  { name: "كتب غير روائية", nameEn: "Non-Fiction", slug: "non-fiction", parent: "books" },
  { name: "كتب أطفال", nameEn: "Children's Books", slug: "childrens-books", parent: "books" },
  { name: "كتب تعليمية", nameEn: "Educational Books", slug: "educational-books", parent: "books" },
  { name: "كوميكس", nameEn: "Comics", slug: "comics", parent: "books" },
  { name: "مجلات", nameEn: "Magazines", slug: "magazines", parent: "books" },
  { name: "كتب إلكترونية", nameEn: "E-books", slug: "e-books", parent: "books" },

  // ── OFFICE SUPPLIES (7) ──
  { name: "أثاث مكتبي", nameEn: "Office Furniture", slug: "office-furniture", parent: "office-supplies" },
  { name: "قرطاسية", nameEn: "Stationery", slug: "stationery", parent: "office-supplies" },
  { name: "لوازم مدرسية", nameEn: "School Supplies", slug: "school-supplies", parent: "office-supplies" },
  { name: "أدوات كتابة", nameEn: "Writing Instruments", slug: "writing-instruments", parent: "office-supplies" },
  { name: "ورق", nameEn: "Paper", slug: "paper", parent: "office-supplies" },
  { name: "إلكترونيات مكتبية", nameEn: "Office Electronics", slug: "office-electronics", parent: "office-supplies" },
  { name: "حفظ الملفات", nameEn: "Filing", slug: "filing", parent: "office-supplies" },

  // ── PET SUPPLIES (7) ──
  { name: "مستلزمات الكلاب", nameEn: "Dog Supplies", slug: "dog-supplies", parent: "pet-supplies" },
  { name: "مستلزمات القطط", nameEn: "Cat Supplies", slug: "cat-supplies", parent: "pet-supplies" },
  { name: "مستلزمات الطيور", nameEn: "Bird Supplies", slug: "bird-supplies", parent: "pet-supplies" },
  { name: "مستلزمات الأسماك", nameEn: "Fish Supplies", slug: "fish-supplies", parent: "pet-supplies" },
  { name: "مستلزمات الحيوانات الأليفة الصغيرة", nameEn: "Small Pet Supplies", slug: "small-pet-supplies", parent: "pet-supplies" },
  { name: "طعام الحيوانات الأليفة", nameEn: "Pet Food", slug: "pet-food", parent: "pet-supplies" },
  { name: "عناية الحيوانات الأليفة", nameEn: "Pet Grooming", slug: "pet-grooming", parent: "pet-supplies" },

  // ── INDUSTRIAL & SCIENTIFIC (5) ──
  { name: "معدات مختبرية", nameEn: "Lab Equipment", slug: "lab-equipment", parent: "industrial-scientific" },
  { name: "معدات السلامة", nameEn: "Safety Equipment", slug: "safety-equipment", parent: "industrial-scientific" },
  { name: "أدوات صناعية", nameEn: "Industrial Tools", slug: "industrial-tools", parent: "industrial-scientific" },
  { name: "أجهزة اختبار", nameEn: "Test Equipment", slug: "test-equipment", parent: "industrial-scientific" },
  { name: "لوازم تجارية", nameEn: "Commercial Supplies", slug: "commercial-supplies", parent: "industrial-scientific" },

  // ── ARTS & CRAFTS (6) ──
  { name: "رسم", nameEn: "Painting", slug: "painting", parent: "arts-crafts" },
  { name: "تخطيط", nameEn: "Drawing", slug: "drawing", parent: "arts-crafts" },
  { name: "خياطة", nameEn: "Sewing", slug: "sewing", parent: "arts-crafts" },
  { name: "حياكة", nameEn: "Knitting", slug: "knitting", parent: "arts-crafts" },
  { name: "سجل القصاصات", nameEn: "Scrapbooking", slug: "scrapbooking", parent: "arts-crafts" },
  { name: "مستلزمات الحرف اليدوية", nameEn: "Craft Supplies", slug: "craft-supplies", parent: "arts-crafts" },

  // ── MUSICAL INSTRUMENTS (6) ──
  { name: "جيتار", nameEn: "Guitars", slug: "guitars", parent: "musical-instruments" },
  { name: "لوحات مفاتيح موسيقية", nameEn: "Keyboards", slug: "keyboards", parent: "musical-instruments" },
  { name: "طبول", nameEn: "Drums", slug: "drums", parent: "musical-instruments" },
  { name: "معدات دي جي", nameEn: "DJ Equipment", slug: "dj-equipment", parent: "musical-instruments" },
  { name: "معدات استوديو", nameEn: "Studio Equipment", slug: "studio-equipment", parent: "musical-instruments" },
  { name: "ملحقات الآلات الموسيقية", nameEn: "Instrument Accessories", slug: "instrument-accessories", parent: "musical-instruments" },

  // ── GARDEN & OUTDOOR (6) ──
  { name: "أدوات البستنة", nameEn: "Gardening Tools", slug: "gardening-tools", parent: "garden-outdoor" },
  { name: "نباتات", nameEn: "Plants", slug: "plants", parent: "garden-outdoor" },
  { name: "أثاث خارجي", nameEn: "Outdoor Furniture", slug: "outdoor-furniture", parent: "garden-outdoor" },
  { name: "شواء", nameEn: "BBQ", slug: "bbq", parent: "garden-outdoor" },
  { name: "حمامات سباحة", nameEn: "Pools", slug: "pools", parent: "garden-outdoor" },
  { name: "مكافحة الآفات", nameEn: "Pest Control", slug: "pest-control", parent: "garden-outdoor" },

  // ── JEWELRY (6) ──
  { name: "قلائد", nameEn: "Necklaces", slug: "necklaces", parent: "jewelry" },
  { name: "خواتم", nameEn: "Rings", slug: "rings", parent: "jewelry" },
  { name: "أساور", nameEn: "Bracelets", slug: "bracelets", parent: "jewelry" },
  { name: "أقراط", nameEn: "Earrings", slug: "earrings", parent: "jewelry" },
  { name: "خلاخيل", nameEn: "Anklets", slug: "anklets", parent: "jewelry" },
  { name: "تمائم", nameEn: "Charms", slug: "charms", parent: "jewelry" },

  // ── WATCHES (5) ──
  { name: "ساعات ذكية", nameEn: "Smart Watches", slug: "smart-watches", parent: "watches" },
  { name: "ساعات فاخرة", nameEn: "Luxury Watches", slug: "luxury-watches", parent: "watches" },
  { name: "ساعات رياضية", nameEn: "Sports Watches", slug: "sports-watches", parent: "watches" },
  { name: "ساعات أطفال", nameEn: "Kids Watches", slug: "kids-watches", parent: "watches" },
  { name: "إكسسوارات الساعات", nameEn: "Watch Accessories", slug: "watch-accessories", parent: "watches" },

  // ── DIGITAL PRODUCTS (9) ──
  { name: "برمجيات رقمية", nameEn: "Software", slug: "software-dp", parent: "digital-products" },
  { name: "ألعاب", nameEn: "Games", slug: "games", parent: "digital-products" },
  { name: "كتب إلكترونية رقمية", nameEn: "E-books", slug: "e-books-dp", parent: "digital-products" },
  { name: "دورات عبر الإنترنت", nameEn: "Online Courses", slug: "online-courses", parent: "digital-products" },
  { name: "قوالب", nameEn: "Templates", slug: "templates", parent: "digital-products" },
  { name: "رسومات", nameEn: "Graphics", slug: "graphics", parent: "digital-products" },
  { name: "خطوط", nameEn: "Fonts", slug: "fonts", parent: "digital-products" },
  { name: "موسيقى", nameEn: "Music", slug: "music", parent: "digital-products" },
  { name: "صور مخزنة", nameEn: "Stock Photos", slug: "stock-photos", parent: "digital-products" },

  // ── SERVICES (7) ──
  { name: "خدمات منزلية", nameEn: "Home Services", slug: "home-services", parent: "services" },
  { name: "تنظيف", nameEn: "Cleaning", slug: "cleaning", parent: "services" },
  { name: "إصلاحات", nameEn: "Repairs", slug: "repairs", parent: "services" },
  { name: "خدمات السيارات", nameEn: "Car Services", slug: "car-services", parent: "services" },
  { name: "خدمات التجميل", nameEn: "Beauty Services", slug: "beauty-services", parent: "services" },
  { name: "استشارات عبر الإنترنت", nameEn: "Online Consulting", slug: "online-consulting", parent: "services" },
  { name: "خدمات مستقلة", nameEn: "Freelance Services", slug: "freelance-services", parent: "services" },

  // ── ADULT (2) ──
  { name: "ملابس داخلية", nameEn: "Lingerie", slug: "lingerie", parent: "adult" },
  { name: "هدايا رومانسية", nameEn: "Romantic Gifts", slug: "romantic-gifts", parent: "adult" },
];

// ── IMAGE ASSIGNMENTS ──
const avifFiles = [
  "photo-1503376780353-7e6692767b70.avif",
  "photo-1504754524776-8f4f37790ca0.avif",
  "photo-1505751172876-fa1923c5c528.avif",
  "photo-1514852451047-f8e1d1cd9b64.avif",
  "photo-1519689680058-324335c77eba.avif",
  "photo-1523301551780-cd17359a95d0.avif",
  "photo-1523376460408-aeb5f5d051b8.avif",
  "photo-1535016120720-40c646be5580.avif",
  "photo-1542751110-97427bbecf20.avif",
  "photo-1549298916-b41d501d3772.avif",
  "photo-1556185781-a47769abb7ee.avif",
  "photo-1556379118-7034d926d258.avif",
  "photo-1558060370-d644479cb6f7.avif",
  "photo-1571624436279-b272aff752b5.avif",
  "photo-1573408301185-9146fe634ad0.avif",
  "photo-1578844251758-2f71da64c96f.avif",
  "photo-1581093577421-f561a654a353.avif",
  "photo-1585477078060-d06978689e34.avif",
  "photo-1600634999623-864991678406.avif",
  "photo-1602153508753-4ace888c10a0.avif",
  "photo-1608979048467-6194dabc6a3d.avif",
  "photo-1613685302957-3a6fc45346ef.avif",
  "photo-1615655114865-4cc1bda5901e.avif",
  "photo-1616486338812-3dadae4b4ace.avif",
  "photo-1624638746091-4b7de51514c7.avif",
  "photo-1629079447777-1e605162dc8d.avif",
  "photo-1631160246898-58192f971b5f.avif",
  "photo-1643622357625-c013987d90e7.avif",
  "photo-1645651964715-d200ce0939cc.avif",
  "photo-1669344319217-19810a5e3d3b.avif",
  "photo-1671040690726-b78261eff126.avif",
  "photo-1695668548342-c0c2ad479aee.avif",
  "photo-1738618140037-09e11c8e644a.avif",
  "photo-1760463921658-0fa0ce72c91c.avif",
  "photo-1761933921555-c45b3c172413.avif",
  "premium_photo-1661281309429-06d083d8dcf9.avif",
  "premium_photo-1661645417454-fabe3698fe4a.avif",
  "premium_photo-1664202526559-e21e9c0fb46a.avif",
  "premium_photo-1664301887532-328f07bb2c24.avif",
  "premium_photo-1673141390230-8b4a3c3152b1.avif",
  "premium_photo-1675018083155-6742ba47d570.avif",
  "premium_photo-1684444605542-93725082d214.avif",
  "premium_photo-1712764121254-d9867c694b81.avif",
  "premium_photo-1723921379491-46da62e13562.avif",
  "premium_photo-1737631673428-7dc9ac9db616.avif",
];

const categoryImageMap: Record<string, string> = {};
categoryImageMap["electronics"] = "/image/category/electronic.png";
categoryImageMap["telephones"] = "/image/category/phone-case.png";

const mainSlugs = categories.filter((c) => !c.parent).map((c) => c.slug);
for (let i = 1; i < mainSlugs.length; i++) {
  categoryImageMap[mainSlugs[i]] = `/image/category/${avifFiles[i - 1]}`;
}

const subSlugs = categories.filter((c) => c.parent).map((c) => c.slug);
const poolStart = 21;
for (let i = 0; i < subSlugs.length; i++) {
  if (categoryImageMap[subSlugs[i]]) continue;
  categoryImageMap[subSlugs[i]] = `/image/category/${avifFiles[poolStart + (i % (avifFiles.length - poolStart))]}`;
}

function getCategoryImage(slug: string): string {
  return categoryImageMap[slug] ?? "";
}

async function main() {
  console.log(`Clearing category references from products...`);
  await prisma.product.updateMany({ data: { categoryId: null } });

  console.log(`Deleting all existing categories...`);
  await prisma.category.deleteMany({});
  console.log("Deleted old categories");

  console.log(`Creating ${categories.length} categories...`);

  // First pass: create all parent categories (parent: null)
  const parents = categories.filter((c) => !c.parent);
  for (const cat of parents) {
    await prisma.category.create({
      data: { name: cat.name, nameEn: cat.nameEn, slug: cat.slug, image: getCategoryImage(cat.slug) },
    });
  }
  console.log(`Created ${parents.length} parent categories`);

  // Second pass: get all parent IDs by slug
  const dbCategories = await prisma.category.findMany({ select: { slug: true, id: true } });
  const parentMap = new Map(dbCategories.map((c) => [c.slug, c.id]));

  // Third pass: create all child categories
  const children = categories.filter((c) => c.parent);
  for (const cat of children) {
    const parentId = parentMap.get(cat.parent!);
    if (!parentId) {
      console.warn(`Parent not found for slug "${cat.parent}" (child: ${cat.nameEn})`);
      continue;
    }
    await prisma.category.create({
      data: { name: cat.name, nameEn: cat.nameEn, slug: cat.slug, parentId, image: getCategoryImage(cat.slug) },
    });
  }
  console.log(`Created ${children.length} child categories`);

  console.log(`Total: ${categories.length} categories created successfully`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
