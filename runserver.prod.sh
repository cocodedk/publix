# clear the screen
set -x

# Use Python 3.11
PYTHON="python3.11"
$PYTHON --version

# set the timezone to Europe/Copenhagen
timedatectl set-timezone Europe/Copenhagen

# set the OS to sync with a ntp server
timedatectl set-ntp true

# delete the /code/env311 directory if it exists
if [ -d "/code/env311" ]; then
    echo "The virtual environment for python  exists"
    echo "Deleting the virtual environment for python "
    rm -rf /code/env311
else
    echo "The virtual environment for python  does not exist"
fi

# create the python virtual environment
if [ ! -d "/code/env311" ]; then
    echo "The virtual environment for python  does not exist"
    echo "Creating the virtual environment for python "
    $PYTHON -m venv /code/env311
else
    echo "The virtual environment for python  exists"
fi

# activate the virtual environment
source ./env311/bin/activate

# check if the python environment is activated
if [ "$VIRTUAL_ENV" != "" ]; then
    echo "The python environment is activated"
    echo "The python environment is: $VIRTUAL_ENV"
else
    echo "The python environment is not activated"

    # exit the script
    echo "Exiting the script"
    exit 1
fi

# Upgrade pip and install Python dependencies from requirements.txt

# Check if pip is installed, if not, install it
if ! command -v pip &> /dev/null; then
    echo "pip could not be found. Installing pip..."
    
    RUN pip3 install --upgrade pip

    $PYTHON -m ensurepip --upgrade
else
    echo "pip is installed."
    pip install --upgrade pip
fi

pip install -r requirements.txt

# Check if the database at host mariadb port 3306 is running
tries=0
max_tries=5
while ! nc -z mariadb 3306 && [[ "$tries" -lt "$max_tries" ]]; do
    sleep 5
    tries=$((tries+1))
    echo "Waiting for database... ($tries/$max_tries)"
done

# Create migrations for the Django database and then migrate
$PYTHON manage.py makemigrations
$PYTHON manage.py migrate

# For production
gunicorn --reload -w 4 -b 0.0.0.0:8000 credsec.wsgi:application