#!/usr/bin/env bash
set -o errexit

apt-get update && apt-get install -y gcc libffi-dev libssl-dev python3-dev
pip install --no-cache-dir --upgrade pip
pip install --no-cache-dir -r requirements.txt