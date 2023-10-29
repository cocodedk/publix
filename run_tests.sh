#!/bin/bash

python3 -m venv /code/env311

which python
python3 --version

source /code/env311/bin/activate

which python
python3 --version

python3 -m pip install --upgrade pip

python3 -m pip install -r /code/requirements.txt

python manage.py test
