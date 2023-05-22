# CredSec

Welcome to the **credsec** repository! This project aims to create a versatile credential search site.

## Getting Started

### Clone the Repository

To get started, you'll first need to clone the repository. We recommend using SSH for cloning. If you haven't already set up SSH keys, follow these steps:

1. Open a terminal window and run the following command to generate a new SSH key pair:

   ```
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

   Replace `your_email@example.com` with your GitHub email address.

2. Press `Enter` to accept the default file location or provide a custom path if desired.

3. Enter a passphrase for your SSH key (optional).

4. Add the SSH key to the ssh-agent:

   ```
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/id_ed25519
   ```

5. Add the SSH key to your GitHub account. You can follow the instructions [here](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account).

Now, you can clone the repository using the following command:

```
git clone git@github.com:babakbandpey/credsec.git
```

### Install Docker and Docker Compose

Before you proceed, ensure that both Docker and Docker Compose are installed on your machine. If you don't have them installed, follow the instructions provided in the official documentation:

- [Install Docker](https://docs.docker.com/engine/install/)
- [Install Docker Compose](https://docs.docker.com/compose/install/)

### Set Up the Project

1. After cloning the repository, navigate to the project directory:

   ```
   cd credsec
   ```

2. Run the following command to set up the Docker containers:

   ```
   docker-compose up
   ```

   This command needs to be executed only once. After the first time, you can simply use `docker-compose start` or `docker-compose stop` to start or stop the containers, respectively.

3. If you need to destroy the containers, run:

   ```
   docker-compose down
   ```

4. This will stop the containers, but it will not delete the data stored in the MariaDB container. If you want to delete the data as well (which is useful if you’ve changed your bootstrap files), you can use the following command:
   ```
   docker-compose down --volumes
   ```

