# clear the screen
clear

# create a variable for the needed python version
PYTHON="python3.11"

$PYTHON --version

apt install software-properties-common -y

apt update -y
apt upgrade -y
apt install wget build-essential checkinstall  libreadline-gplv2-dev  libncursesw5-dev  libssl-dev  libsqlite3-dev tk-dev libgdbm-dev libc6-dev libbz2-dev libffi-dev zlib1g-dev tzdata -y

# installing gunicorn
apt install gunicorn -y

apt upgrade -y

apt install ca-certificates apt-transport-https software-properties-common lsb-release -y

sudo apt update -y

apt upgrade -y

apt install ca-certificates apt-transport-https software-properties-common lsb-release -y

command -v $PYTHON

# set the TZ to UTC
export TZ=UTC

# set the timezone to Europe/Copenhagen
timedatectl set-timezone Europe/Copenhagen

# set the OS to sync with a ntp server
timedatectl set-ntp true

# install python-3.11 if it is not installed
if ! [ -x "$(command -v $PYTHON)" ]; then

    # aske for input from the user to install python3.11
    echo "Error: $PYTHON is not installed." >&2
    echo "Installing $PYTHON"
    apt install python3.11 -yupdate-alternatives --install /usr/bin/python3 python3 /usr/local/bin/python3.11 1en

    echo "Error: python3.11 is not installed." >&2
    echo "Installing python3.11"
    # apt install python3.11 -yupdate-alternatives --install /usr/bin/python3 python3 /usr/local/bin/python3.11 1en
    # cd /usr/src
    # wget https://www.python.org/ftp/python/3.11.0/Python-3.11.0.tgz
    # tar xzf Python-3.11.0.tgz
    # cd Python-3.11.0
    # ./configure --enable-optimizations
    # make altinstall

    # # set the python3.11 as the default python3
    # update-alternatives --install /usr/bin/python3 python3 /usr/local/bin/python3.11 1
    apt install python3.11 -y

    cd /code
fi

apt install python3-pip -y

# install python pip if it is not installed
if ! [ -x "$(command -v pip3)" ]; then
    echo "Error: pip3 is not installed." >&2
    echo "Installing pip3"
    apt install python3-pip -y
fi

# check if mariadb-client is installed and if it is not installed install it
if dpkg -s mariadb-client > /dev/null 2>&1; then
    echo "mariadb-client is installed"
else
    echo "mariadb-client is not installed"
    echo "Installing mariadb-client"
    apt install mariadb-client -y
fi

# check for libmariadbclient-dev and if it is not installed install it
if dpkg -s libmariadb-dev > /dev/null 2>&1; then
    echo "libmariadb-dev is installed"
else
    echo "libmariadb-dev is not installed"
    echo "Installing libmariadb-dev"
    apt install libmariadb-dev -y
fi

if dpkg -s python3-mysqldb > /dev/null 2>&1; then
    echo "python3-mysqldb is installed"
else
    echo "python3-mysqldb is not installed"
    echo "Installing python3-mysqldb"
    apt install python3-mysqldb -y
fi

# echo activating the virtual environment
echo "**********************************"
echo "Installing the virtual environment"
echo "**********************************"

apt install python3.11-venv -y

## control if the viritualenv is installed
if ! [ -x "$(command -v python3 -m vevn -h)" ]; then
    echo "Error: virtualenv is not installed." >&2  
    echo "Installing virtualenv"
## else output the version of virtualenv
else
    echo "virtualenv is installed"
fi

python3.11 -m venv env311

# check if the virtual environment exists
if [ ! -d "./env311" ]; then
    echo "The virtual environment does not exist"
    echo "Creating the virtual environment"
    python3.11 -m venv env311
fi

# activate the virtual environment
echo "**********************************"
echo "Activating the virtual environment"
echo "**********************************"
source ./env311/bin/activate

# check if the python environment is activated
if [ "$VIRTUAL_ENV" != "" ]; then
    echo "The python environment is activated"
    echo "The python environment is: $VIRTUAL_ENV"
else
    echo "The python environment is not activated"
    echo "The python environment is: $VIRTUAL_ENV"

    # exit the script
    echo "Exiting the script"
    exit 1
fi

# echo upgrading pip
echo "**********************"
echo "Upgrading pip"
echo "**********************"
apt install python3-pip -y

# echo installing the requirements
echo "***************************"
echo "Installing the requirements"
echo "***************************"
$PYTHON -m pip install -r requirements.txt

# echo the message that if they need to restore data into the database they can do it by running the db_load.sh script
echo "************************************************"
echo "If you need to restore data into the database" 
echo "you can do it by running the ./db_load.sh script"
echo "************************************************"

# make the ./db_load.sh script executable
chmod +x ./db_load.sh

ls -la ./db_load.sh

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

echo "**************************"
echo "Starting the gunicorn"
echo "**************************"
gunicorn --reload -w 4 -b 0.0.0.0:8000 credsec.wsgi:application
