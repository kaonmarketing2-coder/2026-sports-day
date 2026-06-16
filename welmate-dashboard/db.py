import sqlite3
from config import DB_PATH


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS employees (
            사번 TEXT PRIMARY KEY,
            이름 TEXT NOT NULL,
            소속 TEXT,
            직책 TEXT,
            본부 TEXT,
            그룹 TEXT,
            부서팀 TEXT,
            파트 TEXT,
            입사일 TEXT,
            상태 TEXT DEFAULT '재직',
            퇴사일 TEXT
        );

        CREATE TABLE IF NOT EXISTS wellmate (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            멘토_이름 TEXT NOT NULL,
            멘티_사번 TEXT,
            마감월 TEXT,
            엔드서베이 TEXT,
            재직확인 TEXT,
            퇴사일 TEXT,
            메모 TEXT,
            생성일 TEXT DEFAULT (date('now'))
        );
    """)
    # 기존 DB에 컬럼 추가 (마이그레이션)
    for col, default in [("상태", "'재직'"), ("퇴사일", "NULL")]:
        try:
            c.execute(f"ALTER TABLE employees ADD COLUMN {col} TEXT DEFAULT {default}")
        except Exception:
            pass
    conn.commit()
    conn.close()


def import_employees_from_df(df):
    conn = get_conn()
    c = conn.cursor()
    count = 0
    for _, row in df.iterrows():
        sabun = str(row.get("사번", "")).strip()
        name = str(row.get("이름", "")).strip()
        if not sabun or not name or sabun == "nan":
            continue
        c.execute("""
            INSERT INTO employees (사번, 이름, 소속, 직책, 본부, 그룹, 부서팀, 파트, 입사일, 상태)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '재직')
            ON CONFLICT(사번) DO UPDATE SET
                이름=excluded.이름, 소속=excluded.소속, 직책=excluded.직책,
                본부=excluded.본부, 그룹=excluded.그룹, 부서팀=excluded.부서팀,
                파트=excluded.파트, 입사일=excluded.입사일
        """, (
            sabun, name,
            _val(row, "소속"), _val(row, "직책"), _val(row, "본부"),
            _val(row, "그룹"), _val(row, "부서팀"), _val(row, "파트"),
            _val(row, "입사일"),
        ))
        count += 1
    conn.commit()
    conn.close()
    return count


def _val(row, col):
    v = row.get(col, None)
    if v is None:
        return None
    import pandas as pd
    try:
        if pd.isna(v):
            return None
    except Exception:
        pass
    if hasattr(v, "strftime"):
        return v.strftime("%Y-%m-%d")
    s = str(v).strip()
    return None if s in ("nan", "None", "-", "") else s


def get_employee(sabun):
    conn = get_conn()
    row = conn.execute("SELECT * FROM employees WHERE 사번=?", (sabun,)).fetchone()
    conn.close()
    return dict(row) if row else None


def search_employees(q, include_resigned=False):
    conn = get_conn()
    status_filter = "" if include_resigned else "AND (상태 IS NULL OR 상태='재직')"
    rows = conn.execute(
        f"SELECT * FROM employees WHERE (이름 LIKE ? OR 사번 LIKE ?) {status_filter} LIMIT 20",
        (f"%{q}%", f"%{q}%")
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_all_employees(include_resigned=False):
    conn = get_conn()
    if include_resigned:
        rows = conn.execute("SELECT * FROM employees ORDER BY 입사일 DESC").fetchall()
    else:
        rows = conn.execute("SELECT * FROM employees WHERE (상태 IS NULL OR 상태='재직') ORDER BY 입사일 DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_resigned_employees():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM employees WHERE 상태='퇴사' ORDER BY 퇴사일 DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_employee(data):
    conn = get_conn()
    conn.execute("""
        INSERT INTO employees (사번, 이름, 소속, 직책, 본부, 그룹, 부서팀, 파트, 입사일, 상태)
        VALUES (:사번,:이름,:소속,:직책,:본부,:그룹,:부서팀,:파트,:입사일,'재직')
        ON CONFLICT(사번) DO UPDATE SET
            이름=excluded.이름, 소속=excluded.소속, 직책=excluded.직책,
            본부=excluded.본부, 그룹=excluded.그룹, 부서팀=excluded.부서팀,
            파트=excluded.파트, 입사일=excluded.입사일
    """, data)
    conn.commit()
    conn.close()


def update_employee(sabun, data):
    conn = get_conn()
    conn.execute("""
        UPDATE employees SET 이름=:이름, 소속=:소속, 직책=:직책, 본부=:본부,
        그룹=:그룹, 부서팀=:부서팀, 파트=:파트, 입사일=:입사일 WHERE 사번=:sabun
    """, {**data, "sabun": sabun})
    conn.commit()
    conn.close()


def resign_employee(sabun, resign_date):
    conn = get_conn()
    conn.execute("UPDATE employees SET 상태='퇴사', 퇴사일=? WHERE 사번=?", (resign_date, sabun))
    conn.commit()
    conn.close()


def bulk_update_employees(filter_col, filter_val, update_col, update_val):
    allowed_cols = {"소속", "직책", "본부", "그룹", "부서팀", "파트"}
    if filter_col not in allowed_cols or update_col not in allowed_cols:
        return 0
    conn = get_conn()
    cur = conn.execute(
        f"UPDATE employees SET {update_col}=? WHERE {filter_col}=? AND (상태 IS NULL OR 상태='재직')",
        (update_val, filter_val)
    )
    count = cur.rowcount
    conn.commit()
    conn.close()
    return count


def delete_employee(sabun):
    conn = get_conn()
    conn.execute("DELETE FROM employees WHERE 사번=?", (sabun,))
    conn.commit()
    conn.close()


def get_all_wellmate():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM wellmate ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_wellmate(data):
    conn = get_conn()
    conn.execute("""
        INSERT INTO wellmate (멘토_이름, 멘티_사번, 마감월, 엔드서베이, 재직확인, 퇴사일, 메모)
        VALUES (:멘토_이름,:멘티_사번,:마감월,:엔드서베이,:재직확인,:퇴사일,:메모)
    """, data)
    conn.commit()
    conn.close()


def update_wellmate(id, data):
    conn = get_conn()
    conn.execute("""
        UPDATE wellmate SET 멘토_이름=:멘토_이름, 멘티_사번=:멘티_사번,
        마감월=:마감월, 엔드서베이=:엔드서베이, 재직확인=:재직확인,
        퇴사일=:퇴사일, 메모=:메모 WHERE id=:id
    """, {**data, "id": id})
    conn.commit()
    conn.close()


def delete_wellmate(id):
    conn = get_conn()
    conn.execute("DELETE FROM wellmate WHERE id=?", (id,))
    conn.commit()
    conn.close()


def get_wellmate(id):
    conn = get_conn()
    row = conn.execute("SELECT * FROM wellmate WHERE id=?", (id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_org_tree():
    conn = get_conn()
    rows = conn.execute("""
        SELECT 소속, 본부, 그룹, 부서팀, COUNT(*) as cnt
        FROM employees
        WHERE 상태 IS NULL OR 상태='재직'
        GROUP BY 소속, 본부, 그룹, 부서팀
        ORDER BY 소속, 본부, 그룹, 부서팀
    """).fetchall()
    conn.close()
    raw = {}
    for r in rows:
        s = r["소속"] or "미분류"
        b = r["본부"] or "-"
        g = r["그룹"] or "-"
        d = r["부서팀"] or "-"
        raw.setdefault(s, {}).setdefault(b, {}).setdefault(g, {})[d] = r["cnt"]

    # Precompute totals so templates don't need dict.values() filter
    result = []
    for s, 본부들 in raw.items():
        s_total = 0
        b_list = []
        for b, 그룹들 in 본부들.items():
            b_total = sum(sum(부서들.values()) for 부서들 in 그룹들.values())
            s_total += b_total
            g_list = [{"이름": g, "부서들": list(부서들.items())} for g, 부서들 in 그룹들.items()]
            b_list.append({"이름": b, "total": b_total, "그룹들": g_list})
        result.append({"이름": s, "total": s_total, "본부들": b_list})
    return result
