import time


class TTLCache:
    def __init__(self):
        self._items = {}

    def set(self, key, value, ttl_seconds):
        self._items[key] = {
            "value": value,
            "expires_at": time.time() + ttl_seconds,
        }

    def get(self, key):
        item = self._items.get(key)

        if item is None:
            return None

        if item["expires_at"] > time.time():
            del self._items[key]
            return None

        return item["value"]