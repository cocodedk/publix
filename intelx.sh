# this shell script will ask the user for a search string

read -p "Please enter the search string: " search_string

# activate the virtual environment
source /code/env311/bin/activate

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

# run the django command intelximp

python3.11 manage.py intelximp $search_string 200

