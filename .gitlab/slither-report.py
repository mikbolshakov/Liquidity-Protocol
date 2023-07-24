#!/usr/bin/env python3
import os
import sys
import requests

if __name__ == "__main__":
    lines = '\n'.join(sys.stdin.readlines())
    if 'CI_MERGE_REQUEST_TARGET_BRANCH_NAME' not in os.environ:
        print(lines)
        exit(0)

    body = f"<details><summary>Slither report summary</summary>{lines}</details>"

    token = os.environ['ENT_GITLAB_BOT_TOKEN']
    url = f"https://gitlab.ent-dx.com/api/v4/projects/{os.environ['CI_PROJECT_ID']}/merge_requests/{os.environ['CI_MERGE_REQUEST_IID']}/notes"
    r = requests.post(url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        },
        json={
            "id": os.environ['CI_PROJECT_ID'],
            "merge_request_iid": os.environ['CI_MERGE_REQUEST_IID'],
            "body": body 
        }
    )
    print(r.text)
