def load(key):
    return key.upper()


def get_or_load(cache, key):
    if key in cache:
        return cache[key]
    value = load(key)
    cache[key] = value
    return value
