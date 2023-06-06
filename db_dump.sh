
#!/bin/bash
# Dump the database to a file calles itsvamfapp.sql
# it is a mysqldump command
# include the password in the command. The password is mysql@@@880202
# the database name is itsvamf
# the file name is itsvamfapp.sql 

host=mariadb

# check if the db_dumps directory exists
# if not create it
if [ ! -d db_dumps ]; then
    mkdir db_dumps
fi

# check if the host is up
if ! nc -z $host 3306; then
    echo "The host $host is not up"
    exit 1
fi

# put this in a variable db_dumps/itsvamfapp_$(date +%Y%m%d_%H%M%S).sql.gz as a string
dump_file="db_dumps/itsvamfapp_$(date +%Y%m%d_%H%M%S).sql.gz"

echo $dump_file


# dump the database and add the data and time to the file name and zip it to zip format
mysqldump -h $host -u credsec -p123credsec123 app --protocol=TCP | gzip -9 > $dump_file

# check if the file exists
if [ -f $dump_file ]; then
    echo "The database was dumped to the file $dump_file"
else
    echo "The database was not dumped to the file $dump_file"
fi
