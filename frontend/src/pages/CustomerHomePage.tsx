import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { formatTHB } from '../components/MenuItemCard'
import type { MenuItem } from '../types'

export function CustomerHomePage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuLoading, setMenuLoading] = useState(true)
  const aboutRef = useRef<HTMLElement>(null)
  const menuRef = useRef<HTMLElement>(null)
  const howRef = useRef<HTMLElement>(null)

  useEffect(() => {
    api.menu.list()
      .then((d) => setMenuItems(d.items.filter((i) => i.isAvailable)))
      .catch(() => {})
      .finally(() => setMenuLoading(false))
  }, [])

  function scrollToSection(ref: React.RefObject<HTMLElement | null>) {
    ref.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-30 bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <span className="text-xl font-bold text-orange-600">oshi</span>
        <nav className="flex items-center gap-4">
          <button onClick={() => scrollToSection(aboutRef)} className="text-sm text-gray-600 hover:text-orange-500 transition-colors">เกี่ยวกับเรา</button>
          <button onClick={() => scrollToSection(menuRef)} className="text-sm text-gray-600 hover:text-orange-500 transition-colors">เมนู</button>
          <button onClick={() => scrollToSection(howRef)} className="text-sm text-gray-600 hover:text-orange-500 transition-colors">วิธีสั่ง</button>
          <Link to="/orders" className="text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors">ติดตามออเดอร์</Link>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="bg-orange-50 px-6 py-20 text-center">
        <h1 className="text-5xl font-bold text-orange-600 mb-3">oshi</h1>
        <p className="text-lg text-gray-600 max-w-sm mx-auto">อาหารทำสด ทำด้วยใจ ส่งตรงถึงคุณ</p>
        <Link
          to="/order"
          className="mt-8 inline-block bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full font-semibold text-base transition-colors shadow-sm"
        >
          สั่งอาหารเลย →
        </Link>
      </section>

      {/* ── About Us ── */}
      <section ref={aboutRef} className="px-6 py-16 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">เกี่ยวกับเรา</h2>
        <div className="w-10 h-1 bg-orange-400 rounded mb-6" />
        <p className="text-gray-600 leading-relaxed mb-4">
          oshi คือร้านอาหารที่เราเชื่อว่าทุกมื้อควรเป็นมื้อที่ดี เราคัดสรรวัตถุดิบสดใหม่และปรุงอาหารตามสั่งด้วยความตั้งใจทุกจาน
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          แนวคิดของเราเรียบง่าย — อาหารดีไม่ต้องราคาสูง แค่ต้องทำด้วยใจ เราอยากให้คุณได้กินอาหารที่ดีต่อสุขภาพและอร่อยพร้อมกันในทุกวัน
        </p>
        <p className="text-gray-600 leading-relaxed">
          สั่งออนไลน์ได้ง่ายๆ ชำระเงินผ่าน PromptPay และมารับที่ร้านได้เลย ไม่มีค่าส่ง ไม่ยุ่งยาก
        </p>
      </section>

      {/* ── Menu ── */}
      <section ref={menuRef} className="bg-gray-50 px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">เมนู</h2>
          <div className="w-10 h-1 bg-orange-400 rounded mb-6" />
          {menuLoading && <p className="text-gray-400 text-center py-8">กำลังโหลด...</p>}
          {!menuLoading && menuItems.length === 0 && (
            <p className="text-gray-400 text-center py-8">ยังไม่มีเมนูในขณะนี้</p>
          )}
          {!menuLoading && menuItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {menuItems.map((item) => (
                <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                  {item.imageKey && (
                    <img
                      src={`/api/menu/${item.id}/image`}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                    )}
                    <p className="text-orange-600 font-bold text-sm mt-1">{formatTHB(item.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── How to Order ── */}
      <section ref={howRef} className="px-6 py-16 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">วิธีสั่งซื้อ</h2>
        <div className="w-10 h-1 bg-orange-400 rounded mb-6" />
        <ol className="space-y-4">
          {[
            { step: '1', text: 'เลือกเมนูที่ต้องการและเพิ่มลงตะกร้า' },
            { step: '2', text: 'กรอกชื่อและเบอร์โทรศัพท์ของคุณ' },
            { step: '3', text: 'โอนเงินผ่าน PromptPay ตามยอดที่แจ้ง' },
            { step: '4', text: 'อัปโหลดหลักฐานการโอนเงินในแอป' },
            { step: '5', text: 'รอรับการยืนยันและมารับอาหารที่จุดรับสินค้า' },
          ].map(({ step, text }) => (
            <li key={step} className="flex items-start gap-4">
              <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-bold text-sm flex items-center justify-center shrink-0">
                {step}
              </span>
              <p className="text-gray-600 pt-1">{text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 text-center">
          <Link
            to="/order"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-10 py-3.5 rounded-full font-semibold text-base transition-colors shadow-sm"
          >
            สั่งอาหารเลย →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 text-center text-xs py-6 px-4">
        <p className="font-semibold text-white mb-1">oshi</p>
        <p>© {new Date().getFullYear()} oshi. All rights reserved.</p>
      </footer>
    </div>
  )
}
