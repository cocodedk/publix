# clear the screen
set -x

# Use Python 3.11
PYTHON="python3.11"
$PYTHON --version

# set the timezone to Europe/Copenhagen
timedatectl set-timezone Europe/Copenhagen

# set the OS to sync with a ntp server
timedatectl set-ntp true

# Check if the database at host mariadb port 3306 is running
tries=0
max_tries=5
while ! nc -z mariadb 3306 && [[ "$tries" -lt "$max_tries" ]]; do
    sleep 5
    tries=$((tries+1))
    echo "Waiting for database... ($tries/$max_tries)"
done

# Copy the pre-commit hook and make it executable
cp -f pre-commit /code/.git/hooks/pre-commit # Development server
chmod +x .git/hooks/pre-commit # Development server
chmod +x ./gitpull.sh # Development server

chmod +x ./db_load.sh
chmod +x ./db_dump.sh

# The above 3 lines must not be copied to runserver.prod.sh

# Create migrations for the Django database and then migrate
$PYTHON manage.py makemigrations
$PYTHON manage.py migrate

# Start the Livereload server in the background
$PYTHON manage.py livereload 0.0.0.0:35729 & # Development server

# Start the watchdog_command in the background
$PYTHON manage.py watchdog_command & # Development server

# Start the Django server
$PYTHON manage.py runserver_plus 0.0.0.0:80

# gunicorn --reload -w 4 -b 0.0.0.0:8000 publix.wsgi:application
