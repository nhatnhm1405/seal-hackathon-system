-- Remove unused IP address storage from SystemLog.
-- AuditLog.ip_address is intentionally kept.
ALTER TABLE SystemLog
  DROP COLUMN ip_address;
