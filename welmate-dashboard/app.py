from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash, Response
import pandas as pd
from datetime import datetime, date
import io, os
from db import (
    init_db, get_all_wellmate, add_wellmate, update_wellmate, delete_wellmate,
    get_wellmate, get_employee, search_employees, get_all_employees,
    add_employee, update_employee, delete_employee, import_employees_from_df,
    resign_employee, get_resigned_employees, bulk_update_employees, get_org_tree,
    get_monthly_hire_counts, get_monthly_resign_counts, get_소속_dist,
    get_employees_by_hire_month, get_employees_by_resign_month,
    get_employees_by_소속_name, get_pending_wellmates,
    get_직책_dist, get_employees_by_직책_cat, get_avg_tenure, get_calendar_events,
    get_team_list, export_to_excel,
)
from config import HOST, PORT, DEBUG, SECRET_KEY, LOGIN_PASSWORD, ALERT_DAYS, EXCEL_EXPORT_PATH


def _auto_export():
    """직원/웰메이트 변경 후 엑셀 자동 저장 (실패해도 무시)"""
    if not EXCEL_EXPORT_PATH:
        return
    try:
        export_to_excel(EXCEL_EXPORT_PATH)
        print(f"[엑셀 저장 완료] {EXCEL_EXPORT_PATH}")
    except Exception as e:
        print(f"[엑셀 저장 실패] {e}")

app = Flask(__name__)
app.secret_key = SECRET_KEY


def login_required(f):
    from functools import wraps
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get("logged_in"):
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return wrapper


def enrich_wellmate(records):
    today = date.today()
    all_emps = {e["사번"]: e for e in get_all_employees(include_resigned=True)}
    all_emps_by_name = {}
    for e in get_all_employees(include_resigned=True):
        all_emps_by_name.setdefault(e["이름"], e)

    result = []
    for r in records:
        mentee = all_emps.get(r["멘티_사번"]) if r["멘티_사번"] else None
        mentor = all_emps_by_name.get(r["멘토_이름"])

        # 퇴사자 제외
        if mentee and mentee.get("상태") == "퇴사":
            continue
        if mentor and mentor.get("상태") == "퇴사":
            continue

        def days_left(d_str):
            if not d_str:
                return None
            try:
                d = datetime.strptime(d_str, "%Y-%m-%d").date()
                return (d - today).days
            except Exception:
                return None

        마감_잔여일 = days_left(r["마감월"])
        서베이_잔여일 = days_left(r["엔드서베이"])
        재직중 = not r["재직확인"]

        result.append({
            **r,
            "멘토": mentor,
            "멘티": mentee,
            "마감_잔여일": 마감_잔여일,
            "서베이_잔여일": 서베이_잔여일,
            "재직중": 재직중,
            "마감_임박": 재직중 and 마감_잔여일 is not None and 0 <= 마감_잔여일 <= ALERT_DAYS,
            "서베이_임박": 재직중 and 서베이_잔여일 is not None and 0 <= 서베이_잔여일 <= ALERT_DAYS,
        })
    return result


# ── 로그인 ──────────────────────────────────────────
@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        if request.form.get("password") == LOGIN_PASSWORD:
            session["logged_in"] = True
            return redirect(url_for("index"))
        error = "비밀번호가 틀렸습니다."
    return render_template("login.html", error=error)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


# ── 대시보드 ─────────────────────────────────────────
@app.route("/")
@login_required
def index():
    all_wm = [r for r in get_all_wellmate() if r.get("멘토_이름")]
    records = enrich_wellmate(all_wm)
    pending_wellmates = get_pending_wellmates()
    today = date.today()
    today_str = today.strftime("%Y-%m-%d")
    today_ym = today.strftime("%Y-%m")

    # 소속별 신규입사자 (웰메이트 기준)
    소속_count = {}
    for r in records:
        if r.get("멘티") and r["재직중"]:
            s = r["멘티"].get("소속") or "미분류"
            소속_count[s] = 소속_count.get(s, 0) + 1

    # 전체 재직 인원
    all_emps = get_all_employees()
    total_employees = len(all_emps)

    # 이번달 입사/퇴사
    this_month_hires = get_employees_by_hire_month(today_ym)
    this_month_resigned = get_employees_by_resign_month(today_ym)

    # 월별 차트 데이터 (12개월)
    monthly_hires = get_monthly_hire_counts(12)
    monthly_resigned = get_monthly_resign_counts(12)

    # 소속별 분포
    소속_dist = get_소속_dist()

    # 직책별 분포 + 평균 재직기간
    직책_dist = get_직책_dist()
    avg_tenure = get_avg_tenure()

    # 웰메이트 진행률 (재직확인 완료 / 전체 활성 레코드)
    active = [r for r in records if r["재직중"]]
    wm_total = len(active)
    wm_done = sum(1 for r in active if r.get("재직확인"))
    wm_pct = round(wm_done / wm_total * 100) if wm_total else 0
    wm_incomplete = [r for r in active if not r.get("재직확인")]

    summary = {
        "총원": len(records),
        "재직중": sum(1 for r in records if r["재직중"]),
        "마감_임박": sum(1 for r in records if r["마감_임박"]),
        "서베이_임박": sum(1 for r in records if r["서베이_임박"]),
        "기준일": today_str,
        "alert_days": ALERT_DAYS,
    }
    # 마감 임박 통합 목록 (마감월 + 엔드서베이, D-30 이내, 날짜순 정렬)
    upcoming = []
    for r in records:
        mentee_name = (r.get("멘티") or {}).get("이름") or r.get("멘티_사번") or "-"
        if r["마감_잔여일"] is not None and 0 <= r["마감_잔여일"] <= 30:
            upcoming.append({"이름": mentee_name, "종류": "마감월", "날짜": r["마감월"], "잔여일": r["마감_잔여일"]})
        if r["서베이_잔여일"] is not None and 0 <= r["서베이_잔여일"] <= 30:
            upcoming.append({"이름": mentee_name, "종류": "엔드서베이", "날짜": r["엔드서베이"], "잔여일": r["서베이_잔여일"]})
    upcoming.sort(key=lambda x: x["잔여일"])

    return render_template("index.html",
        records=records, summary=summary, 소속_count=소속_count,
        total_employees=total_employees,
        this_month_hires=this_month_hires,
        this_month_resigned=this_month_resigned,
        monthly_hires=monthly_hires,
        monthly_resigned=monthly_resigned,
        소속_dist=소속_dist,
        직책_dist=직책_dist,
        avg_tenure=avg_tenure,
        wm_total=wm_total, wm_done=wm_done, wm_pct=wm_pct,
        wm_incomplete=wm_incomplete,
        today_ym=today_ym,
        pending_wellmates=pending_wellmates,
        upcoming=upcoming,
    )


# ── 대시보드 세부내역 API ─────────────────────────────────────────
@app.route("/api/dashboard/hires/<yyyymm>")
@login_required
def api_dashboard_hires(yyyymm):
    return jsonify(get_employees_by_hire_month(yyyymm))


@app.route("/api/dashboard/resigned/<yyyymm>")
@login_required
def api_dashboard_resigned(yyyymm):
    return jsonify(get_employees_by_resign_month(yyyymm))


@app.route("/api/dashboard/by-sokcheol")
@login_required
def api_dashboard_by_소속():
    name = request.args.get("name", "")
    return jsonify(get_employees_by_소속_name(name))


@app.route("/api/dashboard/by-jikchek")
@login_required
def api_dashboard_by_직책():
    cat = request.args.get("cat", "")
    return jsonify(get_employees_by_직책_cat(cat))


@app.route("/api/calendar/<int:year>/<int:month>")
@login_required
def api_calendar(year, month):
    return jsonify(get_calendar_events(year, month))


@app.route("/api/dashboard/wm-incomplete")
@login_required
def api_dashboard_wm_incomplete():
    records = enrich_wellmate(get_all_wellmate())
    active = [r for r in records if r["재직중"] and not r.get("재직확인")]
    result = []
    for r in active:
        result.append({
            "id": r["id"],
            "멘토_이름": r["멘토_이름"],
            "멘티_이름": r["멘티"]["이름"] if r.get("멘티") else "-",
            "멘티_소속": r["멘티"]["소속"] if r.get("멘티") else "-",
            "마감월": r["마감월"] or "-",
            "마감_잔여일": r["마감_잔여일"],
            "메모": r["메모"] or "",
        })
    return jsonify(result)


# ── 직원 DB ──────────────────────────────────────────
@app.route("/employees")
@login_required
def employees():
    q = request.args.get("q", "")
    rows = search_employees(q) if q else get_all_employees()
    return render_template("employees.html", employees=rows, q=q)


@app.route("/employees/add", methods=["GET", "POST"])
@login_required
def employee_add():
    if request.method == "POST":
        이름 = request.form["이름"].strip()
        existing = [e for e in get_all_employees(include_resigned=True) if e["이름"] == 이름]
        if existing:
            flash(f"이미 '{이름}' 이름의 직원이 존재합니다 (사번: {existing[0]['사번']}). 동명이인은 등록할 수 없습니다.", "danger")
            return render_template("employee_form.html", emp={"이름": 이름, **{k: request.form.get(k,"") for k in ["사번","직책","소속","본부","그룹","부서팀","파트","입사일","메모"]}}, mode="add")
        add_employee({
            "사번": request.form["사번"].strip(),
            "이름": 이름,
            "소속": request.form.get("소속", ""),
            "직책": request.form.get("직책", ""),
            "본부": request.form.get("본부", ""),
            "그룹": request.form.get("그룹", ""),
            "부서팀": request.form.get("부서팀", ""),
            "파트": request.form.get("파트", ""),
            "입사일": request.form.get("입사일", ""),
            "메모": request.form.get("메모", "") or None,
        })
        sabun = request.form["사번"].strip()
        new_wm_id = add_wellmate({
            "멘토_이름": "", "멘티_사번": sabun,
            "마감월": None, "엔드서베이": None,
            "재직확인": None, "퇴사일": None, "메모": None,
        })
        _auto_export()
        flash("직원이 등록되었습니다. 웰메이트를 배정해 주세요.")
        return redirect(url_for("wellmate_edit", id=new_wm_id))
    return render_template("employee_form.html", emp=None, mode="add")


@app.route("/employees/edit/<sabun>", methods=["GET", "POST"])
@login_required
def employee_edit(sabun):
    emp = get_employee(sabun)
    if not emp:
        return redirect(url_for("employees"))
    if request.method == "POST":
        update_employee(sabun, {
            "이름": request.form["이름"].strip(),
            "소속": request.form.get("소속", ""),
            "직책": request.form.get("직책", ""),
            "본부": request.form.get("본부", ""),
            "그룹": request.form.get("그룹", ""),
            "부서팀": request.form.get("부서팀", ""),
            "파트": request.form.get("파트", ""),
            "입사일": request.form.get("입사일", ""),
            "메모": request.form.get("메모", "") or None,
        })
        _auto_export()
        flash("수정되었습니다.")
        return redirect(url_for("employees"))
    return render_template("employee_form.html", emp=emp, mode="edit")


@app.route("/employees/resign/<sabun>", methods=["POST"])
@login_required
def employee_resign(sabun):
    resign_date = request.form.get("퇴사일") or date.today().strftime("%Y-%m-%d")
    resign_employee(sabun, resign_date)
    _auto_export()
    flash("퇴사 처리되었습니다.")
    return redirect(url_for("employees"))


@app.route("/employees/delete/<sabun>", methods=["POST"])
@login_required
def employee_delete(sabun):
    delete_employee(sabun)
    _auto_export()
    flash("삭제되었습니다.")
    return redirect(url_for("employees"))


@app.route("/employees/bulk-edit", methods=["GET", "POST"])
@login_required
def employee_bulk_edit():
    result = None
    if request.method == "POST":
        filter_col = request.form.get("filter_col")
        filter_val = request.form.get("filter_val", "").strip()
        update_col = request.form.get("update_col")
        update_val = request.form.get("update_val", "").strip()
        if filter_col and filter_val and update_col and update_val:
            count = bulk_update_employees(filter_col, filter_val, update_col, update_val)
            result = f"{count}명 업데이트 완료"
    return render_template("bulk_edit.html", result=result)


@app.route("/employees/import", methods=["GET", "POST"])
@login_required
def employee_import():
    result = None
    wellmate_result = None
    if request.method == "POST":
        f = request.files.get("file")
        if f:
            file_bytes = f.read()
            df = pd.read_excel(io.BytesIO(file_bytes), sheet_name="ROASTER", header=1, engine="openpyxl")
            df = df.rename(columns={"본부/실": "본부", "부서/팀": "부서팀"})
            count = import_employees_from_df(df)
            result = f"{count}명 임포트 완료"

            if request.form.get("import_wellmate"):
                wm_df = pd.read_excel(io.BytesIO(file_bytes), sheet_name=4, header=3, engine="openpyxl")
                wm_count = 0
                for _, row in wm_df.iterrows():
                    mentor_name = str(row.get("이름", "")).strip()
                    if not mentor_name or mentor_name in ("nan", "None", "이름"):
                        continue
                    cols = list(wm_df.columns)
                    sabun_col = "사번.1" if "사번.1" in cols else (cols[8] if len(cols) > 8 else None)
                    mentee_sabun = str(row.get(sabun_col, "")).strip() if sabun_col else ""
                    if mentee_sabun in ("nan", "None", ""):
                        mentee_sabun = None

                    def fmt(v):
                        if v is None: return None
                        try:
                            if pd.isna(v): return None
                        except Exception:
                            pass
                        if hasattr(v, "strftime"): return v.strftime("%Y-%m-%d")
                        s = str(v).strip()
                        return None if s in ("nan", "None", "") else s

                    add_wellmate({
                        "멘토_이름": mentor_name,
                        "멘티_사번": mentee_sabun,
                        "마감월": fmt(row.get("마감월")),
                        "엔드서베이": fmt(row.get("엔드서베이")),
                        "재직확인": fmt(row.get("재직확인")),
                        "퇴사일": fmt(row.get("퇴사일")),
                        "메모": None,
                    })
                    wm_count += 1
                wellmate_result = f"웰메이트 매칭 {wm_count}건 임포트 완료"

    if result or wellmate_result:
        _auto_export()
    return render_template("import.html", result=result, wellmate_result=wellmate_result)


@app.route("/employees/export")
@login_required
def employee_export():
    import openpyxl
    rows = get_all_employees()
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "직원DB"
    headers = ["사번", "이름", "직책", "소속", "본부", "그룹", "부서팀", "파트", "입사일"]
    ws.append(headers)
    for e in rows:
        ws.append([e.get(h) or "" for h in headers])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return Response(buf.read(), mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": "attachment; filename=employees.xlsx"})


# ── 자동완성 API ──────────────────────────────────────
@app.route("/api/employee/<sabun>")
@login_required
def api_employee(sabun):
    emp = get_employee(sabun.strip())
    return jsonify(emp) if emp else (jsonify({}), 404)


@app.route("/api/search")
@login_required
def api_search():
    q = request.args.get("q", "")
    return jsonify(search_employees(q))


@app.route("/api/org-hierarchy")
@login_required
def api_org_hierarchy():
    """소속 + 하위 단위값 입력 시 나머지 계층 자동완성"""
    소속 = request.args.get("소속", "").strip()
    field = request.args.get("field", "").strip()   # 파트|부서팀|그룹|본부
    value = request.args.get("value", "").strip()
    if not (소속 and field and value):
        return jsonify({})
    allowed = {"파트", "부서팀", "그룹", "본부"}
    if field not in allowed:
        return jsonify({})
    conn = __import__("db").get_conn()
    row = conn.execute(
        f"SELECT 본부,그룹,부서팀,파트 FROM employees WHERE 소속=? AND {field}=? AND (상태 IS NULL OR 상태='재직') LIMIT 1",
        (소속, value)
    ).fetchone()
    conn.close()
    return jsonify(dict(row)) if row else jsonify({})


# ── 조직도 ────────────────────────────────────────────
@app.route("/org")
@login_required
def org():
    tree = get_org_tree()
    teams = get_team_list()
    return render_template("org.html", tree=tree, teams=teams)


# ── 퇴사자 ────────────────────────────────────────────
@app.route("/resigned")
@login_required
def resigned():
    rows = get_resigned_employees()
    소속_count = {}
    for e in rows:
        s = e.get("소속") or "미분류"
        소속_count[s] = 소속_count.get(s, 0) + 1
    return render_template("resigned.html", employees=rows, 소속_count=소속_count)


@app.route("/resigned/export")
@login_required
def resigned_export():
    import openpyxl
    rows = get_resigned_employees()
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "퇴사자"
    headers = ["사번", "이름", "직책", "소속", "본부", "부서팀", "입사일", "퇴사일"]
    ws.append(headers)
    for e in rows:
        ws.append([e.get(h) or "" for h in headers])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return Response(buf.read(), mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": "attachment; filename=resigned.xlsx"})


# ── 웰메이트 매칭 ─────────────────────────────────────
@app.route("/wellmate/new", methods=["GET", "POST"])
@login_required
def wellmate_new():
    if request.method == "POST":
        add_wellmate({
            "멘토_이름": request.form["멘토_이름"].strip(),
            "멘티_사번": request.form.get("멘티_사번", "").strip() or None,
            "마감월": request.form.get("마감월") or None,
            "엔드서베이": request.form.get("엔드서베이") or None,
            "재직확인": request.form.get("재직확인") or None,
            "퇴사일": request.form.get("퇴사일") or None,
            "메모": request.form.get("메모") or None,
        })
        _auto_export()
        flash("매칭이 등록되었습니다.")
        return redirect(url_for("index"))
    return render_template("wellmate_form.html", wm=None, mode="new")


@app.route("/wellmate/edit/<int:id>", methods=["GET", "POST"])
@login_required
def wellmate_edit(id):
    wm = get_wellmate(id)
    if not wm:
        return redirect(url_for("index"))
    if request.method == "POST":
        mentor = request.form.get("멘토_이름", "").strip()
        update_wellmate(id, {
            "멘토_이름": mentor or "",
            "멘티_사번": request.form.get("멘티_사번", "").strip() or None,
            "마감월": request.form.get("마감월") or None,
            "엔드서베이": request.form.get("엔드서베이") or None,
            "재직확인": request.form.get("재직확인") or None,
            "퇴사일": request.form.get("퇴사일") or None,
            "메모": request.form.get("메모") or None,
        })
        if mentor:
            _auto_export()
            flash("매칭이 저장되었습니다.")
            return redirect(url_for("index"))
        else:
            flash("웰메이트가 입력되지 않았습니다. 배정 후 다시 저장하세요.", "warning")
            return redirect(url_for("wellmate_edit", id=id))
    # 멘티 직원 정보 조회 (이메일 초안용)
    mentee_emp = get_employee(wm["멘티_사번"]) if wm.get("멘티_사번") else None
    return render_template("wellmate_form.html", wm=wm, mode="edit", mentee_emp=mentee_emp)


@app.route("/wellmate/delete/<int:id>", methods=["POST"])
@login_required
def wellmate_delete(id):
    delete_wellmate(id)
    _auto_export()
    flash("삭제되었습니다.")
    return redirect(url_for("index"))


if __name__ == "__main__":
    init_db()
    app.run(host=HOST, port=PORT, debug=DEBUG)
