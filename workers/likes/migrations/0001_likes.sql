CREATE TABLE article_counts (
  article_id TEXT PRIMARY KEY,
  total INTEGER NOT NULL DEFAULT 0 CHECK(total >= 0)
) WITHOUT ROWID;

CREATE TABLE article_likes (
  article_id TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(article_id, visitor_hash)
) WITHOUT ROWID;

CREATE TRIGGER like_added AFTER INSERT ON article_likes BEGIN
  INSERT INTO article_counts(article_id, total) VALUES(NEW.article_id, 1)
  ON CONFLICT(article_id) DO UPDATE SET total = total + 1;
END;
CREATE TRIGGER like_removed AFTER DELETE ON article_likes BEGIN
  UPDATE article_counts SET total = total - 1 WHERE article_id = OLD.article_id;
END;

CREATE TABLE rate_limits (
  bucket TEXT PRIMARY KEY,
  requests INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
) WITHOUT ROWID;
CREATE INDEX rate_limits_expiry ON rate_limits(expires_at);
