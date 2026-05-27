-- Replace legacy halted status with on_hold (closest match for paused games).
UPDATE games SET status = 'on_hold' WHERE status = 'halted';
