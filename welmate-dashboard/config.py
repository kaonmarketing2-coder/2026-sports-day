import os

# 알림 기준 (D-N일 이내 강조)
ALERT_DAYS = 7

# 로그인 비밀번호 (팀원 공유용)
LOGIN_PASSWORD = "kaon2026"

# Flask 설정
HOST = "0.0.0.0"   # 사내망 전체 접근 허용
PORT = 5000
DEBUG = False       # 팀원 공유 시 False 권장

# DB 파일 경로
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "wellmate.db")

# 엑셀 자동 백업 경로 (None이면 비활성화)
# Windows 예시: r"C:\Users\k250801\OneDrive - KAON MEDIA CO., LTD\Branding&Culture - 문서\브컬 only\3. 사내 프로그램\웰메이트\wellmate_backup.xlsx"
EXCEL_EXPORT_PATH = os.path.join(BASE_DIR, "wellmate_backup.xlsx")

# Flask secret key
SECRET_KEY = "kaon-wellmate-secret-2026"
