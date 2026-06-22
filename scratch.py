import re
c = open('frontend/src/data/airportsData.js', encoding='utf-8').read()
d = dict(re.findall(r'icao:\s*"(.*?)"[^}]*?gmtOffset:\s*([-+\d]+)', c))
for k,v in d.items():
    print(f'"{k}": {v},', end=' ')
