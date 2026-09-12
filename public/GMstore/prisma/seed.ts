import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function img(cat: string, idx: number): string[] {
  const POOL: Record<string, string[]> = {
    accessories: ["https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1611921986305-1a7e1211a53a?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1594226801341-41427b4e5c22?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1573405601187-1e4f3e7d90cf?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1605812860427-4024433a70fd?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1600080972464-8e5f35f7d984?w=600&h=600&fit=crop"],
    electronics: ["https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1550009158-9ebf2b5d1b1a?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1526406915894-7bcd65f60845?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=600&fit=crop"],
    clothing: ["https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1554568218-0f1715e72254?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1544005313-ae96f0ad18e0?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&h=600&fit=crop"],
    home: ["https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1544457070-4cd773b4d71e?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1522771739015-7ad95b47a5ae?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=600&h=600&fit=crop"],
    "personal-care": ["https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1570194065650-d99fb4b38c34?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1559599101-f09722fb4948?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=600&h=600&fit=crop"],
    books: ["https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1621351183012-e2f9972dd9bf?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1491841573634-28140fc7ced7?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1526243741027-444d633d7365?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?w=600&h=600&fit=crop"],
    toys: ["https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1558877385-a7f1f477f39a?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1597501433401-e0c1008588a8?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1580477667995-45ede0ebcf10?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1567225591452-5f8ba8e884b5?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1575379570134-64f2fdc94616?w=600&h=600&fit=crop"],
    sports: ["https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1530549387889-abc339e8d606?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1595056815056-fe275e91d9ca?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1461896836934-aa607d0bb9f4?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=600&fit=crop"],
    auto: ["https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1514316454349-750a7fd3da3a?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1441148345475-03b22f6c0ca1?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=600&h=600&fit=crop"],
    "food-drinks": ["https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1506354666786-959d6d497f1a?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1499028344343-cd173ffc68a9?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=600&h=600&fit=crop"],
    jewelry: ["https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1515562141589-67f0e48ffbed?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1535632066927-ab7c8ab60908?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1560195813-05d87f1e65e9?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=600&h=600&fit=crop"],
    pets: ["https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1548658166-136d9f6a7e76?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1574231164645-d6f0e8553590?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1544568100-847a948585b9?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1543859399-1b4f7e48e87a?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1444212477490-ca0b91be17ac?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=600&h=600&fit=crop"],
    "baby-kids": ["https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1585241936939-be409c2d9e8b?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1541689592655-f5f7bb4e0c04?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1522771930-78848d9293e8?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1491013516836-7db643ee125a?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1519451241324-20b4ea2c4220?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&h=600&fit=crop"],
    garden: ["https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1557187666-4fd70cf76254?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1558692025-59e6528f45cc?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1578302758196-f1b04e272f26?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1592150621744-19564d5b2f81?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1560743641-3914f2c45636?w=600&h=600&fit=crop"],
    office: ["https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1453928582365-b6ad33cbcf64?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1497215842964-222b430dc094?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1527192491265-7e15c96e58a8?w=600&h=600&fit=crop"],
    "musical-instruments": ["https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1520175480920-7b2a483c2e41?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop"],
    bags: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1547949003-9792a18a2601?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1605408499391-6368e628ef0a?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1563903530908-afdd155d057a?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1591561954557-26941169b8e7?w=600&h=600&fit=crop"],
    shoes: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1595341888016-a392ef81b7de?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1605408499391-6368e628ef0a?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=600&h=600&fit=crop"],
    watches: ["https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1548171915-e34a9f0928c0?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1587836374828-4dbafa94cfbe?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1526045431041-2a08e6762ba1?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1542496658-e33a6d38d2f6?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600&h=600&fit=crop"],
    perfumes: ["https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1567721913486-6585f069b332?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1547887537-e3a2f32cb1cc?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=600&h=600&fit=crop"],
    cameras: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1500634245200-e5245c7574ef?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1533827432537-70133748f5c8?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=600&h=600&fit=crop"],
    furniture: ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1618220179428-22790b461013?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop"],
    health: ["https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1584515933487-779824d29309?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1489274495757-95c07c0c102a?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1540555700478-4be289fbec6d?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&h=600&fit=crop"],
    gifts: ["https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1549465220-1a8b9238ae1d?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1512446886047-30d2cd27b0bd?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1549465220-1a8b9238ae1d?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=600&h=600&fit=crop"],
  };
  const pool = POOL[cat] || POOL.electronics;
  // Return 2 images per product for hover effect
  return [pool[idx % pool.length], pool[(idx + 1) % pool.length]];
}

const CATEGORIES = [
  { name: "اكسسوارت", nameEn: "Accessories", slug: "accessories", desc: "إكسسوارات متنوعة" },
  { name: "إلكترونيات", nameEn: "Electronics", slug: "electronics", desc: "أجهزة إلكترونية وكهربائية" },
  { name: "ملابس", nameEn: "Clothing", slug: "clothing", desc: "ملابس رجالية ونسائية" },
  { name: "منزل", nameEn: "Home", slug: "home", desc: "مستلزمات المنزل والمطبخ" },
  { name: "العناية الشخصية", nameEn: "Personal Care", slug: "personal-care", desc: "منتجات العناية بالبشرة والشعر" },
  { name: "كتب", nameEn: "Books", slug: "books", desc: "كتب عربية وأجنبية في مختلف المجالات" },
  { name: "ألعاب", nameEn: "Toys", slug: "toys", desc: "ألعاب أطفال وترفيهية" },
  { name: "رياضة", nameEn: "Sports", slug: "sports", desc: "مستلزمات وأدوات رياضية" },
  { name: "سيارات", nameEn: "Auto", slug: "auto", desc: "إكسسوارات وقطع سيارات" },
  { name: "أطعمة ومشروبات", nameEn: "Food & Drinks", slug: "food-drinks", desc: "أطعمة ومشروبات متنوعة" },
  { name: "مجوهرات", nameEn: "Jewelry", slug: "jewelry", desc: "مجوهرات وساعات فاخرة" },
  { name: "حيوانات أليفة", nameEn: "Pets", slug: "pets", desc: "مستلزمات الحيوانات الأليفة" },
  { name: "أطفال", nameEn: "Baby & Kids", slug: "baby-kids", desc: "منتجات الأطفال والرضع" },
  { name: "حديقة", nameEn: "Garden", slug: "garden", desc: "مستلزمات الحدائق والنباتات" },
  { name: "مكتبية", nameEn: "Office", slug: "office", desc: "مستلزمات مكتبية وأدوات قرطاسية" },
  { name: "آلات موسيقية", nameEn: "Musical Instruments", slug: "musical-instruments", desc: "آلات موسيقية وإكسسوارات" },
  { name: "حقائب", nameEn: "Bags", slug: "bags", desc: "حقائب يد وسفر ومدرسة" },
  { name: "أحذية", nameEn: "Shoes", slug: "shoes", desc: "أحذية رجالية ونسائية ورياضية" },
  { name: "ساعات", nameEn: "Watches", slug: "watches", desc: "ساعات يد فاخرة ورياضية" },
  { name: "عطور", nameEn: "Perfumes", slug: "perfumes", desc: "عطور رجالية ونسائية فاخرة" },
  { name: "كاميرات", nameEn: "Cameras", slug: "cameras", desc: "كاميرات تصوير ومعداتها" },
  { name: "أثاث", nameEn: "Furniture", slug: "furniture", desc: "أثاث منزلي ومكتبي" },
  { name: "صحة", nameEn: "Health", slug: "health", desc: "منتجات صحية وطبية" },
  { name: "هدايا", nameEn: "Gifts", slug: "gifts", desc: "هدايا متنوعة ومناسبات" },
];

const PRODUCTS = [
  // إلكترونيات (10)
  { name: "سماعات بلوتوث لاسلكية", desc: "سماعات بلوتوث عالية الجودة مع عزل للضوضاء، بطارية تدوم 20 ساعة.", price: 149.99, cat: "electronics", stock: 50, featured: true, bg: "16213e" },
  { name: "ساعة ذكية رياضية", desc: "ساعة ذكية مقاومة للماء مع مراقبة معدل ضربات القلب وGPS.", price: 299.99, cat: "electronics", stock: 30, featured: true, bg: "0f3460" },
  { name: "شاحن متنقل 20000mAh", desc: "باور بانك سعة 20000 ملي أمبير مع شحن سريع USB-C.", price: 89.99, cat: "electronics", stock: 100, featured: false, bg: "533483" },
  { name: "حافظة لاب توب", desc: "حافظة لاب توب مقاومة للصدمات مقاس 15.6 بوصة.", price: 69.99, cat: "electronics", stock: 80, featured: false, bg: "1a5276" },
  { name: "ماوس لاسلكي", desc: "ماوس لاسلكي مريح بتصميم إرجونوميك.", price: 49.99, cat: "electronics", stock: 150, featured: false, bg: "2c3e50" },
  { name: "كاميرا مراقبة منزلية", desc: "كاميرا مراقبة ذكية بدقة 1080p ورؤية ليلية.", price: 199.99, cat: "electronics", stock: 40, featured: true, bg: "34495e" },
  { name: "سماعة رأس للألعاب", desc: "سماعة رأس محيطية مع مايكروفون مدمج.", price: 129.99, cat: "electronics", stock: 60, featured: false, bg: "212f3d" },
  { name: "قاعدة تبريد لاب توب", desc: "قاعدة تبريد بمروحتين مع إضاءة LED.", price: 39.99, cat: "electronics", stock: 90, featured: false, bg: "5d6d7e" },
  { name: "محول USB متعدد", desc: "محول USB-C إلى 7 منافذ مع HDMI.", price: 34.99, cat: "electronics", stock: 120, featured: false, bg: "85929e" },
  { name: "طابعة منزلية", desc: "طابعة ليزر لاسلكية متعددة الوظائف.", price: 399.99, cat: "electronics", stock: 20, featured: false, bg: "1b4f72" },

  // ملابس (10)
  { name: "قميص قطني رجالي", desc: "قميص قطني مريح مناسب للعمل والمناسبات.", price: 79.99, cat: "clothing", stock: 200, featured: true, bg: "2b2e4a" },
  { name: "فستان نسائي صيفي", desc: "فستان صيفي خفيف بتصميم أنيق.", price: 129.99, cat: "clothing", stock: 150, featured: false, bg: "e84545" },
  { name: "حذاء رياضي نسائي", desc: "حذاء رياضي مريح للمشي والجري.", price: 189.99, cat: "clothing", stock: 80, featured: false, bg: "2c3e50" },
  { name: "جاكيت شتوي رجالي", desc: "جاكيت شتوي ثقيل بطبقة داخلية صوف.", price: 259.99, cat: "clothing", stock: 60, featured: true, bg: "1a1a2e" },
  { name: "بنطلون جينز", desc: "بنطلون جينز كلاسيكي بقصة مستقيمة.", price: 99.99, cat: "clothing", stock: 120, featured: false, bg: "34495e" },
  { name: "تي شيرت رياضي", desc: "تي شيرت قطني رياضي بقماش ماص للعرق.", price: 49.99, cat: "clothing", stock: 300, featured: false, bg: "27ae60" },
  { name: "حزام جلدي رجالي", desc: "حزام جلدي طبيعي فاخر.", price: 59.99, cat: "clothing", stock: 100, featured: false, bg: "5d4037" },
  { name: "شال نسائي حرير", desc: "شال حريري ناعم بألوان جذابة.", price: 89.99, cat: "clothing", stock: 70, featured: false, bg: "c0392b" },
  { name: "بيجاما شتوية", desc: "بيجاما شتوية قطنية مريحة.", price: 69.99, cat: "clothing", stock: 90, featured: false, bg: "4a235a" },
  { name: "قبعة شمسية", desc: "قبعة شمسية واسعة لحماية الوجه.", price: 39.99, cat: "clothing", stock: 110, featured: false, bg: "d4ac0d" },

  // منزل (10)
  { name: "طقم قدور ستانلس ستيل", desc: "طقم قدور 10 قطع بمقابض عازلة.", price: 249.99, cat: "home", stock: 40, featured: true, bg: "34495e" },
  { name: "مصباح طاولة LED", desc: "مصباح طاولة LED بثلاث درجات إضاءة.", price: 59.99, cat: "home", stock: 120, featured: false, bg: "d35400" },
  { name: "طقم كاسات زجاجية", desc: "طقم 6 كاسات زجاجية مقواة.", price: 39.99, cat: "home", stock: 200, featured: false, bg: "85c1e9" },
  { name: "سجادة صلاة فاخرة", desc: "سجادة صلاة مخملية فاخرة بتصميم إسلامي.", price: 49.99, cat: "home", stock: 150, featured: true, bg: "1a5276" },
  { name: "منظم مكتب خشبي", desc: "منظم مكتب متعدد الأدراج من الخشب الطبيعي.", price: 79.99, cat: "home", stock: 60, featured: false, bg: "a0522d" },
  { name: "طقم مناشف حمام", desc: "طقم 4 مناشف قطنية فاخرة.", price: 89.99, cat: "home", stock: 100, featured: false, bg: "5dade2" },
  { name: "أكياس تخزين فراغ", desc: "أكياس تخزين بتقنية الفراغ لتوفير المساحة.", price: 29.99, cat: "home", stock: 250, featured: false, bg: "7fb3d8" },
  { name: "مكواة بخار عمودية", desc: "مكواة بخار عمودية سريعة لكي الملابس.", price: 149.99, cat: "home", stock: 35, featured: false, bg: "f39c12" },
  { name: "طقم صحون عشاء", desc: "طقم صحون عشاء خزفي 12 قطعة.", price: 129.99, cat: "home", stock: 50, featured: false, bg: "d5dbdb" },
  { name: "حامل شموع ديكوري", desc: "حامل شموع معدني بتصميم عصري.", price: 34.99, cat: "home", stock: 80, featured: false, bg: "b03a2e" },

  // العناية الشخصية (10)
  { name: "زيت أركان للشعر", desc: "زيت أركان طبيعي 100% للشعر والبشرة.", price: 39.99, cat: "personal-care", stock: 300, featured: true, bg: "27ae60" },
  { name: "عطر رجالي فاخر", desc: "عطر رجالي برائحة خشبية منعشة.", price: 199.99, cat: "personal-care", stock: 60, featured: false, bg: "8e44ad" },
  { name: "كريم مرطب للوجه", desc: "كريم ترطيب عميق بخلاصة الصبار وفيتامين E.", price: 49.99, cat: "personal-care", stock: 180, featured: false, bg: "f1948a" },
  { name: "معجون أسنان مبيض", desc: "معجون أسنان طبيعي لتبييض الأسنان.", price: 24.99, cat: "personal-care", stock: 400, featured: false, bg: "85c1e9" },
  { name: "مزيل عرق طبيعي", desc: "مزيل عرق خالٍ من الألمنيوم برائحة منعشة.", price: 19.99, cat: "personal-care", stock: 250, featured: false, bg: "aed6f1" },
  { name: "صابون عضوي", desc: "صابون طبيعي بزيت الزيتون والعسل.", price: 14.99, cat: "personal-care", stock: 500, featured: false, bg: "f5b041" },
  { name: "مجفف شعر احترافي", desc: "مجفف شعر بقوة 2000 واط مع 3 سرعات.", price: 109.99, cat: "personal-care", stock: 45, featured: false, bg: "5d6d7e" },
  { name: "مقص أظافر فاخر", desc: "مقص أظافر ستانلس ستيل مع مبرد.", price: 29.99, cat: "personal-care", stock: 150, featured: false, bg: "bdc3c7" },
  { name: "فرشاة أسنان كهربائية", desc: "فرشاة أسنان كهربائية بشاحن USB.", price: 79.99, cat: "personal-care", stock: 70, featured: false, bg: "3498db" },
  { name: "واقي شمس SPF 50", desc: "واقي شمس بعامل حماية 50 للوجه والجسم.", price: 44.99, cat: "personal-care", stock: 90, featured: false, bg: "f1c40f" },

  // كتب (10)
  { name: "رواية مئة عام من العزلة", desc: "رواية خالدة للأديب غابرييل غارسيا ماركيز.", price: 39.99, cat: "books", stock: 100, featured: true, bg: "1a1a2e" },
  { name: "كتاب العادات الذرية", desc: "كتاب تطوير الذات وبناء العادات الإيجابية.", price: 49.99, cat: "books", stock: 200, featured: true, bg: "2c3e50" },
  { name: "ديوان المتنبي", desc: "ديوان شعر المتنبي كاملاً مشكولاً.", price: 59.99, cat: "books", stock: 80, featured: false, bg: "8b4513" },
  { name: "كتاب فن الحرب", desc: "كتاب صن تزو في الاستراتيجية العسكرية.", price: 29.99, cat: "books", stock: 150, featured: false, bg: "a52a2a" },
  { name: "موسوعة العلوم", desc: "موسوعة علمية مصورة للشباب.", price: 89.99, cat: "books", stock: 40, featured: false, bg: "1a5276" },
  { name: "كتاب لغز الحياة", desc: "كتاب فلسفي في معنى الحياة والوجود.", price: 34.99, cat: "books", stock: 60, featured: false, bg: "4a235a" },
  { name: "رواية البؤساء", desc: "رواية كلاسيكية لفيكتور هوغو.", price: 44.99, cat: "books", stock: 70, featured: false, bg: "6c3483" },
  { name: "كتاب الطبخ العربي", desc: "أشهى الوصفات العربية التقليدية والحديثة.", price: 69.99, cat: "books", stock: 90, featured: false, bg: "d35400" },
  { name: "قصص أطفال مصورة", desc: "مجموعة 10 قصص مصورة للأطفال.", price: 24.99, cat: "books", stock: 300, featured: false, bg: "2ecc71" },
  { name: "قاموس إنجليزي-عربي", desc: "قاموس عصري يحتوي على 50000 كلمة.", price: 59.99, cat: "books", stock: 45, featured: false, bg: "5d8aa8" },

  // ألعاب (10)
  { name: "لعبة بازل 1000 قطعة", desc: "لغز صورة مكون من 1000 قطعة.", price: 34.99, cat: "toys", stock: 80, featured: false, bg: "e74c3c" },
  { name: "دمية أطفال متكلمة", desc: "دمية ذكية تتفاعل مع الطفل وتتكلم.", price: 89.99, cat: "toys", stock: 50, featured: true, bg: "f06292" },
  { name: "مجسم ليغو مدينة", desc: "مجسم بناء مدينة متكامل بمكعبات ليغو.", price: 149.99, cat: "toys", stock: 30, featured: true, bg: "1976d2" },
  { name: "كرة قدم للأطفال", desc: "كرة قدم مقاس 5 مناسبة للأطفال.", price: 29.99, cat: "toys", stock: 200, featured: false, bg: "ffffff" },
  { name: "سيارة تحكم عن بعد", desc: "سيارة سباق تعمل بالتحكم اللاسلكي.", price: 79.99, cat: "toys", stock: 60, featured: false, bg: "f44336" },
  { name: "مكعبات بناء خشبية", desc: "100 مكعب بناء خشبي ملون للأطفال.", price: 44.99, cat: "toys", stock: 100, featured: false, bg: "ff9800" },
  { name: "لعبة الشطرنج", desc: "طقم شطرنج خشبي فاخر مع حافظة.", price: 69.99, cat: "toys", stock: 40, featured: false, bg: "795548" },
  { name: "رجل آلي تفاعلي", desc: "روبوت تفاعلي يمشي ويصدر أصواتاً.", price: 119.99, cat: "toys", stock: 25, featured: false, bg: "607d8b" },
  { name: "ألوان رسم 48 لوناً", desc: "مجموعة ألوان خشبية 48 لوناً مع ممحاة.", price: 24.99, cat: "toys", stock: 150, featured: false, bg: "ffc107" },
  { name: "لعبة ألغاز خشبية", desc: "لعبة ألغاز تعليمية ثلاثية الأبعاد.", price: 39.99, cat: "toys", stock: 70, featured: false, bg: "8d6e63" },

  // رياضة (10)
  { name: "حبل مقاومة مطاطي", desc: "حبل مقاومة متعدد المستويات للتمارين.", price: 29.99, cat: "sports", stock: 200, featured: false, bg: "c0392b" },
  { name: "سجادة يوجا", desc: "سجادة يوجا غير قابلة للانزلاق سمك 6 مم.", price: 49.99, cat: "sports", stock: 100, featured: false, bg: "2ecc71" },
  { name: "دمبلز معدني قابل للتعديل", desc: "طقم دمبلز معدني 20 كجم قابل للتعديل.", price: 299.99, cat: "sports", stock: 30, featured: true, bg: "7f8c8d" },
  { name: "دراجة هوائية جبلية", desc: "دراجة هوائية 21 سرعة بمكابح قرصية.", price: 899.99, cat: "sports", stock: 10, featured: true, bg: "e74c3c" },
  { name: "حقيبة ظهر رياضية", desc: "حقيبة ظهر مقاومة للماء 40 لتر.", price: 69.99, cat: "sports", stock: 80, featured: false, bg: "2c3e50" },
  { name: "زجاجة ماء حرارية", desc: "زجاجة ماء ستانلس ستيل عازلة 750 مل.", price: 34.99, cat: "sports", stock: 300, featured: false, bg: "3498db" },
  { name: "قفازات ملاكمة", desc: "قفازات ملاكمة جلدية للتدريب.", price: 89.99, cat: "sports", stock: 40, featured: false, bg: "e74c3c" },
  { name: "ساعة توقيت رقمية", desc: "ساعة توقيت إلكترونية مع منبه.", price: 19.99, cat: "sports", stock: 150, featured: false, bg: "34495e" },
  { name: "حزام رفع أوزان", desc: "حزام دعم للظهر لرفع الأثقال.", price: 59.99, cat: "sports", stock: 60, featured: false, bg: "1a1a2e" },
  { name: "نظارات سباحة", desc: "نظارات سباحة مقاومة للضباب.", price: 39.99, cat: "sports", stock: 90, featured: false, bg: "2980b9" },

  // سيارات (10)
  { name: "ماسحات زجاج أمامية", desc: "ماسحات زجاج عالية الجودة لجميع السيارات.", price: 24.99, cat: "auto", stock: 200, featured: false, bg: "2c3e50" },
  { name: "مصباح LED للسيارة", desc: "مصباح LED ساطع للسيارة مقاوم للماء.", price: 49.99, cat: "auto", stock: 100, featured: false, bg: "f1c40f" },
  { name: "حامل جوال للسيارة", desc: "حامل جوال مغناطيسي لفتحات التكييف.", price: 19.99, cat: "auto", stock: 300, featured: false, bg: "34495e" },
  { name: "عطر سيارة فاخر", desc: "عطر سيارة برائحة المسك والعود.", price: 29.99, cat: "auto", stock: 500, featured: false, bg: "8e44ad" },
  { name: "شاحن سيارة USB", desc: "شاحن سيارة سريع بمنفذي USB.", price: 14.99, cat: "auto", stock: 250, featured: false, bg: "5d6d7e" },
  { name: "غطاء مقعد سيارة", desc: "غطاء مقعد أمامي جلد صناعي كوني.", price: 89.99, cat: "auto", stock: 60, featured: false, bg: "1a1a2e" },
  { name: "جهاز تشخيص أعطال", desc: "جهاز فحص أعطال السيارة OBD2 بلوتوث.", price: 79.99, cat: "auto", stock: 30, featured: true, bg: "c0392b" },
  { name: "مضخة هواء محمولة", desc: "مضخة هواء كهربائية للإطارات.", price: 59.99, cat: "auto", stock: 70, featured: false, bg: "27ae60" },
  { name: "فرشاة تنظيف السيارة", desc: "فرشاة تنظيف السيارة بشعيرات ناعمة.", price: 34.99, cat: "auto", stock: 120, featured: false, bg: "3498db" },
  { name: "مقبس محمول لاسلكي", desc: "جهاز تشغيل محمول مع كابلات DK.", price: 149.99, cat: "auto", stock: 20, featured: true, bg: "d35400" },

  // أطعمة ومشروبات (10)
  { name: "قهوة عربية فاخرة", desc: "قهوة عربية سعودية محمصة طازجة.", price: 44.99, cat: "food-drinks", stock: 200, featured: true, bg: "4e342e" },
  { name: "عسل طبيعي 500g", desc: "عسل جبلي طبيعي 100% عضوي.", price: 79.99, cat: "food-drinks", stock: 100, featured: false, bg: "f57c00" },
  { name: "زيت زيتون بكر ممتاز", desc: "زيت زيتون إسباني بكر ممتاز 1 لتر.", price: 59.99, cat: "food-drinks", stock: 80, featured: false, bg: "7cb342" },
  { name: "شوكولاتة بلجيكية", desc: "علبة شوكولاتة بلجيكية فاخرة 24 قطعة.", price: 69.99, cat: "food-drinks", stock: 60, featured: false, bg: "3e2723" },
  { name: "شاي أخضر ياباني", desc: "شاي أخضر ياباني عضوي فاخر.", price: 34.99, cat: "food-drinks", stock: 150, featured: false, bg: "66bb6a" },
  { name: "تمر سكري فاخر", desc: "تمر سكري طبيعي من القصيم 1 كجم.", price: 49.99, cat: "food-drinks", stock: 250, featured: true, bg: "a0522d" },
  { name: "مكسرات مشكلة", desc: "مكسرات طازجة مشكلة 500 جرام.", price: 39.99, cat: "food-drinks", stock: 120, featured: false, bg: "8d6e63" },
  { name: "زعتر بري", desc: "زعتر بري فلسطيني مع السمسم.", price: 19.99, cat: "food-drinks", stock: 300, featured: false, bg: "6d4c41" },
  { name: "صلصة طماطم إيطالية", desc: "صلصة طماطم إيطالية عضوية 400 جرام.", price: 14.99, cat: "food-drinks", stock: 400, featured: false, bg: "e53935" },
  { name: "عصير رمان طبيعي", desc: "عصير رمان طبيعي طازج 1 لتر.", price: 24.99, cat: "food-drinks", stock: 180, featured: false, bg: "c62828" },

  // مجوهرات (10)
  { name: "ساعة يد رجالية", desc: "ساعة كوارتز بسوار فولاذي مقاوم للخدش.", price: 249.99, cat: "jewelry", stock: 40, featured: true, bg: "1a237e" },
  { name: "قلادة فضة عيار 925", desc: "قلادة فضة إيطالية بتصميم عصري.", price: 89.99, cat: "jewelry", stock: 60, featured: false, bg: "78909c" },
  { name: "خاتم ذهب عيار 21", desc: "خاتم ذهب أصفر عيار 21 مع نقشة ناعمة.", price: 599.99, cat: "jewelry", stock: 15, featured: true, bg: "ffb300" },
  { name: "سوار جلدي رجالي", desc: "سوار جلدي طبيعي مع إبزيم فضي.", price: 39.99, cat: "jewelry", stock: 80, featured: false, bg: "3e2723" },
  { name: "أقراط لؤلؤ", desc: "أقراط فضة مع لؤلؤ طبيعي.", price: 149.99, cat: "jewelry", stock: 30, featured: false, bg: "eceff1" },
  { name: "سلسلة ذهب عيار 18", desc: "سلسلة ذهب أبيض عيار 18 مع دلاية.", price: 899.99, cat: "jewelry", stock: 10, featured: true, bg: "fff9c4" },
  { name: "دبوس ربطة عنق", desc: "دبوس ربطة عنق فضي مع حجر كريم.", price: 49.99, cat: "jewelry", stock: 45, featured: false, bg: "90a4ae" },
  { name: "خاتم فضة رجالي", desc: "خاتم فضة عيار 925 بعرض 8 مم.", price: 69.99, cat: "jewelry", stock: 55, featured: false, bg: "7f8c8d" },
  { name: "طقم مجوهرات نسائي", desc: "طقم عقد وأقراط فضة مطلية ذهب وردي.", price: 199.99, cat: "jewelry", stock: 20, featured: false, bg: "f48fb1" },
  { name: "محفظة جلدية فاخرة", desc: "محفظة جلد طبيعي رجالي فاخرة.", price: 109.99, cat: "jewelry", stock: 35, featured: false, bg: "4e342e" },
];

const CATEGORY_IMAGES: Record<string, string> = {
  accessories: "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=200&h=200&fit=crop&crop=center",
  electronics: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&h=200&fit=crop&crop=center",
  clothing: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=200&h=200&fit=crop&crop=center",
  home: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=200&fit=crop&crop=center",
  "personal-care": "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=200&h=200&fit=crop&crop=center",
  books: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=200&h=200&fit=crop&crop=center",
  toys: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=200&h=200&fit=crop&crop=center",
  sports: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&h=200&fit=crop&crop=center",
  auto: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=200&h=200&fit=crop&crop=center",
  "food-drinks": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop&crop=center",
  jewelry: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=200&h=200&fit=crop&crop=center",
  pets: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=200&h=200&fit=crop&crop=center",
  "baby-kids": "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=200&h=200&fit=crop&crop=center",
  garden: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=200&h=200&fit=crop&crop=center",
  office: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=200&h=200&fit=crop&crop=center",
  "musical-instruments": "https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=200&h=200&fit=crop&crop=center",
  bags: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&h=200&fit=crop&crop=center",
  shoes: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=200&h=200&fit=crop&crop=center",
  watches: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200&h=200&fit=crop&crop=center",
  perfumes: "https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=200&h=200&fit=crop&crop=center",
  cameras: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=200&h=200&fit=crop&crop=center",
  furniture: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop&crop=center",
  health: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center",
  gifts: "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=200&h=200&fit=crop&crop=center",
};

const CATEGORY_PREFIX: Record<string, string> = {
  accessories: "acc",
  electronics: "elec",
  pets: "pet",
  "baby-kids": "baby",
  garden: "grdn",
  office: "offc",
  "musical-instruments": "music",
  bags: "bag",
  clothing: "cloth",
  home: "home",
  "personal-care": "care",
  books: "book",
  toys: "toy",
  sports: "sport",
  auto: "auto",
  "food-drinks": "food",
  jewelry: "jewel",
  shoes: "shoe",
  watches: "watch",
  perfumes: "perf",
  cameras: "cam",
  furniture: "furt",
  health: "hlth",
  gifts: "gift",
};

async function main() {
  // Admin
  const adminEmail = "admin@gmstore.com";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const password = await bcrypt.hash("admin123", 12);
    await prisma.user.create({ data: { name: "Admin", email: adminEmail, password, role: "ADMIN" } });
    console.log("Admin user created: admin@gmstore.com / admin123");
  } else {
    console.log("Admin user already exists");
  }

  // Merchant users (create sample merchants if none exist)
  const merchants = await prisma.user.findMany({ where: { role: "MERCHANT" } });
  if (merchants.length === 0) {
    const sample = [
      { name: "متجر الإلكترونيات", email: "electronics@shop.com" },
      { name: "متجر الأزياء", email: "fashion@shop.com" },
      { name: "المتجر الشامل", email: "mall@shop.com" },
    ];
    for (const m of sample) {
      const pw = await bcrypt.hash("merchant123", 12);
      await prisma.user.create({ data: { name: m.name, email: m.email, password: pw, role: "MERCHANT" } });
      console.log(`Merchant created: ${m.email} / merchant123`);
    }
  } else {
    console.log(`${merchants.length} merchant(s) already exist`);
  }

  const allMerchants = await prisma.user.findMany({ where: { role: "MERCHANT" } });
  if (allMerchants.length === 0) {
    console.log("No merchants available");
    return;
  }

  // Categories
  const createdCategories: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    const existingCat = await prisma.category.findUnique({ where: { slug: cat.slug } });
    const image = CATEGORY_IMAGES[cat.slug] || null;
    if (existingCat) {
      createdCategories[cat.slug] = existingCat.id;
      const updateData: any = {};
      if (existingCat.image !== image) updateData.image = image;
      if (Object.keys(updateData).length) {
        await prisma.category.update({ where: { id: existingCat.id }, data: updateData });
      }
    } else {
      const created = await prisma.category.create({ data: { name: cat.name, nameEn: cat.nameEn, slug: cat.slug, description: cat.desc, image } });
      createdCategories[cat.slug] = created.id;
    }
  }
  console.log(`Categories: ${Object.keys(createdCategories).length} available`);

  // Delete all existing products to start fresh with clean slugs
  const allExisting = await prisma.product.count();
  if (allExisting > 0) {
    await prisma.review.deleteMany();
    await prisma.orderItem.deleteMany({ where: { productId: { not: undefined } } });
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    console.log(`Deleted ${allExisting} existing products`);
  }

    // English translations for products
  const EN: Record<string, { nameEn: string; descEn: string }> = {
    "سماعات بلوتوث لاسلكية": { nameEn: "Wireless Bluetooth Headphones", descEn: "High-quality Bluetooth headphones with noise cancellation, 20-hour battery." },
    "ساعة ذكية رياضية": { nameEn: "Smart Sports Watch", descEn: "Water-resistant smartwatch with heart rate monitor and GPS." },
    "شاحن متنقل 20000mAh": { nameEn: "20000mAh Power Bank", descEn: "20000mAh power bank with fast USB-C charging." },
    "حافظة لاب توب": { nameEn: "Laptop Case", descEn: "Shockproof 15.6-inch laptop case." },
    "ماوس لاسلكي": { nameEn: "Wireless Mouse", descEn: "Comfortable ergonomic wireless mouse." },
    "كاميرا مراقبة منزلية": { nameEn: "Home Security Camera", descEn: "Smart 1080p security camera with night vision." },
    "سماعة رأس للألعاب": { nameEn: "Gaming Headset", descEn: "Surround sound headset with built-in microphone." },
    "قاعدة تبريد لاب توب": { nameEn: "Laptop Cooling Pad", descEn: "Dual-fan cooling pad with LED lighting." },
    "محول USB متعدد": { nameEn: "Multi USB Hub", descEn: "USB-C to 7-port hub with HDMI." },
    "طابعة منزلية": { nameEn: "Home Printer", descEn: "Wireless laser multi-function printer." },
    "قميص قطني رجالي": { nameEn: "Men's Cotton Shirt", descEn: "Comfortable cotton shirt suitable for work and occasions." },
    "فستان نسائي صيفي": { nameEn: "Summer Dress", descEn: "Light summer dress with elegant design." },
    "حذاء رياضي نسائي": { nameEn: "Women's Sneakers", descEn: "Comfortable sports shoes for walking and running." },
    "جاكيت شتوي رجالي": { nameEn: "Men's Winter Jacket", descEn: "Heavy winter jacket with inner wool layer." },
    "بنطلون جينز": { nameEn: "Jeans Pants", descEn: "Classic straight-cut jeans." },
    "تي شيرت رياضي": { nameEn: "Sports T-Shirt", descEn: "Cotton sports t-shirt with moisture-wicking fabric." },
    "حزام جلدي رجالي": { nameEn: "Men's Leather Belt", descEn: "Premium natural leather belt." },
    "شال نسائي حرير": { nameEn: "Silk Women's Shawl", descEn: "Soft silk shawl in attractive colors." },
    "بيجاما شتوية": { nameEn: "Winter Pajamas", descEn: "Comfortable cotton winter pajamas." },
    "قبعة شمسية": { nameEn: "Sun Hat", descEn: "Wide brim sun hat for face protection." },
    "طقم قدور ستانلس ستيل": { nameEn: "Stainless Steel Cookware Set", descEn: "10-piece cookware set with heat-resistant handles." },
    "مصباح طاولة LED": { nameEn: "LED Table Lamp", descEn: "LED table lamp with 3 brightness levels." },
    "طقم كاسات زجاجية": { nameEn: "Glass Cup Set", descEn: "Set of 6 reinforced glass cups." },
    "سجادة صلاة فاخرة": { nameEn: "Premium Prayer Rug", descEn: "Velvet prayer rug with Islamic design." },
    "منظم مكتب خشبي": { nameEn: "Wooden Desk Organizer", descEn: "Multi-drawer desk organizer from natural wood." },
    "طقم مناشف حمام": { nameEn: "Bath Towel Set", descEn: "Set of 4 premium cotton towels." },
    "أكياس تخزين فراغ": { nameEn: "Vacuum Storage Bags", descEn: "Vacuum storage bags to save space." },
    "مكواة بخار عمودية": { nameEn: "Vertical Steam Iron", descEn: "Quick vertical steam iron for clothes." },
    "طقم صحون عشاء": { nameEn: "Dinner Plate Set", descEn: "Ceramic dinner plate set 12 pieces." },
    "حامل شموع ديكوري": { nameEn: "Decorative Candle Holder", descEn: "Metal candle holder with modern design." },
    "زيت أركان للشعر": { nameEn: "Argan Hair Oil", descEn: "100% natural argan oil for hair and skin." },
    "عطر رجالي فاخر": { nameEn: "Luxury Men's Perfume", descEn: "Men's perfume with a fresh woody scent." },
    "كريم مرطب للوجه": { nameEn: "Face Moisturizer", descEn: "Deep moisturizing cream with aloe vera and vitamin E." },
    "معجون أسنان مبيض": { nameEn: "Whitening Toothpaste", descEn: "Natural teeth whitening toothpaste." },
    "مزيل عرق طبيعي": { nameEn: "Natural Deodorant", descEn: "Aluminum-free deodorant with fresh scent." },
    "صابون عضوي": { nameEn: "Organic Soap", descEn: "Natural soap with olive oil and honey." },
    "مجفف شعر احترافي": { nameEn: "Professional Hair Dryer", descEn: "2000W hair dryer with 3 speeds." },
    "مقص أظافر فاخر": { nameEn: "Premium Nail Clipper", descEn: "Stainless steel nail clipper with file." },
    "فرشاة أسنان كهربائية": { nameEn: "Electric Toothbrush", descEn: "USB rechargeable electric toothbrush." },
    "واقي شمس SPF 50": { nameEn: "Sunscreen SPF 50", descEn: "SPF 50 sunscreen for face and body." },
    "رواية مئة عام من العزلة": { nameEn: "One Hundred Years of Solitude", descEn: "Timeless novel by Gabriel Garcia Marquez." },
    "كتاب العادات الذرية": { nameEn: "Atomic Habits", descEn: "Self-development book on building positive habits." },
    "ديوان المتنبي": { nameEn: "Al-Mutanabbi's Diwan", descEn: "Complete poetry collection by Al-Mutanabbi." },
    "كتاب فن الحرب": { nameEn: "The Art of War", descEn: "Sun Tzu's military strategy classic." },
    "موسوعة العلوم": { nameEn: "Science Encyclopedia", descEn: "Illustrated science encyclopedia for youth." },
    "كتاب لغز الحياة": { nameEn: "The Puzzle of Life", descEn: "Philosophical book on the meaning of life." },
    "رواية البؤساء": { nameEn: "Les Misérables", descEn: "Classic novel by Victor Hugo." },
    "كتاب الطبخ العربي": { nameEn: "Arabic Cookbook", descEn: "Traditional and modern Arabic recipes." },
    "قصص أطفال مصورة": { nameEn: "Illustrated Children's Stories", descEn: "Set of 10 illustrated stories for children." },
    "قاموس إنجليزي-عربي": { nameEn: "English-Arabic Dictionary", descEn: "Modern dictionary with 50,000 words." },
    "لعبة بازل 1000 قطعة": { nameEn: "1000-Piece Puzzle", descEn: "Image puzzle made of 1000 pieces." },
    "دمية أطفال متكلمة": { nameEn: "Talking Doll", descEn: "Smart doll that interacts with the child." },
    "مجسم ليغو مدينة": { nameEn: "LEGO City Set", descEn: "Complete city building set with LEGO bricks." },
    "كرة قدم للأطفال": { nameEn: "Kids Soccer Ball", descEn: "Size 5 soccer ball suitable for children." },
    "سيارة تحكم عن بعد": { nameEn: "Remote Control Car", descEn: "Wireless racing car with remote control." },
    "مكعبات بناء خشبية": { nameEn: "Wooden Building Blocks", descEn: "100 colorful wooden building blocks." },
    "لعبة الشطرنج": { nameEn: "Chess Set", descEn: "Premium wooden chess set with case." },
    "رجل آلي تفاعلي": { nameEn: "Interactive Robot", descEn: "Interactive walking robot with sounds." },
    "ألوان رسم 48 لوناً": { nameEn: "48-Color Drawing Set", descEn: "Set of 48 colored pencils with eraser." },
    "لعبة ألغاز خشبية": { nameEn: "Wooden Puzzle Game", descEn: "3D educational puzzle game." },
    "حبل مقاومة مطاطي": { nameEn: "Resistance Band", descEn: "Multi-level resistance band for exercise." },
    "سجادة يوجا": { nameEn: "Yoga Mat", descEn: "Non-slip 6mm yoga mat." },
    "دمبلز معدني قابل للتعديل": { nameEn: "Adjustable Dumbbell Set", descEn: "20kg adjustable metal dumbbell set." },
    "دراجة هوائية جبلية": { nameEn: "Mountain Bike", descEn: "21-speed mountain bike with disc brakes." },
    "حقيبة ظهر رياضية": { nameEn: "Sports Backpack", descEn: "Water-resistant 40L sports backpack." },
    "زجاجة ماء حرارية": { nameEn: "Thermal Water Bottle", descEn: "Insulated stainless steel 750ml water bottle." },
    "قفازات ملاكمة": { nameEn: "Boxing Gloves", descEn: "Leather boxing gloves for training." },
    "ساعة توقيت رقمية": { nameEn: "Digital Stopwatch", descEn: "Digital electronic stopwatch with alarm." },
    "حزام رفع أوزان": { nameEn: "Weightlifting Belt", descEn: "Back support belt for weightlifting." },
    "نظارات سباحة": { nameEn: "Swimming Goggles", descEn: "Anti-fog swimming goggles." },
    "ماسحات زجاج أمامية": { nameEn: "Windshield Wipers", descEn: "High-quality windshield wipers for all cars." },
    "مصباح LED للسيارة": { nameEn: "Car LED Light", descEn: "Bright waterproof car LED light." },
    "حامل جوال للسيارة": { nameEn: "Car Phone Mount", descEn: "Magnetic phone holder for AC vents." },
    "عطر سيارة فاخر": { nameEn: "Luxury Car Perfume", descEn: "Car perfume with musk and oud scent." },
    "شاحن سيارة USB": { nameEn: "Car USB Charger", descEn: "Fast dual USB car charger." },
    "غطاء مقعد سيارة": { nameEn: "Car Seat Cover", descEn: "Universal faux leather front seat cover." },
    "جهاز تشخيص أعطال": { nameEn: "Diagnostic Scanner", descEn: "Bluetooth OBD2 car diagnostic scanner." },
    "مضخة هواء محمولة": { nameEn: "Portable Air Pump", descEn: "Electric tire air pump." },
    "فرشاة تنظيف السيارة": { nameEn: "Car Cleaning Brush", descEn: "Soft-bristle car cleaning brush." },
    "مقبس محمول لاسلكي": { nameEn: "Portable Jump Starter", descEn: "Portable jump starter with cables." },
    "قهوة عربية فاخرة": { nameEn: "Premium Arabic Coffee", descEn: "Freshly roasted Saudi Arabic coffee." },
    "عسل طبيعي 500g": { nameEn: "Natural Honey 500g", descEn: "100% organic mountain honey." },
    "زيت زيتون بكر ممتاز": { nameEn: "Extra Virgin Olive Oil", descEn: "Spanish extra virgin olive oil 1L." },
    "شوكولاتة بلجيكية": { nameEn: "Belgian Chocolate", descEn: "Premium Belgian chocolate box 24 pieces." },
    "شاي أخضر ياباني": { nameEn: "Japanese Green Tea", descEn: "Premium organic Japanese green tea." },
    "تمر سكري فاخر": { nameEn: "Premium Sukkari Dates", descEn: "Natural Sukkari dates from Qassim 1kg." },
    "مكسرات مشكلة": { nameEn: "Mixed Nuts", descEn: "Fresh mixed nuts 500g." },
    "زعتر بري": { nameEn: "Wild Za'atar", descEn: "Palestinian wild za'atar with sesame." },
    "صلصة طماطم إيطالية": { nameEn: "Italian Tomato Sauce", descEn: "Organic Italian tomato sauce 400g." },
    "عصير رمان طبيعي": { nameEn: "Natural Pomegranate Juice", descEn: "Fresh natural pomegranate juice 1L." },
    "ساعة يد رجالية": { nameEn: "Men's Wrist Watch", descEn: "Quartz watch with scratch-resistant steel band." },
    "قلادة فضة عيار 925": { nameEn: "925 Silver Pendant", descEn: "Italian silver pendant with modern design." },
    "خاتم ذهب عيار 21": { nameEn: "21K Gold Ring", descEn: "Yellow gold ring with delicate engraving." },
    "سوار جلدي رجالي": { nameEn: "Men's Leather Bracelet", descEn: "Natural leather bracelet with silver buckle." },
    "أقراط لؤلؤ": { nameEn: "Pearl Earrings", descEn: "Silver earrings with natural pearl." },
    "سلسلة ذهب عيار 18": { nameEn: "18K Gold Chain", descEn: "White gold chain with pendant." },
    "دبوس ربطة عنق": { nameEn: "Tie Pin", descEn: "Silver tie pin with gemstone." },
    "خاتم فضة رجالي": { nameEn: "Men's Silver Ring", descEn: "925 silver ring 8mm width." },
    "طقم مجوهرات نسائي": { nameEn: "Women's Jewelry Set", descEn: "Necklace and earrings set rose gold plated." },
    "محفظة جلدية فاخرة": { nameEn: "Premium Leather Wallet", descEn: "Genuine leather men's wallet." },
  };

  // Products — 100, distributed across merchants
  let createdCount = 0;
  for (const p of PRODUCTS) {
    const prefix = CATEGORY_PREFIX[p.cat] || "prod";
    const slug = `${prefix}-${createdCount + 1}`;
    const merchant = allMerchants[createdCount % allMerchants.length];
      const en = EN[p.name];
      await prisma.product.create({
        data: {
          name: p.name,
          nameEn: en?.nameEn ?? p.name,
          slug,
          description: p.desc,
          descriptionEn: en?.descEn ?? p.desc,
          price: p.price,
          categoryId: createdCategories[p.cat],
          stock: p.stock,
          featured: p.featured,
          images: img(p.cat, createdCount),
          userId: merchant.id,
        },
      });
      createdCount++;
  }

  console.log(`✅ Created ${createdCount} products (cleaned old Arabic-slug products)`);

  // Default banners
  const existingBanners = await prisma.banner.count();
  if (existingBanners === 0) {
    await prisma.banner.createMany({
      data: [
        { image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80", title: "تخفيضات تصل إلى 50%", titleEn: "Sales up to 50%", desc: "على جميع المنتجات المختارة", descEn: "On selected products", order: 0, link: "/products" },
        { image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1600&q=80", title: "شحن مجاني", titleEn: "Free Shipping", desc: "للطلبات فوق 5000 ريال", descEn: "For orders over 5000 YER", order: 1, link: "/products" },
        { image: "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1600&q=80", title: "أحدث المنتجات", titleEn: "New Arrivals", desc: "تصفح أحدث المنتجات المضافة", descEn: "Browse our latest products", order: 2, link: "/products" },
      ],
    });
    console.log("✅ Created 3 default banners");
  } else {
    console.log(`Banners: ${existingBanners} already exist`);
  }

  console.log("\n✅ Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
