"""Basic connection example.
"""

import redis

r = redis.Redis(
    host='redis-14245.c321.us-east-1-2.ec2.redns.redis-cloud.com',
    port=14245,
    decode_responses=True,
    username="default",
    password="UL5tpo8dma2OCBbi88QxICIfyeoxDQcd",
)

success = r.set('foo', 'bar')
# True

result = r.get('foo')
print(result)
# >>> bar

