import glob
import os
import pandas as pd
from datetime import datetime
from config import WELLMATE_FOLDER, ALERT_DAYS


def find_latest_excel():
    files = glob.glob(os.path.join(WELLMATE_FOLDER, "*.xlsx"))
    if not files:
        raise FileNotFoundError(f"엑셀 파일을 찾을 수 없습니다: {WELLMATE_FOLDER}")
    return max(files, key=os.path.getmtime)


def load_roster(file_path):
    """ROASTER 시트에서 전사 직원 마스터 데이터 로드"""
    df = pd.read_excel(file_path, sheet_name="ROASTER", header=1, engine="openpyxl")
    df = df.rename(columns={
        "사번": "사번",
        "이름": "이름",
        "소속": "소속",
        "직책": "직책",
        "본부/실": "본부",
        "그룹": "그룹",
        "부서/팀": "부서팀",
        "파트": "파트",
        "입사일": "입사일",
    })
    df = df[df["사번"].notna() & df["이름"].notna()]
    df["사번"] = df["사번"].astype(str).str.strip()
    df["이름"] = df["이름"].astype(str).str.strip()
    return df


def lookup(roster, key, key_col, target_col):
    """roster에서 key_col==key인 행의 target_col 값 반환"""
    rows = roster[roster[key_col] == str(key).strip()]
    if rows.empty:
        return "-"
    val = rows.iloc[0][target_col]
    if pd.isna(val):
        return "-"
    if hasattr(val, "strftime"):
        return val.strftime("%Y-%m-%d")
    return str(val).strip()


def load_data():
    file_path = find_latest_excel()
    roster = load_roster(file_path)

    # 웰메이트 시트 읽기 (4번째 행이 헤더, 0-indexed=3)
    wm = pd.read_excel(file_path, sheet_name="웰메이트", header=3, engine="openpyxl")

    # 실제 컬럼명 매핑 (엑셀 헤더 기준)
    # 웰메이트: 사번(B), 예산(C), 이름(D) / 신규입사자: 사번(J=두번째사번) / 마감월, 엔드서베이, 재직확인
    col_names = list(wm.columns)

    # 이름 컬럼 찾기
    mentor_name_col = "이름" if "이름" in col_names else col_names[2]
    mentee_sabun_col = "사번.1" if "사번.1" in col_names else None

    # 사번 중복 처리 (pandas가 두 번째 사번을 사번.1로 rename)
    if mentee_sabun_col is None:
        # 직접 위치로 찾기 (J열 = index 8, 0-based from B = index 8)
        mentee_sabun_col = col_names[8] if len(col_names) > 8 else None

    today = pd.Timestamp(datetime.now().date())

    records = []
    for _, row in wm.iterrows():
        mentor_name = str(row.get(mentor_name_col, "")).strip()
        if not mentor_name or mentor_name in ("nan", "None", "이름"):
            continue

        # 신규입사자 사번
        mentee_sabun = str(row.get(mentee_sabun_col, "")).strip() if mentee_sabun_col else "-"
        if mentee_sabun in ("nan", "None", ""):
            mentee_sabun = "-"

        # ROASTER에서 멘토 정보 조회
        mentor_info = {
            "직책": lookup(roster, mentor_name, "이름", "직책"),
            "소속": lookup(roster, mentor_name, "이름", "소속"),
            "본부": lookup(roster, mentor_name, "이름", "본부"),
            "그룹": lookup(roster, mentor_name, "이름", "그룹"),
            "부서팀": lookup(roster, mentor_name, "이름", "부서팀"),
        }

        # ROASTER에서 신규입사자 정보 조회
        if mentee_sabun != "-":
            mentee_info = {
                "이름": lookup(roster, mentee_sabun, "사번", "이름"),
                "직책": lookup(roster, mentee_sabun, "사번", "직책"),
                "소속": lookup(roster, mentee_sabun, "사번", "소속"),
                "본부": lookup(roster, mentee_sabun, "사번", "본부"),
                "그룹": lookup(roster, mentee_sabun, "사번", "그룹"),
                "부서팀": lookup(roster, mentee_sabun, "사번", "부서팀"),
                "파트": lookup(roster, mentee_sabun, "사번", "파트"),
                "입사일": lookup(roster, mentee_sabun, "사번", "입사일"),
            }
        else:
            mentee_info = {k: "-" for k in ["이름", "직책", "소속", "본부", "그룹", "부서팀", "파트", "입사일"]}

        # 날짜 처리
        마감월_raw = row.get("마감월", None)
        서베이_raw = row.get("엔드서베이", None)
        재직확인 = row.get("재직확인", None)

        마감월_d = pd.to_datetime(마감월_raw, errors="coerce")
        서베이_d = pd.to_datetime(서베이_raw, errors="coerce")

        마감_잔여일 = int((마감월_d - today).days) if pd.notna(마감월_d) else None
        서베이_잔여일 = int((서베이_d - today).days) if pd.notna(서베이_d) else None

        재직중 = pd.isna(재직확인) or str(재직확인).strip() == ""

        records.append({
            # 웰메이트 (멘토)
            "멘토_이름": mentor_name,
            "멘토_직책": mentor_info["직책"],
            "멘토_소속": mentor_info["소속"],
            "멘토_본부": mentor_info["본부"],
            "멘토_부서팀": mentor_info["부서팀"],
            # 신규입사자 (멘티)
            "멘티_사번": mentee_sabun,
            "멘티_이름": mentee_info["이름"],
            "멘티_직책": mentee_info["직책"],
            "멘티_소속": mentee_info["소속"],
            "멘티_부서팀": mentee_info["부서팀"],
            "멘티_파트": mentee_info["파트"],
            "멘티_입사일": mentee_info["입사일"],
            # 일정
            "마감월": 마감월_d.strftime("%Y-%m-%d") if pd.notna(마감월_d) else "-",
            "엔드서베이": 서베이_d.strftime("%Y-%m-%d") if pd.notna(서베이_d) else "-",
            "마감_잔여일": 마감_잔여일,
            "서베이_잔여일": 서베이_잔여일,
            "마감_임박": 재직중 and 마감_잔여일 is not None and 0 <= 마감_잔여일 <= ALERT_DAYS,
            "서베이_임박": 재직중 and 서베이_잔여일 is not None and 0 <= 서베이_잔여일 <= ALERT_DAYS,
            "재직중": 재직중,
        })

    재직중_수 = sum(1 for r in records if r["재직중"])
    summary = {
        "총원": len(records),
        "재직중": 재직중_수,
        "마감_임박": sum(1 for r in records if r["마감_임박"]),
        "서베이_임박": sum(1 for r in records if r["서베이_임박"]),
        "기준파일": os.path.basename(file_path),
        "기준일": today.strftime("%Y-%m-%d"),
        "alert_days": ALERT_DAYS,
    }

    return records, summary
