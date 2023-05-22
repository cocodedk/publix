# this script is used to load the database from a zipped sql file
# which is created by the db_dump.sh script
# the file is saved in the db_dumps directory
# this script loads the latest file in the db_dumps directory into the database

# check if the db_dumps directory exists

hostname=mariadb

# store the database name in a variable
db_name=app
#store the password in a variable

#read the mysql password from the prompt
echo -n "Enter the mysql root password: "
# read the password without echoing it
read -s db_password

# if the password is empty exit the script
if [ -z "$db_password" ]; then
    echo "The password is empty"
    exit 1
fi

# check if the password can be used to connect to the mysql server
if ! mysql -h $hostname -u root -p$db_password --protocol=TCP -e "SHOW DATABASES"; then
    echo "The password is not correct"
    exit 1
fi

if [ ! -d db_dumps ]; then
    echo "The db_dumps directory does not exist"
    exit 1
fi

# check if sudo apt install mariadb-client-core-10.6 is installed
# if not install it
if ! [ -x "$(command -v mysql)" ]; then
    echo "Error: mariadb-client-core-10.6 is not installed." >&2
    echo "Installing mariadb-client-core-10.6"
    apt install mariadb-client-core-10.6
fi

# Show the databases
mysql -h $hostname -u root -p$db_password --protocol=TCP -e "SHOW DATABASES"

# drop the data base itsvam
echo "Dropping the database itsvamf"
mysql -h $hostname -u root -p$db_password --protocol=TCP -e "DROP DATABASE IF EXISTS itsvamf"

if mysql -h $hostname -u root -p$db_password --protocol=TCP -e "SHOW DATABASES" | grep $db_name; then
    echo "The database is not dropped"
else
    echo "The database is dropped"
fi

mysql -h $hostname -u root -p$db_password --protocol=TCP -e "SHOW DATABASES"

# create the database $db_name
echo "Creating the database $db_name"
mysql -h $hostname -u root -p$db_password --protocol=TCP -e "CREATE DATABASE IF NOT EXISTS $db_name"

if mysql -h $hostname -u root -p$db_password --protocol=TCP -e "SHOW DATABASES" | grep $db_name; then
    echo "The database is created"
else
    echo "The database is not created"
fi

# get the latest file in the db_dumps directory
# the file name is in the format itsvamfapp_20180101_123456.sql.gz
# the file name contains the date and time
# find the latest file by sorting the files by date and time in the file name
# the latest file is the first file in the list

echo "Getting the latest file in the db_dumps directory: "
latest_file=$(ls -r db_dumps | head -1)

echo $latest_file

# the file needs to be unziped before it can be loaded into the database
# unzip the file to a temporary file called tmp.sql
# load the file into the database
# delete the temporary file

gunzip -c db_dumps/$latest_file | mysql -h $hostname -u root -p$db_password $db_name

# check if the database is loaded
# if $db_name data base has tables in it then the database is loaded
# show the tables of the database
mysql -h $hostname -u root -p$db_password -e "SHOW TABLES" $db_name
