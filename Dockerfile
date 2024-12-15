# set base image (host OS)
FROM python:3.11.6-slim-bullseye

# Set the working directory in the container
WORKDIR /code

# Copy the dependencies file to the working directory
COPY ./requirements.txt .

# Update and install necessary dependencies
RUN apt-get update -y && \
    apt-get install -y apt-utils pkg-config software-properties-common wget build-essential checkinstall ncat mariadb-client libmariadb-dev libmariadb-dev-compat python3-mysqldb && \
    apt-get install -y libreadline-dev  libncursesw5-dev  libssl-dev  tk-dev libgdbm-dev libc6-dev libbz2-dev libffi-dev zlib1g-dev tzdata && \
    apt-get install -y ca-certificates apt-transport-https lsb-release && \
    apt-get install -y gunicorn && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install and upgrade pip, then install requirements
RUN python -m ensurepip --upgrade && \
    pip install --upgrade pip && \
    pip install -r requirements.txt

# add this line to the /home/ubuntu/.bashrc file
RUN echo "source /code/env311/bin/activate" >> /root/.bashrc

ENV TZ=Europe/Copenhagen
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# mount the current directory to the working directory
VOLUME [ "/code" ]

RUN pwd
RUN ls -la
