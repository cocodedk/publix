# clear the screen
clear

# add a comment that this will destroy all docker containers and images system wide
echo "This will destroy all docker containers and images system wide"

# create a random number of 5 digits
random_number=$((RANDOM%90000+10000))
# prompt the user to enter the random number to confirm the deletion of all docker containers and images
read -p "Please enter the random number $random_number to confirm the deletion of all docker containers and images: " user_random_number

# compare the random number entered by the user with the random number generated
if [ $user_random_number -eq $random_number ]
then
    echo "The random number entered by the user is correct"
else
    echo "The random number entered by the user is incorrect"
    exit 1
fi

# prompt again if the user is sure to delete all docker containers and images
read -p "Are you sure you want to delete all docker containers and images? (y/n) " user_response

# compare the user response with y or n
if [ $user_response == "y" ]
then
    echo "The user has confirmed to delete all docker containers and images"
else
    echo "The user has not confirmed to delete all docker containers and images"
    exit 1
fi

docker-compose down
docker stop $(docker ps -a -q)
docker container rm $(docker container ls -a -q)
docker image rm $(docker image ls -a -q)

# ask the user if he wants to start the docker containers
read -p "Do you want to start the docker containers? (y/n) " user_response

# compare the user response with y or n
if [ $user_response == "y" ]
then
    echo "The user has confirmed to start the docker containers"
else
    echo "The user has not confirmed to start the docker containers"
    exit 1
fi

docker-compose up