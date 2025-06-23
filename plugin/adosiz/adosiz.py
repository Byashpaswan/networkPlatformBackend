import requests, sys, json
r = requests.get('http://api.adosiz.com/api/offers/list_v5', headers=json.loads(sys.argv[1]), params = json.loads(sys.argv[2]))