import Link from 'next/link'

export default function DonePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)' }}>
      <div className="bg-white rounded-3xl shadow-2xl p-10 text-center max-w-sm w-full">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">제출 완료!</h1>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          소중한 의견을 남겨주셔서 감사합니다.<br />
          더 나은 체육대회를 만드는 데 활용하겠습니다.
        </p>
        <Link
          href="/"
          className="inline-block bg-blue-700 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-800 transition-colors"
        >
          홈으로
        </Link>
      </div>
    </div>
  )
}
