// Seed 30 sample menu items to the local dev server.
// Usage: node scripts/seed-menu.mjs
// Requires the worker to be running on http://localhost:8787

const BASE = 'http://localhost:8787/api'
const SECRET = process.env.MERCHANT_SECRET ?? 'dev-secret-change-me'

const MENUS = [
  // Rice dishes
  { name: 'ข้าวผัดกระเพราหมูสับ', description: 'ข้าวผัดกระเพราหมูสับไข่ดาว', price: 6000 },
  { name: 'ข้าวผัดกระเพราไก่', description: 'ข้าวผัดกระเพราไก่สับไข่ดาว', price: 6000 },
  { name: 'ข้าวผัดกระเพราทะเล', description: 'กุ้ง หมึก หอย ผัดกระเพราเผ็ดร้อน', price: 8000 },
  { name: 'ข้าวมันไก่', description: 'ข้าวมันไก่ต้มพร้อมน้ำซุปใสและน้ำจิ้ม', price: 6500 },
  { name: 'ข้าวหมูแดง', description: 'ข้าวหมูแดงกรอบราดน้ำแดง', price: 6500 },
  { name: 'ข้าวหน้าเป็ด', description: 'เป็ดพะโล้หั่นบางราดหน้าข้าว', price: 7000 },
  { name: 'ข้าวผัดข้าวเหนียวไข่', description: 'ข้าวผัดข้าวเหนียวไข่เจียว', price: 5500 },
  // Noodles
  { name: 'ผัดไทยกุ้งสด', description: 'ผัดไทยเส้นเล็กกุ้งสดใส่ถั่วงอก', price: 7500 },
  { name: 'ผัดซีอิ๊วหมู', description: 'เส้นใหญ่ผัดซีอิ๊วหมูไข่', price: 6000 },
  { name: 'ราดหน้าหมู', description: 'เส้นใหญ่ราดหน้าหมูซอสข้นหนา', price: 6000 },
  { name: 'ก๋วยเตี๋ยวต้มยำ', description: 'ก๋วยเตี๋ยวน้ำต้มยำกุ้งเผ็ดร้อน', price: 7000 },
  { name: 'บะหมี่เป็ดต้มยำ', description: 'บะหมี่แห้งเป็ดต้มยำ', price: 7500 },
  // Soups / Curries
  { name: 'แกงเขียวหวานไก่', description: 'แกงเขียวหวานไก่ใส่มะเขือพวง', price: 7000 },
  { name: 'แกงมัสมั่นเนื้อ', description: 'แกงมัสมั่นเนื้อใส่มันฝรั่งและถั่วลิสง', price: 9000 },
  { name: 'ต้มยำกุ้งน้ำข้น', description: 'ต้มยำกุ้งน้ำข้นเห็ดฟาง', price: 9500 },
  { name: 'ต้มข่าไก่', description: 'ต้มข่าไก่กะทิสมุนไพร', price: 7500 },
  // Stir-fry
  { name: 'ผัดกะเพราเนื้อ', description: 'เนื้อวัวผัดกะเพราใบ', price: 8500 },
  { name: 'ผัดฉ่าทะเล', description: 'กุ้ง หมึก ปลาหมึกผัดฉ่าสมุนไพร', price: 9000 },
  { name: 'หมูกระเทียมพริกไทย', description: 'หมูทอดกระเทียมพริกไทยดำ', price: 7000 },
  { name: 'ไก่ผัดเม็ดมะม่วง', description: 'ไก่ผัดเม็ดมะม่วงหิมพานต์พริกหวาน', price: 8000 },
  // Grilled / Fried
  { name: 'ปลาทับทิมทอดน้ำปลา', description: 'ปลาทับทิมทอดกรอบราดน้ำปลา', price: 18000 },
  { name: 'ไก่ทอดน้ำปลา', description: 'ไก่ทอดกรอบน้ำปลาเสิร์ฟพร้อมข้าว', price: 7500 },
  { name: 'หมูปิ้ง', description: 'หมูปิ้งหมักสมุนไพร 3 ไม้', price: 4500 },
  { name: 'ไก่ย่างพร้อมส้มตำ', description: 'ไก่ย่างครึ่งตัวเสิร์ฟพร้อมส้มตำไทย', price: 15000 },
  // Salads / Sides
  { name: 'ส้มตำไทย', description: 'ส้มตำมะละกอสูตรดั้งเดิม', price: 5500 },
  { name: 'ลาบหมู', description: 'ลาบหมูสดเครื่องเทศ', price: 7000 },
  { name: 'ยำวุ้นเส้น', description: 'ยำวุ้นเส้นกุ้งสด', price: 7000 },
  // Desserts / Drinks
  { name: 'ข้าวเหนียวมะม่วง', description: 'ข้าวเหนียวมะม่วงสุกกะทิสด', price: 7500 },
  { name: 'ชาไทยเย็น', description: 'ชาไทยใส่นมข้นหวาน', price: 3500 },
  { name: 'น้ำมะพร้าว', description: 'น้ำมะพร้าวอ่อนสดพร้อมเนื้อ', price: 4000 },
]

async function main() {
  // Login
  const loginRes = await fetch(`${BASE}/merchant/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: SECRET }),
  })
  if (!loginRes.ok) {
    console.error('Login failed:', await loginRes.text())
    process.exit(1)
  }
  const cookie = loginRes.headers.get('set-cookie')
    ?.split(',')
    .map(s => s.split(';')[0].trim())
    .join('; ') ?? ''

  console.log(`Logged in. Seeding ${MENUS.length} items...\n`)

  let ok = 0
  for (const item of MENUS) {
    const res = await fetch(`${BASE}/merchant/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(item),
    })
    if (res.ok) {
      const { id } = await res.json()
      console.log(`  ✓ ${item.name} (${(item.price / 100).toFixed(0)} ฿) → ${id}`)
      ok++
    } else {
      console.error(`  ✗ ${item.name}: ${await res.text()}`)
    }
  }

  console.log(`\nDone: ${ok}/${MENUS.length} items seeded.`)
}

main()
