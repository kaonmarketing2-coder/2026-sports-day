# 웰메이트 대시보드 — 인수인계 문서

## 프로젝트 개요
카온미디어 브랜딩&컬처팀 웰메이트(멘토/멘티) 프로그램 관리 웹 대시보드.  
기존 엑셀 기반 업무를 Flask 웹앱으로 전환. 팀원 전체가 사내망(LAN)에서 공동 접속.

## 사용 방법 (Windows)
```
# 경로: C:\Users\k250801\kaon-agents\wellmate\
python app.py
```
- 브라우저: `http://localhost:5000` (본인), 팀원: `http://172.20.2.21:5000`
- 비밀번호: `kaon2026` (config.py에서 변경 가능)

## 파일 구조
```
wellmate/
├── app.py          ← Flask 라우트 전체
├── db.py           ← SQLite DB 함수 전체
├── config.py       ← 포트, 비밀번호, DB 경로 등 설정
├── requirements.txt
├── wellmate.db     ← SQLite DB (자동 생성)
└── templates/
    ├── base.html
    ├── index.html         ← 대시보드 (소속별 신규입사자 차트)
    ├── employees.html     ← 직원 DB 목록
    ├── employee_form.html ← 직원 추가/수정
    ├── bulk_edit.html     ← 벌크 수정
    ├── org.html           ← 조직도 (아코디언)
    ├── resigned.html      ← 퇴사자 현황 (소속별 차트)
    ├── import.html        ← 엑셀 임포트
    ├── wellmate_form.html ← 매칭 등록/수정
    └── login.html
```

## DB 스키마
### employees 테이블
| 컬럼 | 타입 | 비고 |
|------|------|------|
| 사번 | TEXT PK | |
| 이름 | TEXT | |
| 소속 | TEXT | 가온브로드밴드 등 |
| 직책 | TEXT | |
| 본부 | TEXT | |
| 그룹 | TEXT | |
| 부서팀 | TEXT | |
| 파트 | TEXT | |
| 입사일 | TEXT | YYYY-MM-DD |
| 상태 | TEXT | '재직' 또는 '퇴사' |
| 퇴사일 | TEXT | YYYY-MM-DD |

### wellmate 테이블
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | INTEGER PK | |
| 멘토_이름 | TEXT | |
| 멘티_사번 | TEXT | employees.사번 참조 |
| 마감월 | TEXT | |
| 엔드서베이 | TEXT | |
| 재직확인 | TEXT | |
| 퇴사일 | TEXT | |
| 메모 | TEXT | |
| 생성일 | TEXT | |

## 주요 기능 목록
1. **대시보드 (`/`)** — 웰메이트 매칭 현황, 마감/서베이 임박 알림, 소속별 신규입사자 Chart.js 바차트
2. **직원 DB (`/employees`)** — 이름/사번 검색, 개인 수정, 퇴사 처리, 삭제, 엑셀 추출
3. **직원 추가 (`/employees/add`)** — 폼으로 직접 입력
4. **벌크 수정 (`/employees/bulk-edit`)** — 특정 조건(소속/본부/그룹/부서팀/파트/직책)에 해당하는 직원 일괄 변경
5. **조직도 (`/org`)** — 소속→본부→그룹→부서팀 아코디언, 인쇄/PDF 저장
6. **퇴사자 (`/resigned`)** — 퇴사자 목록, 소속별 Chart.js 바차트, 엑셀 추출
7. **엑셀 임포트 (`/employees/import`)** — ROASTER 시트(header=1)에서 직원 임포트, 웰메이트 시트(index=4, header=3) 선택 임포트
8. **매칭 등록 (`/wellmate/new`)** — 멘토 이름 자동완성, 멘티 사번으로 정보 자동 채우기
9. **엑셀 추출** — 직원DB: `/employees/export`, 퇴사자: `/resigned/export`

## 주요 기술 결정 / 함정 주의사항

### 1. URL 변수는 반드시 영문 사용
```python
# 잘못됨 (Windows에서 ValueError)
@app.route("/employees/edit/<사번>")

# 올바름
@app.route("/employees/edit/<sabun>")
def employee_edit(sabun):
```

### 2. 엑셀 임포트 시 sheet_name
- ROASTER 시트: `sheet_name="ROASTER"` (이름으로 접근 가능)
- 웰메이트 시트: `sheet_name=4` (인덱스 사용, 한글 시트명이 Windows에서 깨짐)
- `engine="openpyxl"` 반드시 명시

### 3. 회사 보안 엑셀
- 보안이 걸린 엑셀은 pandas로 못 읽음 → 사용자가 보안 해제 후 wellmate 폴더에 복사

### 4. org.html의 `map('values')` 에러 (해결됨)
- Jinja2에는 `values` 필터가 없음 → `db.py`의 `get_org_tree()`에서 카운트를 Python에서 미리 계산해서 반환
- 현재 `get_org_tree()`는 `list[{이름, total, 본부들: list[{이름, total, 그룹들: list[{이름, 부서들: list[(부서, cnt)]}]}]}]` 형태 반환

### 5. 퇴사자 필터링
- `enrich_wellmate()` 함수에서 멘토 또는 멘티가 `상태='퇴사'`이면 웰메이트 현황에서 자동 제외

## LAN 접속 설정
`config.py`:
```python
HOST = "0.0.0.0"  # 팀 전체 접근 허용
PORT = 5000
```

## 남은 작업 / 개선 아이디어
- [ ] 웰메이트 임포트 시 중복 체크 (현재는 그냥 추가됨)
- [ ] 페이지네이션 (직원이 많아질 경우)
- [ ] 비밀번호 팀원별 계정 분리 (현재 공유 비밀번호)
- [ ] 웰메이트 시트 임포트 컬럼 매핑 검증

## 의존성
```
flask
pandas
openpyxl
```
설치: `pip install flask pandas openpyxl`
