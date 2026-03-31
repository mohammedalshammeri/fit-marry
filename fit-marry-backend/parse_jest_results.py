import json, pathlib
p = pathlib.Path('jest-results.json')
if not p.exists():
    print('NO_RESULTS_FILE')
    raise SystemExit(0)
data = json.loads(p.read_text())
print(f"SUCCESS={data['success']}")
print(f"NUM_FAILED_TEST_SUITES={data['numFailedTestSuites']}")
print(f"NUM_FAILED_TESTS={data['numFailedTests']}")
for tr in data['testResults']:
    print(f"FILE={tr['name']}")
    print(f"STATUS={tr['status']}")
    msg = (tr.get('message') or '').strip().replace('\n', ' | ')
    if msg:
        print('MESSAGE=' + msg)
    for ar in tr.get('assertionResults', []):
        if ar.get('status') == 'failed':
            print('FAILED_TEST=' + ar.get('fullName', ''))
