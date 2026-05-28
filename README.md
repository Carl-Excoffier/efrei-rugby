# Efrei Rugby Club - Cloud Server Management System

**Student Name:** Carl Excoffier
**Student Number:** 35986331

### Key Links
* **Live Website (DNS):** https://efrei-rugby.fr
* **Global IP Address:** 54.252.151.249
* **Video Explainer:** [Link to your YouTube/Vimeo video]
* **GitHub Repository:** https://github.com/Carl-Excoffier/efrei-rugby

---

## 1. Project Overview
This project is a bespoke web application built for the Efrei Rugby club to manage their schedule, roster, and player performance reviews. It is built using Node.js and Express, connected to a MySQL database, and hosted on an Amazon Web Services (AWS) EC2 Ubuntu instance.

## 2. Cloud Infrastructure Setup (AWS EC2)
The server is hosted on AWS EC2 using an Ubuntu AMI.

1. **Instance Creation:** Spun up a `t2.micro` Ubuntu instance.
2. **Security Groups:** Configured the AWS Security Group to allow inbound traffic on:
   * Port `22` (SSH for administration)
   * Port `80` (HTTP)
   * Port `443` (HTTPS for SSL/TLS)

## 3. Server Environment Configuration
*Note: The following commands should be run in the Ubuntu terminal via SSH.*

**Update the system:**
`sudo apt update && sudo apt upgrade -y`

**Install Node.js & npm:**
`curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -`
`sudo apt install -y nodejs`

**Install MySQL Server:**
`sudo apt install mysql-server -y`

**Install PM2 (Process Manager):**
`sudo npm install -g pm2`

## 4. Database Setup
1. Log into MySQL: `sudo mysql -u root`
2. Create the database and dedicated user:
   ```sql
   CREATE DATABASE efreirugby;
   CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'rugby2026';
   GRANT ALL PRIVILEGES ON efreirugby.* TO 'app_user'@'localhost';
   FLUSH PRIVILEGES;
