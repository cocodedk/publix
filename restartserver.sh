# clear the screen
clear

# create a variable for the needed python version
PYTHON="python3.11"

# echo installing the requirements
echo "***************************"
echo "Installing the requirements"
echo "***************************"
$PYTHON -m pip install -r requirements.txt

# activate the virtual environment
echo "**********************************"
echo "Activating the virtual environment"
echo "**********************************"
source ./env311/bin/activate

# create migrations for the django database
echo "*******************************************"
echo "Creating migrations for the django database"
echo "*******************************************"
$PYTHON manage.py makemigrations


# migrate the django database
echo "*****************************"
echo "Migrating the django database"
echo "*****************************"
$PYTHON manage.py migrate

# echo the message that if they need to restore data into the database they can do it by running the db_load.sh script
echo "**********************************************************************************************"
echo "**********************************************************************************************"
echo "If you need to restore data into the database you can do it by running the ./db_load.sh script"
echo "**********************************************************************************************"
echo "**********************************************************************************************"

# make the ./db_load.sh script executable
chmod +x ./db_load.sh

ls -la ./db_load.sh

# check if the watchdog_helper.py is running and if it is running kill it
if ps -ef | grep watchdog_helper.py | grep -v grep > /dev/null 2>&1; then
    echo "watchdog_helper.py is running"
    echo "Killing watchdog_helper.py"
    pkill -f watchdog_helper.py
else
    echo "watchdog_helper.py is not running"
fi

# echo starting watchdog_helper.py
echo "*******************************"
echo "Starting the watchdog_helper.py"
echo "*******************************"

$PYTHON ./watchdog_helper.py &

# wait 1 second
sleep 1

# do a ps and grep for the watchdog_helper.py and make sure that it is running
ps -ef | grep watchdog_helper.py


# check if the livereload is running and if it is running kill it
if ps -ef | grep livereload | grep -v grep > /dev/null 2>&1; then
    echo "livereload is running"
    echo "Killing livereload"
    pkill -f livereload
else
    echo "livereload is not running"
fi

echo "******************************"
echo "Starting the Livereload server"
echo "******************************"
$PYTHON manage.py livereload  &

# wait 3 second
sleep 3

# do a ps and grep for the livereload and make sure that it is running
ps -ef | grep livereload

# check if gunicon is running and if it is running kill it
if ps -ef | grep gunicorn | grep -v grep > /dev/null 2>&1; then
    echo "gunicorn is running"
    echo "Killing gunicorn"
    pkill -f gunicorn
else
    echo "gunicorn is not running"
fi

# wait 4 second
sleep 4

echo "**************************"
echo "Starting the gunicorn"
echo "**************************"
gunicorn -w 4 -b 0.0.0.0:8000 credsec.wsgi:application
