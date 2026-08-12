import os
import sqlite3
import pymysql
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Load .env file
env_path = BASE_DIR / '.env'
if not env_path.exists():
    env_path = BASE_DIR.parent / '.env'

db_config = {
    'host': '127.0.0.1',
    'port': 3306,
    'user': 'root',
    'password': '',
    'database': 'CyberDB'
}

if env_path.exists():
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, val = line.split('=', 1)
                key = key.strip()
                val = val.strip().strip("'").strip('"')
                if key == 'DB_HOST': db_config['host'] = val
                elif key == 'DB_PORT': db_config['port'] = int(val)
                elif key == 'DB_USER': db_config['user'] = val
                elif key == 'DB_PASSWORD': db_config['password'] = val
                elif key == 'DB_NAME': db_config['database'] = val

sqlite_path = BASE_DIR / 'db.sqlite3'

def run_import():
    if not sqlite_path.exists():
        print(f"[-] SQLite database file not found at {sqlite_path}")
        return

    print(f"[+] Reading previous data from {sqlite_path}...")
    s_conn = sqlite3.connect(sqlite_path)
    s_conn.row_factory = sqlite3.Row
    s_cur = s_conn.cursor()

    print(f"[+] Connecting to MySQL database '{db_config['database']}' at {db_config['host']}...")
    try:
        m_conn = pymysql.connect(
            host=db_config['host'],
            port=db_config['port'],
            user=db_config['user'],
            password=db_config['password'],
            database=db_config['database'],
            autocommit=True
        )
    except Exception as e:
        print(f"[-] Error connecting to MySQL: {e}")
        print("    Please check your MySQL service and password in .env")
        return

    m_cur = m_conn.cursor()

    # Import users_user table
    try:
        s_cur.execute("SELECT * FROM users_user")
        users = s_cur.fetchall()
        print(f"[+] Found {len(users)} user account(s) in SQLite.")

        transferred_count = 0
        for u in users:
            cols = list(u.keys())
            vals = [u[c] for c in cols]
            placeholders = ", ".join(["%s"] * len(cols))
            col_names = ", ".join([f"`{c}`" for c in cols])
            
            sql = f"INSERT IGNORE INTO `users_user` ({col_names}) VALUES ({placeholders})"
            m_cur.execute(sql, vals)
            transferred_count += 1
            print(f"    -> User: {u['username']} | Email: {u['email']} | Last Login: {u['last_login']}")

        print(f"[✓] Successfully imported {transferred_count} user(s) into MySQL CyberDB!")

    except Exception as e:
        print(f"[-] Error importing users: {e}")

    # Import django_session table
    try:
        s_cur.execute("SELECT * FROM django_session")
        sessions = s_cur.fetchall()
        print(f"[+] Found {len(sessions)} session(s) in SQLite.")

        for s in sessions:
            cols = list(s.keys())
            vals = [s[c] for c in cols]
            placeholders = ", ".join(["%s"] * len(cols))
            col_names = ", ".join([f"`{c}`" for c in cols])
            
            sql = f"INSERT IGNORE INTO `django_session` ({col_names}) VALUES ({placeholders})"
            m_cur.execute(sql, vals)

        print(f"[✓] Successfully imported sessions into MySQL CyberDB!")

    except Exception as e:
        print(f"[-] Error importing sessions: {e}")

    s_conn.close()
    m_conn.close()
    print("\n[🎉] Import completed successfully! You can now check MySQL Workbench.")

if __name__ == "__main__":
    run_import()
