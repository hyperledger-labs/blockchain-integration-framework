# Copyright 2019-2020 Fujitsu Laboratories Ltd.
# SPDX-License-Identifier: Apache-2.0
docker-compose -f docker-init.yml down
docker-compose down 
sudo rm -r ./data*
docker network rm ec1net
docker network rm ec2net
