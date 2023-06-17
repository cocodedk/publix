# set base image (host OS)
FROM ubuntu:23.04

# set the working directory in the container
WORKDIR /code

# copy the dependencies file to the working directory
COPY requirements.txt .

RUN apt-get update && apt-get install -y tzdata

ENV TZ=UTC

# install dependencies
# RUN python3 -m pip install -r requirements.txt

# copy the content of the local src directory to the working directory
COPY . /code

# mount the current directory to the working directory
VOLUME [ "/code" ]

RUN pwd
RUN ls -la