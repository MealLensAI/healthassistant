# MySQL setup from zero (Mac)

Follow these steps in order. When you paste and run the SQL, you’ll see the output described below.

---

## Step 1: Install MySQL on your Mac

**Option A – Homebrew (recommended)**

```bash
brew install mysql
```

**Option B – Official installer**

- Go to https://dev.mysql.com/downloads/mysql/
- Download “macOS DMG Archive” and run the installer.

---

## Step 2: Start MySQL

**If you used Homebrew:**

```bash
brew services start mysql
```

**If you used the official installer:** MySQL may already be running (check System Preferences / System Settings for “MySQL”).

**Check it’s running:** you should be able to run the next step without “connection refused”.

---

## Step 3: Log in as root and run the setup SQL

Open Terminal and run:

```bash
mysql -u root -p
```

- If it asks for a password and you never set one, try pressing **Enter** (empty password).
- If you installed with Homebrew and a password was generated, use that (or reset it – see below).

You should see something like:

```
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 8
Server version: 8.0.x ...

Type 'help;' or '\h' for help. Type '\c' to clear the current input buffer.

mysql>
```

That `mysql>` is the prompt. You’re in the MySQL client.

**Paste and run the setup file:**

1. In Terminal (with `mysql>` showing), run:

   ```bash
   source /Users/danielsamuel/PycharmProjects/Meallensai/healthassistant/backend/scripts/supabase_to_mysql/setup_mysql.sql
   ```

   Or from the project root:

   ```bash
   mysql -u root -p < backend/scripts/supabase_to_mysql/setup_mysql.sql
   ```

2. If you’re already at `mysql>`, you can paste the contents of `setup_mysql.sql` (the whole file) and press Enter.

**What you’ll get from MySQL when it works:**

- After `CREATE DATABASE IF NOT EXISTS healthassistant`  
  → Usually no message, or:  
  `Query OK, 1 row affected`

- After `CREATE USER IF NOT EXISTS ...`  
  → `Query OK, 0 rows affected` (or 1 row if the user was just created)

- After `GRANT ...`  
  → `Query OK, 0 rows affected`

- After `FLUSH PRIVILEGES`  
  → `Query OK, 0 rows affected`

- After `SHOW DATABASES LIKE 'healthassistant'`  
  → A small table with one row:

  ```
  +------------------------------+
  | Database (healthassistant)   |
  +------------------------------+
  | healthassistant              |
  +------------------------------+
  1 row in set
  ```

So: **you know it worked when you see that “healthassistant” database in the list and no error messages.**

To exit the MySQL client:

```text
exit
```

---

## Step 4: Put the same user and password in `.env`

The SQL file creates:

- **User:** `healthassistant`
- **Password:** `HealthAssistantDev`
- **Database:** `healthassistant`

Add (or update) these in **`backend/.env`**:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=healthassistant
MYSQL_PASSWORD=HealthAssistantDev
MYSQL_DATABASE=healthassistant
```

No need to invent “your_mysql_user” or “your_mysql_password” – use these exact values.

---

## Step 5: Run the migration

From the project root:

```bash
pip install pymysql
python backend/scripts/supabase_to_mysql/migrate_supabase_to_mysql.py
```

That will create the tables in MySQL and copy data from Supabase.

---

## If `mysql -u root -p` says “Access denied”

**Homebrew:** sometimes root has no password. Try:

```bash
mysql -u root
```

(no `-p`). If that works, you can set a root password later if you want.

**Official installer:** the installer may have shown a root password; use that with `-p`.

**Reset root password (Homebrew):** search for “mysql reset root password homebrew” for your exact MySQL version.

---

## If you don’t have the `mysql` command

- **Homebrew:** after `brew install mysql`, run `brew services start mysql` and try again. If `mysql` is still not found, add the bin path (e.g. `/opt/homebrew/opt/mysql/bin`) to your PATH or use the full path.
- **Installer:** make sure “MySQL Command Line Client” or the MySQL bin directory is in your PATH (installer often offers to add it).

---

## Summary

| What you run | Where | What you get |
|--------------|--------|--------------|
| `brew install mysql` then `brew services start mysql` | Terminal | MySQL installed and running |
| `mysql -u root -p` | Terminal | `mysql>` prompt |
| `source .../setup_mysql.sql` or paste `setup_mysql.sql` | At `mysql>` | `Query OK` lines and `SHOW DATABASES` showing `healthassistant` |
| Add `MYSQL_USER=healthassistant`, `MYSQL_PASSWORD=HealthAssistantDev`, `MYSQL_DATABASE=healthassistant` | `backend/.env` | App and migration script can connect to MySQL |
| `python backend/scripts/supabase_to_mysql/migrate_supabase_to_mysql.py` | Terminal (project root) | Tables created and Supabase data copied into MySQL |

So: **you set “your_mysql_user” = `healthassistant` and “your_mysql_password” = `HealthAssistantDev` by running the SQL file once; then you put those same values in `.env`.**
