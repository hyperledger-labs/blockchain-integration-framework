# Copyright 2021 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0
FROM hyperledger/fabric-ccenv:x86_64-1.0.4
#ENV http_proxy $HTTP_PROXY
#ENV https_proxy $HTTP_PROXY
#ENV HTTP_PROXY $HTTP_PROXY
#ENV HTTPS_PROXY $HTTP_PROXY
#ENV NO_PROXY "rest-server,ec1-connector,ec2-connector,geth1,geth2"
RUN apt update
RUN apt-get install -y screen
RUN apt-get install -y npm
#RUN npm -g config set proxy $HTTP_PROXY
RUN npm -g install n
RUN n --version
RUN n 8.9.0
RUN npm -g install express
