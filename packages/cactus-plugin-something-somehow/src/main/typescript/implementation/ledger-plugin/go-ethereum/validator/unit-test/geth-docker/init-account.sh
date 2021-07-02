# Copyright 2019-2020 Fujitsu Laboratories Ltd.
# SPDX-License-Identifier: Apache-2.0
echo "make-account-ec1-accounts[0]"
docker-compose -f docker-init.yml run make-account-ec1 
cp ./genesis/template/genesis-template.json ./genesis/genesis-ec1.json
echo " "
echo "make-account-ec1-accounts[1]"
docker-compose -f docker-init.yml run make-account-ec1 
echo " "
echo "make-account-ec1-accounts[2]"
docker-compose -f docker-init.yml run make-account-ec1 
echo " "
echo "make-account-ec1-accounts[3]"
docker-compose -f docker-init.yml run make-account-ec1 
echo " "
echo "make-account-ec1-accounts[4]"
docker-compose -f docker-init.yml run make-account-ec1 
echo " "
echo "make-account-ec2-accounts[0]"
docker-compose -f docker-init.yml run make-account-ec2 
cp ./genesis/template/genesis-template.json ./genesis/genesis-ec2.json
echo " "
echo "make-account-ec2-accounts[1]"
docker-compose -f docker-init.yml run make-account-ec2 
echo " "
echo "make-account-ec2-accounts[2]"
docker-compose -f docker-init.yml run make-account-ec2 
echo " "
echo "make-account-ec2-accounts[3]"
docker-compose -f docker-init.yml run make-account-ec2 
echo " "
echo "make-account-ec2-accounts[4]"
docker-compose -f docker-init.yml run make-account-ec2 
echo " "
