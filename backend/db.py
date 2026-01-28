"""
PostgreSQL 데이터베이스 클라이언트
Supabase 클라이언트 인터페이스와 호환되는 래퍼
"""
import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

# 연결 풀
_connection = None


def get_connection():
    global _connection
    if _connection is None or _connection.closed:
        _connection = psycopg2.connect(
            host=os.environ["DB_HOST"],
            port=os.environ["DB_PORT"],
            database=os.environ["DB_NAME"],
            user=os.environ["DB_USER"],
            password=os.environ["DB_PASSWORD"]
        )
        _connection.autocommit = True
        # 스키마 설정
        cur = _connection.cursor()
        schema = os.environ.get("DB_SCHEMA", "public")
        cur.execute(f'SET search_path TO "{schema}";')
        cur.close()
    return _connection


def serialize_row(row):
    """datetime 객체를 ISO 문자열로 변환"""
    from datetime import datetime, date
    result = {}
    for key, value in row.items():
        if isinstance(value, (datetime, date)):
            result[key] = value.isoformat()
        elif isinstance(value, dict):
            result[key] = serialize_row(value)
        else:
            result[key] = value
    return result


class QueryResult:
    def __init__(self, data):
        # datetime 직렬화
        self.data = [serialize_row(row) if isinstance(row, dict) else row for row in data]


class QueryBuilder:
    def __init__(self, table_name):
        self.table_name = table_name
        self._select_cols = "*"
        self._where_clauses = []
        self._where_values = []
        self._order_by = None
        self._order_desc = False
        self._limit = None
        self._operation = "select"
        self._insert_data = None
        self._update_data = None
        self._joins = []

    def select(self, cols="*"):
        self._operation = "select"
        self._select_cols = cols
        # 조인 쿼리 파싱 (예: "*, teams(*)")
        self._joins = []
        if "(*)" in cols:
            import re
            # teams(*) 같은 패턴 찾기
            join_matches = re.findall(r'(\w+)\(\*\)', cols)
            for join_table in join_matches:
                self._joins.append(join_table)
            # 조인 부분 제거하고 기본 컬럼만 남기기
            self._select_cols = re.sub(r',?\s*\w+\(\*\)', '', cols).strip().rstrip(',').strip() or "*"
        return self

    def insert(self, data):
        self._operation = "insert"
        self._insert_data = data
        return self

    def update(self, data):
        self._operation = "update"
        self._update_data = data
        return self

    def delete(self):
        self._operation = "delete"
        return self

    def eq(self, column, value):
        self._where_clauses.append(f'"{column}" = %s')
        self._where_values.append(value)
        return self

    def neq(self, column, value):
        self._where_clauses.append(f'"{column}" != %s')
        self._where_values.append(value)
        return self

    def is_(self, column, value):
        if value is None:
            self._where_clauses.append(f'"{column}" IS NULL')
        else:
            self._where_clauses.append(f'"{column}" IS %s')
            self._where_values.append(value)
        return self

    def in_(self, column, values):
        if not values:
            # 빈 배열이면 결과 없음 조건 추가
            self._where_clauses.append("FALSE")
        else:
            placeholders = ", ".join(["%s"] * len(values))
            self._where_clauses.append(f'"{column}" IN ({placeholders})')
            self._where_values.extend(values)
        return self

    def order(self, column, desc=False):
        self._order_by = column
        self._order_desc = desc
        return self

    def limit(self, count):
        self._limit = count
        return self

    def single(self):
        self._limit = 1
        return self

    def execute(self):
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        try:
            if self._operation == "select":
                # 조인이 있는 경우 처리
                if self._joins:
                    # 메인 테이블의 모든 컬럼 가져오기
                    main_alias = "t1"
                    sql = f'SELECT {main_alias}.* FROM "{self.table_name}" {main_alias}'

                    # 조인 테이블들 추가
                    for i, join_table in enumerate(self._joins):
                        join_alias = f"j{i}"
                        # FK 관계 추측 (예: users.team_id -> teams.id)
                        fk_col = f"{join_table[:-1]}_id" if join_table.endswith('s') else f"{join_table}_id"
                        sql += f' LEFT JOIN "{join_table}" {join_alias} ON {main_alias}."{fk_col}" = {join_alias}."id"'

                    if self._where_clauses:
                        # WHERE 절의 컬럼에 별칭 추가
                        where_parts = []
                        for clause in self._where_clauses:
                            where_parts.append(f'{main_alias}.{clause}')
                        sql += " WHERE " + " AND ".join(where_parts)
                    if self._order_by:
                        sql += f' ORDER BY {main_alias}."{self._order_by}"'
                        if self._order_desc:
                            sql += " DESC"
                    if self._limit:
                        sql += f" LIMIT {self._limit}"

                    cur.execute(sql, self._where_values)
                    rows = cur.fetchall()
                    results = [dict(row) for row in rows]

                    # 배치 쿼리로 조인 데이터 가져오기 (N+1 문제 해결)
                    for join_table in self._joins:
                        fk_col = f"{join_table[:-1]}_id" if join_table.endswith('s') else f"{join_table}_id"
                        key_name = join_table[:-1] if join_table.endswith('s') else join_table

                        # 모든 FK 값 수집
                        fk_values = list(set(r.get(fk_col) for r in results if r.get(fk_col)))

                        if fk_values:
                            # 한 번의 쿼리로 모든 조인 데이터 가져오기
                            placeholders = ','.join(['%s'] * len(fk_values))
                            cur.execute(f'SELECT * FROM "{join_table}" WHERE "id" IN ({placeholders})', fk_values)
                            join_rows = cur.fetchall()
                            join_map = {row['id']: dict(row) for row in join_rows}

                            # 결과에 매핑
                            for r in results:
                                fk_val = r.get(fk_col)
                                r[key_name] = join_map.get(fk_val) if fk_val else None
                        else:
                            for r in results:
                                r[key_name] = None

                    return QueryResult(results)
                else:
                    sql = f'SELECT {self._select_cols} FROM "{self.table_name}"'
                    if self._where_clauses:
                        sql += " WHERE " + " AND ".join(self._where_clauses)
                    if self._order_by:
                        sql += f' ORDER BY "{self._order_by}"'
                        if self._order_desc:
                            sql += " DESC"
                    if self._limit:
                        sql += f" LIMIT {self._limit}"

                    cur.execute(sql, self._where_values)
                    rows = cur.fetchall()
                    return QueryResult([dict(row) for row in rows])

            elif self._operation == "insert":
                if isinstance(self._insert_data, list):
                    # Bulk insert
                    if not self._insert_data:
                        return QueryResult([])
                    cols = self._insert_data[0].keys()
                    col_names = ", ".join(f'"{c}"' for c in cols)
                    placeholders = ", ".join(["%s"] * len(cols))
                    sql = f'INSERT INTO "{self.table_name}" ({col_names}) VALUES ({placeholders}) RETURNING *'

                    results = []
                    for item in self._insert_data:
                        values = [item.get(c) for c in cols]
                        cur.execute(sql, values)
                        results.append(dict(cur.fetchone()))
                    return QueryResult(results)
                else:
                    # Single insert
                    cols = self._insert_data.keys()
                    col_names = ", ".join(f'"{c}"' for c in cols)
                    placeholders = ", ".join(["%s"] * len(cols))
                    values = list(self._insert_data.values())
                    sql = f'INSERT INTO "{self.table_name}" ({col_names}) VALUES ({placeholders}) RETURNING *'

                    cur.execute(sql, values)
                    row = cur.fetchone()
                    return QueryResult([dict(row)] if row else [])

            elif self._operation == "update":
                set_clauses = []
                set_values = []
                for col, val in self._update_data.items():
                    set_clauses.append(f'"{col}" = %s')
                    set_values.append(val)

                sql = f'UPDATE "{self.table_name}" SET {", ".join(set_clauses)}'
                if self._where_clauses:
                    sql += " WHERE " + " AND ".join(self._where_clauses)
                sql += " RETURNING *"

                cur.execute(sql, set_values + self._where_values)
                rows = cur.fetchall()
                return QueryResult([dict(row) for row in rows])

            elif self._operation == "delete":
                sql = f'DELETE FROM "{self.table_name}"'
                if self._where_clauses:
                    sql += " WHERE " + " AND ".join(self._where_clauses)
                sql += " RETURNING *"

                cur.execute(sql, self._where_values)
                rows = cur.fetchall()
                return QueryResult([dict(row) for row in rows])

        finally:
            cur.close()


class PostgresClient:
    def table(self, table_name):
        return QueryBuilder(table_name)


# 싱글톤 클라이언트
_client = None


def get_db_client():
    global _client
    if _client is None:
        _client = PostgresClient()
    return _client


if __name__ == "__main__":
    # 테스트
    client = get_db_client()

    # teams 조회 테스트
    result = client.table("teams").select("*").execute()
    print("Teams:", result.data)
