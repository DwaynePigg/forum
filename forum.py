import sqlite3

# Connect to a SQLite database file (creates it if missing)
with sqlite3.connect("forum.db") as conn:
	cur = conn.cursor()
	cur.execute("""
	CREATE TABLE IF NOT EXISTS posts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		body TEXT NOT NULL
	)
	""")

	# c.execute("INSERT INTO posts (title, body) VALUES (?, ?)", ("Hello", "First post!"))
	cur.execute("DELETE FROM posts WHERE id = ?", (8,))
	cur.execute("INSERT INTO posts (title, body) VALUES (?, ?)", ("What Number?", "Hello?"))
	conn.commit()

	for row in cur.execute("SELECT * FROM posts"):
		print(*row)

