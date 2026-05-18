import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen px-4" style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)' }}>
      <div className="text-center text-white mb-12">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-3xl font-bold mb-2">2026 KAON 체육대회</h1>
        <p className="text-blue-200 text-lg">만족도 조사</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Link
          href="/survey"
          className="flex-1 flex flex-col items-center gap-3 bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 text-center"
        >
          <div className="text-4xl">📝</div>
          <div className="font-bold text-gray-800 text-xl">설문 참여하기</div>
          <div className="text-gray-500 text-sm">만족도를 알려주세요</div>
        </Link>

        <Link
          href="/admin"
          className="flex-1 flex flex-col items-center gap-3 bg-white/10 border-2 border-white/30 rounded-2xl p-8 hover:bg-white/20 transition-all duration-200 hover:-translate-y-1 text-center"
        >
          <div className="text-4xl">🔐</div>
          <div className="font-bold text-white text-xl">관리자 페이지</div>
          <div className="text-blue-200 text-sm">응답 데이터 확인</div>
        </Link>
      </div>
    </div>
  );
}
